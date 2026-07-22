'use client'
import { useState, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'

type Placement = { account_id: string; angle: string; format: string; handle: string; emoji: string; color: string; named: boolean }
type Shred = { point: string; source_quote?: string; placements: Placement[] }
type Plan = { shreds: Shred[]; summary: { points: number; posts: number } }

// The Commander flow as a self-contained modal: shred an input → preview the plan
// (remove any placement) → compose all → receipt. Reusable anywhere (Notes, etc.).
export default function CommanderModal({ input, onClose }: { input: string; onClose: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [created, setCreated] = useState<{ id: number; handle: string; title: string }[] | null>(null)
  const [error, setError] = useState('')

  // Shred once when the modal opens. All state updates happen after the await
  // (never synchronously in the effect), with a cancel guard for safety.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/commander', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'plan', input }) })
        const d = await res.json()
        if (cancelled) return
        if (d.shreds) setPlan({ shreds: d.shreds, summary: d.summary })
        else setError(d.error || 'Could not shred this one.')
      } catch { if (!cancelled) setError('Shred failed — try again.') } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [input])

  const dropPlacement = (si: number, pi: number) => setPlan(pl => {
    if (!pl) return pl
    const shreds = pl.shreds.map((s, i) => i !== si ? s : { ...s, placements: s.placements.filter((_, j) => j !== pi) }).filter(s => s.placements.length > 0)
    return { shreds, summary: { points: shreds.length, posts: shreds.reduce((n, s) => n + s.placements.length, 0) } }
  })

  const compose = async () => {
    if (!plan) return
    setComposing(true)
    try {
      const res = await fetch('/api/commander', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'compose', shreds: plan.shreds }) })
      const d = await res.json()
      setCreated(d.created ?? [])
      setPlan(null)
    } catch { setError('Compose failed — try again.') } finally { setComposing(false) }
  }
  const go = (view: string) => { window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view } })); onClose() }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>🔱 Shred &amp; Compose{plan ? ` — ${plan.summary.points} points → ${plan.summary.posts} posts` : ''}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '14px 18px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Tearing it into its distinct points and finding where each one belongs…</p>}
          {error && <p style={{ fontSize: '13px', color: 'var(--hot-pink)', fontWeight: 600 }}>⚠ {error}</p>}

          {plan && plan.shreds.map((s, si) => (
            <div key={si} style={{ background: 'var(--surface-raised)', borderRadius: '8px', padding: '9px 11px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>{s.point}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {s.placements.map((p, pi) => (
                  <span key={pi} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '20px', background: 'var(--surface)', border: `1px solid ${p.color}`, color: 'var(--text)' }}>
                    {p.emoji} {p.handle}{p.named ? '' : ' ✨'} · {p.format}
                    <button onClick={() => dropPlacement(si, pi)} title="remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: 0, marginLeft: '2px', fontSize: '12px', lineHeight: 1 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          ))}

          {created && (
            <div style={{ border: '1px solid #3DAA7C', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', background: '#EAF7F0', fontSize: '11px', fontWeight: 800, color: '#2E8B60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ Composed {created.length} posts — filed in Accounts</div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {created.map((c, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.handle} — {c.title}</p>)}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          {plan && (
            <button onClick={compose} disabled={composing || plan.summary.posts === 0}
              style={{ flex: 1, padding: '11px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {composing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Composing {plan.summary.posts}…</> : <>✍️ Compose all {plan.summary.posts} posts</>}
            </button>
          )}
          {created ? (
            <button onClick={() => go('accounts')} style={{ flex: 1, padding: '11px', background: '#3DAA7C', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>See them in Accounts →</button>
          ) : (
            <button onClick={onClose} style={{ padding: '11px 16px', background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
          )}
        </div>
      </div>
    </div>
  )
}
