import './env.js'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './auth.js'
import { listTokens, mintToken, revokeToken } from './tokens.js'
import { withLiveDoc } from './docbody.js'
import { saveVersion } from './snapshots.js'

/**
 * Scope C server: thin. Supabase Postgres + RLS now own all document / comment
 * / membership data — the browser reads and writes it DIRECTLY via
 * @supabase/supabase-js, with RLS enforcing access. This Express service keeps
 * only what cannot live in the client:
 *   - /health
 *   - /api/auth/sync   provision/refresh the caller's app_user row on login
 *   - /api/auth/ws-token  hand the collab relay a verified token (the relay is
 *                         a raw WebSocket; it reads the token from the query)
 *
 * The relay (collab.ts) authorizes document access with the service-role key.
 */

const app = express()
const PORT = Number(process.env.PORT ?? 4000)
// Allow the dev client regardless of which loopback spelling the browser uses.
// Vite listens on [::1]:5173 but can be reached as localhost / 127.0.0.1 / [::1],
// and each spelling is a DISTINCT Origin for CORS. Pinning a single string meant
// a session opened on http://127.0.0.1:5173 had its credentialed fetches
// (lookup + share) blocked, surfacing as a generic "Failed to share" in the UI.
// Loopback is ALWAYS allowed (dev); a non-loopback CLIENT_ORIGIN (prod) is
// allowed in addition to it.
const EXPLICIT_ORIGIN = process.env.CLIENT_ORIGIN
const LOOPBACK_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      // Non-browser clients (curl, same-origin, server-to-server) send no Origin.
      if (!origin) return cb(null, true)
      // With credentials:true the allowed origin must be reflected back as the
      // exact string — returning boolean true makes cors emit "*", which the
      // browser rejects for credentialed requests. So echo `origin` when allowed.
      const ok = LOOPBACK_RE.test(origin) || (!!EXPLICIT_ORIGIN && origin === EXPLICIT_ORIGIN)
      return cb(null, ok ? origin : false)
    },
  }),
)
app.use(express.json({ limit: '8mb' }))

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
)

app.get('/health', (_req, res) => res.json({ ok: true }))

// Provision (or refresh) the caller's app_user row. Called by the client right
// after login so documents/memberships/comments can FK to a user row. Uses the
// service role to upsert, keyed by the verified Supabase user id.
app.post('/api/auth/sync', requireAuth, async (req, res) => {
  const { id, email } = req.user!
  const name = typeof req.body?.name === 'string' ? req.body.name : null
  const { error } = await admin
    .from('app_user')
    .upsert({ id, email, name }, { onConflict: 'id' })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ id, email, name })
})

// Resolve a user by email for sharing. Done server-side with the service role
// because app_user RLS only lets a caller see themselves + existing
// collaborators — so a client-side lookup of someone you haven't shared with
// yet returns nothing (chicken-and-egg). Only an authenticated user may call
// this, and it returns just the id/email/name needed to create a share.
app.get('/api/users/lookup', requireAuth, async (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email.trim() : ''
  if (!email) return res.status(400).json({ error: 'email required' })
  const { data, error } = await admin
    .from('app_user')
    .select('id,email,name')
    .eq('email', email)
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'No user with that email' })
  res.json(data)
})

// Create/update a share. The membership insert is done server-side with the
// service role to avoid client-token/RLS timing fragility, but we FIRST verify
// the caller is OWNER (or MANAGER) of the document, preserving the same
// authorization the RLS policy enforces.
app.post('/api/docs/:id/shares', requireAuth, async (req, res) => {
  const callerId = req.user!.id
  const docId = req.params.id
  const targetUserId = typeof req.body?.userId === 'string' ? req.body.userId : ''
  const role = typeof req.body?.role === 'string' ? req.body.role : ''
  if (!targetUserId || !['VIEWER', 'EDITOR', 'MANAGER'].includes(role)) {
    return res.status(400).json({ error: 'userId and a valid role are required' })
  }
  if (targetUserId === callerId) {
    return res.status(400).json({ error: 'You already have access to this document' })
  }

  // Authorize: caller must own the doc, or hold a MANAGER membership on it.
  const { data: doc, error: docErr } = await admin
    .from('document')
    .select('owner_id')
    .eq('id', docId)
    .maybeSingle()
  if (docErr) return res.status(500).json({ error: docErr.message })
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  let canManage = doc.owner_id === callerId
  if (!canManage) {
    const { data: mem } = await admin
      .from('membership')
      .select('role')
      .eq('document_id', docId)
      .eq('user_id', callerId)
      .maybeSingle()
    canManage = mem?.role === 'MANAGER'
  }
  if (!canManage) return res.status(403).json({ error: 'Only the owner or a manager can share' })

  const { error } = await admin
    .from('membership')
    .upsert({ document_id: docId, user_id: targetUserId, role }, { onConflict: 'document_id,user_id' })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// List a document's comments with author details resolved via the service
// role. Reading comments through supabase-js directly leaves the author join
// null for any commenter whose app_user row RLS hides from the reader (e.g. a
// collaborator added by someone else) — which both looks wrong and crashed the
// client. We verify the caller can access the doc, then return resolved rows.
app.get('/api/docs/:id/comments', requireAuth, async (req, res) => {
  const callerId = req.user!.id
  const docId = req.params.id

  // Authorize: owner or any membership on the doc.
  const { data: doc } = await admin.from('document').select('owner_id').eq('id', docId).maybeSingle()
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  let allowed = doc.owner_id === callerId
  if (!allowed) {
    const { data: mem } = await admin
      .from('membership')
      .select('user_id')
      .eq('document_id', docId)
      .eq('user_id', callerId)
      .maybeSingle()
    allowed = !!mem
  }
  if (!allowed) return res.status(403).json({ error: 'No access to this document' })

  const { data, error } = await admin
    .from('comment')
    .select('*, author:app_user(id,email,name)')
    .eq('document_id', docId)
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data ?? [])
})

// ------------------------------------------------------------- versioning
// Content lives in Yjs; a "version" is a full Y.encodeStateAsUpdate(ydoc)
// captured by the (already-synced) browser client and stored as base64 here.
// Restore is done client-side by applying the stored update onto the live doc.

/** Resolve the caller's capability on a doc: 'owner' | 'editor' | 'viewer' | null. */
async function docCapability(callerId: string, docId: string) {
  const { data: doc } = await admin.from('document').select('owner_id').eq('id', docId).maybeSingle()
  if (!doc) return { exists: false as const }
  if (doc.owner_id === callerId) return { exists: true as const, cap: 'owner' as const }
  const { data: mem } = await admin
    .from('membership')
    .select('role')
    .eq('document_id', docId)
    .eq('user_id', callerId)
    .maybeSingle()
  if (!mem) return { exists: true as const, cap: null }
  const cap = mem.role === 'VIEWER' ? ('viewer' as const) : ('editor' as const)
  return { exists: true as const, cap }
}

// List versions (metadata only — no blobs).
app.get('/api/docs/:id/versions', requireAuth, async (req, res) => {
  const r = await docCapability(req.user!.id, String(req.params.id))
  if (!r.exists) return res.status(404).json({ error: 'Document not found' })
  if (!r.cap) return res.status(403).json({ error: 'No access to this document' })
  const { data, error } = await admin
    .from('document_version')
    .select('id,seq,label,source,is_keyframe,created_at,author:app_user(id,email,name)')
    .eq('document_id', req.params.id)
    .order('seq', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data ?? [])
})

// Create a version. Reads the live relay doc server-side and routes through the
// shared saveVersion (same delta/keyframe + seq logic as the timer), so a
// manual save and a timer save are produced identically. `force` is set so a
// manual save always records a version even if the state vector is unchanged.
app.post('/api/docs/:id/versions', requireAuth, async (req, res) => {
  const docId = String(req.params.id)
  const r = await docCapability(req.user!.id, docId)
  if (!r.exists) return res.status(404).json({ error: 'Document not found' })
  if (r.cap !== 'owner' && r.cap !== 'editor') {
    return res.status(403).json({ error: 'Only editors can save a version' })
  }
  const label = typeof req.body?.label === 'string' && req.body.label.trim() ? req.body.label.trim() : null
  try {
    const result = await withLiveDoc(docId, req.user!.id, (doc) =>
      saveVersion(docId, doc, { source: 'manual', createdBy: req.user!.id, label, force: true }),
    )
    if (!result) return res.status(500).json({ error: 'Could not capture document state' })
    res.json({ seq: result.seq, is_keyframe: result.isKeyframe, label })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to save version' })
  }
})

// Fetch the restore chain for a target version: the nearest keyframe at or
// before `seq`, then every delta from there up to `seq`, in ascending order.
// The client replays these onto a fresh Y.Doc to reconstruct that version.
app.get('/api/docs/:id/versions/:seq/chain', requireAuth, async (req, res) => {
  const docId = String(req.params.id)
  const targetSeq = Number(req.params.seq)
  const r = await docCapability(req.user!.id, docId)
  if (!r.exists) return res.status(404).json({ error: 'Document not found' })
  if (!r.cap) return res.status(403).json({ error: 'No access to this document' })
  if (!Number.isFinite(targetSeq)) return res.status(400).json({ error: 'Bad seq' })

  // Nearest keyframe at or before the target.
  const { data: kf, error: kfErr } = await admin
    .from('document_version')
    .select('seq')
    .eq('document_id', docId)
    .eq('is_keyframe', true)
    .lte('seq', targetSeq)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (kfErr) return res.status(500).json({ error: kfErr.message })
  if (!kf) return res.status(404).json({ error: 'No keyframe to root this version' })

  // Keyframe + all deltas up to the target, in order.
  const { data: rows, error } = await admin
    .from('document_version')
    .select('seq,delta_blob,is_keyframe')
    .eq('document_id', docId)
    .gte('seq', kf.seq as number)
    .lte('seq', targetSeq)
    .order('seq', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })

  const chain = (rows ?? []).map((row) => {
    const hex = String(row.delta_blob).replace(/^\\x/, '')
    return Buffer.from(hex, 'hex').toString('base64')
  })
  res.json({ target: targetSeq, from_keyframe: kf.seq, chain })
})

// Delete a version (editors only). A delta can't be deleted if a LATER delta
// depends on it (would break the chain); only a version with no dependent delta
// after it, or a keyframe superseded by a later keyframe, is safe to drop here.
app.delete('/api/docs/:id/versions/:seq', requireAuth, async (req, res) => {
  const docId = String(req.params.id)
  const seq = Number(req.params.seq)
  const r = await docCapability(req.user!.id, docId)
  if (!r.exists) return res.status(404).json({ error: 'Document not found' })
  if (r.cap !== 'owner' && r.cap !== 'editor') {
    return res.status(403).json({ error: 'Only editors can delete a version' })
  }
  // Safe to delete only if it is the latest version OR the next version is a
  // keyframe (which doesn't depend on this row). Otherwise deleting would
  // orphan the delta chain — refuse rather than corrupt history.
  const { data: next } = await admin
    .from('document_version')
    .select('seq,is_keyframe')
    .eq('document_id', docId)
    .gt('seq', seq)
    .order('seq', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (next && !next.is_keyframe) {
    return res.status(409).json({ error: 'Cannot delete: a later version depends on this one' })
  }
  const { error } = await admin
    .from('document_version')
    .delete()
    .eq('document_id', docId)
    .eq('seq', seq)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ------------------------------------------------------------- reviews
// List a document's reviews (PR-style approvals) with reviewer details resolved
// via the service role — same rationale as /comments: a reviewer's app_user row
// may be RLS-hidden from the current reader, which would null the join. Verify
// the caller can access the doc, then return resolved rows.
app.get('/api/docs/:id/reviews', requireAuth, async (req, res) => {
  const callerId = req.user!.id
  const docId = req.params.id

  const { data: doc } = await admin.from('document').select('owner_id').eq('id', docId).maybeSingle()
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  let allowed = doc.owner_id === callerId
  if (!allowed) {
    const { data: mem } = await admin
      .from('membership')
      .select('user_id')
      .eq('document_id', docId)
      .eq('user_id', callerId)
      .maybeSingle()
    allowed = !!mem
  }
  if (!allowed) return res.status(403).json({ error: 'No access to this document' })

  const { data, error } = await admin
    .from('review')
    .select('id,document_id,state,note,created_at,reviewer:app_user(id,email,name)')
    .eq('document_id', docId)
    .order('created_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data ?? [])
})

// ------------------------------------------------------------- folders
// Folder metadata and doc-to-folder mapping persisted in Postgres/Supabase.
// Using app_folder and app_doc_folder tables (with graceful fallback if table not yet migrated).
app.get('/api/folders', requireAuth, async (req, res) => {
  const userId = req.user!.id
  const { data, error } = await admin
    .from('app_folder')
    .select('id,name,parent_id,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    // If table doesn't exist yet, return empty list gracefully
    return res.json([])
  }
  const formatted = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    createdAt: row.created_at,
  }))
  res.json(formatted)
})

app.post('/api/folders', requireAuth, async (req, res) => {
  const userId = req.user!.id
  const { id, name, parentId } = req.body ?? {}
  if (!id || !name) return res.status(400).json({ error: 'id and name required' })

  const { error } = await admin.from('app_folder').upsert({
    id,
    user_id: userId,
    name: String(name).trim(),
    parent_id: parentId || null,
  })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

app.delete('/api/folders/:id', requireAuth, async (req, res) => {
  const userId = req.user!.id
  const folderId = req.params.id

  const { error } = await admin
    .from('app_folder')
    .delete()
    .eq('id', folderId)
    .eq('user_id', userId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

app.get('/api/folders/mapping', requireAuth, async (req, res) => {
  const userId = req.user!.id
  const { data, error } = await admin
    .from('app_doc_folder')
    .select('document_id,folder_id')
    .eq('user_id', userId)

  if (error) return res.json({})
  const mapping: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.document_id && row.folder_id) {
      mapping[row.document_id] = row.folder_id
    }
  }
  res.json(mapping)
})

app.post('/api/folders/mapping', requireAuth, async (req, res) => {
  const userId = req.user!.id
  const { docId, folderId } = req.body ?? {}
  if (!docId) return res.status(400).json({ error: 'docId required' })

  if (!folderId) {
    await admin
      .from('app_doc_folder')
      .delete()
      .eq('user_id', userId)
      .eq('document_id', docId)
    return res.json({ ok: true })
  }

  const { error } = await admin.from('app_doc_folder').upsert({
    user_id: userId,
    document_id: docId,
    folder_id: folderId,
  }, { onConflict: 'user_id,document_id' })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ------------------------------------------------------------- API tokens
// Personal tokens for the remote MCP server. The raw token is returned ONCE on
// creation and never stored (only its hash). All run as the authenticated user.
app.get('/api/tokens', requireAuth, async (req, res) => {
  try {
    res.json(await listTokens(req.user!.id))
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to list tokens' })
  }
})

app.post('/api/tokens', requireAuth, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : ''
  const scope = req.body?.scope === 'read_only' ? 'read_only' : 'read_write'
  try {
    const { raw, token } = await mintToken(req.user!.id, name, scope)
    res.json({ raw, token }) // raw shown ONCE
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to create token' })
  }
})

app.delete('/api/tokens/:id', requireAuth, async (req, res) => {
  try {
    await revokeToken(req.user!.id, String(req.params.id))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to revoke token' })
  }
})

// The collab relay is a raw WebSocket and reads its token from the query
// string. The browser already holds a Supabase access token; this endpoint
// simply echoes the verified identity so the client knows the token is good
// (and provides a single place to later swap in a scoped, short-lived token).
app.get('/api/auth/ws-token', requireAuth, (req, res) => {
  // The client passes its Supabase access token to the relay directly; we
  // return the verified identity as a confirmation. (The relay verifies the
  // same token itself on connect.)
  res.json({ user: req.user })
})

// ----------------------------------------------------------- Site Analytics
// Track page visits and calculate daily active visitors (DAU) using Supabase Postgres.
app.post('/api/analytics/visit', async (req, res) => {
  const visitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.slice(0, 128) : null
  if (!visitorId) return res.status(400).json({ error: 'visitorId required' })

  const path = typeof req.body?.path === 'string' ? req.body.path.slice(0, 256) : '/'
  const referrer = typeof req.body?.referrer === 'string' ? req.body.referrer.slice(0, 512) : null
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : null
  const userAgent = (req.headers['user-agent'] ?? '').slice(0, 512)

  try {
    const { error } = await admin.from('site_visit').insert({
      visitor_id: visitorId,
      path,
      referrer,
      user_id: userId,
      user_agent: userAgent,
    })
    if (error) {
      console.warn('[analytics] note on visit insert:', error.message)
      return res.status(200).json({ ok: false, warning: error.message })
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(200).json({ ok: false, warning: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.get('/api/analytics/stats', async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data, error } = await admin
      .from('site_visit')
      .select('visitor_id, path, visited_date, created_at')
      .gte('visited_date', thirtyDaysAgo)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(200).json({
        ok: false,
        warning: error.message,
        today: { uniqueVisitors: 0, totalViews: 0 },
        history: [],
        topPages: [],
      })
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const visits = data ?? []

    const dailyMap = new Map<string, { uniqueVisitors: Set<string>; totalViews: number }>()
    const pagesMap = new Map<string, number>()

    for (const v of visits) {
      const d = v.visited_date
      if (!dailyMap.has(d)) {
        dailyMap.set(d, { uniqueVisitors: new Set(), totalViews: 0 })
      }
      const entry = dailyMap.get(d)!
      entry.uniqueVisitors.add(v.visitor_id)
      entry.totalViews += 1

      pagesMap.set(v.path, (pagesMap.get(v.path) ?? 0) + 1)
    }

    const todayEntry = dailyMap.get(todayStr)
    const today = {
      uniqueVisitors: todayEntry ? todayEntry.uniqueVisitors.size : 0,
      totalViews: todayEntry ? todayEntry.totalViews : 0,
    }

    const history = Array.from(dailyMap.entries())
      .map(([date, val]) => ({
        date,
        uniqueVisitors: val.uniqueVisitors.size,
        totalViews: val.totalViews,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const topPages = Array.from(pagesMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    res.json({
      ok: true,
      today,
      totalRecordedVisits: visits.length,
      history,
      topPages,
    })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to fetch analytics' })
  }
})

app.listen(PORT, () => {
  console.log(`DXEditor API (scope C) listening on http://localhost:${PORT}`)
})
