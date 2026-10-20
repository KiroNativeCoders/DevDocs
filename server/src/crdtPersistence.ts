import './env.js'
import { createClient } from '@supabase/supabase-js'

/**
 * Production CRDT Persistence Provider for Yjs.
 *
 * Implements a dual-tier storage strategy:
 * 1. Log Append: Streams incoming binary diffs into `document_update_log` (buffered/batched).
 * 2. Periodic Snapshot Checkpoint: Compresses the full Y.Doc state into `document_snapshot`
 *    every 1 minute (or when the document unloads/closes), then trims the stale log diffs.
 * 3. Graceful fallback: If Supabase Postgres is not reachable or tables are being migrated,
 *    logs a warning and continues in-memory without crashing the WebSocket relay.
 */

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const SNAPSHOT_INTERVAL_MS = Number(process.env.SNAPSHOT_INTERVAL_MS ?? 60_000) // 1 minute
const DIFF_FLUSH_INTERVAL_MS = Number(process.env.DIFF_FLUSH_INTERVAL_MS ?? 1_000) // 1 second batching

// Pending diff buffer: docName -> array of Buffer diffs
const pendingDiffs = new Map<string, Buffer[]>()
// Periodic snapshot timers per document
const snapshotTimers = new Map<string, NodeJS.Timeout>()

// Flush pending diff buffers to Postgres every 1 second
setInterval(async () => {
  if (pendingDiffs.size === 0) return

  const entries = Array.from(pendingDiffs.entries())
  pendingDiffs.clear()

  for (const [docName, diffList] of entries) {
    if (diffList.length === 0) continue
    try {
      const rows = diffList.map((diff) => ({
        document_id: docName,
        diff: `\\x${diff.toString('hex')}`, // Postgres hex format for BYTEA
      }))
      await admin.from('document_update_log').insert(rows)
    } catch (err) {
      console.warn(`[crdt-sync] failed to append diff log for ${docName}:`, err)
    }
  }
}, DIFF_FLUSH_INTERVAL_MS).unref()

export interface YjsPersistence {
  bindState: (docName: string, ydoc: any) => Promise<void>
  writeState: (docName: string, ydoc: any) => Promise<void>
}

export function createPostgresPersistence(Y: any): YjsPersistence {
  /**
   * Write full compacted snapshot checkpoint to `document_snapshot`,
   * and clean up older log entries to prevent table bloat.
   */
  async function flushSnapshot(docName: string, ydoc: any) {
    try {
      const snapshotBytes = Buffer.from(Y.encodeStateAsUpdate(ydoc))
      const hexSnapshot = `\\x${snapshotBytes.toString('hex')}`

      // 1. Upsert snapshot checkpoint
      const { error: snapErr } = await admin.from('document_snapshot').upsert({
        document_id: docName,
        snapshot: hexSnapshot,
        updated_at: new Date().toISOString(),
      })

      if (snapErr) {
        console.warn(`[crdt-sync] snapshot save failed for ${docName}:`, snapErr.message)
        return
      }

      console.log(`[crdt-sync] checkpoint saved for ${docName} (${snapshotBytes.length} bytes)`)

      // 2. Prune flushed update logs older than 2 minutes
      const pruneCutoff = new Date(Date.now() - 120_000).toISOString()
      void admin
        .from('document_update_log')
        .delete()
        .eq('document_id', docName)
        .lt('created_at', pruneCutoff)
    } catch (err) {
      console.warn(`[crdt-sync] checkpoint error for ${docName}:`, err)
    }
  }

  return {
    /**
     * Called when a Y.Doc is loaded into memory by y-websocket.
     * Loads the latest snapshot + any subsequent diff logs from Postgres,
     * and attaches listeners for real-time diff logging and periodic checkpoints.
     */
    bindState: async (docName: string, ydoc: any) => {
      try {
        console.log(`[crdt-sync] binding state for ${docName} from Postgres...`)

        // 1. Load latest full snapshot checkpoint
        const { data: snapData } = await admin
          .from('document_snapshot')
          .select('snapshot,updated_at')
          .eq('document_id', docName)
          .maybeSingle()

        if (snapData?.snapshot) {
          try {
            // Buffer from hex string or raw byte buffer
            const raw = snapData.snapshot
            const buf = typeof raw === 'string' && raw.startsWith('\\x')
              ? Buffer.from(raw.slice(2), 'hex')
              : Buffer.from(raw)
            Y.applyUpdate(ydoc, new Uint8Array(buf))
            console.log(`[crdt-sync] loaded snapshot checkpoint for ${docName}`)
          } catch (e) {
            console.warn(`[crdt-sync] failed to apply snapshot for ${docName}:`, e)
          }
        }

        // 2. Apply any diffs recorded since that snapshot
        const diffQuery = admin
          .from('document_update_log')
          .select('diff,created_at')
          .eq('document_id', docName)
          .order('id', { ascending: true })

        if (snapData?.updated_at) {
          diffQuery.gte('created_at', snapData.updated_at)
        }

        const { data: diffs } = await diffQuery
        if (diffs && diffs.length > 0) {
          for (const d of diffs) {
            try {
              const raw = d.diff
              const buf = typeof raw === 'string' && raw.startsWith('\\x')
                ? Buffer.from(raw.slice(2), 'hex')
                : Buffer.from(raw)
              Y.applyUpdate(ydoc, new Uint8Array(buf))
            } catch (e) {
              /* ignore corrupt individual diff */
            }
          }
          console.log(`[crdt-sync] applied ${diffs.length} incremental diffs for ${docName}`)
        }
      } catch (err) {
        console.warn(`[crdt-sync] initial bind fallback for ${docName}:`, err)
      }

      // 3. Listen to real-time update events: buffer diffs for append-log
      ydoc.on('update', (update: Uint8Array) => {
        let list = pendingDiffs.get(docName)
        if (!list) {
          list = []
          pendingDiffs.set(docName, list)
        }
        list.push(Buffer.from(update))
      })

      // 4. Start periodic 1-minute snapshot timer
      if (snapshotTimers.has(docName)) {
        clearInterval(snapshotTimers.get(docName)!)
      }
      const timer = setInterval(() => {
        void flushSnapshot(docName, ydoc)
      }, SNAPSHOT_INTERVAL_MS)
      snapshotTimers.set(docName, timer)
    },

    /**
     * Called when the last user disconnects and the doc is unbinding from memory.
     * Takes one final compacted snapshot and clears the timer.
     */
    writeState: async (docName: string, ydoc: any) => {
      console.log(`[crdt-sync] unbinding doc ${docName}: saving final snapshot`)
      const timer = snapshotTimers.get(docName)
      if (timer) {
        clearInterval(timer)
        snapshotTimers.delete(docName)
      }

      // Flush any remaining buffered diffs immediately
      const diffList = pendingDiffs.get(docName)
      if (diffList && diffList.length > 0) {
        pendingDiffs.delete(docName)
        try {
          const rows = diffList.map((diff) => ({
            document_id: docName,
            diff: `\\x${diff.toString('hex')}`,
          }))
          await admin.from('document_update_log').insert(rows)
        } catch {
          // ignore
        }
      }

      // Save final compacted snapshot
      await flushSnapshot(docName, ydoc)
    },
  }
}
