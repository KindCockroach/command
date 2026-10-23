'use client'
import { useState, useEffect } from 'react'

// PODCAST GUEST SCHEDULER (public). A guest scrolls a monthly calendar, picks one of
// Mandi's available weekly slots, fills their details, and lands on a warm thank-you
// with her bio + socials. Cream + purple, lots of whitespace, the balloon. No RISE chrome.

type Weekly = { dow: number; time: string; end?: string }
const PURPLE = '#6B5BD4'
const CREAM = '#FBF7F1'
const INK = '#2E2A3F'

const COMM_OPTIONS = ['Instagram DM', 'Facebook Messenger', 'Text message', 'Email', 'WhatsApp', 'Other']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmtTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '')
  if (!m) return t
  let h = parseInt(m[1], 10); const min = m[2]; const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${min} ${ap}`
}
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function gcalLink(date: string, time: string, name: string, endTime?: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '20:00')
  const hh = String(m ? +m[1] : 20).padStart(2, '0'); const mm = m ? m[2] : '00'
  const start = `${date.replace(/-/g, '')}T${hh}${mm}00`
  const em = endTime ? /^(\d{1,2}):(\d{2})/.exec(endTime) : null
  const endH = String(em ? +em[1] : (m ? +m[1] : 20) + 1).padStart(2, '0')
  const endM = em ? em[2] : mm
  const end = `${date.replace(/-/g, '')}T${endH}${endM}00`
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `AI Mom Podcast — ${name}`, details: 'Podcast interview with Mandi Beck.', ctz: 'America/Chicago', dates: `${start}/${end}` })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export default function BookPage() {
  const [weekly, setWeekly] = useState<Weekly[]>([])
  const [from, setFrom] = useState<string | null>(null)
  const [bookedSet, setBookedSet] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [picked, setPicked] = useState<{ date: string; time: string; end?: string } | null>(null)
  const [dayPick, setDayPick] = useState<{ date: string; slots: Weekly[] } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', instagram: '', tiktok: '', youtube: '', facebook: '', linkedin: '', link: '', notes: '', comm_method: 'Instagram DM', comm_other: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<{ date: string; time: string; name: string; end?: string } | null>(null)

  useEffect(() => {
    document.title = 'Be a guest · AI Mom Podcast'
    fetch('/api/podcast/schedule').then(r => r.json()).then(d => {
      setWeekly(Array.isArray(d.weekly) ? d.weekly : [])
      setFrom(d.from || null)
      setBookedSet(new Set((d.booked || []).map((b: { date: string; time: string }) => `${b.date}@${b.time}`)))
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  // One account may have multiple slots on the same day; collect them all per dow.
  const dowSlots = new Map<number, Weekly[]>()
  weekly.forEach(w => { const a = dowSlots.get(w.dow) ?? []; a.push(w); dowSlots.set(w.dow, a) })
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const slotsFor = (d: Date): Weekly[] => {
    const all = dowSlots.get(d.getDay()) ?? []
    if (!all.length || d < today) return []
    if (from && ymd(d) < from) return []
    return all.filter(w => !bookedSet.has(`${ymd(d)}@${w.time}`))
  }

  // Build the month grid
  const first = new Date(cursor.y, cursor.m, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.y, cursor.m, d))

  const moveMonth = (delta: number) => {
    const m = cursor.m + delta
    setCursor({ y: cursor.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 })
  }
  const canGoBack = cursor.y > today.getFullYear() || (cursor.y === today.getFullYear() && cursor.m > today.getMonth())

  const submit = async () => {
    if (!picked || !form.name.trim() || !form.email.trim()) { setErr('Please add your name and email.'); return }
    setBusy(true); setErr('')
    const comm_method = form.comm_method === 'Other' ? (form.comm_other.trim() || 'Other') : form.comm_method
    const socials = [
      form.instagram.trim() && `Instagram: ${form.instagram.trim()}`,
      form.tiktok.trim() && `TikTok: ${form.tiktok.trim()}`,
      form.youtube.trim() && `YouTube: ${form.youtube.trim()}`,
      form.facebook.trim() && `Facebook: ${form.facebook.trim()}`,
      form.linkedin.trim() && `LinkedIn: ${form.linkedin.trim()}`,
    ].filter(Boolean).join(' · ')
    const d = await fetch('/api/podcast/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book: { date: picked.date, time: picked.time, name: form.name, email: form.email, phone: form.phone, socials, link: form.link, notes: form.notes, comm_method } }),
    }).then(r => r.json()).catch(() => ({ error: 'Connection hiccup — try again.' }))
    setBusy(false)
    if (d.booking) setDone({ date: picked.date, time: picked.time, name: form.name, end: picked.end })
    else setErr(d.error || 'Could not book that — try another date.')
  }

  const card: React.CSSProperties = { background: '#fff', borderRadius: '22px', boxShadow: '0 20px 60px -30px rgba(90,79,207,0.35)', border: '1px solid rgba(107,91,212,0.12)' }

  return (
    <main style={{ minHeight: '100vh', background: CREAM, color: INK, fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <img src="/balloon-512.png" alt="" style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '10px', lineHeight: 1.15 }}>Be a guest on the<br />AI Mom Podcast</h1>
          <p style={{ fontSize: '14px', color: '#8B84A3', marginTop: '10px', lineHeight: 1.5 }}>Pick a date that works for you. One hour, real conversation.</p>
        </div>

        {done ? (
          /* ───── Thank you ───── */
          <div style={{ ...card, padding: '34px 28px', textAlign: 'center' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto', border: `3px solid ${PURPLE}`, background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/host-photo.jpg" alt="Mandi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).src = '/balloon-512.png'; e.currentTarget.style.objectFit = 'contain'; e.currentTarget.style.padding = '12px' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: '16px' }}>You&apos;re on, {done.name.split(' ')[0]}! 🎈</h2>
            <p style={{ fontSize: '14px', color: '#6E678A', marginTop: '8px', lineHeight: 1.55 }}>
              {DOW[new Date(done.date + 'T00:00').getDay()]}, {MONTHS[new Date(done.date + 'T00:00').getMonth()]} {new Date(done.date + 'T00:00').getDate()} at {fmtTime(done.time)} CT. I&apos;ll reach out on your preferred channel to confirm the details.
            </p>
            <a href={gcalLink(done.date, done.time, done.name, done.end)} target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', marginTop: '16px', padding: '10px 18px', borderRadius: '11px', background: CREAM, color: PURPLE, fontWeight: 700, fontSize: '13px', textDecoration: 'none', border: `1px solid ${PURPLE}` }}>📅 Add to your calendar</a>

            <div style={{ borderTop: '1px solid #EFE9F7', margin: '26px 0 18px' }} />
            <p style={{ fontSize: '14px', color: INK, lineHeight: 1.6, textAlign: 'left' }}>
              I&apos;m Mandi — mom of four, former realtor, now host of the AI Mom Podcast. I talk with real women about intuition, building a life that actually fits, and using AI without losing your humanity. I can&apos;t wait to have you on.
            </p>
            <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B3ABC9', marginTop: '20px' }}>Let&apos;s connect everywhere</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
              {[
                ['🎙️ The Podcast', 'https://aimomeducation.com'],
                ['IG · @aimompodcast', 'https://instagram.com/aimompodcast'],
                ['IG · @mandij0y', 'https://instagram.com/mandij0y'],
                ['IG · @theknowingis', 'https://instagram.com/theknowingis'],
                ['LinkedIn', 'https://linkedin.com/in/amanda-beck-588200378'],
                ['aiworksforher.com', 'https://aiworksforher.com'],
              ].map(([label, href]) => (
                <a key={href} href={href} target="_blank" rel="noreferrer"
                  style={{ padding: '8px 13px', borderRadius: '999px', background: '#F3F0FC', color: PURPLE, fontWeight: 700, fontSize: '12.5px', textDecoration: 'none' }}>{label}</a>
              ))}
            </div>
          </div>
        ) : !loaded ? (
          <div style={{ textAlign: 'center', color: '#B3ABC9', padding: '40px' }}>Loading…</div>
        ) : weekly.length === 0 ? (
          <div style={{ ...card, padding: '30px', textAlign: 'center', color: '#8B84A3', fontSize: '14px', lineHeight: 1.6 }}>
            No open dates right now — check back soon, or reach out on Instagram <strong>@aimompodcast</strong> and we&apos;ll find a time.
          </div>
        ) : picked ? (
          /* ───── Guest details form ───── */
          <div style={{ ...card, padding: '26px' }}>
            <button onClick={() => { setPicked(null); setErr('') }} style={{ background: 'none', border: 'none', color: PURPLE, fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '14px' }}>← pick another date</button>
            <div style={{ background: '#F3F0FC', borderRadius: '12px', padding: '12px 15px', marginBottom: '18px' }}>
              <p style={{ fontSize: '12px', color: '#8B84A3', fontWeight: 700 }}>YOUR SLOT</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: INK, marginTop: '2px' }}>
                {DOW[new Date(picked.date + 'T00:00').getDay()]}, {MONTHS[new Date(picked.date + 'T00:00').getMonth()]} {new Date(picked.date + 'T00:00').getDate()} · {fmtTime(picked.time)}{picked.end ? ` – ${fmtTime(picked.end)}` : ''} CT
              </p>
            </div>
            {([
              ['name', 'Your name', 'text'], ['email', 'Email', 'email'],
              ['phone', 'Phone — optional, but encouraged so I can text you', 'tel'],
              ['instagram', 'Instagram (optional)', 'text'],
              ['tiktok', 'TikTok (optional)', 'text'],
              ['youtube', 'YouTube (optional)', 'text'],
              ['facebook', 'Facebook (optional)', 'text'],
              ['linkedin', 'LinkedIn (optional)', 'text'],
              ['link', "Share the website or link that best represents what you're working on", 'text'],
            ] as const).map(([k, label, type]) => (
              <div key={k} style={{ marginBottom: '13px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8B84A3' }}>{label}</label>
                <input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ width: '100%', marginTop: '5px', padding: '11px 13px', borderRadius: '11px', border: '1px solid #E4DEF2', background: CREAM, color: INK, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: '13px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#8B84A3', display: 'block', lineHeight: 1.45 }}>Anything you&apos;d like me to know about you or your project before we meet? And what&apos;s the #1 question your audience is asking right now?</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4}
                style={{ width: '100%', marginTop: '6px', padding: '11px 13px', borderRadius: '11px', border: '1px solid #E4DEF2', background: CREAM, color: INK, fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#8B84A3' }}>Best way to reach you</label>
              <select value={form.comm_method} onChange={e => setForm(f => ({ ...f, comm_method: e.target.value }))}
                style={{ width: '100%', marginTop: '5px', padding: '11px 13px', borderRadius: '11px', border: '1px solid #E4DEF2', background: CREAM, color: INK, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                {COMM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {form.comm_method === 'Other' && (
                <input type="text" value={form.comm_other} onChange={e => setForm(f => ({ ...f, comm_other: e.target.value }))}
                  placeholder="How should she reach you?"
                  style={{ width: '100%', marginTop: '8px', padding: '11px 13px', borderRadius: '11px', border: '1px solid #E4DEF2', background: CREAM, color: INK, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
            {err && <p style={{ color: '#D1456B', fontSize: '13px', marginBottom: '12px' }}>{err}</p>}
            <button onClick={submit} disabled={busy}
              style={{ width: '100%', padding: '14px', borderRadius: '13px', border: 'none', background: PURPLE, color: '#fff', fontWeight: 800, fontSize: '15px', cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Booking…' : 'Book my spot 🎈'}
            </button>
          </div>
        ) : dayPick ? (
          /* ───── Pick a time (multiple slots that day) ───── */
          <div style={{ ...card, padding: '26px' }}>
            <button onClick={() => setDayPick(null)} style={{ background: 'none', border: 'none', color: PURPLE, fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>← pick another date</button>
            <p style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>
              {DOW[new Date(dayPick.date + 'T00:00').getDay()]}, {MONTHS[new Date(dayPick.date + 'T00:00').getMonth()]} {new Date(dayPick.date + 'T00:00').getDate()} — pick a time:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dayPick.slots.map((s, i) => (
                <button key={i} onClick={() => { setPicked({ date: dayPick.date, time: s.time, end: s.end }); setDayPick(null) }}
                  style={{ padding: '14px', borderRadius: '13px', border: `1.5px solid ${PURPLE}`, background: '#F3F0FC', color: PURPLE, fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
                  {fmtTime(s.time)}{s.end ? ` – ${fmtTime(s.end)}` : ''} CT
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ───── Calendar ───── */
          <div style={{ ...card, padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button onClick={() => moveMonth(-1)} disabled={!canGoBack}
                style={{ border: 'none', background: canGoBack ? '#F3F0FC' : 'transparent', color: canGoBack ? PURPLE : '#D8D2E8', width: '34px', height: '34px', borderRadius: '10px', cursor: canGoBack ? 'pointer' : 'default', fontSize: '18px' }}>‹</button>
              <p style={{ fontSize: '16px', fontWeight: 800 }}>{MONTHS[cursor.m]} {cursor.y}</p>
              <button onClick={() => moveMonth(1)} style={{ border: 'none', background: '#F3F0FC', color: PURPLE, width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
              {DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '10.5px', fontWeight: 800, color: '#B3ABC9', padding: '4px 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {cells.map((d, i) => {
                if (!d) return <div key={i} />
                const slots = slotsFor(d)
                const open = slots.length > 0
                const choose = () => { if (slots.length === 1) setPicked({ date: ymd(d), time: slots[0].time, end: slots[0].end }); else setDayPick({ date: ymd(d), slots }) }
                return (
                  <button key={i} disabled={!open} onClick={choose}
                    style={{
                      aspectRatio: '1', borderRadius: '11px', border: open ? `1.5px solid ${PURPLE}` : '1px solid transparent',
                      background: open ? '#F3F0FC' : 'transparent', color: open ? PURPLE : '#CFC9DF',
                      fontWeight: open ? 800 : 500, fontSize: '14px', cursor: open ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}>
                    {d.getDate()}
                    {open && <span style={{ fontSize: '8px', fontWeight: 700, marginTop: '2px' }}>open</span>}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: '12px', color: '#B3ABC9', textAlign: 'center', marginTop: '14px' }}>Highlighted days are open. Tap one to grab it.</p>
          </div>
        )}
      </div>
    </main>
  )
}
