import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// Canva Connect OAuth token store (single-user). Kept on the Railway volume next
// to the main db so it survives restarts.
const DIR = path.dirname(process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'db.json'))
const FILE = path.join(DIR, 'canva-tokens.json')
const AUTH_BASE = 'https://www.canva.com/api/oauth/authorize'
const TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'

const SCOPES = ['brandtemplate:meta:read', 'brandtemplate:content:read', 'design:content:write', 'design:meta:read', 'asset:read', 'asset:write', 'design:content:read'].join(' ')

type Store = { access_token?: string; refresh_token?: string; expires_at?: number; verifier?: string; state?: string }

function read(): Store {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return {} }
}
function write(s: Store) {
  try { fs.mkdirSync(DIR, { recursive: true }) } catch { /* exists */ }
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2))
}

export function canvaConfigured(): boolean {
  return !!process.env.CANVA_CLIENT_ID && !!process.env.CANVA_CLIENT_SECRET
}
export function canvaConnected(): boolean {
  return !!read().refresh_token
}

// Build the authorize URL (PKCE) and stash the verifier + state for the callback.
export function authUrl(redirectUri: string): string {
  const verifier = crypto.randomBytes(64).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')
  const s = read(); s.verifier = verifier; s.state = state; write(s)
  const p = new URLSearchParams({
    code_challenge: challenge, code_challenge_method: 's256', scope: SCOPES,
    response_type: 'code', client_id: process.env.CANVA_CLIENT_ID!, redirect_uri: redirectUri, state,
  })
  return `${AUTH_BASE}?${p.toString()}`
}

function basicAuth(): string {
  return 'Basic ' + Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64')
}

// Exchange the authorization code for tokens (using the stored PKCE verifier).
export async function exchangeCode(code: string, state: string, redirectUri: string): Promise<{ ok: boolean; error?: string }> {
  const s = read()
  if (!s.state || s.state !== state || !s.verifier) return { ok: false, error: 'state/verifier mismatch — restart the connect flow' }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: s.verifier, redirect_uri: redirectUri }),
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || !d.access_token) return { ok: false, error: d.error_description || d.error || `token exchange failed (${res.status})` }
  write({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in ?? 3600) * 1000 })
  return { ok: true }
}

async function refresh(): Promise<boolean> {
  const s = read()
  if (!s.refresh_token) return false
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: s.refresh_token }),
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || !d.access_token) return false
  write({ access_token: d.access_token, refresh_token: d.refresh_token ?? s.refresh_token, expires_at: Date.now() + (d.expires_in ?? 3600) * 1000 })
  return true
}

// A valid access token, refreshing when it's within 60s of expiry.
export async function getAccessToken(): Promise<string | null> {
  const s = read()
  if (!s.access_token) return null
  if ((s.expires_at ?? 0) - Date.now() < 60000) { if (!(await refresh())) return null }
  return read().access_token ?? null
}
