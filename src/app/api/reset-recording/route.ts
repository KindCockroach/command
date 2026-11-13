import { NextRequest, NextResponse } from 'next/server'
import { logActivity, logSend } from '@/lib/db'
import { isOwner } from '@/lib/ownerAuth'
import { resendSend } from '@/lib/resend'
import { ghlContact } from '@/lib/wfhServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Post-Reset follow-up with the recording. Two segments, two emails:
//   group 'attendees' → the 5 who joined live: thank-you + recording + survey/reply
//   group 'noshows'   → registered but missed it: replay + testimonial + come Sunday
// Owner only (station cookie). mode 'test' sends one copy to TEST_TO; 'send' = the group.
// Native via Resend; each send upserts the contact into GHL and logs to People.
const TEST_TO = { name: 'Mandi', email: 'mandijoy.beck@gmail.com' }
const FROM = `"Mandi — Joyful Media Productions" <hi@aimomeducation.com>`
const SOURCE = 'Be There For Her · Reset recording'
const RECORDING = 'https://drive.google.com/file/d/1ZfvbnEsVvbdB3cU86m8HzIja0dUr6KDf/view?usp=sharing'
const SURVEY = 'https://www.bethereforher.com/reset/survey'
const RESET = 'https://www.bethereforher.com/reset'

const ATTENDEES = [
  { name: 'Elizabeth', email: 'emichels89@gmail.com' },
  { name: 'Emily', email: 'eabeckteam@gmail.com' },
  { name: 'Bridget', email: 'bridget.guess@gmail.com' },
  { name: 'Carla', email: 'carlahylen@gmail.com' },
  { name: 'Jackie', email: 'j.oconnell@kw.com' },
]
const NOSHOWS = [
  { name: 'Monica', email: 'monica.vela77@gmail.com' },
  { name: 'Katie', email: 'wcbdti@gmail.com' },
]

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const btn = (href: string, label: string, solid = true) =>
  `<a href="${href}" style="display:inline-block;${solid
    ? 'background:#D98C5F;color:#fff;'
    : 'background:transparent;border:2px solid #D98C5F;color:#3C2A37;'}padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:bold">${label}</a>`
const wrap = (inner: string) =>
  `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3C2A37;max-width:560px">${inner}
<p>Be there for her,<br>Mandi<br><a href="https://www.bethereforher.com" style="color:#D98C5F">bethereforher.com</a></p></div>`

function attendeeHtml(name: string): string {
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi love,'
  return wrap(`<p>${hi}</p>
<p>You did something most women never do: you gave yourself an hour. Thank you for spending it with me.</p>
<p>Here&rsquo;s the recording, so you can drop back into that quiet whenever the week gets loud again:</p>
<p style="margin:22px 0">${btn(RECORDING, '▶ Watch the Reset')}</p>
<p>And I&rsquo;d love to know how it landed for you. If you like a prompt to guide you, your reflections are welcome right here:</p>
<p style="margin:22px 0">${btn(SURVEY, 'Share your reflections →', false)}</p>
<p>Or simply <b>reply to this email</b> — your words come straight to me, and I read every one.</p>
<p>Come back, too. Every Sunday at 8 PM CT, the door is open and your seat is waiting.</p>`)
}

function noshowHtml(name: string): string {
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi love,'
  return wrap(`<p>${hi}</p>
<p>Life happened Sunday &mdash; I get it. That&rsquo;s the whole reason The Reset exists.</p>
<p>So here&rsquo;s the recording. One hour, just for you. Claim it when you can:</p>
<p style="margin:22px 0">${btn(RECORDING, '▶ Watch the Reset')}</p>
<p style="border-left:3px solid #E0A458;padding-left:14px;color:#6a5a62;font-style:italic">
&ldquo;It was a delightful experience to wrap up the end of the week while starting the next.&rdquo;<br>&mdash; Elizabeth, after last Sunday</p>
<p>Your seat&rsquo;s still warm. Come live this Sunday at 8 PM CT &mdash; it hits different in real time, together.</p>
<p style="margin:22px 0">${btn(RESET, 'Save my seat →')}</p>`)
}

const SUBJECTS = { attendees: 'Your Reset recording is here 🌙', noshows: 'Sunday Got Away, but I Found You' }

export async function POST(req: NextRequest) {
  if (!isOwner(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const group = b.group === 'noshows' ? 'noshows' : 'attendees'
  const mode = b.mode === 'send' ? 'send' : 'test'
  const list = group === 'noshows' ? NOSHOWS : ATTENDEES
  const html = group === 'noshows' ? noshowHtml : attendeeHtml
  const subject = SUBJECTS[group]

  if (b.mode === 'dry') {
    return NextResponse.json({ group, from: FROM, subject, recipients: list.map(r => `${r.name} <${r.email}>`) })
  }
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const recipients = mode === 'test' ? [TEST_TO] : list
  const results: { who: string; ok: boolean }[] = []
  for (const r of recipients) {
    try { await ghlContact({ name: r.name || r.email, email: r.email, source: SOURCE }) } catch { /* best effort */ }
    const ok = (await resendSend(r.email, subject, html(mode === 'test' ? r.name : r.name), 'hi@aimomeducation.com', FROM)).ok
    results.push({ who: r.name || r.email, ok })
    logSend({ email: r.email, subject, product: `reset-recording-${group}`, status: ok ? 'sent' : 'failed', via: 'resend' })
  }

  logActivity({
    type: 'note',
    title: mode === 'test'
      ? `🌙 Reset recording TEST (${group}) → ${TEST_TO.email}`
      : `🌙 Reset recording emailed to ${group} — ${results.filter(x => x.ok).length}/${results.length}`,
    detail: results.map(x => `${x.who} ${x.ok ? '✓' : '✗'}`).join(' · '),
    icon: '🌙',
    source: 'bethereforher',
  })

  return NextResponse.json({ group, mode, sent: results.filter(x => x.ok).length, failed: results.filter(x => !x.ok).length, results })
}
