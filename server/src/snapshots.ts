import type * as Y from 'yjs'
import { supa } from './access.js'
import {
  liveDocs,
  encodeFull,
  encodeDelta,
  encodeVector,
  vectorsEqual,
  assertYjsWiring,
} from './ysnap.js'

/**
 * Server-side delta snapshot engine.
 *
 * A single timer (one interval for the whole process, NOT one per doc) wakes
 * every SNAPSHOT_INTERVAL_MS and, for each document currently open in the
 * relay, saves a version IF it changed since the last saved version. Every
 * KEYFRAME_EVERY-th version is a full keyframe; the rest are deltas from the
 * previous version's state vector. All history state lives in Postgres, so the
 * timer is stateless and restart-safe.
 */

const KEYFRAME_EVERY = Number(process.env.KEYFRAME_EVERY ?? 25)
const INTERVAL_MS = Number(process.env.SNAPSHOT_INTERVAL_MS ?? 300_000) // 5 min

type LastVersion = { seq: number; state_vector: Uint8Array | null } | null

// Postgres bytea comes back from supabase-js as a hex string ("\\x...") or a
// Encode bytes as the \x-prefixed hex string PostgREST accepts for a bytea
// column. (Passing a raw Buffer through supabase-js JSON-serializes it into
// garbage — this is the correct wire form, matching the server's other bytea
// writes.)
function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return '\\x' + hex
}

// Decode a bytea value coming back from supabase-js. It is a \x-prefixed hex
// string over PostgREST; be defensive about an unexpected shape.
function toBytes(v: unknown): Uint8Array | null {
  if (v == null) return null
  if (v instanceof Uint8Array) return v
  if (typeof v === 'string') {
    if (!v.startsWith('\\x')) return null // unknown form — don't fabricate bytes
    const hex = v.slice(2)
    if (hex.length % 2 !== 0) return null
    const out = new Uint8Array(hex.length / 2)
    for (let i = 0; i < out.length; i++) {
      const byte = parseInt(hex.substr(i * 2, 2), 16)
      if (Number.isNaN(byte)) return null
      out[i] = byte
    }
    return out
  }
  try {
    return Uint8Array.from(v as ArrayLike<number>)
  } catch {
    return null
  }
}

async function lastVersion(documentId: string): Promise<LastVersion> {
  const { data, error } = await supa()
    .from('document_version')
    .select('seq,state_vector')
    .eq('document_id', documentId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return { seq: data.seq as number, state_vector: toBytes(data.state_vector) }
}

/**
 * Save one version of `doc` for `documentId` if it changed. Shared by the timer
 * (source 'timer', createdBy null) and the manual endpoint (source 'manual',
 * createdBy the user). Returns the new seq, or null if skipped (unchanged).
 */
export async function saveVersion(
  documentId: string,
  doc: Y.Doc,
  opts: { source: 'manual' | 'timer'; createdBy?: string | null; label?: string | null; force?: boolean },
): Promise<{ seq: number; isKeyframe: boolean } | null> {
  const nowVec = encodeVector(doc)
  const last = await lastVersion(documentId)

  // Change detection: skip an unchanged doc (unless a manual save forces it).
  if (!opts.force && last && vectorsEqual(nowVec, last.state_vector)) return null

  const nextSeq = (last?.seq ?? 0) + 1
  // Keyframe when: first version, every KEYFRAME_EVERY-th, or we have no usable
  // previous state vector to root a delta against (safe fallback).
  const isKeyframe = !last || !last.state_vector || nextSeq % KEYFRAME_EVERY === 0
  const blob = isKeyframe ? encodeFull(doc) : encodeDelta(doc, last!.state_vector!)

  const { error } = await supa().from('document_version').insert({
    document_id: documentId,
    seq: nextSeq,
    delta_blob: toHex(blob),
    state_vector: toHex(nowVec),
    is_keyframe: isKeyframe,
    source: opts.source,
    created_by: opts.createdBy ?? null,
    label: opts.label ?? null,
  })
  if (error) {
    // A unique (document_id, seq) violation means another writer raced us;
    // that's fine — their version covers this moment. Swallow it.
    if (/duplicate key|unique/i.test(error.message)) return null
    throw new Error(error.message)
  }
  return { seq: nextSeq, isKeyframe }
}

async function tick(): Promise<void> {
  // Snapshot only docs the relay currently holds in memory — a doc nobody has
  // open is not changing, so there is nothing to capture.
  const docs = await liveDocs()
  for (const [docName, doc] of docs.entries()) {
    try {
      const saved = await saveVersion(docName, doc, { source: 'timer', createdBy: null })
      if (saved) {
        console.log(`[snapshots] ${docName}: saved v${saved.seq}${saved.isKeyframe ? ' (keyframe)' : ''}`)
      }
    } catch (err) {
      console.error(`[snapshots] ${docName}: snapshot failed:`, err)
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null

/** Start the one process-wide snapshot timer. Idempotent. */
export function startSnapshotTimer(): void {
  if (timer) return
  assertYjsWiring()
  console.log(`[snapshots] timer every ${INTERVAL_MS}ms, keyframe every ${KEYFRAME_EVERY} versions`)
  timer = setInterval(() => {
    void tick()
  }, INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
}

export function stopSnapshotTimer(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
