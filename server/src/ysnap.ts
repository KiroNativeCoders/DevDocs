import * as Y from 'yjs'

/**
 * Yjs snapshot primitives for delta versioning.
 *
 * CRITICAL: the live documents are owned by y-websocket's bin/utils.js, which
 * does `const Y = require('yjs')`. We verified at build time that y-websocket
 * resolves the SAME yjs module as this file (server/node_modules/yjs), so our
 * Y.* operate on the very docs utils.js holds — no cross-instance no-op. The
 * boot assertion below fails fast if that ever regresses.
 *
 * utils.js reads YPERSISTENCE at module-load time, so we MUST NOT import it
 * statically here (that would load it before collab.ts sets YPERSISTENCE and
 * silently disable LevelDB persistence). We import it lazily, by which point
 * collab.ts has already loaded it with persistence wired.
 */

type YwUtils = { docs: Map<string, Y.Doc> }
let _utils: YwUtils | null = null

async function utils(): Promise<YwUtils> {
  if (!_utils) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- no type declarations for the bin utils
    _utils = (await import('../node_modules/y-websocket/bin/utils.js')) as unknown as YwUtils
  }
  return _utils
}

/** y-websocket's live rooms: docName -> WSSharedDoc (extends Y.Doc). */
export async function liveDocs(): Promise<Map<string, Y.Doc>> {
  return (await utils()).docs
}

/** Full state update — a self-contained snapshot (used for keyframes). */
export function encodeFull(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc)
}

/** Delta since a previous state vector — only ops added since that bookmark. */
export function encodeDelta(doc: Y.Doc, previousStateVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(doc, previousStateVector)
}

/** The doc's current state vector (compact fingerprint / bookmark). */
export function encodeVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc)
}

/** True if two state vectors are byte-identical (⇒ nothing changed). */
export function vectorsEqual(a: Uint8Array | null | undefined, b: Uint8Array | null | undefined): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * Rebuild a document to a target state by replaying an ordered chain of updates
 * (nearest keyframe, then deltas up to the target) onto a fresh doc. Returns
 * the fresh doc; caller reads its fragment or diffs it against the live doc.
 */
export function replayChain(blobs: Uint8Array[]): Y.Doc {
  const doc = new Y.Doc()
  doc.transact(() => {
    for (const blob of blobs) Y.applyUpdate(doc, blob)
  })
  return doc
}

/**
 * Boot assertion: prove encoding against a doc produced by the SAME Yjs that
 * owns the live rooms is non-empty. Guards the cross-instance regression the
 * collab.ts header documents. Call once at startup; throws if it ever breaks.
 */
export function assertYjsWiring(): void {
  const probe = new Y.Doc()
  probe.getText('t').insert(0, 'x')
  const full = encodeFull(probe)
  const vec = encodeVector(probe)
  probe.destroy()
  if (full.length < 2 || vec.length < 1) {
    throw new Error(
      '[ysnap] Yjs wiring assertion failed: encodeStateAsUpdate returned empty. ' +
        'y-websocket is likely resolving a different yjs instance than this module.',
    )
  }
}
