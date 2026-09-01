'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import { hasMedia } from '@/lib/contentStatus'
import { CheckCircle2, RefreshCw, Camera, Video, ArrowRight, Sparkles, MessageCircleQuestion, MessageCircle } from 'lucide-react'
import PostChat from './PostChat'

// The merged Content tab: Daily Command IS the content surface now. A prioritized
// work queue — approvals first, then the ideas that are alive and need finishing —
// ordered by highest-priority account → her newest notes to the Commander →
// background ideas. Focused on: approve, give feedback, develop the top posts.

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2, planned: 3, paused: 4 }

// Rough REACH READ — a heuristic, not a promise. Rewards the things that actually
// travel on IG: a carousel/reel over a single image, a STATEMENT hook (not a
// question), a specific number or quote, and her own words. Used to rank "what's
// worth finishing first" and to show a one-word read on each card.
function reachScore(p: ContentPiece, isHers: boolean): number {
  let s = 42
  const firstHook = (p.onscreen_text || '').split('\n')[0]?.trim() || ''
  if (p.type === 'carousel') s += 18
  else if (p.type === 'video') s += 12
  else if (p.type === 'image') s += 6
  if (firstHook) s += firstHook.endsWith('?') ? -10 : 12 // statement hook beats a question
  const text = `${firstHook} ${p.description ?? ''}`
  if (/\d/.test(text)) s += 8            // a real number
  if (/["“”]/.test(text)) s += 6          // a real quote
  if (isHers) s += 10                     // her own words = authentic
  if (p.open_questions?.length) s -= 6    // still has unanswered gaps
  return Math.max(5, Math.min(98, s))
}
function reachRead(score: number): { label: string; color: string; bg: string } {
  if (score >= 74) return { label: '🔥 High potential', color: '#C2410C', bg: '#FFF1E8' }
  if (score >= 58) return { label: '📈 Strong', color: '#2E8B60', bg: '#E8F7F1' }
  if (score >= 46) return { label: 'Solid', color: '#6B7280', bg: '#F3F4F6' }
  return { label: '✏️ Sharpen the hook', color: '#9333EA', bg: 'var(--purple-light)' }
}

export default function CommandQueue() {
  const [posts, setPosts] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [chatting, setChatting] = useState<ContentPiece | null>(null)
  const [fAccount, setFAccount] = useState('')  // filter: account id
  const [fType, setFType] = useState('')         // filter: media/content type
  const [fSearch, setFSearch] = useState('')     // filter: shared root / keyword

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

  // Everything that still needs a step, ranked by REACH READ (highest-potential
  // first) so "what to produce next" is the strongest post, not just the newest.
  const developAll = posts
    .filter(p => !(hasMedia(p) && (p.description ?? '').trim()))
    .sort((a, b) => reachScore(b, hers(b)) - reachScore(a, hers(a)) || rank(a) - rank(b) || recency(b) - recency(a))

  // Filters: account, media type, and a shared-root/keyword search (matches title,
  // her words, or the shaped caption — so all variants of one story surface together).
  const q = fSearch.trim().toLowerCase()
  const develop = developAll.filter(p => {
    if (fAccount && p.account_id !== fAccount) return false
    if (fType && p.type !== fType) return false
    if (q && !`${p.title ?? ''} ${p.source_context ?? ''} ${p.description ?? ''} ${p.onscreen_text ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
  const typeOptions = Array.from(new Set(developAll.map(p => p.type).filter(Boolean)))
  const acctOptions = Array.from(new Set(developAll.map(p => p.account_id).filter(Boolean))) as string[]
  const filtersOn = !!(fAccount || fType || q)

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
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 8px', borderRadius: '10px', background: 'var(--purple-light)', color: 'var(--purple)' }}>{develop.length}{filtersOn ? ` / ${developAll.length}` : ''}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>top 5 by reach — filter to focus a batch</span>
        </div>

        {/* Filter bar: shared root (search), account, media type */}
        {developAll.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={fSearch} onChange={e => setFSearch(e.target.value)} placeholder="🔎 shared root / keyword (e.g. Dolly)"
              style={{ flex: '1 1 160px', minWidth: 0, padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '12px', outline: 'none' }} />
            <select value={fAccount} onChange={e => setFAccount(e.target.value)}
              style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>
              <option value="">All accounts</option>
              {acctOptions.map(id => <option key={id} value={id}>{acct(id)?.handle ?? id}</option>)}
            </select>
            <select value={fType} onChange={e => setFType(e.target.value)}
              style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>
              <option value="">All media</option>
              {typeOptions.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            {filtersOn && (
              <button onClick={() => { setFSearch(''); setFAccount(''); setFType('') }}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Clear</button>
            )}
          </div>
        )}
        {develop.length > 5 && (
          <p style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>Showing the 5 highest-reach of {develop.length}{filtersOn ? ' matching' : ''} — filter above to work a specific root, account, or media type.</p>
        )}

        {develop.slice(0, 5).map(p => {
          const step = nextStep(p)
          const read = reachRead(reachScore(p, hers(p)))
          return (
            <div key={p.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <AccChip p={p} />
                {hers(p) && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '9px', background: 'var(--purple-light)', color: 'var(--purple)' }}>YOUR NOTE</span>}
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>{p.type.replace(/_/g, ' ')}</span>
                <span title="Rough reach read — rewards carousels/reels, statement hooks, real numbers/quotes, and your own words. A guide, not a guarantee."
                  style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '9px', background: read.bg, color: read.color }}>{read.label}</span>
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
                <button onClick={() => setChatting(p)}
                  title="Talk it through with the Commander — answer its questions, give direction, watch the post come together"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 11px', borderRadius: '9px', border: '1px solid var(--purple)', background: 'var(--purple-light)', color: 'var(--purple)', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>
                  <MessageCircle size={12} /> Talk it through
                </button>
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
          <p style={{ fontSize: '12px', color: 'var(--text-subtle)', padding: '4px 2px' }}>
            {filtersOn ? 'Nothing matches that filter — clear it to see the rest.' : 'No open ideas. Drop a thought or a photo to the Commander above and it lands here.'}
          </p>
        )}
      </section>

      {chatting && (
        <PostChat
          post={chatting}
          account={acct(chatting.account_id)}
          onClose={() => setChatting(null)}
          onChanged={updated => setPosts(prev => prev.map(x => x.id === updated.id ? updated : x))}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
