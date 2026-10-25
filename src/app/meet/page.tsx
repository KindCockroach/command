'use client'
import { useState, useEffect } from 'react'
import { serviceLabel } from '@/lib/wfh'
import { wfhCss } from '@/components/wfh/theme'

// WFH — "Book a time with me." Every service ends here (?service=<key> from lib/wfh.ts).
// Shows the next three weeks of Mandi's open slots (set on /meet/manage; podcast
// recordings block them too), takes details, books via /api/wfh, and thanks them.
// If they just took the questionnaire, their details are prefilled from sessionStorage.

type Slot = { dow: number; time: string; end?: string }
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmtTime = (t: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}` }
const fmtDay = (date: string) => { const d = new Date(date + 'T00:00'); return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` }

function gcal(date: string, time: string, end: string | undefined, title: string) {
  const s = (t: string) => `${date.replace(/-/g, '')}T${t.replace(':', '')}00`
  const [h, mi] = time.split(':').map(Number)
  const plus30 = h * 60 + mi + 30
  const fallbackEnd = `${String(Math.floor(plus30 / 60)).padStart(2, '0')}:${String(plus30 % 60).padStart(2, '0')}`
  const p = new URLSearchParams({ action: 'TEMPLATE', text: title, details: 'Meeting with Mandi Beck — WFH (Works For Her). She will send the Google Meet link.', ctz: 'America/Chicago', dates: `${s(time)}/${s(end || fallbackEnd)}` })
  return `https://calendar.google.com/calendar/render?${p}`
}

export default function MeetPage() {
  const [service, setService] = useState('')
  const [weekly, setWeekly] = useState<Slot[]>([])
  const [from, setFrom] = useState<string | null>(null)
  const [taken, setTaken] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [picked, setPicked] = useState<{ date: string; time: string; end?: string } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', business: '', notes: '' })
  const [leadId, setLeadId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.title = 'Book a time · WFH — Works For Her'
    setService(new URLSearchParams(window.location.search).get('service') || '')
    try {
      const lead = JSON.parse(sessionStorage.getItem('wfh_lead') || 'null')
      if (lead?.email) { setForm(f => ({ ...f, name: lead.name || '', email: lead.email, business: lead.business || '' })); setLeadId(lead.id || '') }
    } catch {}
    fetch('/api/wfh').then(r => r.json()).then(d => {
      setWeekly(Array.isArray(d.weekly) ? d.weekly : [])
      setFrom(d.from || null)
      setTaken(new Set((d.booked || []).map((b: { date: string; time: string }) => `${b.date}@${b.time}`)))
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  // The next 21 days that have an open slot. Today is skipped so she gets notice.
  const days: { date: string; slots: Slot[] }[] = []
  const start = new Date(); start.setHours(0, 0, 0, 0)
  for (let i = 1; i <= 21; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const date = ymd(d)
    if (from && date < from) continue
    const slots = weekly.filter(w => w.dow === d.getDay() && !taken.has(`${date}@${w.time}`)).sort((a, b) => a.time.localeCompare(b.time))
    if (slots.length) days.push({ date, slots })
  }

  const label = serviceLabel(service)
  const isSpeaking = service === 'speaking'

  const submit = async () => {
    if (!picked) return
    if (!form.name.trim() || !form.email.trim()) { setErr('Please add your name and email.'); return }
    setBusy(true); setErr('')
    const d = await fetch('/api/wfh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ book: { ...picked, ...form, service, lead_id: leadId } }) })
      .then(r => r.json()).catch(() => ({ error: 'Connection hiccup — try again.' }))
    setBusy(false)
    if (d.booking) { setDone(true); try { sessionStorage.removeItem('wfh_lead') } catch {} }
    else {
      setErr(d.error || 'Could not book that — try another time.')
      if (d.error?.includes('taken')) { setTaken(t => new Set([...t, `${picked.date}@${picked.time}`])); setPicked(null) }
    }
  }

  return (
    <main className="w">
      <style>{wfhCss + css}</style>
      <header className="top">
        <div className="wrap">
          <a className="home" href="/">WFH · WORKS FOR HER</a>
          <h1>{done ? <>You&rsquo;re booked, <em>{form.name.split(' ')[0]}</em>.</> : <>Book a time <em>with me.</em></>}</h1>
          <p>{done ? 'I’ll send the Google Meet link and a quick note before we talk.' : <>For: <strong>{label}</strong>. Pick a time that works &mdash; all times are Central.</>}</p>
        </div>
      </header>

      <section className="wrap body">
        {done && picked ? (
          <div className="panel center">
            <img src="/balloon-512.png" alt="" className="balloon" />
            <h2>{fmtDay(picked.date)} · {fmtTime(picked.time)} CT</h2>
            <p className="muted">{label}</p>
            <a className="btn ghost" target="_blank" rel="noreferrer" href={gcal(picked.date, picked.time, picked.end, `Mandi Beck · ${label}`)}>📅 Add to your calendar</a>
            <p className="muted small">While you wait, the <a href="/aimom">AI Mom Podcast</a> is a good place to get to know me.</p>
          </div>
        ) : !loaded ? (
          <div className="panel center muted">Loading open times…</div>
        ) : picked ? (
          <div className="panel">
            <button className="link" onClick={() => { setPicked(null); setErr('') }}>← Pick another time</button>
            <div className="chosen">
              <p>YOUR TIME</p>
              <strong>{fmtDay(picked.date)} · {fmtTime(picked.time)}{picked.end ? ` – ${fmtTime(picked.end)}` : ''} CT</strong>
            </div>
            <label className="f">Your name<input className="in" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="f">Email<input className="in" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
            <label className="f">Phone (optional)<input className="in" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></label>
            <label className="f">{isSpeaking ? 'Organization or event' : 'Business or brand'} (optional)<input className="in" value={form.business} onChange={e => setForm(f => ({ ...f, business: e.target.value }))} /></label>
            <label className="f">{isSpeaking ? 'Event date, audience, and which topic you’re interested in' : 'Anything I should know before we meet?'}
              <textarea className="in" rows={4} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </label>
            {err && <p className="err">{err}</p>}
            <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Booking…' : 'Confirm my time →'}</button>
          </div>
        ) : days.length === 0 ? (
          <div className="panel center muted">
            {err && <p className="err">{err}</p>}
            No open times in the next three weeks — check back soon, or reach me on Instagram <strong>@aimompodcast</strong>.
          </div>
        ) : (
          <div className="panel">
            {err && <p className="err">{err}</p>}
            <div className="days">
              {days.map(d => (
                <div className="day" key={d.date}>
                  <p className="dname">{fmtDay(d.date)}</p>
                  <div className="slots">
                    {d.slots.map(s => (
                      <button key={s.time} className="slot" onClick={() => { setPicked({ date: d.date, time: s.time, end: s.end }); setErr('') }}>{fmtTime(s.time)}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="foot"><a href="/">WFH home</a>·<a href="/assessment">AI questionnaire</a>·<a href="/ugc">UGC &amp; marketing</a></footer>
    </main>
  )
}

const css = `
.w .body { margin-top:-28px; position:relative; max-width:640px; }
.w .center { text-align:center; }
.w .muted { color:var(--muted); }
.w .small { font-size:14px; margin-top:20px; }
.w .small a { color:var(--nebula); font-weight:700; }
.w .balloon { width:60px; height:60px; object-fit:contain; }
.w .center h2 { margin:10px 0 4px; font-size:24px; }
.w .center .btn { margin-top:14px; }
.w .chosen { background:#f1effc; border-radius:14px; padding:12px 16px; margin:14px 0 18px; }
.w .chosen p { margin:0; font-size:11px; font-weight:800; letter-spacing:1.5px; color:#8b84a3; }
.w .days { display:grid; gap:16px; }
.w .day { border-bottom:1px solid #f0eadf; padding-bottom:14px; }
.w .day:last-child { border-bottom:0; padding-bottom:0; }
.w .dname { margin:0 0 8px; font-weight:800; font-size:15px; }
.w .slots { display:flex; flex-wrap:wrap; gap:8px; }
.w .slot { background:var(--cream); border:1.5px solid #e1d9ca; border-radius:12px; padding:10px 16px; font-size:15px; font-weight:700;
  color:var(--nebula); cursor:pointer; font-family:inherit; }
.w .slot:hover { border-color:var(--nebula); background:#f1effc; }
`
