'use client'

import { useEffect, useState } from 'react'

// Private editor for bethereforher.com/reset — change the session date weekly.
// Gated by middleware (STATION_KEY) like the rest of the station.

type Session = { date: string; time: string; price: number; label: string; checkout_url: string; repeat_weekly: boolean; updated_at: string }
type Showing = Session & { starts_at: string; is_rolled: boolean; display_label: string }

const PUBLIC_URL = 'https://bethereforher.com/reset'

export default function ResetEditor() {
  const [form, setForm] = useState<Session | null>(null)
  const [showing, setShowing] = useState<Showing | null>(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/reset-session').then(r => r.json()).then(j => { setForm(j.stored); setShowing(j.showing) })
      .catch(() => setMsg('Could not load the session.'))
  }, [])

  async function save(extra?: Partial<Session>) {
    if (!form) return
    setSaving(true); setMsg('')
    const body = { ...form, ...extra }
    const r = await fetch('/api/reset-session', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    setSaving(false)
    if (!r.ok) { setMsg(j.error || 'Save failed'); return }
    setForm(j.stored); setShowing(j.showing); setMsg('Saved — the page is updated.')
  }

  function nextWeek() {
    if (!form) return
    const [y, m, d] = form.date.split('-').map(Number)
    const t = new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10)
    setForm({ ...form, date: t, label: form.label.replace(/\binaugural\s*/i, '').trim() || 'The Reset' })
  }

  if (!form) return <main style={S.main}><p>{msg || 'Loading…'}</p></main>
  const set = (k: keyof Session) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <main style={S.main}>
      <h1 style={S.h1}>The Reset — session date</h1>
      <p style={S.muted}>Changes go live on <a href={PUBLIC_URL} target="_blank" rel="noreferrer" style={S.link}>bethereforher.com/reset</a> the moment you save. Times are Central.</p>

      {showing && (
        <div style={S.card}>
          <div style={S.muted}>The page is showing</div>
          <div style={S.big}>{showing.display_label} · {showing.date} · {showing.time} CT · ${showing.price}</div>
          {showing.is_rolled && <div style={S.note}>Your saved date has passed, so the page rolled forward a week on its own. Save a new date to set it yourself.</div>}
        </div>
      )}

      <div style={S.grid}>
        <label style={S.label}>Date<input type="date" value={form.date} onChange={set('date')} style={S.input} /></label>
        <label style={S.label}>Time (Central)<input type="time" value={form.time} onChange={set('time')} style={S.input} /></label>
        <label style={S.label}>Price ($)<input type="number" min={0} value={form.price} onChange={set('price')} style={S.input} /></label>
        <label style={S.label}>Label<input value={form.label} onChange={set('label')} style={S.input} /></label>
        <label style={{ ...S.label, gridColumn: '1 / -1' }}>Checkout link<input value={form.checkout_url} onChange={set('checkout_url')} style={S.input} /></label>
        <label style={{ ...S.check, gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={form.repeat_weekly} onChange={set('repeat_weekly')} />
          Repeat weekly — after a session ends, the page moves to the same day and time next week on its own
        </label>
      </div>

      <div style={S.row}>
        <button onClick={nextWeek} style={S.ghost}>+1 week</button>
        <button onClick={() => save()} disabled={saving} style={S.btn}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      {msg && <p style={S.msg}>{msg}</p>}
    </main>
  )
}

const S: Record<string, React.CSSProperties> = {
  main: { maxWidth: 640, margin: '0 auto', padding: '40px 16px', fontFamily: 'system-ui, sans-serif', color: '#3c2a37', background: '#F4E9DB', minHeight: '100vh', boxSizing: 'border-box' },
  h1: { fontFamily: 'Georgia, serif', fontSize: 30, margin: '0 0 6px' },
  muted: { color: '#7a6a72', fontSize: 14, margin: '0 0 6px' },
  link: { color: '#b2566a' },
  card: { background: '#fffaf4', border: '1px solid #e6cdb6', borderRadius: 14, padding: '14px 16px', margin: '18px 0' },
  big: { fontFamily: 'Georgia, serif', fontSize: 19, fontWeight: 700 },
  note: { fontSize: 13, color: '#b26a52', marginTop: 6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 },
  check: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 },
  input: { padding: '11px 12px', borderRadius: 10, border: '1px solid #d9c3ae', fontSize: 16, fontFamily: 'inherit', background: '#fff', color: '#3c2a37' },
  row: { display: 'flex', gap: 10, marginTop: 20 },
  btn: { background: 'linear-gradient(135deg,#c96f7e,#d98c5f)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 28px', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
  ghost: { background: 'transparent', color: '#3c2a37', border: '1px solid #c9a991', borderRadius: 999, padding: '12px 20px', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  msg: { marginTop: 14, fontWeight: 700 },
}
