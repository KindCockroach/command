'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Mail, Send, Sparkles, Copy, Check, X, CalendarClock, Bell, Trash2, CalendarPlus, MessageSquarePlus, Eye } from 'lucide-react'

// GUESTS ADMIN — the back office for podcast guests: every booking (reschedule,
// cancel, remind, add to calendar), an email composer (templates, AI draft, send
// through GoHighLevel, or open in her mail app), and one communications log across
// every guest. Availability still lives at /book/manage.
type Comm = { id: string; at: string; channel: string; direction: 'in' | 'out'; subject?: string; body: string; status: string; booking_id?: string; error?: string }
type Guest = { id: string; name: string; show: string; email?: string; comms?: Comm[] }
type Booking = { id: string; date: string; time: string; name: string; email: string; phone?: string; socials?: string; comm_method?: string; link?: string; notes?: string; guest_id?: string; seen_at?: string; reminded_at?: string; created_at: string }
type Slot = { dow: number; time: string; end?: string }
type Kind = 'confirm' | 'prep' | 'reminder' | 'reschedule' | 'thanks' | 'live' | 'followup'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtTime = (t: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}` }
const fmtDate = (d: string) => { const x = new Date(d + 'T00:00'); return `${DOW[x.getDay()]} ${MON[x.getMonth()]} ${x.getDate()}` }
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const label = { fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-subtle)' }
const input = { width: '100%', border: '1px solid var(--border)', borderRadius: '9px', padding: '7px 10px', fontSize: '12.5px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }
const small = (color = 'var(--text-muted)') => ({ border: '1px solid var(--border)', background: 'var(--bg)', color, borderRadius: '8px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' })

function gcal(b: Booking): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(b.time || '10:00'); const h = m ? +m[1] : 10; const mm = m ? m[2] : '00'
  const d = b.date.replace(/-/g, '')
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `AI Mom Podcast — ${b.name}`, details: `Guest: ${b.name}\nEmail: ${b.email}\nPhone: ${b.phone || ''}\nReach via: ${b.comm_method || ''}`, ctz: 'America/Chicago', dates: `${d}T${String(h).padStart(2, '0')}${mm}00/${d}T${String(h + 1).padStart(2, '0')}${mm}00` })
  return `https://calendar.google.com/calendar/render?${p}`
}

const SIGN = "Let's roar,\nMandi Beck\nAI Mom Podcast | aiworksforher.com"
function template(kind: Kind, name: string, b?: Booking): { subject: string; body: string } {
  const first = name.split(/\s+/)[0] || 'there'
  const when = b ? `${fmtDate(b.date)} at ${fmtTime(b.time)} CT` : '[DATE] at [TIME] CT'
  switch (kind) {
    case 'confirm': return { subject: `You're booked: AI Mom Podcast, ${b ? fmtDate(b.date) : '[DATE]'}`, body: `Hi ${first},\n\nYou're on the calendar: ${when}. We'll record on Riverside, and I'll send the link the day before. Plan on about 40 minutes.\n\nThe whole conversation hangs on one question: what has AI changed in your life, and what are you refusing to hand over?\n\nCan't wait.\n\n${SIGN}` }
    case 'prep': return { subject: 'Quick prep for our episode', body: `Hi ${first},\n\nA few things so we hit the ground running on ${when}:\n\n1. Send 3 to 5 questions your audience asks you most. I'll build the episode around them.\n2. A headshot and the links you want in the show notes.\n3. One thing you want every listener to walk away and DO.\n\nThat's it. You bring you; I'll bring the rest.\n\n${SIGN}` }
    case 'reminder': return { subject: `Reminder: AI Mom Podcast, ${when}`, body: `Hi ${first},\n\nQuick reminder: we record ${when}.\n\nRiverside link: [RIVERSIDE LINK]\n\nGrab headphones and a quiet spot, and come as you are. See you there.\n\n${SIGN}` }
    case 'reschedule': return { subject: `New time: ${when}`, body: `Hi ${first},\n\nThank you for rolling with the change. We're now set for ${when}. Same Riverside setup; I'll send the link the day before.\n\n${SIGN}` }
    case 'thanks': return { subject: 'Thank you. That was a good one.', body: `Hi ${first},\n\nThank you for showing up so fully. That conversation is going to land.\n\nYour share kit (clips, captions, and a quote card) is coming within 48 hours, and I'll send the live link the moment it posts.\n\n${SIGN}` }
    case 'live': return { subject: "We're live: your AI Mom episode", body: `Hi ${first},\n\nIt's live: [EPISODE LINK]\n\nYour share kit is attached and ready to post. If you share it with your people, tag @aimompodcast and I'll reshare.\n\n${SIGN}` }
    default: return { subject: 'Following up', body: `Hi ${first},\n\nBumping this to the top of your inbox. "Yes," "not now" and "no" are all great answers. I just don't want to leave you hanging.\n\n${SIGN}` }
  }
}
const KIND_LABEL: Record<Kind, string> = { confirm: 'Confirmation', prep: 'Prep + FAQ ask', reminder: 'Reminder', reschedule: 'Reschedule', thanks: 'Thank you', live: 'Episode is live', followup: 'Follow-up' }

type Draft = { guestId: string; bookingId?: string; kind: Kind; to: string; subject: string; body: string }

export default function GuestsAdmin() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [weekly, setWeekly] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<'' | 'ai' | 'send' | 'save'>('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [moving, setMoving] = useState<{ id: string; date: string; time: string } | null>(null)
  const [logFilter, setLogFilter] = useState('')
  const [entry, setEntry] = useState({ guestId: '', channel: 'dm', direction: 'out', body: '' })

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/podcast/guests').then(r => r.json()).catch(() => ({})),
      fetch('/api/podcast/schedule?admin=1').then(r => r.json()).catch(() => ({})),
    ]).then(([g, s]) => {
      setGuests(Array.isArray(g.guests) ? g.guests : [])
      setBookings(Array.isArray(s.bookings) ? s.bookings : [])
      setWeekly(Array.isArray(s.weekly) ? s.weekly : [])
    }).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const guestFor = (b: Booking) => guests.find(g => g.id === b.guest_id) ?? guests.find(g => g.email && g.email.toLowerCase() === b.email.toLowerCase())
  const today = todayStr()
  const upcoming = bookings.filter(b => b.date >= today)
  const past = bookings.filter(b => b.date < today).reverse()

  const patchBooking = async (id: string, body: Record<string, unknown>) => {
    const d = await fetch('/api/podcast/schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) }).then(r => r.json()).catch(() => ({ error: 'network error' }))
    if (d.error) { alert(d.error); return false }
    load(); return true
  }
  const cancel = async (b: Booking) => {
    if (!confirm(`Cancel ${b.name}'s booking on ${fmtDate(b.date)}? This frees the slot. Her guest card stays.`)) return
    await fetch(`/api/podcast/schedule?id=${b.id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }
  const reschedule = async () => {
    if (!moving) return
    const b = bookings.find(x => x.id === moving.id)
    const ok = await patchBooking(moving.id, { date: moving.date, time: moving.time })
    if (ok && b) {
      const g = guestFor(b)
      const nb = { ...b, date: moving.date, time: moving.time }
      if (g) compose(g, 'reschedule', nb)
    }
    setMoving(null)
  }

  const compose = (g: Guest, kind: Kind, b?: Booking) => {
    const t = template(kind, g.name, b)
    setMsg(''); setDraft({ guestId: g.id, bookingId: b?.id, kind, to: g.email || b?.email || '', ...t })
  }
  const aiDraft = async () => {
    if (!draft) return
    setBusy('ai'); setMsg('')
    const d = await fetch('/api/podcast/guests/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'draft', guest_id: draft.guestId, booking_id: draft.bookingId, kind: draft.kind }) }).then(r => r.json()).catch(() => ({ error: 'network error' }))
    if (d.error) setMsg(`⚠ ${d.error}`); else setDraft({ ...draft, subject: d.subject || draft.subject, body: d.body || draft.body })
    setBusy('')
  }
  const send = async () => {
    if (!draft) return
    if (!confirm(`Send "${draft.subject}" to ${draft.to}?`)) return
    setBusy('send'); setMsg('')
    const d = await fetch('/api/podcast/guests/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', guest_id: draft.guestId, booking_id: draft.bookingId, kind: draft.kind, to: draft.to, subject: draft.subject, body: draft.body }) }).then(r => r.json()).catch(() => ({ error: 'network error' }))
    setBusy('')
    if (d.error) { setMsg(`⚠ Not sent: ${d.error}. Use "Open in email" instead; the attempt is logged.`); load(); return }
    setDraft(null); load()
  }
  const saveDraft = async () => {
    if (!draft) return
    setBusy('save')
    await fetch('/api/podcast/guests/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'comm', guest_id: draft.guestId, booking_id: draft.bookingId, channel: 'email', direction: 'out', status: 'drafted', subject: draft.subject, body: draft.body }) }).catch(() => {})
    setBusy(''); setDraft(null); load()
  }
  const logEntry = async () => {
    if (!entry.guestId || !entry.body.trim()) return
    await fetch('/api/podcast/guests/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'comm', guest_id: entry.guestId, channel: entry.channel, direction: entry.direction, body: entry.body }) }).catch(() => {})
    setEntry({ ...entry, body: '' }); load()
  }

  const allComms = guests.flatMap(g => (g.comms ?? []).map(c => ({ ...c, guest: g })))
    .filter(c => !logFilter || c.guest.id === logFilter)
    .sort((a, b) => b.at.localeCompare(a.at))
  const slotsFor = (date: string) => weekly.filter(w => w.dow === new Date(date + 'T00:00').getDay())

  if (loading) return <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading the back office…</div>

  const bookingRow = (b: Booking) => {
    const g = guestFor(b)
    const isMoving = moving?.id === b.id
    return (
      <div key={b.id} style={{ borderTop: '1px solid var(--border)', padding: '11px 0', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{b.name}{!b.seen_at && <span style={{ marginLeft: '7px', fontSize: '10px', fontWeight: 800, color: '#fff', background: '#C2477E', borderRadius: '999px', padding: '2px 7px' }}>NEW</span>}</p>
            <p style={{ fontSize: '12.5px', color: 'var(--purple)', fontWeight: 700, marginTop: '2px' }}>{fmtDate(b.date)} · {fmtTime(b.time)} CT{b.reminded_at ? <span style={{ color: 'var(--text-subtle)', fontWeight: 600 }}> · reminded {b.reminded_at.slice(0, 10)}</span> : null}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{b.email}{b.phone ? ` · ${b.phone}` : ''}{b.comm_method ? ` · reach via ${b.comm_method}` : ''}</p>
            {b.socials ? <p style={{ fontSize: '11.5px', color: 'var(--text-subtle)' }}>{b.socials}</p> : null}
            {b.notes ? <p style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>“{b.notes}”</p> : null}
            {!g && <p style={{ fontSize: '11px', color: '#C2477E', marginTop: '3px' }}>No guest card linked.</p>}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {!b.seen_at && <button onClick={() => patchBooking(b.id, { seen: true })} style={small()}><Eye size={11} /> Mark seen</button>}
            {g && <button onClick={() => compose(g, 'reminder', b)} style={small('#C2477E')}><Bell size={11} /> Reminder</button>}
            {g && <button onClick={() => compose(g, 'confirm', b)} style={small('var(--purple)')}><Mail size={11} /> Email</button>}
            <button onClick={() => setMoving(isMoving ? null : { id: b.id, date: b.date, time: b.time })} style={small()}><CalendarClock size={11} /> Reschedule</button>
            <a href={gcal(b)} target="_blank" rel="noreferrer" style={{ ...small(), textDecoration: 'none' }}><CalendarPlus size={11} /> Calendar</a>
            <button onClick={() => cancel(b)} style={small('#C2477E')}><Trash2 size={11} /> Cancel</button>
          </div>
        </div>
        {isMoving && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg)', borderRadius: '10px', padding: '9px' }}>
            <input type="date" value={moving.date} onChange={e => setMoving({ ...moving, date: e.target.value })} style={{ ...input, width: '150px' }} />
            {slotsFor(moving.date).length > 0 ? (
              <select value={moving.time} onChange={e => setMoving({ ...moving, time: e.target.value })} style={{ ...input, width: '150px' }}>
                {!slotsFor(moving.date).some(s => s.time === moving.time) && <option value={moving.time}>{fmtTime(moving.time)}</option>}
                {slotsFor(moving.date).map(s => <option key={s.time} value={s.time}>{fmtTime(s.time)}</option>)}
              </select>
            ) : <input type="time" value={moving.time} onChange={e => setMoving({ ...moving, time: e.target.value })} style={{ ...input, width: '130px' }} />}
            <button onClick={reschedule} style={{ ...small('#fff'), background: 'var(--purple)', border: 'none' }}>Move it + draft the note</button>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{slotsFor(moving.date).length ? 'Your open slots for that day' : 'Not one of your weekly slots; any time works'}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Bookings */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{ ...label, fontSize: '11.5px' }}>Bookings · {upcoming.length} upcoming</p>
          <a href="/book/manage" target="_blank" rel="noreferrer" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', textDecoration: 'none' }}>Edit weekly availability →</a>
        </div>
        {upcoming.length === 0 ? <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', marginTop: '10px' }}>No upcoming bookings. Share aiworksforher.com/book.</p> : upcoming.map(bookingRow)}
        {past.length > 0 && (
          <details style={{ marginTop: '8px' }}>
            <summary style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer' }}>Past bookings ({past.length})</summary>
            {past.map(bookingRow)}
          </details>
        )}
      </div>

      {/* Compose for any guest */}
      <div style={{ ...card, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <p style={{ ...label, fontSize: '11.5px' }}>Draft an email to</p>
        <select defaultValue="" onChange={e => { const g = guests.find(x => x.id === e.target.value); if (g) compose(g, 'followup'); e.target.value = '' }} style={{ ...input, width: 'auto', minWidth: '220px' }}>
          <option value="" disabled>Choose a guest…</option>
          {guests.map(g => <option key={g.id} value={g.id}>{g.name}{g.show ? ` · ${g.show}` : ''}</option>)}
        </select>
      </div>

      {/* Communications log */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <p style={{ ...label, fontSize: '11.5px' }}>Communications</p>
          <select value={logFilter} onChange={e => setLogFilter(e.target.value)} style={{ ...input, width: 'auto' }}>
            <option value="">Every guest</option>
            {guests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '12px' }}>
          <select value={entry.guestId} onChange={e => setEntry({ ...entry, guestId: e.target.value })} style={{ ...input, width: 'auto' }}>
            <option value="">Guest…</option>
            {guests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={entry.channel} onChange={e => setEntry({ ...entry, channel: e.target.value })} style={{ ...input, width: 'auto' }}>
            {['dm', 'text', 'email', 'call', 'note'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <select value={entry.direction} onChange={e => setEntry({ ...entry, direction: e.target.value })} style={{ ...input, width: 'auto' }}>
            <option value="out">I sent</option><option value="in">She sent</option>
          </select>
          <input value={entry.body} onChange={e => setEntry({ ...entry, body: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') logEntry() }} placeholder="What was said" style={{ ...input, flex: 1, minWidth: '180px' }} />
          <button onClick={logEntry} disabled={!entry.guestId || !entry.body.trim()} style={{ ...small('#fff'), background: 'var(--purple)', border: 'none' }}><MessageSquarePlus size={11} /> Log it</button>
        </div>
        {allComms.length === 0 ? <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)' }}>Nothing logged yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {allComms.map(c => (
              <div key={c.id} style={{ background: 'var(--bg)', borderRadius: '10px', padding: '9px 11px', borderLeft: `3px solid ${c.status === 'failed' ? '#C2477E' : c.direction === 'in' ? '#2E9E6B' : 'var(--purple)'}` }}>
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 700 }}>{c.at.slice(0, 16).replace('T', ' ')} · {c.guest.name} · {c.direction === 'in' ? 'from her' : 'to her'} · {c.channel.toUpperCase()} · {c.status}</p>
                {c.subject ? <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>{c.subject}</p> : null}
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'pre-wrap', maxHeight: '90px', overflow: 'hidden' }}>{c.body}</p>
                {c.error ? <p style={{ fontSize: '11px', color: '#C2477E', marginTop: '3px' }}>{c.error}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      {draft && (
        <div onClick={() => setDraft(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,40,0.6)', zIndex: 110, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 18px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '18px', padding: '22px', maxWidth: '640px', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>Email {guests.find(g => g.id === draft.guestId)?.name}</h2>
              <button onClick={() => setDraft(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={draft.kind} onChange={e => { const kind = e.target.value as Kind; const g = guests.find(x => x.id === draft.guestId); const b = bookings.find(x => x.id === draft.bookingId); setDraft({ ...draft, kind, ...template(kind, g?.name || '', b) }) }} style={{ ...input, width: 'auto' }}>
                {(Object.keys(KIND_LABEL) as Kind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
              <button onClick={aiDraft} disabled={!!busy} style={small('var(--purple)')}>{busy === 'ai' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />} Draft with AI</button>
            </div>
            <input value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} placeholder="To (email)" style={input} />
            <input value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} placeholder="Subject" style={input} />
            <textarea value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} rows={13} style={{ ...input, fontSize: '13px', lineHeight: 1.55, resize: 'vertical' }} />
            {msg && <p style={{ fontSize: '12px', color: '#C2477E' }}>{msg}</p>}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={send} disabled={!!busy || !draft.to} style={{ ...small('#fff'), background: 'var(--purple)', border: 'none', padding: '8px 14px', fontSize: '12.5px' }}>{busy === 'send' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />} Send through GHL</button>
              {draft.to && <a href={`mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`} style={{ ...small('var(--purple)'), textDecoration: 'none', padding: '8px 14px' }}><Mail size={12} /> Open in email</a>}
              <button onClick={async () => { try { await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* ignore */ } }} style={{ ...small(), padding: '8px 14px' }}>{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}</button>
              <button onClick={saveDraft} disabled={!!busy} style={{ ...small(), padding: '8px 14px' }}>Save as draft</button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>&ldquo;Open in email&rdquo; uses your mail app; log it below once it&rsquo;s sent. GHL sends are logged automatically.</p>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
