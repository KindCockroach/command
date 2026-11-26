'use client'

// Phase 8 · A0: this month's AI spend against the cap: so far, projection, today vs its share,
// the top 5 costs, any background jobs the cap paused, and the editable cap itself.
// Used on Business › Health (HealthPanel) and on /admin.
import { useCallback, useEffect, useState } from 'react'

type Status = {
  month: string; cap: number; per_job_cap: number; spent: number; spent_today: number; day_share: number
  projection: number; pct: number; warn80: boolean; over_day: boolean; over_month: boolean
  top5: { label: string; calls: number; costUsd: number }[]
  paused: { ts: string; route: string; kind: string; why: string }[]
}

const usd = (n: number) => '$' + (n ?? 0).toFixed(2)
const T = { text: 'var(--text, #2B2233)', sub: 'var(--text-subtle, #5E5468)', border: 'var(--border, #DDD3E6)', surface: 'var(--surface, #fff)', bg: 'var(--bg, #FAF7FC)', link: 'var(--link, #5A4FCF)' }

export default function SpendCard() {
  const [s, setS] = useState<Status | null>(null)
  const [cap, setCap] = useState('')
  const [job, setJob] = useState('')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const d = await fetch('/api/spend', { cache: 'no-store' }).then(r => r.json()).catch(() => null)
    if (d?.status) { setS(d.status); setCap(String(d.status.cap)); setJob(String(d.status.per_job_cap)) }
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setNote('')
    const d = await fetch('/api/spend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthly_cap_usd: Number(cap), per_job_cap_usd: Number(job) }) }).then(r => r.json()).catch(() => null)
    setSaving(false)
    if (d?.status) { setS(d.status); setNote('Saved.'); window.dispatchEvent(new Event('rise-data-changed')) } else setNote('Couldn’t save. Try again.')
  }

  if (!s) return <p style={{ fontSize: '12px', color: T.sub }}>Loading this month’s AI spend…</p>
  const pct = Math.min(100, Math.round(s.pct * 100))
  const barColor = s.over_month ? '#B23A48' : s.warn80 ? '#C77D1A' : '#3DAA7C'
  const field = { width: 72, font: 'inherit', fontSize: '14px', padding: '6px 8px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.bg, color: T.text }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 900, color: T.text, margin: 0 }}>💸 AI spend · {s.month}</p>
        <p style={{ fontSize: '11.5px', color: T.sub, margin: '2px 0 0' }}>What RISE’s AI calls cost this month (Central time). Railway hosting and Resend email are separate bills.</p>
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span style={{ fontSize: '20px', fontWeight: 900, color: T.text }}>{usd(s.spent)} <span style={{ fontSize: '13px', fontWeight: 700, color: T.sub }}>of {usd(s.cap)}</span></span>
        <span style={{ fontSize: '12.5px', color: T.sub }}>On pace for <b style={{ color: T.text }}>{usd(s.projection)}</b></span>
        <span style={{ fontSize: '12.5px', color: T.sub }}>Today {usd(s.spent_today)} of its {usd(s.day_share)} share</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: T.bg, border: `1px solid ${T.border}`, overflow: 'hidden' }} aria-label={`${pct}% of the monthly cap used`}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width .2s' }} />
      </div>
      <p style={{ fontSize: '12px', color: T.text, margin: 0 }}>
        {s.over_month ? 'At the cap: background jobs are paused until the 1st, and anything you start asks first.'
          : s.over_day ? 'Today’s share is used up: background jobs are down to essentials until tomorrow.'
          : s.warn80 ? 'Past 80%: you’ll see this in Her’s Brief.'
          : 'Under the cap. Nothing is held back.'}
      </p>
      {s.top5.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: T.sub, margin: '0 0 4px' }}>Top 5 costs this month</p>
          {s.top5.map(t => (
            <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12.5px', padding: '4px 0', borderTop: `1px solid ${T.border}`, color: T.text }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label} <span style={{ color: T.sub }}>· {t.calls} call{t.calls === 1 ? '' : 's'}</span></span>
              <b>{usd(t.costUsd)}</b>
            </div>
          ))}
        </div>
      )}
      {s.paused.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: T.sub, margin: '0 0 4px' }}>Paused by the cap ({s.paused.length})</p>
          {s.paused.slice(-5).reverse().map(p => (
            <p key={p.ts + p.route} style={{ fontSize: '12px', color: T.sub, margin: '2px 0' }}>{new Date(p.ts).toLocaleString()} · {p.route} · {p.why}</p>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12.5px', color: T.text }}>
        <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>Monthly cap $<input inputMode="decimal" value={cap} onChange={e => setCap(e.target.value)} style={field} /></label>
        <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>Per-job ceiling $<input inputMode="decimal" value={job} onChange={e => setJob(e.target.value)} style={field} /></label>
        <button type="button" disabled={saving} onClick={save} style={{ padding: '7px 14px', borderRadius: '999px', border: 'none', background: T.link, color: '#fff', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 36 }}>{saving ? 'Saving…' : 'Save'}</button>
        {note && <span style={{ color: T.sub }}>{note}</span>}
      </div>
    </div>
  )
}
