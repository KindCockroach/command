import { NextRequest, NextResponse } from 'next/server'
import { isOwner } from '@/lib/ownerAuth'
import { logActivity, logSend } from '@/lib/db'
import { resendSend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// POST — admin only (Mandi): send the post-Reset follow-up ("How was it?" → survey)
// to a list of attendee emails. Registration lives on Luma, so you feed the list
// here (paste or CSV-export from Luma); we send natively via Resend and log each
// send to the People timeline. Nothing goes out until Mandi triggers this.
//
// Body: { attendees: ["a@x.com", "Name <b@y.com>", ...] }  or  { emails: "a@x.com, b@y.com" }
// Auth: owner cookie, or ?k=ADMIN_KEY when ADMIN_KEY is set.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Accept "Name <email>" or bare "email"; returns { name, email } with email lowercased.
function parseOne(raw: string): { name: string; email: string } | null {
  const s = raw.trim()
  if (!s) return null
  const m = s.match(/^(.*?)<([^>]+)>$/)
  if (m) {
    const email = m[2].trim().toLowerCase()
    return EMAIL_RE.test(email) ? { name: m[1].trim().replace(/^["']|["']$/g, ''), email } : null
  }
  const email = s.toLowerCase()
  return EMAIL_RE.test(email) ? { name: '', email } : null
}

export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY || ''
  const keyOk = !!adminKey && req.nextUrl.searchParams.get('k') === adminKey
  if (!keyOk && !isOwner(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const raw: string[] = Array.isArray(b.attendees)
    ? (b.attendees as unknown[]).map(String)
    : typeof b.emails === 'string'
      ? b.emails.split(/[\n,;]+/)
      : []

  // De-dupe by email.
  const seen = new Set<string>()
  const people = raw
    .map(parseOne)
    .filter((p): p is { name: string; email: string } => !!p)
    .filter(p => (seen.has(p.email) ? false : (seen.add(p.email), true)))

  if (!people.length) {
    return NextResponse.json({ error: 'No valid emails found. Paste one per line, or comma-separated.' }, { status: 400 })
  }

  const dryRun = b.dryRun === true
  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, count: people.length, emails: people.map(p => p.email) })
  }

  const useResend = !!process.env.RESEND_API_KEY
  const subject = 'How was The Reset? 🌙'
  let sent = 0, failed = 0
  const errors: string[] = []

  for (const p of people) {
    let ok = false
    if (useResend) {
      const r = await resendSend(p.email, subject, followupHtml(p.name))
      ok = r.ok
      if (!r.ok && errors.length < 5) errors.push(`${p.email}: ${r.error}`)
    }
    if (ok) sent++; else failed++
    logSend({ email: p.email, subject, product: 'reset-followup', status: ok ? 'sent' : 'failed', via: useResend ? 'resend' : 'none' })
  }

  logActivity({
    type: 'note',
    title: `🌙 Reset follow-up sent — ${sent} of ${people.length}`,
    detail: `survey invite emailed${failed ? ` · ${failed} failed` : ''}`,
    icon: '🌙',
    source: 'bethereforher',
  })

  return NextResponse.json({ ok: true, count: people.length, sent, failed, errors: errors.length ? errors : undefined })
}

const SURVEY_URL = 'https://www.bethereforher.com/reset/survey'

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}

function followupHtml(name: string): string {
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi love,'
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3C2A37;max-width:560px">
<p>${hi}</p>
<p>Thank you for coming to The Reset. You gave yourself an hour, and that matters more than you know.</p>
<p>Before the week pulls you back under, I'd love to hear how it landed for you — what you felt, what you'd want more of, what would make the next one even better. It takes about two minutes.</p>
<p><a href="${SURVEY_URL}" style="display:inline-block;background:#D98C5F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Tell me how it went</a></p>
<p>Your honesty shapes what this becomes. I read every single one.</p>
<p>And I hope you'll come back — every Sunday at 8 PM CT, the door is open.</p>
<p>Be there for her,<br>Mandi<br><a href="https://www.bethereforher.com" style="color:#D98C5F">bethereforher.com</a></p>
</div>`
}
