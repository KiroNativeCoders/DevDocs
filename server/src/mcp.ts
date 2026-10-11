import './env.js'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { resolveToken, type TokenScope } from './tokens.js'
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
  }

  return server
}

const app = express()
app.use(express.json({ limit: '4mb' }))

app.get('/health', (_req, res) => res.json({ ok: true, service: 'devdocs-mcp' }))

// Streamable HTTP: one request-scoped transport+server per call (stateless).
app.post('/mcp', async (req, res) => {
  const auth = req.headers.authorization
  const raw = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const resolved = await resolveToken(raw)
  if (!resolved) {
    res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Invalid or missing API token' }, id: null })
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
