import { NextRequest, NextResponse } from 'next/server'
import { getWfhSchedule, setWfhWeekly, addWfhBooking, removeWfhBooking, addWfhLead, getWfhLeads, getPodcastSchedule, logActivity } from '@/lib/db'
import { assess, serviceLabel, type Answers } from '@/lib/wfh'
import { recommendRise, ghlContact, ghlEmail, clientEmailHtml, mandiLeadHtml, esc, NOTIFY_EMAIL } from '@/lib/wfhServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// WFH (Works For Her) — the public aiworksforher.com funnel.
// GET               → public: { weekly, from, booked:[{date,time}] } (no client PII)
// GET ?admin=1      → hers: bookings + leads with contact details
// POST {assess}     → score the questionnaire + Claude writes a personalized RISE recommendation;
//                     saves the lead, emails it to them, emails Mandi everything → { lead_id, recommendation }
// POST {book}       → book a meeting
// POST {weekly}     → hers: set her weekly meeting slots
// DELETE ?id=       → hers: remove a booking
// Admin calls need the station cookie. FAIL-CLOSED: with no STATION_KEY set, client
// contact details are never served (this route is public), so set STATION_KEY to use /meet/manage.
function isAdmin(req: NextRequest) {
  const key = process.env.STATION_KEY
  return !!key && req.cookies.get('station_auth')?.value === key
}
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export function GET(req: NextRequest) {
  const s = getWfhSchedule()
  // Podcast recordings block client slots too — one Mandi.
  const podcast = getPodcastSchedule().booked.map(b => ({ date: b.date, time: b.time }))
  if (new URL(req.url).searchParams.get('admin') === '1') {
    if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json({ weekly: s.weekly, from: s.from ?? null, bookings: s.booked.slice().sort((a, b) => a.date.localeCompare(b.date)), leads: getWfhLeads() })
  }
  return NextResponse.json({ weekly: s.weekly, from: s.from ?? null, booked: [...s.booked.map(b => ({ date: b.date, time: b.time })), ...podcast] })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (body.assess) {
    const a = body.assess
    const name = str(a.name, 120), email = str(a.email, 160).toLowerCase()
    if (!name || !validEmail(email)) return NextResponse.json({ error: 'Please add your name and a valid email.' }, { status: 400 })
    const answers: Answers = {}
    for (const [k, v] of Object.entries((a.answers ?? {}) as Record<string, unknown>)) {
      if (typeof v === 'string') answers[k] = v.slice(0, 60)
      else if (Array.isArray(v)) answers[k] = v.filter(x => typeof x === 'string').slice(0, 12).map(x => (x as string).slice(0, 60))
    }
    const result = assess(answers)
    const business = str(a.business, 160), website = str(a.website, 300)
    const { rec, by } = await recommendRise({ name, business, website }, answers, result)
    const lead = addWfhLead({
      kind: 'assessment', name, email, business, website, answers,
      result: { score: result.score, level: result.level, hours_per_month: result.hours_per_month, top: result.top.map(o => o.title), next_step: result.next_step },
      recommendation: { ...rec, by },
      service: 'ai-integration',
    })
    logActivity({ type: 'note', title: `🤖 AI questionnaire — ${name}${business ? ` (${business})` : ''}`, detail: `Recommended: ${rec.features.map(f => f.name).join(', ')} · score ${result.score}`, icon: '🤖', source: 'wfh' })
    const bookUrl = "https://www.aiworksforher.com/meet?service=ai-integration"
    // Emails go out in the background so she sees her recommendation right away.
    void (async () => {
      await ghlContact({ name, email, tag: 'wfh-ai-assessment', source: 'WFH AI questionnaire' })
      await ghlEmail({ name, email }, 'Your personalized RISE recommendation', clientEmailHtml(name, rec, bookUrl), 'WFH AI questionnaire')
      await ghlEmail({ name: 'Mandi Beck', email: NOTIFY_EMAIL }, `New AI questionnaire: ${name}${business ? ` (${business})` : ''}`, mandiLeadHtml({ name, email, business, website }, answers, result, rec, by, bookUrl), 'WFH notices')
    })()
    return NextResponse.json({ ok: true, lead_id: lead.id, recommendation: rec })
  }

  if (body.book) {
    const b = body.book
    const name = str(b.name, 120), email = str(b.email, 160)
    if (!b?.date || !b?.time || !name || !validEmail(email)) {
      return NextResponse.json({ error: 'Please add your name, a valid email, and pick a time.' }, { status: 400 })
    }
    const { booking, error } = addWfhBooking({
      date: str(b.date, 10), time: str(b.time, 5), end: str(b.end, 5) || undefined,
      name, email, phone: str(b.phone, 40), business: str(b.business, 160),
      service: str(b.service, 40), notes: str(b.notes, 1500), lead_id: str(b.lead_id, 20) || undefined,
    })
    if (error) return NextResponse.json({ error }, { status: 409 })
    logActivity({ type: 'note', title: `📅 WFH meeting booked — ${booking!.name}`, detail: `${booking!.date} ${booking!.time} CT · ${serviceLabel(booking!.service)}${booking!.business ? ` · ${booking!.business}` : ''}`, icon: '📅', source: 'wfh' })
    const bk = booking!
    void (async () => {
      await ghlContact({ name, email, phone: bk.phone, tag: 'wfh-meeting-booked', source: `WFH booking · ${serviceLabel(bk.service)}` })
      await ghlEmail({ name: 'Mandi Beck', email: NOTIFY_EMAIL }, `New call booked: ${bk.name} · ${bk.date} ${bk.time} CT`,
        `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6"><h2 style="font-family:Georgia,serif">New call booked</h2><p><b>${esc(bk.name)}</b> booked <b>${esc(serviceLabel(bk.service))}</b><br>${esc(bk.date)} at ${esc(bk.time)} CT</p><p>Email: ${esc(bk.email)}<br>Phone: ${esc(bk.phone || '—')}<br>Business: ${esc(bk.business || '—')}</p>${bk.notes ? `<p>Notes: ${esc(bk.notes)}</p>` : ''}${bk.lead_id ? '<p>They took the AI questionnaire first; their recommendation is in your earlier email.</p>' : ''}<p>Send them the Google Meet link.</p></div>`, 'WFH notices')
    })()
    return NextResponse.json({ ok: true, booking })
  }

  if (Array.isArray(body.weekly)) {
    if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const weekly = body.weekly
      .filter((w: { dow?: number; time?: string }) => typeof w?.dow === 'number' && typeof w?.time === 'string')
      .map((w: { dow: number; time: string; end?: string }) => ({ dow: w.dow, time: w.time, ...(w.end ? { end: String(w.end) } : {}) }))
    return NextResponse.json({ ok: true, schedule: setWfhWeekly(weekly, typeof body.from === 'string' ? body.from : undefined) })
  }

  return NextResponse.json({ error: 'nothing to do' }, { status: 400 })
}

export function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json({ ok: removeWfhBooking(id) })
}
