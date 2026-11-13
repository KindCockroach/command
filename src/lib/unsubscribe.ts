// UNSUBSCRIBE LINKS — every campaign email carries a personal, signed link. The link
// holds the recipient's email (encoded) plus a signature only this server can make,
// so nobody can unsubscribe someone else by guessing a URL. No database lookup is
// needed to verify it, and links never expire.
import { createHmac, timingSafeEqual } from 'node:crypto'

// Signed with a secret that already exists wherever sending works (the Resend key),
// so there is nothing extra to configure. UNSUBSCRIBE_SECRET overrides it if ever set.
function secret(): string | null {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || process.env.STATION_KEY
  if (s) return s
  return process.env.NODE_ENV === 'production' ? null : 'local-dev-unsubscribe-secret'
}

const norm = (email: string) => email.trim().toLowerCase()

function sign(email: string): string | null {
  const s = secret()
  if (!s) return null
  return createHmac('sha256', s).update(`unsubscribe:${norm(email)}`).digest('base64url')
}

export function siteBase(): string {
  return (process.env.SITE_URL || 'https://www.aiworksforher.com').replace(/\/$/, '')
}

// The query string both the page and the API accept: ?e=<encoded email>&t=<signature>.
export function unsubscribeQuery(email: string): string | null {
  const t = sign(email)
  if (!t) return null
  return `e=${Buffer.from(norm(email)).toString('base64url')}&t=${t}`
}

// The link that goes in the email footer (opens the confirm page).
export function unsubscribeUrl(email: string): string | null {
  const q = unsubscribeQuery(email)
  return q ? `${siteBase()}/unsubscribe?${q}` : null
}

// The one-click endpoint mail apps (Gmail, Apple Mail) call from their own Unsubscribe button.
export function unsubscribeApiUrl(email: string): string | null {
  const q = unsubscribeQuery(email)
  return q ? `${siteBase()}/api/unsubscribe?${q}` : null
}

// Returns the email a link belongs to, or null if the link is malformed or forged.
export function verifyUnsubscribe(e: string | null | undefined, t: string | null | undefined): string | null {
  if (!e || !t) return null
  let email: string
  try { email = norm(Buffer.from(e, 'base64url').toString('utf8')) } catch { return null }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  const expected = sign(email)
  if (!expected) return null
  const a = Buffer.from(expected)
  const b = Buffer.from(t)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return email
}
