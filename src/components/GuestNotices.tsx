'use client'
import { useState, useEffect, useCallback } from 'react'
import { Mic, Check, Bell } from 'lucide-react'

// GUEST NOTICES — top of Daily Command. New podcast bookings she hasn't acknowledged,
// plus recordings in the next 7 days and whether their reminder has gone out. Opens
// the Guests admin view for the details.
type Booking = { id: string; date: string; time: string; name: string; email: string; comm_method?: string; seen_at?: string; reminded_at?: string; created_at: string }

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtTime = (t: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}` }
const fmtWhen = (b: Booking) => { const d = new Date(b.date + 'T00:00'); return `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}, ${fmtTime(b.time)} CT` }
const daysUntil = (date: string) => Math.round((new Date(date + 'T00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 864e5)

export default function GuestNotices() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const load = useCallback(() => {
    fetch('/api/podcast/schedule?admin=1').then(r => r.json()).then(d => setBookings(Array.isArray(d.bookings) ? d.bookings : [])).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const fresh = bookings.filter(b => !b.seen_at)
  const soon = bookings.filter(b => { const n = daysUntil(b.date); return n >= 0 && n <= 7 })
  if (fresh.length === 0 && soon.length === 0) return null

  const ack = async (id: string) => {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, seen_at: new Date().toISOString() } : b))
    await fetch('/api/podcast/schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, seen: true }) }).catch(() => {})
  }
  const openAdmin = () => {
    try { sessionStorage.setItem('guests-mode', 'admin') } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view: 'guests' } }))
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid #C2477E', borderRadius: '14px', padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#C2477E', display: 'flex', alignItems: 'center', gap: '6px' }}><Mic size={13} /> Podcast guests</p>
        <button onClick={openAdmin} style={{ border: 'none', background: 'none', color: 'var(--purple)', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>Open guest admin →</button>
      </div>
      {fresh.map(b => (
        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13.5px', color: 'var(--text)', flex: 1 }}>🎙️ <strong>New booking: {b.name}</strong> · records {fmtWhen(b)}</span>
          <button onClick={() => ack(b.id)} style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', borderRadius: '8px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Check size={11} /> Got it</button>
        </div>
      ))}
      {soon.filter(b => b.seen_at).map(b => {
        const n = daysUntil(b.date)
        return (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1 }}>📅 Recording with <strong>{b.name}</strong> {n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`} · {fmtWhen(b)}</span>
            {b.reminded_at
              ? <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>reminder sent</span>
              : <button onClick={openAdmin} style={{ border: 'none', background: '#C2477E', color: '#fff', borderRadius: '8px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Bell size={11} /> Send reminder</button>}
          </div>
        )
      })}
    </div>
  )
}
