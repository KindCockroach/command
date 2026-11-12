import { NextResponse } from 'next/server'
import { SITE_MAP, siteUrl, pageKey } from '@/lib/sites'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Live-check every public page (server-side, no CORS). Returns { "domain/path": httpStatus }.
async function checkOne(url: string): Promise<number> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'RISE-SiteMap' } })
    return res.status
  } catch {
    return 0 // unreachable / timed out
  } finally {
    clearTimeout(t)
  }
}

export async function GET() {
  const checks: { key: string; url: string }[] = []
  for (const d of SITE_MAP) {
    for (const p of d.pages) {
      if (p.private) continue
      checks.push({ key: pageKey(d.domain, p.path), url: siteUrl(d.domain, p.path) })
    }
  }
  const results = await Promise.all(checks.map(async c => [c.key, await checkOne(c.url)] as const))
  const statuses: Record<string, number> = {}
  for (const [key, status] of results) statuses[key] = status
  return NextResponse.json({ statuses, checkedAt: new Date().toISOString() })
}
