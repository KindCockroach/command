'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import PlanCalendar from './PlanCalendar'

// CAP'S PLAN + CALENDAR. Monthly plan per branch → weekly cadence per account → the next two
// weeks of daily items. Each calendar item points at ONE content record (the same record
// Content Day shows); nothing is copied. Joyful Media sorts first everywhere.
type Channel = { format: string; per_week: number }
type Plan = {
  id: string; level: 'monthly' | 'weekly'; branch_id: 'joyful_media' | 'wfh'; period_start: string; period_end: string
  status: 'proposed' | 'approved' | 'declined'; summary: string
  feedback?: { kind: 'question' | 'decline' | 'reopen'; text: string; at: string; answer?: string | null }[]
  monthly?: { goals: string[]; initiatives: string[]; campaigns: { product_id: string; note: string }[]; dates: { date: string; label: string }[]; priorities: string[]; paused: string[] }
  weekly?: { account_id: string; handle: string; channels: Channel[]; posts_per_week: number; per_day: string; batch: string; campaign_balance: string; arc: string }
}
type Acct = { id: string; handle: string; platform: string; status: string; mirrors_account_id: string | null }
type Data = { plans: Plan[]; accounts?: Acct[] }

// Platform badge: a small brand-colored mark plus the platform's name.
const PLAT: Record<string, { bg: string; fg?: string; name: string; glyph: ReactNode }> = {
  instagram: { bg: 'linear-gradient(135deg,#F58529,#DD2A7B 55%,#8134AF)', name: 'Instagram', glyph: <><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="12" cy="12" r="3.6" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="16.8" cy="7.2" r="1.2" fill="#fff" /></> },
  facebook: { bg: '#1877F2', name: 'Facebook', glyph: <path d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.3c0-.8.3-1.4 1.4-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.7v2.2H8.2V14h2.4v7z" fill="#fff" /> },
  linkedin: { bg: '#0A66C2', name: 'LinkedIn', glyph: <><rect x="5" y="9.5" width="3" height="9" fill="#fff" /><circle cx="6.5" cy="6.5" r="1.7" fill="#fff" /><path d="M10.5 9.5h2.9v1.3c.5-.9 1.6-1.5 2.9-1.5 2.4 0 2.9 1.6 2.9 3.6v5.6h-3v-5c0-1.1-.2-1.9-1.3-1.9s-1.5.8-1.5 1.9v5h-2.9z" fill="#fff" /></> },
  tiktok: { bg: '#111', name: 'TikTok', glyph: <path d="M14.5 4h2.6c.2 1.9 1.4 3.1 3.2 3.3v2.7c-1.2 0-2.3-.4-3.2-1v5.6a5 5 0 1 1-5-5h.4v2.7h-.4a2.3 2.3 0 1 0 2.4 2.3z" fill="#fff" /> },
  youtube: { bg: '#FF0000', name: 'YouTube', glyph: <path d="M10 8.5v7l6-3.5z" fill="#fff" /> },
  medium: { bg: '#000', name: 'Medium', glyph: <><circle cx="8" cy="12" r="4" fill="#fff" /><ellipse cx="15" cy="12" rx="2" ry="3.8" fill="#fff" /><ellipse cx="19" cy="12" rx="0.9" ry="3.4" fill="#fff" /></> },
  substack: { bg: '#FF6719', name: 'Substack', glyph: <><rect x="6" y="5" width="12" height="2" fill="#fff" /><rect x="6" y="8.5" width="12" height="2" fill="#fff" /><path d="M6 12h12v8l-6-3.3L6 20z" fill="#fff" /></> },
}
const PLATFORM_CHOICES = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'Medium', 'Substack']
function platKey(platform?: string, handle?: string) {
  const s = `${platform || ''} ${handle || ''}`.toLowerCase()
  return Object.keys(PLAT).find(k => s.includes(k)) || ''
}
function PlatformBadge({ platform, handle }: { platform?: string; handle?: string }) {
  const k = platKey(platform, handle); const p = PLAT[k]
  if (!p) return <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-subtle)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{platform || 'Platform?'}</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
      <span aria-hidden style={{ width: 20, height: 20, borderRadius: 6, background: p.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <svg viewBox="0 0 24 24" width="15" height="15">{p.glyph}</svg>
      </span>
      {p.name}
    </span>
  )
}
const STATUS_TAG = { approved: ['APPROVED', '#2F7D5B'], declined: ['DECLINED', '#B23A48'], proposed: ['WAITING FOR YOU', '#B7791F'] } as const

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
  const [open, setOpen] = useState<{ id: string; mode: 'ask' | 'decline' } | null>(null)
  const [text, setText] = useState('')
  const [mirror, setMirror] = useState('')

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

  const setPlatform = async (id: string, platform: string) => {
    setBusy('pl' + id)
    await fetch('/api/accounts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, platform }) }).catch(() => null)
    setBusy(''); load()
  }
  const openBox = (id: string, mode: 'ask' | 'decline') => { setOpen(o => (o && o.id === id && o.mode === mode ? null : { id, mode })); setText(''); setMirror('') }
  async function sendBox(p: Plan) {
    if (!open || !text.trim()) return
    if (open.mode === 'ask') await run('q' + p.id, { action: 'ask', id: p.id, question: text }, () => 'Cap answered below.')
    else await run('d' + p.id, { action: 'decline', id: p.id, reason: text, mirrors_account_id: mirror || null }, () => mirror ? 'Declined. That account is now marked as a mirror, so Cap won’t draft a separate plan for it.' : 'Declined. Your reason goes onto Cap’s next draft.')
    setOpen(null); setText(''); setMirror('')
  }

  // Approve · Ask Cap · Decline, plus the thread of her notes and Cap's answers.
  const actions = (p: Plan) => {
    const isOpen = open && open.id === p.id
    const notes = p.feedback ?? []
    const others = (data?.accounts ?? []).filter(a => a.id !== p.weekly?.account_id && a.status === 'active')
    return (
      <div>
        {notes.length > 0 && (
          <div style={{ borderLeft: '3px solid var(--border)', paddingLeft: 10, margin: '8px 0' }}>
            {notes.filter(n => n.kind !== 'reopen').map((n, i) => (
              <div key={i} style={{ fontSize: 12.5, margin: '6px 0', color: 'var(--text)' }}>
                <div><strong>{n.kind === 'decline' ? 'You declined:' : 'You asked:'}</strong> {n.text}</div>
                {n.kind === 'question' && <div style={{ marginTop: 3, color: 'var(--text-subtle)' }}><strong style={{ color: '#5A4FCF' }}>Cap:</strong> {n.answer ?? 'Thinking…'}</div>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {p.status !== 'approved' && <button style={primary} disabled={!!busy} onClick={() => run('a' + p.id, { action: 'approve', id: p.id })}>Approve</button>}
          <button style={{ ...btn, ...(isOpen && open!.mode === 'ask' ? { borderColor: '#5A4FCF', color: '#5A4FCF' } : {}) }} disabled={!!busy} onClick={() => openBox(p.id, 'ask')}>Ask Cap</button>
          {p.status === 'declined'
            ? <button style={btn} disabled={!!busy} onClick={() => run('o' + p.id, { action: 'reopen', id: p.id })}>Reopen</button>
            : <button style={{ ...btn, ...(isOpen && open!.mode === 'decline' ? { borderColor: '#B23A48', color: '#B23A48' } : {}) }} disabled={!!busy} onClick={() => openBox(p.id, 'decline')}>Decline…</button>}
        </div>
        {isOpen && (
          <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
            <textarea autoFocus rows={2} value={text} onChange={e => setText(e.target.value)}
              placeholder={open!.mode === 'ask' ? 'Ask Cap anything about this plan…' : 'Why not? e.g. “This FB page gets everything from IG automatically.”'}
              style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: 13, padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }} />
            {open!.mode === 'decline' && p.weekly && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text)', marginTop: 6, flexWrap: 'wrap' }}>
                This account just reposts from
                <select value={mirror} onChange={e => setMirror(e.target.value)} style={{ font: 'inherit', fontSize: 12.5, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg)', color: 'var(--text)' }}>
                  <option value="">(no, it&rsquo;s separate)</option>
                  {others.map(a => <option key={a.id} value={a.id}>{a.handle} · {a.platform}</option>)}
                </select>
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={open!.mode === 'decline' ? { ...primary, background: '#B23A48', borderColor: '#B23A48' } : primary} disabled={!!busy || !text.trim()} onClick={() => sendBox(p)}>
                {busy === 'q' + p.id ? 'Cap is thinking…' : open!.mode === 'ask' ? 'Ask' : 'Decline with this reason'}
              </button>
              <button style={btn} onClick={() => setOpen(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!data) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={20} className="spin" /></div>
  const monthly = data.plans.filter(p => p.level === 'monthly').sort((a, b) => (a.branch_id === 'joyful_media' ? -1 : 1) - (b.branch_id === 'joyful_media' ? -1 : 1))
  const weekly = data.plans.filter(p => p.level === 'weekly').sort((a, b) => (a.branch_id === 'joyful_media' ? -1 : 1) - (b.branch_id === 'joyful_media' ? -1 : 1))
  const monthlyApproved = monthly.some(p => p.status === 'approved')
  const weeklyApproved = weekly.some(p => p.status === 'approved')
  const acct = (p: Plan) => (data.accounts ?? []).find(a => a.id === p.weekly?.account_id)
  const mirrors = (data.accounts ?? []).filter(a => a.mirrors_account_id && a.status === 'active')

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
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: STATUS_TAG[p.status][1] }}>{STATUS_TAG[p.status][0]}</span>
          </div>
          <p style={{ margin: '6px 0', fontSize: 13, color: 'var(--text)' }}>{p.summary}</p>
          <ul style={{ margin: '0 0 6px', paddingLeft: 18, fontSize: 12.5, color: 'var(--text)' }}>
            {p.monthly!.goals.map((g, i) => <li key={i}>{g}</li>)}
            {p.monthly!.dates.map((d, i) => <li key={`d${i}`}><strong>{day(d.date)}</strong>: {d.label}</li>)}
          </ul>
          {p.monthly!.paused.length > 0 && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-subtle)' }}>Paused: {p.monthly!.paused.join(' · ')}</p>}
          {actions(p)}
        </div>
      ))}

      <p style={lbl}>2 · Weekly cadence, per account</p>
      {!weekly.length && <button style={btn} disabled={!!busy || !monthlyApproved} title={monthlyApproved ? '' : 'Approve a monthly plan first'} onClick={() => run('w', { action: 'propose_weekly' }, d => { const s = (d.skipped as string[]) || []; return `Cap drafted ${(d.plans as unknown[]).length} account plans.${s.length ? ` Not drafted: ${s.length} (accounts not placed in a branch yet, or branch not approved).` : ''}` })}>{busy === 'w' ? 'Drafting…' : monthlyApproved ? 'Ask Cap for each account’s week' : 'Approve a monthly plan first'}</button>}
      {weekly.map(p => (
        <div key={p.id} style={card}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            {(() => { const a = acct(p); return (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <PlatformBadge platform={a?.platform} handle={p.weekly!.handle} />
                {a && <select aria-label="Change platform" title="Wrong platform? Change it" value={PLATFORM_CHOICES.find(c => c.toLowerCase() === platKey(a.platform)) || ''} disabled={!!busy} onChange={e => setPlatform(a.id, e.target.value)}
                  style={{ font: 'inherit', fontSize: 11, padding: '1px 2px', border: '1px solid transparent', borderRadius: 6, background: 'transparent', color: 'var(--text-subtle)', cursor: 'pointer', width: 22 }}>
                  <option value="" disabled>{a.platform || 'Pick'}</option>
                  {PLATFORM_CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>}
              </span>) })()}
            <strong style={{ color: 'var(--text)' }}>{p.weekly!.handle}</strong>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{NAME[p.branch_id]} · {p.summary.split(': ')[1]}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: STATUS_TAG[p.status][1] }}>{STATUS_TAG[p.status][0]}</span>
          </div>
          {p.weekly!.channels.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '5px 0', color: 'var(--text)' }}>
              <input type="number" min={0} defaultValue={c.per_week} style={{ width: 52, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg)', color: 'var(--text)' }}
                onBlur={e => { const n = Number(e.target.value); if (n !== c.per_week) setChannel(p, i, n) }} /> a week · {c.format}
            </div>
          ))}
          <p style={{ margin: '6px 0', fontSize: 12, color: 'var(--text-subtle)' }}>{p.weekly!.campaign_balance} {p.weekly!.batch}</p>
          {actions(p)}
        </div>
      ))}
      {mirrors.length > 0 && <p style={{ fontSize: 12.5, color: 'var(--text-subtle)', margin: '4px 0 8px' }}>No plan needed (they repost automatically): {mirrors.map(a => `${a.handle} ← ${(data.accounts ?? []).find(x => x.id === a.mirrors_account_id)?.handle || a.mirrors_account_id}`).join(' · ')}</p>}
      {weekly.length > 0 && monthlyApproved && <button style={btn} disabled={!!busy} onClick={() => run('w', { action: 'propose_weekly' }, d => `Cap redrafted ${(d.plans as unknown[]).length} account plans (approved ones stay; your notes carry over).`)}>{busy === 'w' ? 'Redrafting…' : 'Ask Cap to redraft the ones not approved'}</button>}
      {weeklyApproved && <button style={btn} disabled={!!busy} onClick={() => run('r', { action: 'retire_cadence' }, d => d.error ? String(d.error) : `Preview: this would retire ${(d.goals_retired as string[]).length} old November 11 quota goals (kept, not deleted) and add ${(d.goals_created as string[]).length} goals from the plan. Press again to confirm.`)}>Retire the old daily quotas…</button>}
      {msg.startsWith('Preview:') && <button style={{ ...primary, marginLeft: 8 }} disabled={!!busy} onClick={() => run('r2', { action: 'retire_cadence', confirm: true }, d => `Done. Retired ${(d.goals_retired as string[]).length} old goals and added ${(d.goals_created as string[]).length} from Cap’s plan. Backup saved first.`)}>Confirm</button>}

      <p style={lbl}>3 · The calendar</p>
      <button style={btn} disabled={!!busy || !weeklyApproved && !monthlyApproved} onClick={() => run('c', { action: 'generate_calendar' }, d => `Added ${d.created} new items and reused ${d.reused} existing cards.${(d.dropped as string[]).length ? ` ${(d.dropped as string[]).length} didn’t fit.` : ''}`)}>{busy === 'c' ? 'Building…' : 'Fill the calendar from approved plans'}</button>
      <div style={{ marginTop: 14 }}><PlanCalendar refreshKey={calKey} /></div>
    </div>
  )
}
