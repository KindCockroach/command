'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

type Project = { id: number; name: string; progress: number; deadline: string | null; status: string; next_action: string; label: string }
type Goal = { id: number; title: string; target_per_week: number; postedThisWeek?: number; expectedByToday?: number; behind?: boolean; deadline?: string | null }

function timeline(deadline: string | null): { text: string; tone: 'ok' | 'soon' | 'over' | 'none' } {
  if (!deadline) return { text: 'no deadline', tone: 'none' }
  const diff = Math.ceil((new Date(deadline + 'T00:00:00').getTime() - Date.now()) / 86400000)
  if (diff < 0) return { text: `${-diff}d overdue`, tone: 'over' }
  if (diff === 0) return { text: 'due today', tone: 'soon' }
  if (diff <= 10) return { text: `${diff}d left`, tone: 'soon' }
  return { text: `${diff}d left`, tone: 'ok' }
}
const TONE: Record<string, string> = { ok: 'var(--text-subtle)', soon: '#E0912F', over: '#E05252', none: 'var(--text-subtle)' }

export default function GoalsPace() {
  const [projects, setProjects] = useState<Project[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects?status=active').then(r => r.json()).catch(() => []),
      fetch('/api/goals').then(r => r.json()).catch(() => []),
    ]).then(([p, g]) => {
      setProjects(Array.isArray(p) ? p : [])
      setGoals(Array.isArray(g) ? g : [])
      setLoading(false)
    })
  }, [])

  // Click the bar to set a project's progress — fundraiser-style, updates live.
  const setProgress = async (id: number, pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct))
    setProjects(ps => ps.map(p => p.id === id ? { ...p, progress: clamped } : p))
    try { await fetch('/api/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, progress: clamped }) }) } catch { /* optimistic */ }
  }
  const barClick = (id: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setProgress(id, Math.round(((e.clientX - rect.left) / rect.width) * 100))
  }

  const sortedProjects = [...projects].sort((a, b) => {
    const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity
    const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity
    return ad - bd
  })
  const activeGoals = goals.filter(g => (g as Goal & { active?: boolean }).active !== false)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{ fontSize: '18px' }}>🎯</span>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Goals &amp; Pace</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Where every project stands — and whether you&apos;re on cadence</p>
        </div>
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '7px' }}><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> loading…</p>}

      {/* PROJECTS — fundraiser bars toward completion */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-subtle)' }}>Projects · to completion</p>
          {sortedProjects.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>No active projects.</p>}
          {sortedProjects.map(p => {
            const t = timeline(p.deadline)
            const done = p.progress >= 100
            return (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{done ? '✅ ' : ''}{p.name}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: TONE[t.tone], whiteSpace: 'nowrap' }}>{p.progress}% · {t.text}</span>
                </div>
                <div onClick={barClick(p.id)} title="Click anywhere on the bar to update progress"
                  style={{ position: 'relative', height: '14px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--border)', cursor: 'pointer', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${p.progress}%`, borderRadius: '8px', background: done ? 'linear-gradient(90deg,#3DAA7C,#2E8B60)' : 'linear-gradient(90deg,var(--purple),#B482B7)', transition: 'width 0.25s' }} />
                </div>
                {p.next_action && <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>→ {p.next_action}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* GOALS — weekly pace bars */}
      {!loading && activeGoals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-subtle)' }}>This week&apos;s pace</p>
          {activeGoals.map(g => {
            const posted = g.postedThisWeek ?? 0
            const target = g.target_per_week || 1
            const expected = g.expectedByToday ?? 0
            const pct = Math.min(100, Math.round((posted / target) * 100))
            const expectedPct = Math.min(100, Math.round((expected / target) * 100))
            return (
              <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{g.title}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: g.behind ? '#E0912F' : '#3DAA7C', whiteSpace: 'nowrap' }}>{posted}/{target} this wk{g.behind ? ' · behind' : posted >= target ? ' · done' : ' · on pace'}</span>
                </div>
                <div style={{ position: 'relative', height: '12px', borderRadius: '7px', background: 'var(--surface-raised)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, borderRadius: '7px', background: g.behind ? 'linear-gradient(90deg,#E0912F,#E8B04A)' : 'linear-gradient(90deg,#3DAA7C,#5FC796)', transition: 'width 0.25s' }} />
                  {/* where she should be by today */}
                  <div title="where you should be today" style={{ position: 'absolute', top: 0, bottom: 0, left: `${expectedPct}%`, width: '2px', background: 'var(--text)', opacity: 0.5 }} />
                </div>
              </div>
            )
          })}
          <p style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>The faint line marks where you should be by today.</p>
        </div>
      )}
    </div>
  )
}
