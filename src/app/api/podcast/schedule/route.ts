import { NextRequest, NextResponse } from 'next/server'
import { getPodcastSchedule, setPodcastWeekly, addPodcastBooking, removePodcastBooking, logActivity, getPodcastGuests, updatePodcastGuest, createPodcastGuest, type PodcastBooking } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PODCAST GUEST SCHEDULER.
// GET            → public: { weekly, booked:[{date,time}] } (no guest PII)
// GET ?admin=1   → her view: full bookings with contact details
// POST {book}    → create a guest booking
// POST {weekly}  → set her available weekly slot(s)
// DELETE ?id=    → remove a booking (frees the slot)
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
    linkToGuestCard(booking!)
    await notifyGhl(booking!)
    return NextResponse.json({ ok: true, booking })
  }

  return NextResponse.json({ error: 'nothing to do' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json({ ok: removePodcastBooking(id) })
}

// Tie a booking to her Guests card — match on email, then on name — and check
// "Booking link sent" + "Scheduled". No card yet? Start one so nobody slips through.
function linkToGuestCard(b: PodcastBooking) {
  const norm = (t?: string) => (t ?? '').trim().toLowerCase()
  const guests = getPodcastGuests()
  const match = guests.find(g => norm(g.email) && norm(g.email) === norm(b.email))
    ?? guests.find(g => norm(g.name) === norm(b.name) || (norm(b.name).length > 3 && norm(g.name).includes(norm(b.name))))
  const today = new Date().toISOString().slice(0, 10)
  const line = `Booked via /book on ${today}: records ${b.date} ${b.time}${b.notes ? ` · Notes: ${b.notes}` : ''}${b.link ? ` · ${b.link}` : ''}`
  if (match) {
    updatePodcastGuest(match.id, {
      email: match.email || b.email,
      stages: { ...match.stages, link_sent: match.stages?.link_sent ?? today, scheduled: today },
      notes: [match.notes, line].filter(Boolean).join('\n'),
    })
  } else {
    createPodcastGuest({ name: b.name, email: b.email, tier: 'Tier 0 · booked', contact_notes: [b.socials, b.phone].filter(Boolean).join(' · '), stages: { link_sent: today, scheduled: today }, notes: line })
  }
}

// Put the guest in GoHighLevel tagged "podcast-guest-booked". A GHL workflow
// (trigger: Contact Tag Added → podcast-guest-booked; action: Send Internal
// Notification) turns that into an email/text to Mandi. Best effort — a GHL hiccup
// never blocks the guest's booking.
async function notifyGhl(b: PodcastBooking) {
  const token = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!token || !locationId) return
  const [firstName, ...rest] = b.name.trim().split(/\s+/)
  try {
    const res = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, email: b.email, firstName, lastName: rest.join(' '), ...(b.phone ? { phone: b.phone } : {}), tags: ['podcast-guest-booked'], source: 'AI Mom podcast booking' }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) logActivity({ type: 'note', title: `⚠ GHL booking notice failed (${res.status})`, detail: (await res.text()).slice(0, 200), icon: '⚠️', source: 'podcast-scheduler' })
  } catch (e) {
    logActivity({ type: 'note', title: '⚠ GHL booking notice failed', detail: e instanceof Error ? e.message : 'network error', icon: '⚠️', source: 'podcast-scheduler' })
  }
}
