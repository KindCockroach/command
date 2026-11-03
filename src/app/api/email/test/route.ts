import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, basicEmailHtml, DEFAULT_FROM } from '@/lib/email'
import { getPeople } from '@/lib/db'

export const dynamic = 'force-dynamic'

// TEST SEND — confirm Resend is wired end-to-end once the key + domain are live.
// Guarded: it will only send to Mandi's own address or to someone already in her
// People CRM, so an open endpoint can't be used to spam strangers through her account.
const OWNER = (process.env.OWNER_EMAIL || 'hi@aimomeducation.com').toLowerCase()

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const to = String(body.to || OWNER).trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: 'Give a valid "to" email.' }, { status: 400 })
  }
  const known = new Set(getPeople().map(p => (p.email || '').toLowerCase()).filter(Boolean))
  if (to !== OWNER && !known.has(to)) {
    return NextResponse.json({ error: 'Test sends can only go to your own address or someone already in People.' }, { status: 403 })
  }

  const result = await sendEmail({
    to,
    subject: 'RISE × Resend — you\'re wired up ✨',
    html: basicEmailHtml(`It works.\n\nThis test came straight from RISE through Resend, sent from ${DEFAULT_FROM}.\n\nThat means confirmations, newsletters, and drip sequences can all go out from here now — no GHL needed.\n\n— RISE`),
    text: `It works. This test came from RISE through Resend (${DEFAULT_FROM}). Confirmations, newsletters, and drips can go out from here now.`,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ ok: true, id: result.id, sentTo: to, from: DEFAULT_FROM })
}
