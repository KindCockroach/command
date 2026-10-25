import { NextRequest, NextResponse } from 'next/server'
import { getPodcastGuests, getPodcastSchedule, addGuestComm, updatePodcastBooking, logActivity, type GuestComm } from '@/lib/db'
import { fableText } from '@/lib/fable'
import { parseKit } from '@/lib/jsonkit'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// GUESTS ADMIN — the back office for podcast guests. One POST, three actions:
//  • comm  — log a touchpoint by hand (a DM, a text, a call, a note)
//  • draft — have the writer draft an email (confirmation, reminder, prep, …)
//  • send  — send an email to the guest through GoHighLevel and log it
// Every send and draft lands in the guest's communications log.

const GHL_BASE = 'https://services.leadconnectorhq.com'

const KINDS: Record<string, string> = {
  confirm: 'a booking confirmation: the date and time (Central), that it records on Riverside (link coming), roughly 40 minutes, and what to expect',
  prep: 'a prep note: the one question the episode is built on ("what has AI changed in your life, and what are you refusing to hand over?"), asks for 3-5 FAQs from her audience, a headshot and her links for the show notes',
  reminder: 'a friendly reminder for an upcoming recording: date and time (Central), the Riverside link placeholder [RIVERSIDE LINK], a quiet spot and headphones',
  reschedule: 'a reschedule note confirming the NEW date and time (Central) and thanking her for flexibility',
  thanks: 'a thank-you after recording: when it goes live, and that her share kit (clips, captions, a quote card) is coming within 48 hours',
  live: 'an episode-is-live note: the link placeholder [EPISODE LINK], her share kit, and an invitation to share it with her audience',
  followup: 'a short, warm follow-up nudge on an earlier message',
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function ghlSendEmail(to: string, name: string, subject: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!token || !locationId) return { ok: false, error: 'GHL is not connected (GHL_API_KEY / GHL_LOCATION_ID missing).' }
  const [firstName, ...rest] = name.trim().split(/\s+/)
  const up = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId, email: to, firstName, lastName: rest.join(' '), source: 'AI Mom podcast guests' }),
    signal: AbortSignal.timeout(10000),
  })
  if (!up.ok) return { ok: false, error: `GHL contact (${up.status}): ${(await up.text()).slice(0, 200)}` }
  const contactId = (await up.json())?.contact?.id
  if (!contactId) return { ok: false, error: 'GHL returned no contact id.' }
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55">${esc(body).replace(/\n/g, '<br>')}</div>`
  const res = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Version: '2021-04-15', 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'Email', contactId, subject, html }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return { ok: false, error: `GHL send (${res.status}): ${(await res.text()).slice(0, 200)}` }
  return { ok: true }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const guest = getPodcastGuests().find(g => g.id === body.guest_id)
  if (!guest) return NextResponse.json({ error: 'guest not found' }, { status: 404 })
  const booking = body.booking_id ? getPodcastSchedule().booked.find(b => b.id === body.booking_id) : undefined

  if (body.action === 'comm') {
    const comm: Omit<GuestComm, 'id' | 'at'> = {
      channel: ['email', 'dm', 'text', 'call', 'note'].includes(body.channel) ? body.channel : 'note',
      direction: body.direction === 'in' ? 'in' : 'out',
      subject: body.subject ? String(body.subject).slice(0, 200) : undefined,
      body: String(body.body || '').slice(0, 5000),
      status: body.status === 'drafted' ? 'drafted' : 'logged',
      booking_id: booking?.id,
    }
    if (!comm.body.trim()) return NextResponse.json({ error: 'write something to log' }, { status: 400 })
    return NextResponse.json({ ok: true, guest: addGuestComm(guest.id, comm) })
  }

  if (body.action === 'draft') {
    const kind = KINDS[body.kind] ? body.kind : 'followup'
    const instructions = `You write emails from Mandi Beck, host of the AI Mom Podcast, to a podcast guest. Voice: warm, direct, a little playful, confident; short sentences; no fluff, no exclamation-point pileups. Sign off "Let's roar,\\nMandi Beck\\nAI Mom Podcast | aiworksforher.com". Write ${KINDS[kind]}. Use [BRACKETS] for anything you don't know. Times are Central (CT). Return ONLY JSON: {"subject": "...", "body": "..."} (plain text body, real line breaks).`
    const recent = (guest.comms ?? []).slice(-5).map(c => `${c.at.slice(0, 10)} ${c.direction} ${c.channel}: ${(c.subject ? c.subject + ' — ' : '') + c.body.slice(0, 300)}`).join('\n')
    const input = `GUEST: ${guest.name}${guest.show ? ` (${guest.show})` : ''}\n${booking ? `BOOKING: ${booking.date} at ${booking.time} CT\n` : ''}WHY SHE'S ON: ${guest.why || ''}\nNOTES: ${guest.notes || ''}\n${recent ? `RECENT COMMUNICATIONS:\n${recent}\n` : ''}${body.steer ? `MANDI'S STEER: ${body.steer}\n` : ''}`
    try {
      const raw = await fableText({ instructions, input, maxTokens: 1500, json: true, useClaude: true })
        .catch(() => fableText({ instructions, input, maxTokens: 1500, json: true }))
      const out = await parseKit(raw)
      if (!out) return NextResponse.json({ error: 'The draft came back garbled — try again.' }, { status: 502 })
      return NextResponse.json({ ok: true, subject: String(out.subject || ''), body: String(out.body || '') })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'draft failed' }, { status: 502 })
    }
  }

  if (body.action === 'send') {
    const to = String(body.to || guest.email || '').trim()
    const subject = String(body.subject || '').trim()
    const text = String(body.body || '').trim()
    if (!to || !subject || !text) return NextResponse.json({ error: 'To, subject and message are all required.' }, { status: 400 })
    const sent = await ghlSendEmail(to, guest.name, subject, text).catch(e => ({ ok: false, error: e instanceof Error ? e.message : 'send failed' }))
    const updated = addGuestComm(guest.id, { channel: 'email', direction: 'out', subject, body: text, status: sent.ok ? 'sent' : 'failed', booking_id: booking?.id, error: sent.ok ? undefined : sent.error })
    if (sent.ok && body.kind === 'reminder' && booking) updatePodcastBooking(booking.id, { reminded_at: new Date().toISOString() })
    if (sent.ok) logActivity({ type: 'note', title: `✉️ Email sent to ${guest.name}`, detail: subject, icon: '✉️', source: 'podcast-guests' })
    return NextResponse.json(sent.ok ? { ok: true, guest: updated } : { error: sent.error, guest: updated }, { status: sent.ok ? 200 : 502 })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
