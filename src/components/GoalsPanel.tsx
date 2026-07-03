'use client'
import { useState, useEffect, useCallback } from 'react'
import { Target, Plus, Loader2, Trash2, Pause, Play, Pencil, X, Save, Flame, ChevronLeft, ChevronRight, Clock, Sparkles, CalendarPlus, Lightbulb } from 'lucide-react'
import type { BrandAccount, ContentPiece, CalendarEvent, EventKind } from '@/lib/db'

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

const EVENT_KINDS: { kind: EventKind; label: string; emoji: string; color: string }[] = [
  { kind: 'launch',   label: 'Launch',   emoji: '🚀', color: '#E8448A' },
  { kind: 'promo',    label: 'Promo',    emoji: '📣', color: '#F2A65A' },
  { kind: 'holiday',  label: 'Holiday',  emoji: '🎉', color: '#5A4FCF' },
  { kind: 'personal', label: 'Personal', emoji: '💛', color: '#3DAA7C' },
  { kind: 'trend',    label: 'Trend',    emoji: '📈', color: '#4CC9F0' },
  { kind: 'other',    label: 'Other',    emoji: '📌', color: '#9B8FA6' },
]
const kindMeta = (k: EventKind) => EVENT_KINDS.find(x => x.kind === k) ?? EVENT_KINDS[5]

type Suggestion = {
  post_on: string
  event: string
  account_id: string
  headline: string
  hook: string
  concept: string
  urgency: 'high' | 'medium' | 'low'
}

// ── Live clock + posting calendar ─────────────────────────────────────────────
function ScheduleCalendar({ goals, accounts }: { goals: GoalRow[]; accounts: BrandAccount[] }) {
  const [now, setNow] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [content, setContent] = useState<ContentPiece[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [addingEvent, setAddingEvent] = useState(false)
  const [evForm, setEvForm] = useState({ title: '', time: '', kind: 'promo' as EventKind, notes: '', account_id: '' })
  const [evSaving, setEvSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [filedIdx, setFiledIdx] = useState<Record<number, string>>({})
  const [filingIdx, setFilingIdx] = useState<number | null>(null)

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
    fetch('/api/events').then(r => r.json()).then(setEvents).catch(() => {})
  }, [])

  const saveEvent = async () => {
    if (!evForm.title.trim() || !selectedDay) return
    setEvSaving(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...evForm, account_id: evForm.account_id || null, date: selectedDay }),
      })
      const ev = await res.json()
      setEvents(prev => [...prev, ev])
      setEvForm({ title: '', time: '', kind: 'promo', notes: '', account_id: '' })
      setAddingEvent(false)
    } finally {
      setEvSaving(false)
    }
  }

  const removeEvent = async (id: number) => {
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const generateSuggestions = async () => {
    setSuggesting(true)
    setFiledIdx({})
    try {
      const res = await fetch('/api/suggest', { method: 'POST' })
      const d = await res.json()
      if (d.suggestions) setSuggestions(d.suggestions)
    } finally {
      setSuggesting(false)
    }
  }

  const fileSuggestion = async (s: Suggestion, i: number) => {
    setFilingIdx(i)
    try {
      const res = await fetch('/api/river', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: `CONCEPT FROM THE CALENDAR ENGINE (post on ${s.post_on}, riding: ${s.event}, intended account: ${s.account_id}):\nHEADLINE: ${s.headline}\nHOOK: ${s.hook}\nCONCEPT: ${s.concept}`,
          source: 'calendar',
        }),
      })
      const d = await res.json()
      setFiledIdx(prev => ({ ...prev, [i]: d.complete && d.account ? `✓ ${d.account.handle}` : d.account ? `→ ${d.account.handle} (needs answers)` : '✓ filed' }))
    } catch {
      setFiledIdx(prev => ({ ...prev, [i]: 'failed' }))
    } finally {
      setFilingIdx(null)
    }
  }

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
  const eventsByDay = new Map<string, CalendarEvent[]>()
  events.forEach(e => eventsByDay.set(e.date, [...(eventsByDay.get(e.date) ?? []), e]))

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
          const evs = eventsByDay.get(k)
          const isToday = k === todayKey
          const isPast = k < todayKey
          const isSelected = selectedDay === k
          return (
            <button key={i} onClick={() => { setSelectedDay(isSelected ? null : k); setAddingEvent(false) }}
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
                {evs?.slice(0, 2).map(e => <span key={e.id} style={{ fontSize: '9px' }} title={e.title}>{kindMeta(e.kind).emoji}</span>)}
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
        {EVENT_KINDS.slice(0, 5).map(k => <span key={k.kind} style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{k.emoji} {k.label}</span>)}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={() => setAddingEvent(a => !a)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#5a4fcf', color: '#fff', fontWeight: 700, fontSize: '10px', cursor: 'pointer' }}>
                <CalendarPlus size={11} /> {addingEvent ? 'Cancel' : 'Add event'}
              </button>
              <button onClick={() => setSelectedDay(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}><X size={13} /></button>
            </div>
          </div>

          {/* Add event form */}
          {addingEvent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <input value={evForm.title} onChange={e => setEvForm(f => ({ ...f, title: e.target.value }))} placeholder="Event (e.g. Reset Button Workshop goes live)"
                  style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                <input type="time" value={evForm.time} onChange={e => setEvForm(f => ({ ...f, time: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {EVENT_KINDS.map(k => (
                  <button key={k.kind} onClick={() => setEvForm(f => ({ ...f, kind: k.kind }))}
                    style={{ padding: '4px 10px', borderRadius: '20px', border: `2px solid ${evForm.kind === k.kind ? k.color : 'var(--border)'}`, background: evForm.kind === k.kind ? `${k.color}15` : 'transparent', fontSize: '10px', fontWeight: 700, cursor: 'pointer', color: evForm.kind === k.kind ? k.color : 'var(--text-muted)', fontFamily: 'inherit' }}>
                    {k.emoji} {k.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <select value={evForm.account_id} onChange={e => setEvForm(f => ({ ...f, account_id: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                  <option value="">🌐 All accounts</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.handle}</option>)}
                </select>
                <input value={evForm.notes} onChange={e => setEvForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)"
                  style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
              </div>
              <button onClick={saveEvent} disabled={evSaving || !evForm.title.trim()}
                style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#5a4fcf', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer', opacity: evSaving || !evForm.title.trim() ? 0.6 : 1 }}>
                {evSaving ? 'Saving…' : 'Save Event'}
              </button>
            </div>
          )}

          {/* Events this day */}
          {(eventsByDay.get(selectedDay) ?? []).map(e => {
            const km = kindMeta(e.kind)
            const a = acctFor(e.account_id)
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '6px 8px', background: `${km.color}0d`, borderRadius: '7px', marginBottom: '4px', borderLeft: `3px solid ${km.color}` }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>
                  {km.emoji} {e.title}
                  {e.time && <span style={{ color: km.color, marginLeft: '6px' }}>{e.time}</span>}
                  {a && <span style={{ color: a.color, marginLeft: '6px' }}>· {a.handle}</span>}
                  {e.notes && <span style={{ color: 'var(--text-subtle)', fontWeight: 400, marginLeft: '6px' }}>{e.notes}</span>}
                </p>
                <button onClick={() => removeEvent(e.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px', flexShrink: 0 }}><Trash2 size={11} /></button>
              </div>
            )
          })}

          {selDeadlines.map(g => (
            <p key={g.id} style={{ fontSize: '11px', fontWeight: 700, color: '#F2A65A', marginBottom: '4px' }}>🎯 Deadline: {g.title}</p>
          ))}
          {(!sel || (sel.posted.length === 0 && sel.scheduled.length === 0)) && selDeadlines.length === 0 && (eventsByDay.get(selectedDay) ?? []).length === 0 && !addingEvent && (
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Nothing on this day yet — add an event and the concept engine will build content around it.</p>
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

      {/* ── Concept engine: events + trends → headline/hook/concept suggestions ── */}
      <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: suggestions.length ? '12px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Lightbulb size={14} color="#F2A65A" />
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F2A65A' }}>Concept engine</p>
              <p style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>Reads your next 3 weeks of events + goals + tracked-account trends → headlines, hooks, and concepts</p>
            </div>
          </div>
          <button onClick={generateSuggestions} disabled={suggesting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: 'none', background: '#F2A65A', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer', opacity: suggesting ? 0.7 : 1 }}>
            {suggesting ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Reading the calendar…</> : <><Sparkles size={12} /> {suggestions.length ? 'Regenerate' : 'Suggest content'}</>}
          </button>
        </div>
        {suggestions.map((s, i) => {
          const a = acctFor(s.account_id)
          const urgencyColor = s.urgency === 'high' ? '#e05' : s.urgency === 'medium' ? '#F2A65A' : 'var(--text-subtle)'
          return (
            <div key={i} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)', borderLeft: `3px solid ${a?.color ?? '#F2A65A'}`, marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: urgencyColor, textTransform: 'uppercase' }}>{s.urgency}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)' }}>post {new Date(s.post_on + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    {a && <span style={{ fontSize: '10px', fontWeight: 700, color: a.color }}>{a.emoji} {a.handle}</span>}
                    <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>· rides: {s.event}</span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.35 }}>{s.headline}</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#F2A65A', marginTop: '3px', fontStyle: 'italic' }}>“{s.hook}”</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>{s.concept}</p>
                </div>
                <button onClick={() => fileSuggestion(s, i)} disabled={filingIdx === i || !!filedIdx[i]}
                  style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: filedIdx[i] ? '#E8F7F1' : 'var(--purple)', color: filedIdx[i] ? '#3DAA7C' : '#fff', fontWeight: 700, fontSize: '10px', cursor: filedIdx[i] ? 'default' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {filingIdx === i ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : filedIdx[i] ?? '🌊 Compose & File'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
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
