import type { NextRequest } from 'next/server'

// The address links in emails should use. Live, that's always the www domain (the bare
// domain 404s); locally, the dev server's own host.
export function publicOrigin(req: NextRequest): string {
  if (process.env.PUBLIC_ORIGIN) return process.env.PUBLIC_ORIGIN.replace(/\/$/, '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`
  return 'https://www.aiworksforher.com'
}
