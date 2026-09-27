'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import { hasMedia, postPurpose, PURPOSE_META, type Purpose } from '@/lib/contentStatus'
import { RefreshCw, Camera, Clapperboard, Loader2 } from 'lucide-react'

// CONTENT DAY — the shoot list, designed like the Format Finder concept cards, and
// with a SHOOT PLAN: turn a script into something she can actually film without
// flipping back and forth. A two-voice script (Inner Child / Higher Self) regroups
// BY ROLE — film every line of one character, then switch once — each line with an
// emotion cue and a camera position. A solo script maps onto the retention template.

const MONO = 'ui-monospace, "IBM Plex Mono", Menlo, monospace'

type PlanLine = { text: string; emotion: string; camera: string }
type ShootPlan = {
  mode: 'dialogue' | 'solo'
  title?: string
  sections?: { role: string; setup: string; lines: PlanLine[] }[]
  beats?: { label: string; cue: string; text: string; emotion: string; camera: string }[]
}
type Line = { key: string; kind: string; length: string; script: string; account?: string; color?: string; postId: number; accountId?: string | null; broll?: boolean; purpose: Purpose }

function estLength(script: string): string {
  const words = script.trim().split(/\s+/).filter(Boolean).length
  if (!words) return '10s'
  const secs = Math.max(5, Math.round((words / 2.5) / 5) * 5)
  return `~${secs}s`
}

// Break a talking-head script into readable beats (fallback before a plan is built).
function beats(script: string): string[] {
  const raw = script.trim()
  if (!raw) return []
  let parts = raw.split(/\n+/).map(s => s.trim()).filter(Boolean)
  if (parts.length <= 1) parts = raw.split(/(?<=[.!?])\s+(?=[A-Z"'])/).map(s => s.trim()).filter(Boolean)
  return parts.slice(0, 10)
}

const sig = (script: string) => `${script.length}:${script.slice(0, 24)}`

export default function ContentDay() {
  const [posts, setPosts] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [plans, setPlans] = useState<Record<number, ShootPlan>>({})
  const [planning, setPlanning] = useState<Record<number, boolean>>({})
  const [planErr, setPlanErr] = useState<Record<number, string>>({})
  const [purposeFilter, setPurposeFilter] = useState<'all' | Purpose>('all')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([fetch('/api/content').then(r => r.json()), fetch('/api/accounts').then(r => r.json())])
      .then(([c, a]) => { setPosts(Array.isArray(c) ? c : []); setAccounts(Array.isArray(a) ? a : []) })
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { try { const s = localStorage.getItem('rise-contentday-done'); if (s) setDone(JSON.parse(s)) } catch { /* fresh */ } }, [])
  const toggle = (k: string) => setDone(d => { const n = { ...d, [k]: !d[k] }; try { localStorage.setItem('rise-contentday-done', JSON.stringify(n)) } catch { /* ok */ } return n })

  // Build a shoot plan for a post's script (cached per post + script signature).
  const buildPlan = async (postId: number, script: string, accountId?: string | null) => {
    setPlanning(p => ({ ...p, [postId]: true })); setPlanErr(e => ({ ...e, [postId]: '' }))
    try {
      const r = await fetch('/api/shootplan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script, accountId }) })
      const d = await r.json().catch(() => ({}))
      if (d.plan) {
        setPlans(p => ({ ...p, [postId]: d.plan }))
        try { localStorage.setItem(`rise-shootplan-${postId}`, JSON.stringify({ sig: sig(script), plan: d.plan })) } catch { /* ok */ }
      } else setPlanErr(e => ({ ...e, [postId]: d.error || 'Could not build the plan — try again.' }))
    } catch { setPlanErr(e => ({ ...e, [postId]: 'Connection error' })) } finally { setPlanning(p => ({ ...p, [postId]: false })) }
  }

  const acct = (id?: string | null) => accounts.find(a => a.id === id)

  const allLines: Line[] = []
  for (const p of posts) {
    if (['published', 'archived'].includes(p.status)) continue
    const a = acct(p.account_id)
    const acctLabel = a ? `${a.emoji} ${a.handle}` : undefined
    const purpose = postPurpose(p)
    if ((p.script ?? '').trim() && !(hasMedia(p) && /\.(mp4|mov|webm)/i.test((p.media_url || p.media_urls?.[0] || '')))) {
      allLines.push({ key: `${p.id}-th`, kind: 'Talking head', length: estLength(p.script as string), script: p.script as string, account: acctLabel, color: a?.color, postId: p.id, accountId: p.account_id, purpose })
    }
    const fp = p.frame_plan ?? ''
    if (fp) {
      fp.split('\n').map(l => l.trim()).filter(l => l.startsWith('•') || l.startsWith('-')).forEach((l, i) => {
        const shot = l.replace(/^[•-]\s*/, '')
        const m = shot.match(/^\[([^\]]+)\]\s*(.*)$/)
        allLines.push({ key: `${p.id}-br${i}`, kind: m ? m[1] : 'B-roll', length: '3–6s', script: m ? m[2] : shot, account: acctLabel, color: a?.color, postId: p.id, broll: true, purpose })
      })
    }
  }
  const purposeCounts = allLines.reduce((m, l) => { m[l.purpose] = (m[l.purpose] ?? 0) + 1; return m }, {} as Record<Purpose, number>)
  const lines = purposeFilter === 'all' ? allLines : allLines.filter(l => l.purpose === purposeFilter)

  // Rehydrate cached plans for the talking-head scripts currently on screen.
  useEffect(() => {
    const next: Record<number, ShootPlan> = {}
    for (const l of lines) {
      if (l.broll || plans[l.postId]) continue
      try {
        const raw = localStorage.getItem(`rise-shootplan-${l.postId}`)
        if (raw) { const { sig: s, plan } = JSON.parse(raw); if (s === sig(l.script) && plan) next[l.postId] = plan }
      } catch { /* ignore */ }
    }
    if (Object.keys(next).length) setPlans(p => ({ ...next, ...p }))
  }, [posts]) // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = lines.filter(l => !done[l.key]).length

  const pill = (broll?: boolean): React.CSSProperties => ({ fontFamily: MONO, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 9px', borderRadius: '99px', background: broll ? 'var(--purple-light)' : 'rgba(232,68,138,0.14)', color: broll ? 'var(--purple)' : '#E8448A' })
  const metaStyle: React.CSSProperties = { fontFamily: MONO, fontSize: '11.5px', color: 'var(--text-subtle)', letterSpacing: '0.01em' }
  const labelStyle: React.CSSProperties = { fontFamily: MONO, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--purple)' }
  const emotionPill: React.CSSProperties = { fontSize: '11px', fontWeight: 600, fontStyle: 'italic', padding: '2px 9px', borderRadius: '99px', background: 'rgba(242,166,90,0.16)', color: '#B96A1E' }
  const cameraLine: React.CSSProperties = { fontFamily: MONO, fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '5px', alignItems: 'baseline' }

  const PlanBlock = ({ plan }: { plan: ShootPlan }) => {
    if (plan.mode === 'dialogue' && plan.sections?.length) {
      return (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {plan.sections.map((sec, si) => (
            <div key={si} style={{ borderRadius: '11px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', background: 'var(--purple-light)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Clapperboard size={13} style={{ color: 'var(--purple)' }} />
                <span style={{ fontSize: '12.5px', fontWeight: 900, color: 'var(--purple)' }}>Film all as {sec.role}</span>
                <span style={{ ...metaStyle, marginLeft: 'auto' }}>{sec.lines?.length ?? 0} lines · one setup</span>
              </div>
              {sec.setup && <p style={{ ...cameraLine, padding: '8px 12px 0' }}><span style={labelStyle}>Set-up</span> {sec.setup}</p>}
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {(sec.lines ?? []).map((ln, li) => (
                  <div key={li} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-subtle)', minWidth: '18px', flexShrink: 0, paddingTop: '3px', fontVariantNumeric: 'tabular-nums' }}>{String(li + 1).padStart(2, '0')}</span>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>&ldquo;{ln.text}&rdquo;</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {ln.emotion && <span style={emotionPill}>{ln.emotion}</span>}
                        {ln.camera && <span style={cameraLine}>🎥 {ln.camera}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }
    if (plan.mode === 'solo' && plan.beats?.length) {
      return (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plan.beats.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: '74px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontFamily: MONO, fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--purple)' }}>{b.label}</span>
                <span style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{b.cue}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '2px solid var(--border)', paddingLeft: '11px' }}>
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>{b.text}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {b.emotion && <span style={emotionPill}>{b.emotion}</span>}
                  {b.camera && <span style={cameraLine}>🎥 {b.camera}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '15px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(120deg, var(--purple-light), transparent)' }}>
        <Camera size={18} color="var(--purple)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--purple)' }}>Shoot list</p>
          <p style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.1 }}>Content Day</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: MONO, fontSize: '11.5px', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{remaining}/{lines.length} left</span>
          <button onClick={load} disabled={loading} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 9px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          </button>
        </div>
      </div>

      {/* PURPOSE sorter — focus on follower / conversion / trust */}
      {allLines.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 14px 0' }}>
          {(['all', 'follower', 'conversion', 'trust'] as const).map(pk => {
            const on = purposeFilter === pk
            const meta = pk === 'all' ? { label: 'All', emoji: '', color: 'var(--purple)', bg: 'var(--purple-light)' } : PURPOSE_META[pk]
            const count = pk === 'all' ? allLines.length : (purposeCounts[pk] ?? 0)
            if (pk !== 'all' && count === 0) return null
            return (
              <button key={pk} onClick={() => setPurposeFilter(pk)}
                style={{ padding: '5px 11px', borderRadius: '20px', border: `2px solid ${on ? meta.color : 'var(--border)'}`, background: on ? meta.bg : 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: on ? meta.color : 'var(--text-muted)', fontFamily: 'inherit' }}>
                {'emoji' in meta && meta.emoji ? `${meta.emoji} ` : ''}{meta.label} · {count}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ padding: '12px' }}>
        {loading && <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '14px', textAlign: 'center' }}>Compiling your shoot list…</p>}
        {!loading && lines.length === 0 && (
          <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', padding: '24px 14px', textAlign: 'center', lineHeight: 1.6 }}>Nothing to film right now. 🌊<br />When the Commander drafts posts that need footage, your shoot list builds itself here.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lines.map(l => {
            const isDone = !!done[l.key]
            const plan = l.broll ? undefined : plans[l.postId]
            const bs = l.broll || plan ? [] : beats(l.script)
            const hook = l.broll ? l.script : (plan?.title || bs[0] || l.script)
            const rest = l.broll || plan ? [] : bs.slice(1)
            return (
              <div key={l.key} style={{ border: '1px solid var(--border)', borderRadius: '12px', background: isDone ? 'var(--bg)' : 'var(--surface)', padding: '14px 15px', opacity: isDone ? 0.55 : 1, transition: 'opacity .15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
                  <button onClick={() => toggle(l.key)} aria-label={isDone ? 'Mark not filmed' : 'Mark filmed'}
                    style={{ flexShrink: 0, marginTop: '1px', width: '22px', height: '22px', borderRadius: '7px', border: `2px solid ${isDone ? '#2E8B60' : 'var(--border)'}`, background: isDone ? '#2E8B60' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}>{isDone ? '✓' : ''}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={pill(l.broll)}>{l.kind}</span>
                      {l.account && <span style={{ fontSize: '11px', fontWeight: 700, color: l.color || 'var(--text-subtle)' }}>{l.account}</span>}
                    </div>
                    <p style={{ ...metaStyle, marginBottom: '7px' }}>{l.broll ? 'B-roll' : (plan ? (plan.mode === 'dialogue' ? `Dialogue · ${plan.sections?.length ?? 0} roles to film` : `Talking head · retention plan`) : `Talking head · ${l.length}${rest.length ? ` · ${bs.length} beats` : ''}`)}</p>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.4, letterSpacing: '-0.01em', textDecoration: isDone ? 'line-through' : 'none' }}>{hook}</p>

                    {/* Plan this shoot — dialogue → by role, solo → retention beats */}
                    {!l.broll && !plan && (
                      <div style={{ marginTop: '9px' }}>
                        <button onClick={() => buildPlan(l.postId, l.script, l.accountId)} disabled={!!planning[l.postId]}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '9px', border: '1px solid var(--purple)', background: 'var(--surface)', color: 'var(--purple)', fontWeight: 800, fontSize: '11.5px', cursor: planning[l.postId] ? 'default' : 'pointer' }}>
                          {planning[l.postId] ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Directing the shoot…</> : <><Clapperboard size={12} /> Plan this shoot</>}
                        </button>
                        {planErr[l.postId] && <p style={{ fontSize: '11px', color: '#C0392B', marginTop: '5px' }}>{planErr[l.postId]}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fallback beats (before a plan is built) */}
                {rest.length > 0 && (
                  <div style={{ marginTop: '11px', paddingTop: '11px', borderTop: '1px dashed var(--border)', paddingLeft: '33px' }}>
                    <p style={{ ...labelStyle, marginBottom: '7px' }}>Beats</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {rest.map((b, i) => (
                        <div key={i} style={{ display: 'flex', gap: '11px', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', minWidth: '18px', flexShrink: 0 }}>{String(i + 2).padStart(2, '0')}</span>
                          <p style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.5 }}>{b}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* The generated shoot plan (by role, or retention beats) */}
                {plan && <PlanBlock plan={plan} />}
                {plan && (
                  <button onClick={() => buildPlan(l.postId, l.script, l.accountId)} disabled={!!planning[l.postId]}
                    style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-subtle)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                    {planning[l.postId] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />} Re-plan
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
