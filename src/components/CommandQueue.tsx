'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import { hasMedia } from '@/lib/contentStatus'
import { CheckCircle2, RefreshCw, Camera, Video, ArrowRight, Sparkles, MessageCircleQuestion, MessageCircle, X, ExternalLink, SkipForward, Send, ChevronDown, ChevronUp } from 'lucide-react'
import PostChat from './PostChat'
import { PostCard } from './AccountsPanel'

// THE ONE NEXT THING. Instead of stacking 6 approvals + 5 finishes, the home shows
// ONE prioritized action at a time — ship what's ready first (marketing = money),
// then finish the strongest idea. Skip advances; "show all" opens the full queue for
// a batch session. Priority is rules-based (free): accounts BEHIND their goal bubble
// up, then account priority, then reach read.

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2, planned: 3, paused: 4 }

// Rough REACH READ — rewards what actually travels: carousel/reel over a single
// image, a STATEMENT hook (not a question), a real number/quote, her own words.
function reachScore(p: ContentPiece, isHers: boolean): number {
  let s = 42
  const firstHook = (p.onscreen_text || '').split('\n')[0]?.trim() || ''
  if (p.type === 'carousel') s += 18
  else if (p.type === 'video') s += 12
  else if (p.type === 'image') s += 6
  if (firstHook) s += firstHook.endsWith('?') ? -10 : 12
  const text = `${firstHook} ${p.description ?? ''}`
  if (/\d/.test(text)) s += 8
  if (/["“”]/.test(text)) s += 6
  if (isHers) s += 10
  if (p.open_questions?.length) s -= 6
  return Math.max(5, Math.min(98, s))
}
function reachRead(score: number): { label: string; color: string; bg: string } {
  if (score >= 74) return { label: '🔥 High potential', color: '#C2410C', bg: '#FFF1E8' }
  if (score >= 58) return { label: '📈 Strong', color: '#2E8B60', bg: '#E8F7F1' }
  if (score >= 46) return { label: 'Solid', color: '#6B7280', bg: '#F3F4F6' }
  return { label: '✏️ Sharpen the hook', color: '#9333EA', bg: 'var(--purple-light)' }
}

type Goal = { account_id?: string | null; behind?: boolean }

export default function CommandQueue() {
  const [posts, setPosts] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [behindAccts, setBehindAccts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [chatting, setChatting] = useState<ContentPiece | null>(null)
  const [working, setWorking] = useState<ContentPiece | null>(null)
  const [skipped, setSkipped] = useState<number[]>([])
  const [showAll, setShowAll] = useState(false)
  const [fAccount, setFAccount] = useState('')
  const [fType, setFType] = useState('')
  const [fSearch, setFSearch] = useState('')

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/content').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/goals').then(r => r.json()).catch(() => []),
    ]).then(([c, a, g]) => {
      const active = (c as ContentPiece[]).filter(x => !['published', 'archived', 'held', 'scheduled'].includes(x.status))
      setPosts(Array.isArray(active) ? active : [])
      setAccounts(Array.isArray(a) ? a : [])
      const behind = new Set<string>((Array.isArray(g) ? g as Goal[] : []).filter(x => x.behind && x.account_id).map(x => x.account_id as string))
      setBehindAccts(behind)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!working) return
    const latest = posts.find(p => p.id === working.id)
    if (!latest) { setWorking(null); return }
    if (latest !== working) setWorking(latest)
  }, [posts])  // eslint-disable-line react-hooks/exhaustive-deps

  const acct = (id?: string | null) => accounts.find(a => a.id === id) || null
  const rank = (p: ContentPiece) => PRIORITY_RANK[acct(p.account_id)?.priority ?? 'low'] ?? 5
  const behindRank = (p: ContentPiece) => (p.account_id && behindAccts.has(p.account_id) ? 0 : 1)  // behind-pace accounts first
  const recency = (p: ContentPiece) => new Date(p.updated_at || p.created_at || 0).getTime()
  const hers = (p: ContentPiece) => (p.source_context ?? '').trim().length > 0

  const readyToApprove = posts
    .filter(p => hasMedia(p) && (p.description ?? '').trim())
    .sort((a, b) => behindRank(a) - behindRank(b) || rank(a) - rank(b) || recency(b) - recency(a))

  const developAll = posts
    .filter(p => !(hasMedia(p) && (p.description ?? '').trim()))
    .sort((a, b) => behindRank(a) - behindRank(b) || reachScore(b, hers(b)) - reachScore(a, hers(a)) || rank(a) - rank(b) || recency(b) - recency(a))

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

  // The single prioritized queue behind the "one next thing": ship-ready first
  // (money move), then finish-strongest. Skipped items drop to the back.
  const queue: { p: ContentPiece; kind: 'ship' | 'finish' }[] = [
    ...readyToApprove.map(p => ({ p, kind: 'ship' as const })),
    ...developAll.map(p => ({ p, kind: 'finish' as const })),
  ]
  const pending = queue.filter(x => !skipped.includes(x.p.id))
  const next = pending[0] ?? null

  const approve = async (p: ContentPiece) => {
    setBusy(p.id)
    try {
      await fetch('/api/ghl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: p.id, autoSchedule: true }) })
      setPosts(prev => prev.filter(x => x.id !== p.id))
    } finally { setBusy(null) }
  }
  // "Posted" — she already posted it natively (or it went out). Mark published and
  // clear it from view. No GHL. This is the fix for "already-posted still showing".
  const markPosted = async (p: ContentPiece) => {
    setBusy(p.id)
    try {
      await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'published' }) })
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
  const skip = (p: ContentPiece) => setSkipped(s => [...s, p.id])
  const openInline = (p: ContentPiece) => setWorking(p)
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
    return <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: `${a.color}18`, color: a.color }}>{a.emoji} {a.handle}{p.account_id && behindAccts.has(p.account_id) ? ' · behind' : ''}</span>
  }

  const btn = (bg: string, color = '#fff'): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px 14px', borderRadius: '11px', border: 'none', background: bg, color, fontWeight: 800, fontSize: '13px', cursor: 'pointer' })
  const ghostBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px 14px', borderRadius: '11px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
  const cardStyle: React.CSSProperties = { padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '8px' }

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading your next move…</div>

  const readyCount = readyToApprove.length
  const finishCount = developAll.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── THE ONE NEXT THING ─────────────────────────────────────────── */}
      {!next && (
        <div style={{ ...cardStyle, alignItems: 'center', textAlign: 'center', padding: '30px 18px', gap: '6px' }}>
          <span style={{ fontSize: '30px' }}>🌊</span>
          <p style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text)' }}>{skipped.length ? 'That’s everything for now.' : 'You’re all clear.'}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-subtle)', maxWidth: '38ch' }}>
            {skipped.length ? 'You’ve moved through the whole queue.' : 'Nothing waiting. Drop a thought or a photo to the Commander and your next post lands right here.'}
          </p>
          {skipped.length > 0 && (
            <button onClick={() => setSkipped([])} style={{ ...btn('var(--purple)'), marginTop: '8px' }}><RefreshCw size={13} /> Start over</button>
          )}
        </div>
      )}

      {next && (() => {
        const p = next.p
        const media = p.media_urls?.length ? p.media_urls : (p.media_url ? [p.media_url] : [])
        const isVid = media[0] && /\.(mp4|mov|webm)/i.test(media[0])
        const read = reachRead(reachScore(p, hers(p)))
        const step = nextStep(p)
        return (
          <div className="rise-magic" style={{ borderRadius: '16px', border: `1.5px solid ${next.kind === 'ship' ? '#2E8B60' : 'var(--purple)'}`, background: 'var(--surface)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: next.kind === 'ship' ? 'rgba(46,139,96,0.08)' : 'var(--purple-light)' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: next.kind === 'ship' ? '#2E8B60' : 'var(--purple)' }}>
                {next.kind === 'ship' ? '✅ Ship this next' : '🔥 Finish this next'}
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)' }}>{pending.length} in your queue</span>
            </div>

            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                {media[0] && (isVid
                  ? <video src={media[0]} style={{ width: '92px', height: '92px', borderRadius: '10px', objectFit: 'cover', background: '#000', flexShrink: 0 }} />
                  : <img src={media[0]} alt="" style={{ width: '92px', height: '92px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                    <AccChip p={p} />
                    {media.length > 1 && <span style={{ fontSize: '10px', color: '#2E8B60', fontWeight: 700 }}>📎 {media.length} slides</span>}
                    {next.kind === 'finish' && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '9px', background: read.bg, color: read.color }}>{read.label}</span>}
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.25 }}>{p.title}</p>
                </div>
              </div>

              {/* Body preview */}
              {next.kind === 'finish' && hers(p) && (
                <div style={{ borderLeft: '3px solid var(--purple)', paddingLeft: '10px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '2px' }}>Your words</p>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.source_context}</p>
                </div>
              )}
              {(p.description ?? '').trim() && (
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
              )}
              {!!p.open_questions?.length && next.kind === 'finish' && (
                <div style={{ background: 'var(--purple-light)', borderRadius: '9px', padding: '9px 11px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--purple)', marginBottom: '3px' }}>The Commander needs from you:</p>
                  {p.open_questions.slice(0, 3).map((qq, i) => <p key={i} style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.4 }}>• {qq}</p>)}
                </div>
              )}

              {/* Actions */}
              {next.kind === 'ship' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="rise-tactile" onClick={() => approve(p)} disabled={busy === p.id} style={btn('#2E8B60')}>
                    {busy === p.id ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />} Approve &amp; ship it
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => markPosted(p)} disabled={busy === p.id} title="Already went out — mark it posted and clear it" style={{ ...ghostBtn, flex: 1 }}>
                      <CheckCircle2 size={14} /> Already posted
                    </button>
                    <button onClick={() => openInline(p)} title="Open to edit before shipping" style={{ ...ghostBtn, flex: 1 }}>Open</button>
                    <button onClick={() => skip(p)} title="Skip for now" style={ghostBtn}><SkipForward size={14} /> Skip</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: 'var(--purple)', marginBottom: '2px' }}>{step.icon} Next: {step.label}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="rise-tactile" onClick={() => setChatting(p)} style={{ ...btn('var(--purple)'), flex: 1 }}><MessageCircle size={15} /> Talk it through</button>
                    <button onClick={() => openInline(p)} title="Open the full card to finish it" style={{ ...ghostBtn }}>Finish <ArrowRight size={13} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => polish(p)} disabled={busy === p.id} title="Rewrite the copy in your voice" style={{ ...ghostBtn, flex: 1 }}>
                      {busy === p.id ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : '🧹'} Clean up copy
                    </button>
                    <button onClick={() => markPosted(p)} disabled={busy === p.id} title="Already handled — clear it" style={ghostBtn}><CheckCircle2 size={14} /> Done</button>
                    <button onClick={() => skip(p)} title="Skip for now" style={ghostBtn}><SkipForward size={14} /> Skip</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── The calm status strip + show-all ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px 4px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#2E8B60' }}>✅ {readyCount} ready to ship</span>
        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>·</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)' }}>🔥 {finishCount} to finish</span>
        {skipped.length > 0 && <button onClick={() => setSkipped([])} style={{ fontSize: '11px', color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>reset {skipped.length} skipped</button>}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowAll(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 11px', cursor: 'pointer' }}>
          {showAll ? <><ChevronUp size={13} /> Focus mode</> : <><ChevronDown size={13} /> Show all &amp; batch</>}
        </button>
      </div>

      {/* ── Full queue (batch mode) — the whole stack, on demand ───────── */}
      {showAll && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px dashed var(--border)', paddingTop: '14px' }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#2E8B60' }}>✅ Ready to ship ({readyCount})</span>
            {readyToApprove.map(p => {
              const media = p.media_urls?.length ? p.media_urls : (p.media_url ? [p.media_url] : [])
              return (
                <div key={p.id} style={cardStyle}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {media[0] && (/\.(mp4|mov|webm)/i.test(media[0])
                      ? <video src={media[0]} style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', background: '#000', flexShrink: 0 }} />
                      : <img src={media[0]} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}><AccChip p={p} />{media.length > 1 && <span style={{ fontSize: '10px', color: '#2E8B60', fontWeight: 700 }}>📎 {media.length}</span>}</div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => approve(p)} disabled={busy === p.id} style={{ ...btn('#2E8B60'), flex: 1, padding: '9px', fontSize: '12px' }}>
                      {busy === p.id ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />} Approve &amp; ship
                    </button>
                    <button onClick={() => markPosted(p)} disabled={busy === p.id} style={{ ...ghostBtn, padding: '9px 11px', fontSize: '12px' }} title="Already posted — clear it"><CheckCircle2 size={13} /> Posted</button>
                    <button onClick={() => openInline(p)} style={{ ...ghostBtn, padding: '9px 11px', fontSize: '12px' }}>Open</button>
                  </div>
                </div>
              )
            })}
            {readyCount === 0 && <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Nothing ready yet — finish one below and it lands here. 🌱</p>}
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--purple)' }}>🔥 To finish ({develop.length}{filtersOn ? ` / ${developAll.length}` : ''})</span>
            {developAll.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={fSearch} onChange={e => setFSearch(e.target.value)} placeholder="🔎 shared root / keyword"
                  style={{ flex: '1 1 150px', minWidth: 0, padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '12px', outline: 'none' }} />
                <select value={fAccount} onChange={e => setFAccount(e.target.value)} style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>
                  <option value="">All accounts</option>
                  {acctOptions.map(id => <option key={id} value={id}>{acct(id)?.handle ?? id}</option>)}
                </select>
                <select value={fType} onChange={e => setFType(e.target.value)} style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>
                  <option value="">All media</option>
                  {typeOptions.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                {filtersOn && <button onClick={() => { setFSearch(''); setFAccount(''); setFType('') }} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Clear</button>}
              </div>
            )}
            {develop.map(p => {
              const step = nextStep(p)
              const read = reachRead(reachScore(p, hers(p)))
              return (
                <div key={p.id} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <AccChip p={p} />
                    {hers(p) && <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '9px', background: 'var(--purple-light)', color: 'var(--purple)' }}>YOUR NOTE</span>}
                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '9px', background: read.bg, color: read.color }}>{read.label}</span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: 'var(--purple)' }}>{step.icon} {step.label}</span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setChatting(p)} style={{ ...ghostBtn, padding: '7px 11px', fontSize: '11px', border: '1px solid var(--purple)', background: 'var(--purple-light)', color: 'var(--purple)' }}><MessageCircle size={12} /> Talk</button>
                    <button onClick={() => openInline(p)} style={{ ...btn('var(--purple)'), padding: '7px 11px', fontSize: '11px' }}>Finish <ArrowRight size={12} /></button>
                  </div>
                </div>
              )
            })}
            {develop.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{filtersOn ? 'Nothing matches that filter.' : 'No open ideas. Drop a thought to the Commander and it lands here.'}</p>}
          </section>
        </div>
      )}

      {chatting && (
        <PostChat post={chatting} account={acct(chatting.account_id)} onClose={() => setChatting(null)}
          onChanged={updated => setPosts(prev => prev.map(x => x.id === updated.id ? updated : x))} />
      )}

      {working && (
        <div onClick={() => setWorking(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,14,24,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '4vh 14px 40px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>Work this post</span>
                <AccChip p={working} />
              </div>
              <button onClick={() => setWorking(null)} title="Close" style={{ border: 'none', background: 'var(--surface-raised)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', display: 'flex' }}><X size={16} /></button>
            </div>
            <PostCard post={working} accentColor={acct(working.account_id)?.color || 'var(--purple)'} onApprove={p => { approve(p); setWorking(null) }} approving={busy === working.id} onChanged={load} accounts={accounts} defaultOpen />
            <button onClick={() => openOnAccount(working)} style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: '12px auto 2px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-subtle)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
              <ExternalLink size={12} /> Open the full account view
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
