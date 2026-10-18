// MCP server end-to-end validation.
//
// Starts nothing itself — assumes collab (:4001) and mcp (:4002) are running
// with a shared MCP_INTERNAL_SECRET. Mints real tokens via the service role,
// drives the MCP HTTP endpoint, asserts the full CRUD flow + security cases,
// then cleans up every row it created.
//
// Run (from server/): node scripts/mcp-test.mjs
import { createHash, randomBytes } from 'crypto'
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY
const MCP = process.env.MCP_URL || 'http://127.0.0.1:4002/mcp'
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' }

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`) } else { fail++; console.log(`  ✗ ${m}`) } }

const rest = (path, init = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } })

async function mintToken(userId, scope) {
  const raw = `ddx_${randomBytes(24).toString('hex')}`
  const token_hash = createHash('sha256').update(raw).digest('hex')
  const r = await rest('api_token', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: userId, token_hash, name: 'mcp-test', scope }) })
  const [row] = await r.json()
  return { raw, id: row.id }
}

// One MCP JSON-RPC call.
let rpcId = 1
async function mcp(token, method, params) {
  const res = await fetch(MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }),
  })
  const text = await res.text()
  // Streamable HTTP may answer as SSE: pull the JSON out of the last data: line.
  let json
  try { json = JSON.parse(text) } catch {
    const line = text.split('\n').reverse().find((l) => l.startsWith('data:'))
    json = line ? JSON.parse(line.slice(5).trim()) : { _raw: text, status: res.status }
  }
  return { status: res.status, json }
}
const callTool = async (token, name, args = {}) => mcp(token, 'tools/call', { name, arguments: args })
const toolText = (r) => r.json?.result?.content?.[0]?.text ?? ''

async function main() {
  console.log('MCP validation\n')

  // Two distinct users.
  const users = await (await rest('app_user?select=id&limit=2')).json()
  if (users.length < 2) { console.log('Need >=2 app_user rows to test cross-user denial.'); process.exit(1) }
  const [A, B] = [users[0].id, users[1].id]

  const tokA = await mintToken(A, 'read_write')
  const tokRO = await mintToken(A, 'read_only')
  const created = []

  try {
    // --- auth ---
    const noAuth = await mcp('ddx_bogus', 'tools/list', {})
    ok(noAuth.status === 401, 'invalid token -> 401')

    const list = await mcp(tokA.raw, 'tools/list', {})
    const names = (list.json?.result?.tools ?? []).map((t) => t.name)
    ok(names.includes('create_document') && names.includes('add_comment') && names.length === 10, `read_write sees 10 tools (${names.length})`)

    const listRO = await mcp(tokRO.raw, 'tools/list', {})
    const roNames = (listRO.json?.result?.tools ?? []).map((t) => t.name)
    ok(roNames.length === 5 && !roNames.includes('delete_document'), `read_only sees only 5 read tools (${roNames.length})`)

    // --- create ---
    const cr = await callTool(tokA.raw, 'create_document', { title: '__mcp_test', markdown: '# Hello\n\nFrom **MCP**.\n\n- one\n- two' })
    const m = toolText(cr).match(/([0-9a-f-]{36})/)
    ok(!!m, 'create_document returns a doc id')
    const docId = m?.[1]
    if (docId) created.push(docId)

    // --- get (body round-trips as markdown) ---
    const g = await callTool(tokA.raw, 'get_document', { id: docId })
    const body = toolText(g)
    ok(/From \*\*MCP\*\*/.test(body) && /- one/.test(body), 'get_document returns the markdown body')

    // --- update ---
    await callTool(tokA.raw, 'update_document', { id: docId, title: '__mcp_test2', markdown: '# Changed\n\nNew body.' })
    const g2 = await callTool(tokA.raw, 'get_document', { id: docId })
    ok(/Changed/.test(toolText(g2)) && !/From \*\*MCP\*\*/.test(toolText(g2)), 'update_document replaced the body')

    // --- security: B cannot read/delete A's doc ---
    const tokB = await mintToken(B, 'read_write')
    const bGet = await callTool(tokB.raw, 'get_document', { id: docId })
    ok(/no access|not found/i.test(JSON.stringify(bGet.json)), "user B denied get on A's doc")
    const bDel = await callTool(tokB.raw, 'delete_document', { id: docId })
    ok(/no access|only the owner|not found/i.test(JSON.stringify(bDel.json)), "user B denied delete on A's doc")
    await rest(`api_token?id=eq.${tokB.id}`, { method: 'DELETE' })

    // --- security: read_only cannot write ---
    const roCreate = await callTool(tokRO.raw, 'create_document', { title: 'x' })
    ok(/not found|method|tool|unknown|-32601/i.test(JSON.stringify(roCreate.json)), 'read_only cannot call create_document')

    // --- delete (owner) ---
    const del = await callTool(tokA.raw, 'delete_document', { id: docId })
    ok(/deleted/i.test(toolText(del)), 'delete_document (owner) succeeds')
    const gGone = await callTool(tokA.raw, 'get_document', { id: docId })
    ok(/not found|no access/i.test(JSON.stringify(gGone.json)), 'deleted doc no longer gettable')
    if (docId) created.pop()

    // --- OAuth: we are a resource server; Supabase is the auth server. Verify
    // the MCP server advertises Supabase via protected-resource metadata. ---
    const base = MCP.replace(/\/mcp$/, '')
    const prm = await fetch(`${base}/.well-known/oauth-protected-resource`).then((r) => r.json()).catch(() => null)
    ok(!!prm && Array.isArray(prm.authorization_servers) && prm.authorization_servers[0]?.includes('supabase'),
      'OAuth: advertises Supabase as the authorization server')
    const badJwt = await callTool('eyJhbGciOiJIUzI1NiJ9.bogus.sig', 'list_documents')
    ok(/invalid|missing token|-32001/i.test(JSON.stringify(badJwt.json)) || badJwt.status === 401,
      'OAuth: a bogus JWT is rejected')
  } finally {
    // cleanup
    for (const id of created) await rest(`document?id=eq.${id}`, { method: 'DELETE' })
    await rest(`api_token?id=eq.${tokA.id}`, { method: 'DELETE' })
    await rest(`api_token?id=eq.${tokRO.id}`, { method: 'DELETE' })
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
