import { NextRequest, NextResponse } from 'next/server'
import { getWfhSchedule, setWfhWeekly, addWfhBooking, removeWfhBooking, addWfhLead, getWfhLeads, getPodcastSchedule, logActivity } from '@/lib/db'
import { assess, serviceLabel, type Answers } from '@/lib/wfh'

export const dynamic = 'force-dynamic'

// WFH (Works For Her) — the public aiworksforher.com funnel.
// GET               → public: { weekly, from, booked:[{date,time}] } (no client PII)
// GET ?admin=1      → hers: bookings + leads with contact details
// POST {assess}     → score the AI integration questionnaire, save the lead → { lead_id, result }
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
    const lead = addWfhLead({
      kind: 'assessment', name, email, business: str(a.business, 160), website: str(a.website, 300), answers,
      result: { score: result.score, level: result.level, hours_per_month: result.hours_per_month, top: result.top.map(o => o.title), next_step: result.next_step },
      service: 'ai-integration',
    })
    logActivity({ type: 'note', title: `🤖 AI assessment — ${name}${lead.business ? ` (${lead.business})` : ''}`, detail: `Score ${result.score} · ~${result.hours_per_month} hrs/mo · ${result.top.map(o => o.title).join(', ')}`, icon: '🤖', source: 'wfh' })
    await tagInGhl({ name, email, tag: 'wfh-ai-assessment', source: 'WFH AI assessment' })
    return NextResponse.json({ ok: true, lead_id: lead.id, result })
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
    await tagInGhl({ name, email, phone: booking!.phone, tag: 'wfh-meeting-booked', source: `WFH booking · ${serviceLabel(booking!.service)}` })
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

// Upsert the contact into GoHighLevel with a tag. A GHL workflow on that tag
// (Contact Tag Added → Send Internal Notification) pings Mandi. Best effort.
async function tagInGhl(c: { name: string; email: string; phone?: string; tag: string; source: string }) {
  const token = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!token || !locationId) return
  const [firstName, ...rest] = c.name.trim().split(/\s+/)
  try {
    const res = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, email: c.email, firstName, lastName: rest.join(' '), ...(c.phone ? { phone: c.phone } : {}), tags: [c.tag], source: c.source }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) logActivity({ type: 'note', title: `⚠ GHL tag failed (${res.status})`, detail: (await res.text()).slice(0, 200), icon: '⚠️', source: 'wfh' })
  } catch (e) {
    logActivity({ type: 'note', title: '⚠ GHL tag failed', detail: e instanceof Error ? e.message : 'network error', icon: '⚠️', source: 'wfh' })
  }
}
