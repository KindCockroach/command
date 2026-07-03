'use client'
import { useState, useEffect, useCallback } from 'react'
import { Target, Plus, Loader2, Trash2, Pause, Play, Pencil, X, Save, Flame, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { BrandAccount, ContentPiece } from '@/lib/db'

type GoalRow = {
  id: number
  title: string
  account_id: string | null
  target_per_week: number
  deadline: string | null
  notes: string
  active: boolean
  postedThisWeek: number
  scheduled: number
  queued: number
  expectedByToday: number
  behind: boolean
  deadlineSoon: boolean
}

const BLANK = { title: '', account_id: '', target_per_week: 3, deadline: '', notes: '' }

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ── Live clock + posting calendar ─────────────────────────────────────────────
function ScheduleCalendar({ goals, accounts }: { goals: GoalRow[]; accounts: BrandAccount[] }) {
  const [now, setNow] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [content, setContent] = useState<ContentPiece[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // The station always knows what day and time it is
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/content').then(r => r.json()),
      fetch('/api/content?status=held').then(r => r.json()),
    ]).then(([main, held]: ContentPiece[][]) => {
      const seen = new Set<number>()
      setContent([...main, ...held].filter(c => !seen.has(c.id) && seen.add(c.id)))
    }).catch(() => {})
  }, [])

  // Map content onto days: posted (published_at) and scheduled (scheduled_at)
  const byDay = new Map<string, { posted: ContentPiece[]; scheduled: ContentPiece[] }>()
  const bucket = (k: string) => {
    if (!byDay.has(k)) byDay.set(k, { posted: [], scheduled: [] })
    return byDay.get(k)!
  }
  content.forEach(c => {
    if (c.published_at) bucket(dateKey(new Date(c.published_at))).posted.push(c)
    if (c.scheduled_at && c.status === 'scheduled') bucket(dateKey(new Date(c.scheduled_at))).scheduled.push(c)
  })
  const deadlines = new Map<string, GoalRow[]>()
  goals.filter(g => g.deadline && g.active).forEach(g => {
    const k = g.deadline!
    deadlines.set(k, [...(deadlines.get(k) ?? []), g])
  })

  // Build a Monday-first month grid
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayKey = dateKey(now)
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const isCurrentMonth = viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() === now.getMonth()
  const sel = selectedDay ? byDay.get(selectedDay) : null
  const selDeadlines = selectedDay ? deadlines.get(selectedDay) ?? [] : []
  const acctFor = (id?: string | null) => accounts.find(a => a.id === id)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #5a4fcf', borderRadius: '14px', padding: '18px' }}>
      {/* Header: live clock + month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={14} color="#5a4fcf" />
          <div>
            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              <span style={{ color: '#5a4fcf', marginLeft: '8px', fontVariantNumeric: 'tabular-nums' }}>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '1px' }}>
              Day {(now.getDay() + 6) % 7 + 1} of 7 this week — pace targets pro-rate against this
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ padding: '5px', border: '1px solid var(--border)', borderRadius: '7px', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><ChevronLeft size={13} /></button>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', minWidth: '120px', textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ padding: '5px', border: '1px solid var(--border)', borderRadius: '7px', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><ChevronRight size={13} /></button>
          {!isCurrentMonth && (
            <button onClick={() => { const d = new Date(); setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }} style={{ padding: '5px 10px', border: 'none', borderRadius: '7px', background: '#5a4fcf', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}>Today</button>
          )}
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <p key={d} style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', textAlign: 'center' }}>{d}</p>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const k = dateKey(d)
          const day = byDay.get(k)
          const dl = deadlines.get(k)
          const isToday = k === todayKey
          const isPast = k < todayKey
          const isSelected = selectedDay === k
          return (
            <button key={i} onClick={() => setSelectedDay(isSelected ? null : k)}
              style={{
                minHeight: '52px', padding: '4px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                border: isToday ? '2px solid #5a4fcf' : isSelected ? '2px solid var(--hot-pink)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(232,68,138,0.06)' : isToday ? 'rgba(90,79,207,0.06)' : 'var(--bg)',
                opacity: isPast && !day?.posted.length && !isToday ? 0.55 : 1,
                display: 'flex', flexDirection: 'column', gap: '2px',
              }}>
              <span style={{ fontSize: '10px', fontWeight: isToday ? 900 : 600, color: isToday ? '#5a4fcf' : 'var(--text-muted)' }}>{d.getDate()}</span>
              <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', alignItems: 'center' }}>
                {day?.posted.slice(0, 4).map((_, j) => <span key={`p${j}`} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3daa7c' }} />)}
                {day?.scheduled.slice(0, 4).map((_, j) => <span key={`s${j}`} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CC9F0' }} />)}
                {((day?.posted.length ?? 0) + (day?.scheduled.length ?? 0)) > 4 && <span style={{ fontSize: '8px', color: 'var(--text-subtle)', fontWeight: 700 }}>+{(day!.posted.length + day!.scheduled.length) - 4}</span>}
                {dl && <span style={{ fontSize: '9px' }} title={dl.map(g => g.title).join(', ')}>🎯</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '10px', flexWrap: 'wrap' }}>
        {[
          { c: '#3daa7c', l: 'Posted' },
          { c: '#4CC9F0', l: 'Scheduled (GHL)' },
        ].map(x => (
          <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: x.c }} /> {x.l}
          </span>
        ))}
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>🎯 Goal deadline</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => setSelectedDay(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}><X size={13} /></button>
          </div>
          {selDeadlines.map(g => (
            <p key={g.id} style={{ fontSize: '11px', fontWeight: 700, color: '#F2A65A', marginBottom: '4px' }}>🎯 Deadline: {g.title}</p>
          ))}
          {(!sel || (sel.posted.length === 0 && sel.scheduled.length === 0)) && selDeadlines.length === 0 && (
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Nothing posted or scheduled this day.</p>
          )}
          {sel?.scheduled.map(c => {
            const a = acctFor(c.account_id)
            return <p key={`s${c.id}`} style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}><span style={{ color: '#4CC9F0', fontWeight: 800 }}>◷</span> {c.title} {a && <span style={{ color: a.color, fontWeight: 700 }}>· {a.handle}</span>}</p>
          })}
          {sel?.posted.map(c => {
            const a = acctFor(c.account_id)
            return <p key={`p${c.id}`} style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}><span style={{ color: '#3daa7c', fontWeight: 800 }}>✓</span> {c.title} {a && <span style={{ color: a.color, fontWeight: 700 }}>· {a.handle}</span>}</p>
          })}
        </div>
      )}
    </div>
  )
}

export default function GoalsPanel() {
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch('/api/goals').then(r => r.json()).then((g: GoalRow[]) => { setGoals(g); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  }, [load])

  const startEdit = (g?: GoalRow) => {
    if (g) {
      setEditing(g.id)
      setForm({ title: g.title, account_id: g.account_id ?? '', target_per_week: g.target_per_week, deadline: g.deadline ?? '', notes: g.notes })
    } else {
      setEditing('new')
      setForm(BLANK)
    }
  }

  const saveGoal = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title,
      account_id: form.account_id || null,
      target_per_week: Number(form.target_per_week) || 1,
      deadline: form.deadline || null,
      notes: form.notes,
    }
    try {
      if (editing === 'new') {
        await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...payload }) })
      }
      setEditing(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (g: GoalRow) => {
    await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: g.id, active: !g.active }) })
    load()
  }

  const removeGoal = async (g: GoalRow) => {
    if (!confirm(`Delete goal "${g.title}"?`)) return
    await fetch(`/api/goals?id=${g.id}`, { method: 'DELETE' })
    load()
  }

  const accountFor = (id: string | null) => accounts.find(a => a.id === id)

  const active = goals.filter(g => g.active)
  const paused = goals.filter(g => !g.active)
  const behindCount = active.filter(g => g.behind).length

  const fld = { padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const lbl = (t: string) => <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>{t}</label>

  const editorFor = (id: number | 'new') => (
    <div style={{ background: 'var(--surface)', border: '2px solid #3daa7c', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>{id === 'new' ? 'New Goal' : 'Edit Goal'}</p>
        <button onClick={() => setEditing(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={15} /></button>
      </div>
      <div>
        {lbl('Goal')}
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder='e.g. "Fill the Reset Button Workshop — 5 promo posts/week"' style={fld} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
        <div>
          {lbl('Account')}
          <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} style={{ ...fld, cursor: 'pointer' }}>
            <option value="">🌐 Station-wide (all accounts)</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.handle}</option>)}
          </select>
        </div>
        <div>
          {lbl('Posts / week')}
          <input type="number" min={1} max={21} value={form.target_per_week} onChange={e => setForm(f => ({ ...f, target_per_week: Number(e.target.value) }))} style={fld} />
        </div>
        <div>
          {lbl('Deadline (optional)')}
          <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={fld} />
        </div>
      </div>
      <div>
        {lbl('Notes')}
        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Why this goal matters / what winning looks like" style={fld} />
      </div>
      <button onClick={saveGoal} disabled={saving || !form.title.trim()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: 'none', background: '#3daa7c', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: saving || !form.title.trim() ? 0.6 : 1 }}>
        {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
        {id === 'new' ? 'Create Goal' : 'Save Changes'}
      </button>
    </div>
  )

  const GoalCard = ({ g }: { g: GoalRow }) => {
    const acct = accountFor(g.account_id)
    const pct = Math.min(100, Math.round((g.postedThisWeek / g.target_per_week) * 100))
    if (editing === g.id) return editorFor(g.id)
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${!g.active ? 'var(--border)' : g.behind ? '#e05' : '#3daa7c'}`, borderRadius: '14px', padding: '16px', opacity: g.active ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{g.title}</p>
              {g.behind && g.active && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', background: 'rgba(238,0,85,0.1)', color: '#e05' }}><Flame size={10} /> BEHIND</span>}
              {g.deadlineSoon && g.active && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', background: '#FEF5EA', color: '#F2A65A' }}>⏰ DEADLINE SOON</span>}
              {!g.active && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', background: 'var(--border)', color: 'var(--text-muted)' }}>PAUSED</span>}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
              {acct ? <span style={{ color: acct.color, fontWeight: 700 }}>{acct.emoji} {acct.handle}</span> : '🌐 Station-wide'}
              {g.deadline && <> · deadline {new Date(g.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
              {g.notes && <> · {g.notes}</>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button onClick={() => startEdit(g)} title="Edit" style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><Pencil size={13} /></button>
            <button onClick={() => toggleActive(g)} title={g.active ? 'Pause' : 'Resume'} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>{g.active ? <Pause size={13} /> : <Play size={13} />}</button>
            <button onClick={() => removeGoal(g)} title="Delete" style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Pace bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: g.behind && g.active ? '#e05' : 'var(--text-muted)' }}>
            {g.postedThisWeek} of {g.target_per_week} posted this week {g.active && <>· should be at {g.expectedByToday} by today</>}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{g.scheduled} scheduled · {g.queued} in queue</span>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', background: !g.active ? 'var(--text-subtle)' : g.behind ? '#e05' : '#3daa7c', transition: 'width 0.3s' }} />
          {/* Expected-by-today marker */}
          {g.active && g.target_per_week > 0 && (
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, (g.expectedByToday / g.target_per_week) * 100)}%`, width: '2px', background: 'var(--text)', opacity: 0.4 }} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="#3daa7c" /> Goals
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            The pace-keeper. The river prioritizes these when sorting, and On-Fire flags anything falling behind.
          </p>
        </div>
        <button onClick={() => startEdit()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#3daa7c', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          <Plus size={13} /> New Goal
        </button>
      </div>

      {/* Summary strip */}
      {!loading && goals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { label: 'Active goals', n: active.length, color: '#3daa7c' },
            { label: 'On pace', n: active.length - behindCount, color: '#3daa7c' },
            { label: 'Behind', n: behindCount, color: behindCount ? '#e05' : 'var(--text-subtle)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.n}</p>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginTop: '4px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Schedule / calendar — the station knows what day and time it is */}
      {!loading && <ScheduleCalendar goals={goals} accounts={accounts} />}

      {editing === 'new' && editorFor('new')}

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={22} color="#3daa7c" style={{ animation: 'spin 1s linear infinite' }} /></div>}

      {!loading && goals.length === 0 && editing !== 'new' && (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '14px', padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</p>
          <p style={{ fontSize: '14px', fontWeight: 700 }}>No goals yet</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Set a posting pace per account. The station holds you to it.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {active.map(g => <GoalCard key={g.id} g={g} />)}
      </div>

      {paused.length > 0 && (
        <>
          <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', marginTop: '6px' }}>Paused</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {paused.map(g => <GoalCard key={g.id} g={g} />)}
          </div>
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
