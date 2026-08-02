import { NextRequest, NextResponse } from 'next/server'
import { addWaitlistEntry, getWaitlist } from '@/lib/db'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST — public: a visitor joins the waitlist from the /journal landing page.
export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; source?: string; note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const email = (body.email || '').trim()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  const { duplicate } = addWaitlistEntry({
    email,
    name: body.name,
    source: body.source || 'journal',
    note: body.note,
  })
  return NextResponse.json({ ok: true, duplicate })
}

// GET — admin: list signups. Gated by ADMIN_KEY (?k=) when that env var is set;
// with no ADMIN_KEY configured it stays private-by-obscurity on your own deploy.
export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY || ''
  if (adminKey) {
    const k = req.nextUrl.searchParams.get('k')
    if (k !== adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const source = req.nextUrl.searchParams.get('source') || undefined
  const list = getWaitlist(source)
  return NextResponse.json({ count: list.length, entries: list })
}
