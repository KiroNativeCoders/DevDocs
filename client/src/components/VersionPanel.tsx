import { useEffect, useState } from 'react'
import { versions as versionsApi, ApiError, type DocVersion } from '../lib/api'
import './VersionPanel.css'

type Props = {
  docId: string
  canEdit: boolean
  /** Replay a restore chain (keyframe + deltas, base64) onto the live doc. */
  applyChain: (chain: string[]) => void
  onClose: () => void
}

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function VersionPanel({ docId, canEdit, applyChain, onClose }: Props) {
  const [list, setList] = useState<DocVersion[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(silent = false) {
    try {
      setList(await versionsApi.list(docId))
      if (silent) setError(null)
    } catch (e) {
      // Polling loads stay quiet on transient errors; only an explicit load
      // surfaces them, so the list doesn't flash an error between ticks.
      if (!silent) setError(e instanceof ApiError ? e.message : 'Failed to load versions')
    }
  }
  useEffect(() => {
    load()
    // Timer snapshots land server-side, so poll while the panel is open to keep
    // the list fresh without needing to reopen it.
    const id = setInterval(() => load(true), 15_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  async function save() {
    setError(null)
    setBusy(true)
    try {
      // The server reads the live relay doc and records the version.
      await versionsApi.create(docId)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save version')
    } finally {
      setBusy(false)
    }
  }

  async function restore(v: DocVersion) {
    if (!window.confirm('Restore this version? Current content will be replaced by it.')) return
    setBusy(true)
    try {
      const { chain } = await versionsApi.chain(docId, v.seq)
      applyChain(chain)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to restore')
    } finally {
      setBusy(false)
    }
  }

  async function remove(v: DocVersion) {
    if (!window.confirm('Delete this version?')) return
    try {
      await versionsApi.remove(docId, v.seq)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete')
    }
  }

  return (
    <aside className="version-panel">
      <div className="version-head">
        <span className="version-title">Version history</span>
        <button className="version-close" onClick={onClose} aria-label="Close">Close</button>
      </div>

      {canEdit && (
        <button className="version-save" disabled={busy} onClick={save}>
          Save current version
        </button>
      )}

      {error && <div className="version-error">{error}</div>}

      {list.length === 0 ? (
        <div className="version-empty">No saved versions yet.</div>
      ) : (
        <ul className="version-list">
          {list.map((v) => (
            <li key={v.seq} className="version-row">
              <div className="version-info">
                <span className="version-label">
                  {v.label || `Version ${v.seq}`}
                  {v.source === 'timer' && <span className="version-tag">Auto</span>}
                </span>
                <span className="version-meta">
                  {when(v.created_at)}
                  {v.author?.email ? ` · ${v.author.name || v.author.email}` : v.source === 'timer' ? ' · automatic' : ''}
                </span>
              </div>
              {canEdit && (
                <div className="version-actions">
                  <button className="vbtn" disabled={busy} onClick={() => restore(v)}>Restore</button>
                  <button className="vbtn vbtn-del" onClick={() => remove(v)}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
