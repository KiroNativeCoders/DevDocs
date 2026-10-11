import './env.js'
import { createHash, randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'

/**
 * API-token helpers for the remote MCP server.
 *
 * Tokens are `ddx_<48 hex>`; only the SHA-256 hash is stored. The MCP server
 * resolves an incoming Bearer token to a user id (then runs ops as that user).
 * The app API uses mint/list/revoke on behalf of the logged-in user.
 */

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
)

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export type TokenScope = 'read_only' | 'read_write'

/** Mint a new token for a user. Returns the RAW token ONCE (never stored). */
export async function mintToken(userId: string, name: string, scope: TokenScope = 'read_write') {
  const raw = `ddx_${randomBytes(24).toString('hex')}`
  const token_hash = hashToken(raw)
  const { data, error } = await admin
    .from('api_token')
    .insert({ user_id: userId, token_hash, name: name || null, scope })
    .select('id,name,scope,created_at')
    .single()
  if (error) throw new Error(error.message)
  return { raw, token: data }
}

/** Validate a raw Bearer token -> { userId, scope } or null. Bumps last_used_at. */
export async function resolveToken(raw: string): Promise<{ userId: string; scope: TokenScope } | null> {
  if (!raw || !raw.startsWith('ddx_')) return null
  const token_hash = hashToken(raw)
  const { data, error } = await admin
    .from('api_token')
    .select('id,user_id,scope,revoked_at')
    .eq('token_hash', token_hash)
    .maybeSingle()
  if (error || !data || data.revoked_at) return null
  // Best-effort usage bump (don't block on it).
  void admin.from('api_token').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return { userId: data.user_id, scope: data.scope as TokenScope }
}

export async function listTokens(userId: string) {
  const { data, error } = await admin
    .from('api_token')
    .select('id,name,scope,last_used_at,created_at,revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function revokeToken(userId: string, tokenId: string) {
  const { error } = await admin
    .from('api_token')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .eq('user_id', userId) // ownership guard
  if (error) throw new Error(error.message)
}
