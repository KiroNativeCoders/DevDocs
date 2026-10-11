import './env.js'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { WebSocket } from 'ws'

/**
 * Read/replace a document's BODY via the collaboration relay.
 *
 * The body lives in Yjs/LevelDB (not Postgres), owned by the relay. The safe
 * way to touch it from the MCP server is to connect AS a Yjs client (exactly
 * like the browser), let the relay sync current state, then apply an edit in a
 * transaction — so the change persists to LevelDB AND propagates live to any
 * open collaborators. Writing LevelDB directly would bypass awareness/sync.
 *
 * The relay authorizes the connection with the user's Supabase token (same as
 * the browser), so the MCP caller must pass a token that getAccess accepts.
 */

const COLLAB_URL = process.env.COLLAB_INTERNAL_URL ?? 'ws://127.0.0.1:4001'
const INTERNAL_SECRET = process.env.MCP_INTERNAL_SECRET ?? ''

type DocHandle = { ydoc: Y.Doc; provider: WebsocketProvider; close: () => void }

// Connect to one doc room (as the given user, via the internal secret) and wait
// for the initial sync.
function connectDoc(docId: string, userId: string): Promise<DocHandle> {
  return new Promise((resolve, reject) => {
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider(COLLAB_URL, docId, ydoc, {
      connect: true,
      params: { internal: INTERNAL_SECRET, as: userId },
      // y-websocket needs a WS impl in Node.
      WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
    })
    const close = () => {
      try { provider.destroy() } catch { /* noop */ }
      try { ydoc.destroy() } catch { /* noop */ }
    }
    const timer = setTimeout(() => {
      close()
      reject(new Error('Timed out syncing document body from the collab relay'))
    }, 15_000)
    provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        clearTimeout(timer)
        resolve({ ydoc, provider, close })
      }
    })
    provider.on('connection-error', () => {
      clearTimeout(timer)
      close()
      reject(new Error('Collab relay rejected the connection (token has no access to this doc)'))
    })
  })
}

// TipTap stores its content in the XML fragment named "default".
export async function readBodyJSON(docId: string, userId: string): Promise<unknown> {
  const h = await connectDoc(docId, userId)
  try {
    // Let the relay finish delivering persisted state after the sync event.
    await new Promise((r) => setTimeout(r, 400))
    const frag = h.ydoc.getXmlFragment('default')
    return fragmentToPM(frag)
  } finally {
    h.close()
  }
}

// Replace the whole body with the given ProseMirror doc JSON (same approach as
// the client version-restore: clear the fragment, insert cloned children).
export async function replaceBody(docId: string, userId: string, pmDoc: PMDoc): Promise<void> {
  const h = await connectDoc(docId, userId)
  try {
    // Wait for existing content to finish arriving after sync — otherwise the
    // delete(0, length) below runs against an not-yet-populated fragment and the
    // new nodes get APPENDED to the old body instead of replacing it.
    await new Promise((r) => setTimeout(r, 500))
    const dst = h.ydoc.getXmlFragment('default')
    h.ydoc.transact(() => {
      if (dst.length > 0) dst.delete(0, dst.length)
      const nodes = (pmDoc.content ?? []).map(pmToY)
      if (nodes.length > 0) dst.insert(0, nodes)
    })
    // Ensure the update actually reaches the relay (and its LevelDB persistence)
    // before we disconnect. A fixed short sleep raced the async persist and
    // dropped the write (worst for a brand-new room). Wait for the WS send
    // buffer to drain, then poll until our own fragment reflects the write.
    const ws = (h.provider as unknown as { ws?: { bufferedAmount: number } }).ws
    const expected = (pmDoc.content ?? []).length
    const start = Date.now()
    while (Date.now() - start < 6000) {
      const drained = !ws || ws.bufferedAmount === 0
      if (drained && dst.length >= expected) break
      await new Promise((r) => setTimeout(r, 100))
    }
    // Final grace for the relay to persist to LevelDB after receiving the update.
    await new Promise((r) => setTimeout(r, 1200))
  } finally {
    h.close()
  }
}

// ---- minimal PM<->Yjs conversion (block-level; matches our node set) --------

type PMNode = { type: string; attrs?: Record<string, unknown>; content?: PMNode[]; text?: string; marks?: { type: string; attrs?: Record<string, unknown> }[] }
type PMDoc = { type: 'doc'; content?: PMNode[] }

function pmToY(node: PMNode): Y.XmlElement | Y.XmlText {
  if (node.type === 'text') {
    const t = new Y.XmlText()
    // Carry inline marks as Yjs text formatting (bold/italic/strike/code/link),
    // matching how TipTap's Collaboration stores them, so formatting survives.
    const attrs: Record<string, unknown> = {}
    for (const m of node.marks ?? []) {
      if (m.type === 'link') attrs.link = m.attrs ?? {}
      else attrs[m.type] = m.attrs ?? {}
    }
    t.insert(0, node.text ?? '', Object.keys(attrs).length ? attrs : undefined)
    return t
  }
  const el = new Y.XmlElement(node.type)
  if (node.attrs) for (const [k, v] of Object.entries(node.attrs)) if (v != null) el.setAttribute(k, String(v))
  const kids = (node.content ?? []).map(pmToY)
  if (kids.length) el.insert(0, kids)
  return el
}

function fragmentToPM(frag: Y.XmlFragment): PMDoc {
  // Convert a Y.XmlText into one or more PM text nodes (one per formatting run).
  const textRuns = (xt: Y.XmlText): PMNode[] => {
    const delta = xt.toDelta() as { insert: string; attributes?: Record<string, unknown> }[]
    return delta
      .filter((op) => typeof op.insert === 'string')
      .map((op) => {
        const marks = Object.entries(op.attributes ?? {}).map(([type, attrs]) =>
          attrs && typeof attrs === 'object' && Object.keys(attrs).length
            ? { type, attrs: attrs as Record<string, unknown> }
            : { type },
        )
        return marks.length ? { type: 'text', text: op.insert, marks } : { type: 'text', text: op.insert }
      })
  }
  const childNodes = (el: Y.XmlElement): PMNode[] =>
    el.toArray().flatMap((c) =>
      c instanceof Y.XmlText ? textRuns(c) : [elNode(c as Y.XmlElement)],
    )
  const elNode = (el: Y.XmlElement): PMNode => ({
    type: el.nodeName || 'paragraph',
    attrs: el.getAttributes(),
    content: childNodes(el),
  })
  const top = frag.toArray().flatMap((c) =>
    c instanceof Y.XmlText ? textRuns(c) : [elNode(c as Y.XmlElement)],
  )
  return { type: 'doc', content: top }
}
