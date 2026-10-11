import { useCallback, useEffect, useState } from 'react'
import { tokens as tokensApi, type ApiToken } from '../lib/api'
import './ConnectAiModal.css'

type Props = { isOpen: boolean; onClose: () => void }

const MCP_URL = import.meta.env.VITE_MCP_URL ?? 'https://mcp.devdocs.trailmark.online/mcp'

export default function ConnectAiModal({ isOpen, onClose }: Props) {
  const [items, setItems] = useState<ApiToken[]>([])
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'read_only' | 'read_write'>('read_write')
  const [fresh, setFresh] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setItems(await tokensApi.list()) } catch (e) { setErr(e instanceof Error ? e.message : 'Load failed') }
  }, [])

  useEffect(() => { if (isOpen) void load() }, [isOpen, load])

  if (!isOpen) return null

  const create = async () => {
    setBusy(true); setErr(null)
    try {
      const { raw } = await tokensApi.create(name.trim() || 'MCP token', scope)
      setFresh(raw)
      setName('')
      await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Create failed') }
    finally { setBusy(false) }
  }

  const revoke = async (id: string) => {
    if (!confirm('Revoke this token? Any client using it will stop working.')) return
    await tokensApi.revoke(id)
    await load()
  }

  const configSnippet = (token: string) =>
    JSON.stringify({ mcpServers: { devdocs: { url: MCP_URL, headers: { Authorization: `Bearer ${token}` } } } }, null, 2)

  return (
    <div className="connect-overlay" onClick={onClose}>
      <div className="connect-window" onClick={(e) => e.stopPropagation()}>
        <div className="connect-header">
          <div className="connect-title">Connect an AI agent (MCP)</div>
          <button className="connect-close" onClick={onClose} aria-label="Close">x</button>
        </div>

        <div className="connect-body">
          <p className="connect-intro">
            Generate a personal token to let an MCP client (Claude Desktop, Cursor, etc.)
            read and write your documents. The token is shown once — copy it now.
          </p>

          {fresh && (
            <div className="connect-fresh">
              <div className="connect-fresh-label">New token (copy now — it won't be shown again):</div>
              <code className="connect-fresh-token">{fresh}</code>
              <button className="connect-btn" onClick={() => navigator.clipboard.writeText(fresh)}>Copy token</button>
              <div className="connect-fresh-label" style={{ marginTop: 10 }}>MCP client config:</div>
              <pre className="connect-config">{configSnippet(fresh)}</pre>
              <button className="connect-btn" onClick={() => navigator.clipboard.writeText(configSnippet(fresh))}>Copy config</button>
            </div>
          )}

          <div className="connect-create">
            <input className="connect-input" placeholder="Token name (e.g. My laptop)" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="connect-select" value={scope} onChange={(e) => setScope(e.target.value as 'read_only' | 'read_write')}>
              <option value="read_write">Read &amp; write</option>
              <option value="read_only">Read only</option>
            </select>
            <button className="connect-btn primary" disabled={busy} onClick={create}>Generate token</button>
          </div>
          {err && <div className="connect-err">{err}</div>}

          <div className="connect-list-label">Your tokens</div>
          <ul className="connect-list">
            {items.length === 0 && <li className="connect-empty">No tokens yet.</li>}
            {items.map((t) => (
              <li key={t.id} className={`connect-row${t.revoked_at ? ' is-revoked' : ''}`}>
                <span className="connect-row-name">{t.name || 'Untitled'}</span>
                <span className="connect-row-scope">{t.scope === 'read_only' ? 'read' : 'read/write'}</span>
                <span className="connect-row-meta">
                  {t.revoked_at ? 'revoked' : t.last_used_at ? `used ${new Date(t.last_used_at).toLocaleDateString()}` : 'never used'}
                </span>
                {!t.revoked_at && <button className="connect-revoke" onClick={() => revoke(t.id)}>Revoke</button>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
