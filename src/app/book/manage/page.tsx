'use client'
import { useState, useEffect } from 'react'

// PODCAST SCHEDULER — manage (for Mandi). Set the weekly available slot(s) and see who
// booked, with contact details + one-tap add-to-calendar. Share aiworksforher.com/book
// with guests.

type Weekly = { dow: number; time: string }
type Booking = { id: string; date: string; time: string; name: string; email: string; phone?: string; socials?: string; comm_method?: string; link?: string; created_at: string }
const PURPLE = '#6B5BD4'; const CREAM = '#FBF7F1'; const INK = '#2E2A3F'
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtTime = (t: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}` }
function gcal(b: Booking): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(b.time || '20:00'); const hh = String(m ? +m[1] : 20).padStart(2, '0'); const mm = m ? m[2] : '00'
  const s = `${b.date.replace(/-/g, '')}T${hh}${mm}00`; const e = `${b.date.replace(/-/g, '')}T${String((m ? +m[1] : 20) + 1).padStart(2, '0')}${mm}00`
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `AI Mom Podcast — ${b.name}`, details: `Guest: ${b.name}\nEmail: ${b.email}\nPhone: ${b.phone || ''}\nSocials: ${b.socials || ''}\nReach via: ${b.comm_method || ''}`, ctz: 'America/Chicago', dates: `${s}/${e}` })
  return `https://calendar.google.com/calendar/render?${p}`
}

export default function ManagePage() {
  const [weekly, setWeekly] = useState<Weekly[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [newDow, setNewDow] = useState(0)
  const [newTime, setNewTime] = useState('20:00')
  const [saved, setSaved] = useState('')

  const load = () => fetch('/api/podcast/schedule?admin=1').then(r => r.json()).then(d => { setWeekly(d.weekly || []); setBookings(d.bookings || []) }).catch(() => {})
  useEffect(() => { document.title = 'Scheduler · manage'; load() }, [])

  const save = async (next: Weekly[]) => {
    setWeekly(next)
    await fetch('/api/podcast/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekly: next }) }).catch(() => {})
    setSaved('Saved ✓'); setTimeout(() => setSaved(''), 1500)
  }
  const addSlot = () => { if (weekly.some(w => w.dow === newDow && w.time === newTime)) return; save([...weekly, { dow: newDow, time: newTime }]) }
  const removeSlot = (i: number) => save(weekly.filter((_, x) => x !== i))

  const box: React.CSSProperties = { background: '#fff', borderRadius: '18px', border: '1px solid rgba(107,91,212,0.12)', padding: '20px', boxShadow: '0 14px 40px -28px rgba(90,79,207,0.4)' }

  return (
    <main style={{ minHeight: '100vh', background: CREAM, color: INK, fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif', padding: '36px 20px 70px' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/balloon-512.png" alt="" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Guest scheduler</h1>
            <p style={{ fontSize: '13px', color: '#8B84A3' }}>Share <strong>aiworksforher.com/book</strong> with guests. {saved && <span style={{ color: PURPLE, fontWeight: 700 }}>{saved}</span>}</p>
          </div>
        </div>

        {/* Availability */}
        <div style={box}>
          <p style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>Your weekly availability <span style={{ color: '#B3ABC9', fontWeight: 600 }}>(times are CT)</span></p>
          {weekly.length === 0 && <p style={{ fontSize: '13px', color: '#8B84A3', marginBottom: '12px' }}>No slot set yet — add one below and it opens on your booking page.</p>}
          {weekly.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F3F0FC', borderRadius: '11px', padding: '10px 14px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>Every {DOW[w.dow]} · {fmtTime(w.time)}</span>
              <button onClick={() => removeSlot(i)} style={{ border: 'none', background: 'none', color: '#D1456B', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>remove</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <select value={newDow} onChange={e => setNewDow(+e.target.value)} style={{ flex: 1, minWidth: '130px', padding: '10px', borderRadius: '10px', border: '1px solid #E4DEF2', background: CREAM, fontSize: '14px' }}>
              {DOW.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #E4DEF2', background: CREAM, fontSize: '14px' }} />
            <button onClick={addSlot} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: PURPLE, color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>Add</button>
          </div>
        </div>

        {/* Bookings */}
        <div style={box}>
          <p style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>Booked guests ({bookings.length})</p>
          {bookings.length === 0 ? <p style={{ fontSize: '13px', color: '#8B84A3' }}>No bookings yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bookings.map(b => {
                const d = new Date(b.date + 'T00:00')
                return (
                  <div key={b.id} style={{ border: '1px solid #EFE9F7', borderRadius: '12px', padding: '13px 15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '15px' }}>{b.name}</span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: PURPLE }}>{DOW[d.getDay()].slice(0, 3)} {MONTHS[d.getMonth()]} {d.getDate()} · {fmtTime(b.time)}</span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#6E678A', marginTop: '5px', lineHeight: 1.5 }}>
                      {b.email}{b.phone ? ` · ${b.phone}` : ''}<br />
                      {b.socials ? <>{b.socials}<br /></> : null}
                      {b.link ? <>Working on: <a href={b.link.startsWith('http') ? b.link : `https://${b.link}`} target="_blank" rel="noreferrer" style={{ color: PURPLE }}>{b.link}</a><br /></> : null}
                      Reach via <strong>{b.comm_method || '—'}</strong>
                    </p>
                    <a href={gcal(b)} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', fontWeight: 700, color: PURPLE, textDecoration: 'none' }}>📅 Add to Google Calendar</a>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
