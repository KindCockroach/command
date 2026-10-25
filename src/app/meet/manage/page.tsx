'use client'
import { useState, useEffect } from 'react'
import { serviceLabel, type Assessment } from '@/lib/wfh'
import { wfhCss } from '@/components/wfh/theme'

// WFH — manage (Mandi only; private behind the station lock). Set the weekly times
// clients can book on /meet, see who booked, and read every questionnaire lead.

type Slot = { dow: number; time: string; end?: string }
type Booking = { id: string; date: string; time: string; end?: string; name: string; email: string; phone?: string; business?: string; service?: string; notes?: string }
type Lead = { id: string; kind: string; name: string; email: string; business?: string; website?: string; result?: Pick<Assessment, 'score' | 'level' | 'hours_per_month' | 'next_step'> & { top: string[] }; recommendation?: { features: { name: string }[] }; created_at: string }
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const fmtTime = (t: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}` }

export default function ManageMeet() {
  const [weekly, setWeekly] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [n, setN] = useState({ dow: 2, time: '10:00', end: '10:30' })
  const [msg, setMsg] = useState('')

  const load = () => fetch('/api/wfh?admin=1').then(r => r.json()).then(d => {
    if (d.error) { setMsg('Locked: set STATION_KEY on Railway, then open /station?k=YOUR-KEY once. Bookings + leads also land in Activity and GHL.'); return }
    setWeekly(d.weekly || []); setBookings(d.bookings || []); setLeads(d.leads || [])
  }).catch(() => {})
  useEffect(() => { document.title = 'WFH · manage'; load() }, [])

  const save = async (next: Slot[]) => {
    setWeekly(next)
    const d = await fetch('/api/wfh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekly: next }) }).then(r => r.json()).catch(() => ({}))
    setMsg(d.ok ? 'Saved ✓' : 'Could not save'); setTimeout(() => setMsg(''), 1500)
  }
  const cancel = async (id: string) => {
    if (!confirm('Remove this booking? (It frees the slot. Let them know separately.)')) return
    await fetch(`/api/wfh?id=${id}`, { method: 'DELETE' }); load()
  }
  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="w">
      <style>{wfhCss + css}</style>
      <header className="top"><div className="wrap"><a className="home" href="/">WFH · WORKS FOR HER</a><h1>Meetings &amp; <em>leads</em></h1><p>Clients book at aiworksforher.com/meet. {msg}</p></div></header>

      <section className="wrap grid">
        <div className="panel">
          <h2>When clients can book</h2>
          <p className="muted">Weekly, Central time. Podcast recordings automatically block a matching slot.</p>
          {weekly.length === 0 && <p className="muted">No times yet — nobody can book.</p>}
          {weekly.slice().sort((a, b) => a.dow - b.dow || a.time.localeCompare(b.time)).map(w => (
            <div className="row" key={`${w.dow}-${w.time}`}>
              <span>{DOW[w.dow]} · {fmtTime(w.time)}{w.end ? ` – ${fmtTime(w.end)}` : ''}</span>
              <button className="link" onClick={() => save(weekly.filter(x => !(x.dow === w.dow && x.time === w.time)))}>Remove</button>
            </div>
          ))}
          <div className="add">
            <select className="in" value={n.dow} onChange={e => setN({ ...n, dow: +e.target.value })}>{DOW.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
            <input className="in" type="time" value={n.time} onChange={e => setN({ ...n, time: e.target.value })} />
            <input className="in" type="time" value={n.end} onChange={e => setN({ ...n, end: e.target.value })} />
            <button className="btn" onClick={() => { if (!weekly.some(w => w.dow === n.dow && w.time === n.time)) save([...weekly, n]) }}>Add</button>
          </div>
        </div>

        <div className="panel">
          <h2>Upcoming meetings</h2>
          {bookings.filter(b => b.date >= today).length === 0 && <p className="muted">None yet.</p>}
          {bookings.filter(b => b.date >= today).map(b => (
            <div className="card" key={b.id}>
              <strong>{b.date} · {fmtTime(b.time)} CT — {b.name}</strong>
              <p>{serviceLabel(b.service)}{b.business ? ` · ${b.business}` : ''}</p>
              <p><a href={`mailto:${b.email}`}>{b.email}</a>{b.phone ? ` · ${b.phone}` : ''}</p>
              {b.notes && <p className="muted">{b.notes}</p>}
              <button className="link" onClick={() => cancel(b.id)}>Remove</button>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Questionnaire leads ({leads.length})</h2>
          {leads.length === 0 && <p className="muted">None yet. Share aiworksforher.com/assessment.</p>}
          {leads.map(l => (
            <div className="card" key={l.id}>
              <strong>{l.name}{l.business ? ` — ${l.business}` : ''}</strong>
              <p><a href={`mailto:${l.email}`}>{l.email}</a>{l.website ? ` · ${l.website}` : ''} · {l.created_at.slice(0, 10)}</p>
              {l.result && <p>Score {l.result.score} ({l.result.level}) · ~{l.result.hours_per_month} hrs/mo · {l.result.top.join(', ')} → <em>{l.result.next_step}</em></p>}
              {l.recommendation && <p>Recommended: {l.recommendation.features.map(f => f.name).join(', ')}</p>}
              <p className="muted">{bookings.some(b => b.email.toLowerCase() === l.email) ? '✓ booked a meeting' : 'Not booked yet — follow up'}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

const css = `
.w .grid { display:grid; gap:18px; margin-top:-28px; position:relative; padding-bottom:60px; }
.w h2 { margin:0 0 6px; font-size:22px; }
.w .muted { color:var(--muted); }
.w .row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f0eadf; }
.w .add { display:grid; grid-template-columns:1.4fr 1fr 1fr auto; gap:8px; margin-top:14px; align-items:end; }
.w .add .in { margin-top:0; }
.w .card { border:1px solid var(--line); border-radius:14px; padding:14px 16px; margin-top:10px; }
.w .card p { margin:4px 0; font-size:15px; }
.w .card a { color:var(--nebula); }
@media (max-width:620px){ .w .add { grid-template-columns:1fr 1fr; } }
`
