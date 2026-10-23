import { NextRequest, NextResponse } from 'next/server'
import { getPodcastSchedule, setPodcastWeekly, addPodcastBooking, logActivity } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PODCAST GUEST SCHEDULER.
// GET            → public: { weekly, booked:[{date,time}] } (no guest PII)
// GET ?admin=1   → her view: full bookings with contact details
// POST {book}    → create a guest booking
// POST {weekly}  → set her available weekly slot(s)
export function GET(req: NextRequest) {
  const admin = new URL(req.url).searchParams.get('admin') === '1'
  const s = getPodcastSchedule()
  if (admin) return NextResponse.json({ weekly: s.weekly, from: s.from ?? null, bookings: s.booked.slice().sort((a, b) => a.date.localeCompare(b.date)) })
  return NextResponse.json({ weekly: s.weekly, from: s.from ?? null, booked: s.booked.map(b => ({ date: b.date, time: b.time })) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (Array.isArray(body.weekly)) {
    const weekly = body.weekly
      .filter((w: { dow?: number; time?: string }) => typeof w?.dow === 'number' && typeof w?.time === 'string')
      .map((w: { dow: number; time: string; end?: string }) => ({ dow: w.dow, time: w.time, ...(w.end ? { end: String(w.end) } : {}) }))
    return NextResponse.json({ ok: true, schedule: setPodcastWeekly(weekly, typeof body.from === 'string' ? body.from : undefined) })
  }

  if (body.book) {
    const b = body.book
    if (!b?.date || !b?.time || !b?.name || !b?.email) {
      return NextResponse.json({ error: 'Name, email, date and time are required.' }, { status: 400 })
    }
    const { booking, error } = addPodcastBooking({
      date: String(b.date), time: String(b.time),
      name: String(b.name).slice(0, 120), email: String(b.email).slice(0, 160),
      phone: b.phone ? String(b.phone).slice(0, 40) : '',
      socials: b.socials ? String(b.socials).slice(0, 300) : '',
      comm_method: b.comm_method ? String(b.comm_method).slice(0, 40) : '',
      link: b.link ? String(b.link).slice(0, 400) : '',
      notes: b.notes ? String(b.notes).slice(0, 1500) : '',
    })
    if (error) return NextResponse.json({ error }, { status: 409 })
    logActivity({ type: 'note', title: `🎙️ Podcast guest booked — ${booking!.name}`, detail: `${booking!.date} ${booking!.time} · ${booking!.comm_method || booking!.email}`, icon: '🎙️', source: 'podcast-scheduler' })
    return NextResponse.json({ ok: true, booking })
  }

  return NextResponse.json({ error: 'nothing to do' }, { status: 400 })
}
