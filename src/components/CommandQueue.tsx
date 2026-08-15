'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import { hasMedia } from '@/lib/contentStatus'
import { CheckCircle2, RefreshCw, Camera, Video, ArrowRight, Sparkles, MessageCircleQuestion } from 'lucide-react'

// The merged Content tab: Daily Command IS the content surface now. A prioritized
// work queue — approvals first, then the ideas that are alive and need finishing —
// ordered by highest-priority account → her newest notes to the Commander →
// background ideas. Focused on: approve, give feedback, develop the top posts.

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2, planned: 3, paused: 4 }

export default function CommandQueue() {
  const [posts, setPosts] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/content').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ]).then(([c, a]) => {
      const active = (c as ContentPiece[]).filter(x => !['published', 'archived', 'held', 'scheduled'].includes(x.status))
      setPosts(Array.isArray(active) ? active : [])
      setAccounts(Array.isArray(a) ? a : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const acct = (id?: string | null) => accounts.find(a => a.id === id) || null
  const rank = (p: ContentPiece) => PRIORITY_RANK[acct(p.account_id)?.priority ?? 'low'] ?? 5
  const recency = (p: ContentPiece) => new Date(p.updated_at || p.created_at || 0).getTime()
  const hers = (p: ContentPiece) => (p.source_context ?? '').trim().length > 0

  const readyToApprove = posts
    .filter(p => hasMedia(p) && (p.description ?? '').trim())
    .sort((a, b) => rank(a) - rank(b) || recency(b) - recency(a))

  // Everything that still needs a step: her newest notes first (source_context =
  // something SHE handed the Commander), then background ideas, within account priority.
  const develop = posts
    .filter(p => !(hasMedia(p) && (p.description ?? '').trim()))
    .sort((a, b) => rank(a) - rank(b) || (hers(b) ? 1 : 0) - (hers(a) ? 1 : 0) || recency(b) - recency(a))

  const approve = async (p: ContentPiece) => {
    setBusy(p.id)
    try {
      await fetch('/api/ghl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: p.id, autoSchedule: true }) })
      setPosts(prev => prev.filter(x => x.id !== p.id))
    } finally { setBusy(null) }
  }
  const polish = async (p: ContentPiece) => {
    setBusy(p.id)
    try {
      const r = await fetch('/api/content/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: p.id }) })
      if (r.ok) load()
    } finally { setBusy(null) }
  }
  const openOnAccount = (p: ContentPiece) => {
    if (p.account_id) localStorage.setItem('station-flip-account', p.account_id)
    window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view: 'accounts' } }))
  }

  const nextStep = (p: ContentPiece): { label: string; icon: React.ReactNode } => {
    if (p.open_questions?.length) return { label: `Answer ${p.open_questions.length} question${p.open_questions.length > 1 ? 's' : ''} to finish`, icon: <MessageCircleQuestion size={12} /> }
    if (!hasMedia(p)) return (p.type === 'video' || p.type === 'podcast')
      ? { label: 'Add your video, then approve', icon: <Video size={12} /> }
      : { label: 'Make the image, then approve', icon: <Camera size={12} /> }
    if (!(p.description ?? '').trim()) return { label: 'Clean up the copy', icon: <Sparkles size={12} /> }
    return { label: 'Confirm & build', icon: <ArrowRight size={12} /> }
  }

  const AccChip = ({ p }: { p: ContentPiece }) => {
    const a = acct(p.account_id)
    if (!a) return <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)' }}>· no account</span>
    return <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: `${a.color}18`, color: a.color }}>{a.emoji} {a.handle}</span>
  }

  const cardStyle: React.CSSProperties = { padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '8px' }

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading your queue…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ── Ready to approve ─────────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#2E8B60' }}>✅ Ready to approve</span>
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 8px', borderRadius: '10px', background: '#E8F7F1', color: '#2E8B60' }}>{readyToApprove.length}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>image + words are here — one tap ships it</span>
        </div>
        {readyToApprove.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-subtle)', padding: '4px 2px' }}>Nothing ready yet — finish one below and it lands here. 🌱</p>
        )}
        {readyToApprove.slice(0, 12).map(p => {
          const media = p.media_urls?.length ? p.media_urls : (p.media_url ? [p.media_url] : [])
          return (
            <div key={p.id} style={cardStyle}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {media[0] && (/\.(mp4|mov|webm)/i.test(media[0])
                  ? <video src={media[0]} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', background: '#000', flexShrink: 0 }} />
                  : <img src={media[0]} alt="" style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}><AccChip p={p} />{media.length > 1 && <span style={{ fontSize: '10px', color: '#2E8B60', fontWeight: 700 }}>📎 {media.length} slides</span>}</div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginBottom: '2px' }}>{p.title}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => approve(p)} disabled={busy === p.id}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', borderRadius: '9px', border: 'none', background: '#2E8B60', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', opacity: busy === p.id ? 0.7 : 1 }}>
                  {busy === p.id ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />} Approve
                </button>
                <button onClick={() => openOnAccount(p)}
                  style={{ padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Open</button>
              </div>
            </div>
          )
        })}
      </section>

      {/* ── Alive — develop / finish ─────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--purple)' }}>🔥 Alive — finish these</span>
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 8px', borderRadius: '10px', background: 'var(--purple-light)', color: 'var(--purple)' }}>{develop.length}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>your latest ideas — one step from ready</span>
        </div>
        {develop.slice(0, 15).map(p => {
          const step = nextStep(p)
          return (
            <div key={p.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <AccChip p={p} />
                {hers(p) && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '9px', background: 'var(--purple-light)', color: 'var(--purple)' }}>YOUR NOTE</span>}
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>{p.type.replace(/_/g, ' ')}</span>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</p>
              {hers(p) && (
                <div style={{ borderLeft: '3px solid var(--purple)', paddingLeft: '9px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '2px' }}>Your words</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.source_context}</p>
                </div>
              )}
              {(p.description ?? '').trim() && (
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '2px' }}>What the Commander shaped</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
                </div>
              )}
              {!!p.open_questions?.length && (
                <div style={{ background: 'var(--purple-light)', borderRadius: '8px', padding: '8px 10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--purple)', marginBottom: '3px' }}>The Commander needs from you:</p>
                  {p.open_questions.slice(0, 3).map((q, i) => <p key={i} style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.4 }}>• {q}</p>)}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: 'var(--purple)' }}>{step.icon} Next: {step.label}</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => polish(p)} disabled={busy === p.id}
                  title="Rewrite this post's copy to your voice"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 11px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                  {busy === p.id ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : '🧹'} Clean up copy
                </button>
                <button onClick={() => openOnAccount(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 11px', borderRadius: '9px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>
                  Open to finish <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )
        })}
        {develop.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-subtle)', padding: '4px 2px' }}>No open ideas. Drop a thought or a photo to the Commander above and it lands here.</p>
        )}
      </section>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
