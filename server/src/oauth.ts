import './env.js'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { TokenScope } from './tokens.js'

/**
 * Supabase OAuth 2.1 — RESOURCE-SERVER side only.
 *
 * Supabase Auth is the authorization server: it hosts /authorize, /token,
 * /register, discovery, PKCE, refresh and the client store. We do NOT run an
 * auth server anymore. Our only job is to VERIFY the Supabase-issued OAuth
 * access token (a JWT) and extract the user — whose `sub` IS our app_user.id,
 * because it's the same Supabase identity (no email mapping needed).
 *
 * The consent screen lives in the client SPA at /oauth/consent and uses the
 * supabase-js oauth.* methods; Supabase redirects there with authorization_id.
 */

const JWKS_URL = process.env.SUPABASE_JWKS_URL ?? ''
const ISSUER = process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/auth/v1` : undefined
const jwks = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null

export type OAuthUser = { userId: string; scope: TokenScope }

/**
 * Verify a Supabase OAuth access token. OAuth tokens are issued by the same
 * project (same issuer + JWKS) as session tokens, but may carry a different
 * `aud` than "authenticated", so we do NOT pin the audience here — issuer +
 * signature are the trust anchors. Scope is derived from the token's `scope`
 * claim. Supabase OAuth uses OIDC scopes (openid/email/profile), NOT custom
 * read/write — an authenticated OAuth user is a full DevDocs user, so they get
 * read_write (same as accessing their own docs in the app). Fine-grained
 * read-only is available via ddx_ API tokens, which carry an explicit scope.
 */
export async function verifyOAuthToken(token: string): Promise<OAuthUser | null> {
  if (!jwks) return null
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER })
    const userId = typeof payload.sub === 'string' ? payload.sub : ''
    if (!userId) return null
    return { userId, scope: 'read_write' }
  } catch {
    return null
  }
}

// The OAuth issuer identifier for Supabase's authorization server. We advertise
// the ISSUER (…/auth/v1), NOT the metadata-document URL — RFC 8414 §3.3 requires
// the issuer in the fetched metadata to equal the advertised authorization
// server, and strict clients (MCP Inspector) reject a mismatch. Clients derive
// the /.well-known/oauth-authorization-server document from the issuer themselves.
export function supabaseOAuthMetadataUrl(): string {
  const base = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
  return `${base}/auth/v1`
}
