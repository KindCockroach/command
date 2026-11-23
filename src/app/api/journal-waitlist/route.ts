import { NextRequest, NextResponse, after } from 'next/server'
import { isOwner } from '@/lib/ownerAuth'
import { addWaitlistEntry, getWaitlist, signupListOf } from '@/lib/db'
import { welcomeOnSignup } from '@/lib/resetSequence'

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
  // Phase 5: the list's welcome email, only when Mandi has approved it and switched it live.
  const list = duplicate ? null : signupListOf(body.source || 'journal', body.note)
  if (list) after(() => welcomeOnSignup(email, list, body.name || ''))
  return NextResponse.json({ ok: true, duplicate })
}

// GET — admin: list signups (emails). Mandi only: her station/site-editor cookie, or
// ?k=ADMIN_KEY when that env var is set. Never public — this is subscriber PII.
export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY || ''
  const keyOk = !!adminKey && req.nextUrl.searchParams.get('k') === adminKey
  if (!keyOk && !isOwner(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const source = req.nextUrl.searchParams.get('source') || undefined
  const list = getWaitlist(source)
  return NextResponse.json({ count: list.length, entries: list })
}
