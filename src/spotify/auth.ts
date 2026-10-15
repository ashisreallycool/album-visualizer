/**
 * Spotify Authorization Code with PKCE — the only flow Spotify still allows for
 * browser apps (implicit grant was removed in Nov 2025). Everything runs client-side;
 * no secret is involved and tokens never leave this browser.
 */

const AUTH_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

export const SCOPES = [
  'user-top-read',
  'user-read-recently-played',
  'user-read-private',
  'user-library-read',
  'user-follow-read',
]

const KEY_TOKENS = 'wa:tokens'
const KEY_VERIFIER = 'wa:verifier'
const KEY_STATE = 'wa:state'
const KEY_CLIENT = 'wa:clientId'

export interface Tokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

export class AuthError extends Error {
  constructor(message: string, public readonly code: string = 'auth') {
    super(message)
    this.name = 'AuthError'
  }
}

/** The redirect URI is the app root. Spotify requires HTTPS, or http://127.0.0.1 for local dev. */
export function getRedirectUri(): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/'
  return window.location.origin + base
}

export function getClientId(): string {
  return (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() || localStorage.getItem(KEY_CLIENT) || ''
}

export function setClientId(id: string): void {
  if (id.trim()) localStorage.setItem(KEY_CLIENT, id.trim())
  else localStorage.removeItem(KEY_CLIENT)
}

export function clientIdFromEnv(): boolean {
  return Boolean((import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim())
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  const bytes = new Uint8Array(digest)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function beginLogin(clientId: string): Promise<void> {
  if (!clientId) throw new AuthError('Add your Spotify Client ID first.', 'no-client-id')
  const verifier = randomString(64)
  const challenge = await sha256Base64Url(verifier)
  const state = randomString(16)
  sessionStorage.setItem(KEY_VERIFIER, verifier)
  sessionStorage.setItem(KEY_STATE, state)
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })
  window.location.assign(`${AUTH_URL}?${params.toString()}`)
}

function saveTokens(json: { access_token: string; refresh_token?: string; expires_in: number }, previousRefresh?: string): Tokens {
  const tokens: Tokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? previousRefresh,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  }
  localStorage.setItem(KEY_TOKENS, JSON.stringify(tokens))
  return tokens
}

export function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(KEY_TOKENS)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}

/** True when the current URL is a redirect back from Spotify. */
export function isAuthRedirect(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.has('code') || params.has('error')
}

/** Exchanges the ?code= in the URL for tokens and cleans the URL. */
export async function completeLogin(clientId: string): Promise<Tokens> {
  const params = new URLSearchParams(window.location.search)
  const cleanUrl = window.location.pathname + window.location.hash
  const error = params.get('error')
  const code = params.get('code')
  const state = params.get('state')
  const expectedState = sessionStorage.getItem(KEY_STATE)
  const verifier = sessionStorage.getItem(KEY_VERIFIER)
  window.history.replaceState({}, '', cleanUrl)
  sessionStorage.removeItem(KEY_STATE)
  sessionStorage.removeItem(KEY_VERIFIER)

  if (error) {
    throw new AuthError(
      error === 'access_denied' ? 'You cancelled the Spotify sign-in. Try again whenever you like.' : `Spotify refused the sign-in (${error}).`,
      error,
    )
  }
  if (!code || !verifier) throw new AuthError('Sign-in session expired. Start again from the connect button.', 'no-code')
  if (state !== expectedState) throw new AuthError('Sign-in state mismatch — please start again.', 'bad-state')

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  })
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new AuthError(`Spotify could not issue a token (${res.status}). ${friendlyTokenError(detail)}`, 'token')
  }
  return saveTokens(await res.json())
}

function friendlyTokenError(detail: string): string {
  if (/redirect_uri/i.test(detail)) return 'Check that the redirect URI in your Spotify app matches this page exactly.'
  if (/invalid_client/i.test(detail)) return 'The Client ID does not look right.'
  return ''
}

export async function refreshTokens(clientId: string, tokens: Tokens): Promise<Tokens> {
  if (!tokens.refreshToken) throw new AuthError('Session expired — connect again.', 'expired')
  const body = new URLSearchParams({ client_id: clientId, grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) {
    localStorage.removeItem(KEY_TOKENS)
    throw new AuthError('Session expired — connect again.', 'expired')
  }
  return saveTokens(await res.json(), tokens.refreshToken)
}

export async function getValidAccessToken(clientId: string): Promise<string | null> {
  const tokens = loadTokens()
  if (!tokens) return null
  if (Date.now() < tokens.expiresAt) return tokens.accessToken
  try {
    return (await refreshTokens(clientId, tokens)).accessToken
  } catch {
    return null
  }
}

export function logout(): void {
  localStorage.removeItem(KEY_TOKENS)
}
