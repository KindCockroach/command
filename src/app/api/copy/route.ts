import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSiteCopy, setSiteCopy, resetSiteCopy, getSiteEditKeyHash, claimSiteEditKeyHash } from '@/lib/db'

export const dynamic = 'force-dynamic'

// SITE COPY EDITOR — lets Mandi fix public-page text in place (components/CopyEditor).
// GET ?page=/ugc            → public: { copy: {original: edited}, owner }
// POST {login: key}         → sets the owner cookie if the key matches
// POST {claim: key}         → one-time: sets the key when none exists yet
// POST {page, from, to}     → owner: save one edit (to === from removes it)
// DELETE ?page=/ugc         → owner: undo every edit on that page
// Owner = a cookie holding the sha256 of her key; independent of the station lock.
const COOKIE = 'site_editor'
const sha = (t: string) => createHash('sha256').update(t).digest('hex')
const isOwner = (req: NextRequest) => {
  const h = getSiteEditKeyHash()
  return !!h && req.cookies.get(COOKIE)?.value === h
}
const cleanPage = (p: unknown) => (typeof p === 'string' && /^\/[\w\-/]*$/.test(p) ? p.slice(0, 80) : null)

export function GET(req: NextRequest) {
  const page = cleanPage(new URL(req.url).searchParams.get('page'))
  if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 })
  return NextResponse.json({ copy: getSiteCopy(page), owner: isOwner(req) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (typeof body.claim === 'string' && body.claim.length >= 16) {
    return NextResponse.json({ ok: claimSiteEditKeyHash(sha(body.claim)) })
  }

  if (typeof body.login === 'string') {
    const h = getSiteEditKeyHash()
    if (!h || sha(body.login) !== h) return NextResponse.json({ error: 'wrong key' }, { status: 401 })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE, h, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
    return res
  }

  if (!isOwner(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const page = cleanPage(body.page)
  if (!page || typeof body.from !== 'string' || typeof body.to !== 'string' || !body.from.trim()) {
    return NextResponse.json({ error: 'page, from, to required' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, copy: setSiteCopy(page, body.from.slice(0, 4000), body.to.slice(0, 4000)) })
}

export function DELETE(req: NextRequest) {
  if (!isOwner(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const page = cleanPage(new URL(req.url).searchParams.get('page'))
  if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 })
  resetSiteCopy(page)
  return NextResponse.json({ ok: true })
}
