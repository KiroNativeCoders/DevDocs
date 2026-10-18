import './env.js'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { resolveToken, type TokenScope } from './tokens.js'
import { verifyOAuthToken, supabaseOAuthMetadataUrl } from './oauth.js'
import { readBodyJSON, replaceBody } from './docbody.js'
import { docToMarkdown, markdownToDoc } from './markdown.js'

/**
 * DevDocs remote MCP server (Streamable HTTP).
 *
 * Auth: a per-user `ddx_` bearer token (see tokens.ts). Every tool runs AS that
 * user — document metadata through the service role but authorized to the
 * caller's own rows, and the body through the collab relay (internal secret).
 * read_only tokens may not call create/update/delete.
 */

const PORT = Number(process.env.MCP_PORT ?? 4002)

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// Authorize the caller against a doc (owner or membership).
async function assertAccess(userId: string, docId: string, needEdit: boolean) {
  const { data: doc } = await admin.from('document').select('owner_id').eq('id', docId).maybeSingle()
  if (!doc) throw new Error('Document not found')
  if (doc.owner_id === userId) return
  const { data: mem } = await admin
    .from('membership').select('role').eq('document_id', docId).eq('user_id', userId).maybeSingle()
  if (!mem) throw new Error('No access to this document')
  if (needEdit && mem.role === 'VIEWER') throw new Error('You only have view access to this document')
}

// Build an MCP server bound to one authenticated user + scope.
function buildServer(userId: string, scope: TokenScope) {
  const server = new McpServer({ name: 'devdocs', version: '1.0.0' })
  const canWrite = scope === 'read_write'

  server.tool('list_documents', 'List documents you own or that are shared with you.', {}, async () => {
    const { data, error } = await admin
      .from('document')
      .select('id,title,status,owner_id,updated_at')
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    // RLS is bypassed by service role, so filter to this user's reachable docs.
    const { data: mems } = await admin.from('membership').select('document_id').eq('user_id', userId)
    const shared = new Set((mems ?? []).map((m) => m.document_id))
    const mine = (data ?? []).filter((d) => d.owner_id === userId || shared.has(d.id))
    return { content: [{ type: 'text', text: JSON.stringify(mine, null, 2) }] }
  })

  server.tool('get_document', 'Get a document\'s title and body (as Markdown).',
    { id: z.string().describe('Document id') },
    async ({ id }) => {
      await assertAccess(userId, id, false)
      const { data: doc } = await admin.from('document').select('id,title,status').eq('id', id).maybeSingle()
      if (!doc) throw new Error('Document not found')
      const pm = await readBodyJSON(id, userId)
      const md = docToMarkdown(pm as Parameters<typeof docToMarkdown>[0])
      return { content: [{ type: 'text', text: `# ${doc.title}\n\n${md}` }] }
    })

  server.tool('search_documents', 'Search your documents by title. Returns matching docs (id, title, status).',
    { query: z.string().describe('Case-insensitive text to match in the title') },
    async ({ query }) => {
      const { data, error } = await admin
        .from('document')
        .select('id,title,status,owner_id')
        .ilike('title', `%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(50)
      if (error) throw new Error(error.message)
      const { data: mems } = await admin.from('membership').select('document_id').eq('user_id', userId)
      const shared = new Set((mems ?? []).map((m) => m.document_id))
      const hits = (data ?? []).filter((d) => d.owner_id === userId || shared.has(d.id)).map(({ owner_id: _o, ...r }) => r)
      return { content: [{ type: 'text', text: JSON.stringify(hits, null, 2) }] }
    })

  server.tool('list_comments', 'List the comment threads on a document.',
    { id: z.string().describe('Document id') },
    async ({ id }) => {
      await assertAccess(userId, id, false)
      const { data, error } = await admin
        .from('comment')
        .select('id,body,quote,parent_id,resolved,created_at,author:app_user(name,email)')
        .eq('document_id', id)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return { content: [{ type: 'text', text: JSON.stringify(data ?? [], null, 2) }] }
    })

  server.tool('list_versions', 'List a document\'s saved versions (metadata only).',
    { id: z.string().describe('Document id') },
    async ({ id }) => {
      await assertAccess(userId, id, false)
      const { data, error } = await admin
        .from('document_version')
        .select('id,label,created_at')
        .eq('document_id', id)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return { content: [{ type: 'text', text: JSON.stringify(data ?? [], null, 2) }] }
    })

  if (canWrite) {
    server.tool('create_document', 'Create a new document from Markdown. Returns its id.',
      { title: z.string().describe('Document title'), markdown: z.string().optional().describe('Body as Markdown') },
      async ({ title, markdown }) => {
        const id = randomUUID()
        const { error } = await admin.from('document').insert({ id, title: title.trim() || 'Untitled document', owner_id: userId })
        if (error) throw new Error(error.message)
        if (markdown && markdown.trim()) {
          await replaceBody(id, userId, markdownToDoc(markdown) as Parameters<typeof replaceBody>[2])
        }
        return { content: [{ type: 'text', text: `Created document ${id}` }] }
      })

    server.tool('update_document', 'Update a document\'s title and/or replace its body with Markdown.',
      { id: z.string(), title: z.string().optional(), markdown: z.string().optional().describe('Replaces the entire body') },
      async ({ id, title, markdown }) => {
        await assertAccess(userId, id, true)
        if (title != null) {
          const { error } = await admin.from('document').update({ title: title.trim() || 'Untitled document' }).eq('id', id)
          if (error) throw new Error(error.message)
        }
        if (markdown != null) {
          await replaceBody(id, userId, markdownToDoc(markdown) as Parameters<typeof replaceBody>[2])
        }
        return { content: [{ type: 'text', text: `Updated document ${id}` }] }
      })

    server.tool('delete_document', 'Permanently delete a document (owner only).',
      { id: z.string() },
      async ({ id }) => {
        const { data: doc } = await admin.from('document').select('owner_id').eq('id', id).maybeSingle()
        if (!doc) throw new Error('Document not found')
        if (doc.owner_id !== userId) throw new Error('Only the owner can delete this document')
        const { error } = await admin.from('document').delete().eq('id', id)
        if (error) throw new Error(error.message)
        return { content: [{ type: 'text', text: `Deleted document ${id}` }] }
      })

    server.tool('add_comment', 'Add a comment (or a reply) to a document.',
      { id: z.string().describe('Document id'), body: z.string().describe('Comment text'), parent_id: z.string().optional().describe('Reply to this comment id') },
      async ({ id, body, parent_id }) => {
        await assertAccess(userId, id, true)
        const { error } = await admin.from('comment').insert({
          document_id: id, author_id: userId, body, parent_id: parent_id ?? null,
        })
        if (error) throw new Error(error.message)
        return { content: [{ type: 'text', text: `Comment added to ${id}` }] }
      })

    server.tool('set_status', 'Set a document\'s review status.',
      { id: z.string(), status: z.enum(['DRAFT', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'SUPERSEDED']) },
      async ({ id, status }) => {
        await assertAccess(userId, id, true)
        const { error } = await admin.from('document').update({ status }).eq('id', id)
        if (error) throw new Error(error.message)
        return { content: [{ type: 'text', text: `Status of ${id} set to ${status}` }] }
      })
  }

  return server
}

const app = express()
// Browser-based MCP clients (Inspector, ChatGPT/Claude web connectors) call
// /mcp cross-origin, so CORS is required or the browser blocks with "Failed to
// fetch". This is a public API keyed by bearer token, so any origin is allowed;
// expose the MCP session header and allow the headers clients send.
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'mcp-session-id', 'mcp-protocol-version'],
    exposedHeaders: ['mcp-session-id', 'WWW-Authenticate'],
    maxAge: 86400,
  }),
)
app.use(express.json({ limit: '4mb' }))

app.get('/health', (_req, res) => res.json({ ok: true, service: 'devdocs-mcp' }))

// --- OAuth: Supabase Auth is the authorization server. We are only a resource
// server. Advertise where clients should authenticate (RFC 9728 protected-
// resource metadata) by pointing at Supabase's OAuth discovery document. ---
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  // Behind nginx the internal hop is http; trust X-Forwarded-Proto so the
  // advertised resource identifier is the public https URL (clients require it).
  const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim()
  const self = `${proto}://${req.get('host')}`
  res.json({
    resource: `${self}/mcp`,
    authorization_servers: [supabaseOAuthMetadataUrl()],
    // Supabase OAuth accepts OIDC scopes, NOT custom read/write (requesting
    // read/write fails with "unsupported scope"). Authorization is enforced
    // server-side per user regardless of scope.
    scopes_supported: ['openid', 'email', 'profile'],
    resource_name: 'DevDocs',
  })
})

// Resolve a bearer token to { userId, scope }, accepting EITHER a personal
// ddx_ API token OR a Supabase-issued OAuth access token (a JWT).
async function resolveBearer(raw: string): Promise<{ userId: string; scope: TokenScope } | null> {
  if (!raw) return null
  if (raw.startsWith('ddx_')) return resolveToken(raw)
  return verifyOAuthToken(raw) // Supabase OAuth JWT
}

// Streamable HTTP: one request-scoped transport+server per call (stateless).
app.post('/mcp', async (req, res) => {
  const auth = req.headers.authorization
  const raw = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const resolved = await resolveBearer(raw)
  if (!resolved) {
    res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Invalid or missing token' }, id: null })
    return
  }
  try {
    const server = buildServer(resolved.userId, resolved.scope)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => { void transport.close(); void server.close() })
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: e instanceof Error ? e.message : 'Internal error' }, id: null })
    }
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`DevDocs MCP server listening on http://127.0.0.1:${PORT}/mcp`)
})
