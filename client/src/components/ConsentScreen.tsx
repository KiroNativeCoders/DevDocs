import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { auth, type User } from '../lib/api'
import Auth from './Auth'
import './ConsentScreen.css'

/**
 * OAuth 2.1 consent screen. Supabase Auth (the authorization server) redirects
 * here with ?authorization_id=… when an MCP client starts the flow. We confirm
 * the user is signed in, show what the client is requesting, and approve/deny
 * via the supabase-js oauth.* methods — Supabase mints the code and gives us a
 * redirect_url back to the client.
 */
type Details = {
  client: { name?: string | null }
  redirect_uri?: string
  scope?: string
  redirect_url?: string
  authorization_id?: string
}

export default function ConsentScreen() {
  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id')
  const [user, setUser] = useState<User | null>(null)
  const [checked, setChecked] = useState(false)
  const [details, setDetails] = useState<Details | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    auth.current().then(setUser).catch(() => setUser(null)).finally(() => setChecked(true))
  }, [])

  useEffect(() => {
    if (!user || !authorizationId) return
    supabase.auth.oauth
      .getAuthorizationDetails(authorizationId)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); return }
        // Already consented previously → Supabase returns a redirect_url to follow.
        if (data && !('authorization_id' in data) && data.redirect_url) {
          window.location.href = data.redirect_url
          return
        }
        setDetails(data as Details)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Could not load request'))
  }, [user, authorizationId])

  if (!authorizationId) return <div className="consent-wrap"><p className="consent-err">Missing authorization_id.</p></div>
  if (!checked) return <div className="consent-wrap"><p>Loading…</p></div>
  if (!user) {
    // Sign in first; Auth sets the session, then this component re-renders.
    return <Auth onAuthed={setUser} />
  }

  const decide = async (approve: boolean) => {
    setBusy(true); setErr(null)
    try {
      const fn = approve ? supabase.auth.oauth.approveAuthorization : supabase.auth.oauth.denyAuthorization
      const { data, error } = await fn(authorizationId)
      if (error) { setErr(error.message); return }
      if (data?.redirect_url) window.location.href = data.redirect_url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Authorization failed')
    } finally {
      setBusy(false)
    }
  }

  const scopes = (details?.scope ?? '').split(/\s+/).filter(Boolean)

  return (
    <div className="consent-wrap">
      <div className="consent-card">
        <h1 className="consent-title">Authorize access</h1>
        <p className="consent-sub">
          <strong>{details?.client?.name || 'An application'}</strong> wants to access your DevDocs documents.
        </p>
        {scopes.length > 0 && (
          <div className="consent-scopes">
            <div className="consent-scopes-label">Requested permissions</div>
            <ul>{scopes.map((s) => <li key={s}>{s === 'write' ? 'Read & write your documents' : s === 'read' ? 'Read your documents' : s}</li>)}</ul>
          </div>
        )}
        <p className="consent-user">Signed in as {user.email}</p>
        {err && <p className="consent-err">{err}</p>}
        <div className="consent-actions">
          <button className="consent-deny" disabled={busy} onClick={() => decide(false)}>Deny</button>
          <button className="consent-approve" disabled={busy || !details} onClick={() => decide(true)}>Approve</button>
        </div>
      </div>
    </div>
  )
}
