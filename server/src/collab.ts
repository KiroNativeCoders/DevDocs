import './env.js'
import http from 'http'
import { WebSocketServer } from 'ws'
import { verifyToken } from './auth.js'
import { getAccess } from './access.js'

/**
 * DXEditor collaboration relay.
 *
 * Uses y-websocket's official setupWSConnection (correct Yjs sync + awareness
 * handshake) AND its built-in LevelDB persistence. Persistence is enabled by
 * the YPERSISTENCE env var, which the utils module reads AT IMPORT TIME and
 * wires with its OWN bundled Yjs instance. (Supplying our own setPersistence
 * with our Yjs import silently failed to store updates, because utils creates
 * docs with its Yjs and our Y.encodeStateAsUpdate operated on a different
 * instance — a no-op. Letting utils own both avoids that mismatch.)
 */

const PORT = Number(process.env.COLLAB_PORT ?? 4001)
// Point y-websocket's built-in persistence at our LevelDB dir. MUST be set
// before importing bin/utils.js (it reads the env var at module load).
process.env.YPERSISTENCE = process.env.YJS_DB_DIR ?? './y-leveldb'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- no type declarations for the bin utils
const { setupWSConnection } = await import('../node_modules/y-websocket/bin/utils.js')

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('DXEditor collaboration server\n')
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const docName = url.pathname.slice(1) || 'default'
    const token = url.searchParams.get('token') ?? ''

    // Internal server-to-server path (the MCP server). A trusted caller presents
    // the shared MCP_INTERNAL_SECRET plus the user id it is acting as; we still
    // run getAccess for that user, so authorization is identical to a browser.
    const internal = url.searchParams.get('internal') ?? ''
    const actingAs = url.searchParams.get('as') ?? ''
    const INTERNAL_SECRET = process.env.MCP_INTERNAL_SECRET ?? ''
    let userId: string | null = null

    if (internal && INTERNAL_SECRET && internal === INTERNAL_SECRET && actingAs) {
      userId = actingAs
    } else {
      const session = await verifyToken(token)
      if (!session) {
        console.warn(`[collab] reject ${docName}: unauthenticated`)
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }
      userId = session.id
    }

    const access = await getAccess(userId, docName)
    if (!access) {
      console.warn(`[collab] reject ${docName}: user ${userId} no access`)
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      socket.destroy()
      return
    }
    console.log(`[collab] accept ${docName}: user ${userId} role=${access.role}`)

    wss.handleUpgrade(req, socket, head, (conn) => {
      setupWSConnection(conn, req, { docName, gc: true })
    })
  } catch (err) {
    console.error('[collab] upgrade error:', err)
    try {
      socket.destroy()
    } catch {
      /* already closed */
    }
  }
})

server.listen(PORT, () => {
  console.log(`DXEditor collab (Yjs) listening on ws://localhost:${PORT}`)
})
