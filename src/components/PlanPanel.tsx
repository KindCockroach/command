'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import PlanCalendar from './PlanCalendar'

// CAP'S PLAN + CALENDAR. Monthly plan per branch → weekly cadence per account → the next two
// weeks of daily items. Each calendar item points at ONE content record (the same record
// Content Day shows); nothing is copied. Joyful Media sorts first everywhere.
type Channel = { format: string; per_week: number }
type Plan = {
  id: string; level: 'monthly' | 'weekly'; branch_id: 'joyful_media' | 'wfh'; period_start: string; period_end: string
  status: 'proposed' | 'approved'; summary: string
  monthly?: { goals: string[]; initiatives: string[]; campaigns: { product_id: string; note: string }[]; dates: { date: string; label: string }[]; priorities: string[]; paused: string[] }
  weekly?: { account_id: string; handle: string; channels: Channel[]; posts_per_week: number; per_day: string; batch: string; campaign_balance: string; arc: string }
}
type Data = { plans: Plan[] }

const NAME = { joyful_media: 'Joyful Media', wfh: 'WFH' } as const
const card = { border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', background: 'var(--bg)', marginBottom: '10px' } as const
const btn = { border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: '9px', padding: '6px 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' } as const
const primary = { ...btn, background: '#5A4FCF', color: '#fff', border: '1px solid #5A4FCF' } as const
const lbl = { fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', margin: '18px 0 8px' } as const

const post = (body: object) => fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

export default function PlanPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [calKey, setCalKey] = useState(0)

  const load = useCallback(async () => { setData(await fetch('/api/plan').then(r => r.json()).catch(() => null)) }, [])
  useEffect(() => { load() }, [load])

  async function run(label: string, body: object, summarize?: (d: Record<string, unknown>) => string) {
    setBusy(label); setMsg('')
    const d = await post(body).catch(() => ({ error: 'Connection hiccup.' }))
    setBusy('')
    setMsg(d.error ? String(d.error) : summarize ? summarize(d) : '')
    load(); setCalKey(k => k + 1)
  }
  const setChannel = (plan: Plan, i: number, n: number) => {
    const channels = plan.weekly!.channels.map((c, j) => (j === i ? { ...c, per_week: n } : c))
    run('edit', { action: 'edit', id: plan.id, patch: { channels } })
  }

  if (!data) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={20} className="spin" /></div>
  const monthly = data.plans.filter(p => p.level === 'monthly').sort((a, b) => (a.branch_id === 'joyful_media' ? -1 : 1) - (b.branch_id === 'joyful_media' ? -1 : 1))
  const weekly = data.plans.filter(p => p.level === 'weekly').sort((a, b) => (a.branch_id === 'joyful_media' ? -1 : 1) - (b.branch_id === 'joyful_media' ? -1 : 1))
  const monthlyApproved = monthly.some(p => p.status === 'approved')
  const weeklyApproved = weekly.some(p => p.status === 'approved')

  return (
    <div style={{ padding: '4px 2px', maxWidth: 1180 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Plan</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-subtle)', margin: '2px 0 4px' }}>Cap drafts, you approve. Month first, then each account&rsquo;s week, then the days appear. Joyful Media wins every tie.</p>
      {msg && <p style={{ fontSize: 13, color: msg.toLowerCase().includes('hiccup') || msg.toLowerCase().includes('no approved') ? '#B23A48' : '#2F7D5B' }}>{msg}</p>}

      <p style={lbl}>1 · Monthly plan, per branch</p>
      {!monthly.length && <button style={primary} disabled={!!busy} onClick={() => run('m', { action: 'propose_monthly' }, () => 'Cap drafted both monthly plans.')}>{busy === 'm' ? 'Drafting…' : 'Ask Cap for the monthly plans'}</button>}
      {monthly.map(p => (
        <div key={p.id} style={card}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--text)' }}>{NAME[p.branch_id]}</strong>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{day(p.period_start)} to {day(p.period_end)}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: p.status === 'approved' ? '#2F7D5B' : '#B7791F' }}>{p.status === 'approved' ? 'APPROVED' : 'WAITING FOR YOU'}</span>
          </div>
          <p style={{ margin: '6px 0', fontSize: 13, color: 'var(--text)' }}>{p.summary}</p>
          <ul style={{ margin: '0 0 6px', paddingLeft: 18, fontSize: 12.5, color: 'var(--text)' }}>
            {p.monthly!.goals.map((g, i) => <li key={i}>{g}</li>)}
            {p.monthly!.dates.map((d, i) => <li key={`d${i}`}><strong>{day(d.date)}</strong>: {d.label}</li>)}
          </ul>
          {p.monthly!.paused.length > 0 && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-subtle)' }}>Paused: {p.monthly!.paused.join(' · ')}</p>}
          {p.status !== 'approved' && <button style={primary} disabled={!!busy} onClick={() => run('a' + p.id, { action: 'approve', id: p.id })}>Approve</button>}
        </div>
      ))}

      <p style={lbl}>2 · Weekly cadence, per account</p>
      {!weekly.length && <button style={btn} disabled={!!busy || !monthlyApproved} title={monthlyApproved ? '' : 'Approve a monthly plan first'} onClick={() => run('w', { action: 'propose_weekly' }, d => { const s = (d.skipped as string[]) || []; return `Cap drafted ${(d.plans as unknown[]).length} account plans.${s.length ? ` Not drafted: ${s.length} (accounts not placed in a branch yet, or branch not approved).` : ''}` })}>{busy === 'w' ? 'Drafting…' : monthlyApproved ? 'Ask Cap for each account’s week' : 'Approve a monthly plan first'}</button>}
      {weekly.map(p => (
        <div key={p.id} style={card}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--text)' }}>{p.weekly!.handle}</strong>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{NAME[p.branch_id]} · {p.summary.split(': ')[1]}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: p.status === 'approved' ? '#2F7D5B' : '#B7791F' }}>{p.status === 'approved' ? 'APPROVED' : 'WAITING FOR YOU'}</span>
          </div>
          {p.weekly!.channels.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '5px 0', color: 'var(--text)' }}>
              <input type="number" min={0} defaultValue={c.per_week} style={{ width: 52, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg)', color: 'var(--text)' }}
                onBlur={e => { const n = Number(e.target.value); if (n !== c.per_week) setChannel(p, i, n) }} /> a week · {c.format}
            </div>
          ))}
          <p style={{ margin: '6px 0', fontSize: 12, color: 'var(--text-subtle)' }}>{p.weekly!.campaign_balance} {p.weekly!.batch}</p>
          {p.status !== 'approved' && <button style={primary} disabled={!!busy} onClick={() => run('a' + p.id, { action: 'approve', id: p.id })}>Approve</button>}
        </div>
      ))}
      {weeklyApproved && <button style={btn} disabled={!!busy} onClick={() => run('r', { action: 'retire_cadence' }, d => d.error ? String(d.error) : `Preview: this would retire ${(d.goals_retired as string[]).length} old November 11 quota goals (kept, not deleted) and add ${(d.goals_created as string[]).length} goals from the plan. Press again to confirm.`)}>Retire the old daily quotas…</button>}
      {msg.startsWith('Preview:') && <button style={{ ...primary, marginLeft: 8 }} disabled={!!busy} onClick={() => run('r2', { action: 'retire_cadence', confirm: true }, d => `Done. Retired ${(d.goals_retired as string[]).length} old goals and added ${(d.goals_created as string[]).length} from Cap’s plan. Backup saved first.`)}>Confirm</button>}

      <p style={lbl}>3 · The calendar</p>
      <button style={btn} disabled={!!busy || !weeklyApproved && !monthlyApproved} onClick={() => run('c', { action: 'generate_calendar' }, d => `Added ${d.created} new items and reused ${d.reused} existing cards.${(d.dropped as string[]).length ? ` ${(d.dropped as string[]).length} didn’t fit.` : ''}`)}>{busy === 'c' ? 'Building…' : 'Fill the calendar from approved plans'}</button>
      <div style={{ marginTop: 14 }}><PlanCalendar refreshKey={calKey} /></div>
    </div>
  )
}
