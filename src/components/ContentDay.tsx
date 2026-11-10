'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ContentPiece, BrandAccount, ShootFormat } from '@/lib/db'
import { hasMedia, postPurpose, PURPOSE_META, type Purpose } from '@/lib/contentStatus'
import { RefreshCw, Camera, Clapperboard, Loader2, Sparkles, MessageCircle, RotateCcw, Trash2 } from 'lucide-react'

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
type Line = { key: string; kind: string; length: string; script: string; account?: string; color?: string; postId: number; accountId?: string | null; broll?: boolean; purpose: Purpose; format: ShootFormat }

// The 3 formats that require Mandi to film herself.
const FORMAT_META: Record<ShootFormat, { label: string; emoji: string; color: string }> = {
  talking_head: { label: 'Talking head', emoji: '🎤', color: '#3DAA7C' },
  role_play: { label: 'Role play', emoji: '🎭', color: '#7C3AED' },
  multi_scene: { label: 'Multi-scene', emoji: '🎬', color: '#E8448A' },
}
const FORMATS = Object.keys(FORMAT_META) as ShootFormat[]

// Which film-yourself format is this post? Honor a saved choice; otherwise infer from
// the script + any saved shoot plan (dialogue → role play; multiple scenes → multi-scene).
function classifyFormat(p: ContentPiece): ShootFormat {
  if (p.shoot_format) return p.shoot_format
  const script = p.script ?? ''
  let planMode = ''
  if (p.shoot_plan) { try { planMode = (JSON.parse(p.shoot_plan)?.mode as string) || '' } catch { /* ignore */ } }
  const speakerLines = (script.match(/^[A-Za-z][A-Za-z '’\-]{1,20}:\s/gm) ?? []).length
  if (planMode === 'dialogue' || speakerLines >= 2) return 'role_play'
  const blob = `${script}\n${p.frame_plan ?? ''}\n${p.notes ?? ''}`.toLowerCase()
  if (/scene\s*\d|\bcut to\b|multi-?scene|\bb-?roll\b/.test(blob) || (blob.match(/\bscene\b/g) ?? []).length >= 2) return 'multi_scene'
  return 'talking_head'
}

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

// Content Day is PURELY for shooting yourself on camera. A post is FACELESS (skip
// it) when its script/plan/notes say so — trend clips, text-on-screen only, b-roll,
// voiceover-only, "no face". Those get made elsewhere, not filmed by Mandi.
function isFaceless(p: { script?: string; frame_plan?: string; notes?: string; post_job?: string; onscreen_text?: string }): boolean {
  const blob = `${p.script ?? ''} ${p.frame_plan ?? ''} ${p.notes ?? ''} ${p.post_job ?? ''}`.toLowerCase()
  return /no[- ]?face|faceless|trend(ing)? clip|text[- ]on[- ]screen|text on screen|b[- ]?roll only|voice[- ]?over only|no talking|don'?t show your face|do not show your face|on[- ]screen only|stock (clip|footage)|\bcapcut\b/.test(blob)
}

export default function ContentDay() {
  const [posts, setPosts] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [plans, setPlans] = useState<Record<number, ShootPlan>>({})
  const [planning, setPlanning] = useState<Record<number, boolean>>({})
  const [planErr, setPlanErr] = useState<Record<number, string>>({})
  const [purposeFilter, setPurposeFilter] = useState<'all' | Purpose>('all')
  const [acctFilter, setAcctFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<'all' | ShootFormat>('all')

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
        // Persist ONTO the post so it survives refresh and shows on the post card.
        setPosts(ps => ps.map(p => p.id === postId ? { ...p, shoot_plan: JSON.stringify(d.plan) } : p))
        fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: postId, shoot_plan: JSON.stringify(d.plan) }) }).catch(() => {})
      } else setPlanErr(e => ({ ...e, [postId]: d.error || 'Could not build the plan — try again.' }))
    } catch { setPlanErr(e => ({ ...e, [postId]: 'Connection error' })) } finally { setPlanning(p => ({ ...p, [postId]: false })) }
  }

  const acct = (id?: string | null) => accounts.find(a => a.id === id)

  const allLines: Line[] = []
  for (const p of posts) {
    if (['published', 'archived'].includes(p.status)) continue
    // Talking-head only: a real spoken script, no video filmed yet, and NOT faceless.
    if (!(p.script ?? '').trim()) continue
    if (isFaceless(p)) continue
    if (hasMedia(p) && /\.(mp4|mov|webm)/i.test((p.media_url || p.media_urls?.[0] || ''))) continue
    const a = acct(p.account_id)
    const acctLabel = a ? `${a.emoji} ${a.handle}` : undefined
    const purpose = postPurpose(p)
    const format = classifyFormat(p)
    allLines.push({ key: `${p.id}-th`, kind: FORMAT_META[format].label, length: estLength(p.script as string), script: p.script as string, account: acctLabel, color: a?.color, postId: p.id, accountId: p.account_id, purpose, format })
  }
  const purposeCounts = allLines.reduce((m, l) => { m[l.purpose] = (m[l.purpose] ?? 0) + 1; return m }, {} as Record<Purpose, number>)
  const formatCounts = allLines.reduce((m, l) => { m[l.format] = (m[l.format] ?? 0) + 1; return m }, {} as Record<ShootFormat, number>)
  // Accounts that actually have something to film (for the account filter).
  const acctOptions = Array.from(new Map(allLines.filter(l => l.accountId).map(l => [l.accountId as string, l.account || l.accountId as string])).entries())
  const lines = allLines.filter(l => (purposeFilter === 'all' || l.purpose === purposeFilter) && (acctFilter === 'all' || l.accountId === acctFilter) && (formatFilter === 'all' || l.format === formatFilter))

  // Hand off to Dir (the Content Director) — seed a chat and jump to Assistants.
  const openDir = (seed: string) => {
    try {
      localStorage.setItem('station-open-agent', 'content_director')
      localStorage.setItem('station-agent-prefill', seed)
    } catch { /* ok */ }
    window.dispatchEvent(new CustomEvent('station:open-agent', { detail: {} }))
    window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view: 'assistants' } }))
  }

  // After filming: Rex writes the caption + hook/CTA variations for 4–8 trial reels.
  const handoffToDir = (l: Line) => {
    const post = posts.find(p => p.id === l.postId)
    const a = acct(l.accountId)
    const seed = [
      `🎬 I just filmed this — help me turn it into trial reels.`,
      post?.title ? `CONCEPT: ${post.title}` : '',
      post?.onscreen_text ? `ON-SCREEN HOOK: ${post.onscreen_text}` : '',
      `WHAT I FILMED: ${l.script}`,
      a ? `ACCOUNT: ${a.handle}${a.brand_name ? ` — ${a.brand_name}` : ''}` : '',
      ``,
      `I'm running the SAME footage as 4–8 trial reels to see what lands. In my voice, give me:`,
      `1) One ready-to-post CAPTION.`,
      `2) SIX on-screen HOOK variations (same clip, different angle).`,
      `3) SIX CTA variations.`,
      `Number everything so I can mix and match across the trial reels.`,
    ].filter(Boolean).join('\n')
    openDir(seed)
  }

  // "Talk through Content Day" — a general planning chat about the whole shoot list.
  const talkThrough = () => {
    const list = lines.map(l => {
      const post = posts.find(p => p.id === l.postId)
      const head = (post?.onscreen_text || l.script.split('\n')[0] || '').slice(0, 80)
      return `• ${head}${l.account ? ` (${l.account})` : ''}`
    }).join('\n')
    openDir(`Let's talk through my Content Day. Here's what's on my shoot list:\n${list || '(nothing yet)'}\n\nHelp me decide what to film, what to cut, and how to make each one travel.`)
  }

  // "Undo the directing" — clear a generated shoot plan off a post.
  const clearPlan = async (postId: number) => {
    setPlans(p => { const n = { ...p }; delete n[postId]; return n })
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, shoot_plan: '' } : p))
    try { localStorage.removeItem(`rise-shootplan-${postId}`) } catch { /* ok */ }
    fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: postId, shoot_plan: '' }) }).catch(() => {})
  }

  // Set this shoot's format (talking head / role play / multi-scene) — saved on the post.
  const setFormat = (postId: number, fmt: ShootFormat) => {
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, shoot_format: fmt } : p))
    fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: postId, shoot_format: fmt }) }).catch(() => {})
  }

  // Thumbs-down / delete — removes the underlying content card from RISE entirely.
  const deletePost = (postId: number, label: string) => {
    if (!confirm(`Delete this content card for good?\n\n“${label.slice(0, 80)}”\n\nThis removes it from RISE everywhere — not just Content Day. It can't be undone.`)) return
    setPosts(ps => ps.filter(p => p.id !== postId))
    fetch(`/api/content?id=${postId}`, { method: 'DELETE' }).catch(() => {})
  }

  // Rehydrate plans — the post's saved shoot_plan is the durable source (survives
  // refresh + shows on the post card); localStorage is a fast fallback.
  useEffect(() => {
    const next: Record<number, ShootPlan> = {}
    for (const l of lines) {
      if (l.broll || plans[l.postId]) continue
      const post = posts.find(p => p.id === l.postId)
      if (post?.shoot_plan) {
        try { const plan = JSON.parse(post.shoot_plan); if (plan) { next[l.postId] = plan; continue } } catch { /* fall through */ }
      }
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
          <button onClick={talkThrough} title="Talk through Content Day with Rex" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 11px', borderRadius: '9px', border: '1px solid var(--purple)', background: 'var(--purple-light)', color: 'var(--purple)', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            <MessageCircle size={13} /> Talk it through
          </button>
          <button onClick={load} disabled={loading} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 9px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          </button>
        </div>
      </div>

      {/* Filters — account + purpose */}
      {allLines.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px 0' }}>
          {acctOptions.length > 1 && (
            <select value={acctFilter} onChange={e => setAcctFilter(e.target.value)}
              style={{ padding: '6px 9px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              <option value="all">All accounts</option>
              {acctOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          )}
          {(['all', 'follower', 'engage', 'trust', 'conversion'] as const).map(pk => {
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

      {/* Filter — the 3 film-yourself formats (only when there's a mix) */}
      {allLines.length > 0 && FORMATS.filter(f => formatCounts[f]).length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', padding: '8px 14px 0' }}>
          <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginRight: '2px' }}>Format</span>
          {(['all', 'talking_head', 'role_play', 'multi_scene'] as const).map(fk => {
            const count = fk === 'all' ? allLines.length : (formatCounts[fk] ?? 0)
            if (fk !== 'all' && count === 0) return null
            const on = formatFilter === fk
            const m = fk === 'all' ? { label: 'All', emoji: '', color: 'var(--purple)' } : FORMAT_META[fk]
            return (
              <button key={`f-${fk}`} onClick={() => setFormatFilter(fk)}
                style={{ padding: '5px 11px', borderRadius: '20px', border: `2px solid ${on ? m.color : 'var(--border)'}`, background: on ? `${m.color}1a` : 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: on ? m.color : 'var(--text-muted)', fontFamily: 'inherit' }}>
                {m.emoji ? `${m.emoji} ` : ''}{m.label} · {count}
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
            // FILMED — celebrate, and hand off to Rex for the caption + trial-reel variants.
            if (isDone) {
              return (
                <div key={l.key} style={{ border: '1px solid #BFE3CE', borderRadius: '12px', background: 'linear-gradient(120deg, rgba(46,139,96,0.12), transparent)', padding: '14px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
                    <button onClick={() => toggle(l.key)} aria-label="Mark not filmed" title="Undo — not filmed yet"
                      style={{ flexShrink: 0, marginTop: '1px', width: '22px', height: '22px', borderRadius: '7px', border: '2px solid #2E8B60', background: '#2E8B60', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}>✓</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#2E8B60' }}>🎉 Filmed!</span>
                        {l.account && <span style={{ fontSize: '11px', fontWeight: 700, color: l.color || 'var(--text-subtle)' }}>{l.account}</span>}
                      </div>
                      <p style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.4, letterSpacing: '-0.01em', marginBottom: '10px' }}>{hook}</p>
                      <button onClick={() => handoffToDir(l)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', borderRadius: '10px', border: 0, background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Sparkles size={13} /> Caption + trial reels with Rex
                      </button>
                      <p style={{ fontSize: '10.5px', color: 'var(--text-subtle)', marginTop: '7px', lineHeight: 1.5 }}>Rex writes 1 caption + 6 hook variations + 6 CTAs to run this clip as 4&ndash;8 trial reels.</p>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div key={l.key} style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)', padding: '14px 15px', transition: 'opacity .15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
                  <button onClick={() => toggle(l.key)} aria-label={isDone ? 'Mark not filmed' : 'Mark filmed'}
                    style={{ flexShrink: 0, marginTop: '1px', width: '22px', height: '22px', borderRadius: '7px', border: `2px solid ${isDone ? '#2E8B60' : 'var(--border)'}`, background: isDone ? '#2E8B60' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}>{isDone ? '✓' : ''}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {FORMATS.map(f => {
                          const on = l.format === f
                          const m = FORMAT_META[f]
                          return (
                            <button key={f} onClick={() => setFormat(l.postId, f)} title={`Mark as ${m.label}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '99px', border: `1px solid ${on ? m.color : 'var(--border)'}`, background: on ? `${m.color}1a` : 'transparent', color: on ? m.color : 'var(--text-subtle)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              {m.emoji}{on ? ` ${m.label}` : ''}
                            </button>
                          )
                        })}
                      </div>
                      {l.account && <span style={{ fontSize: '11px', fontWeight: 700, color: l.color || 'var(--text-subtle)' }}>{l.account}</span>}
                      <button onClick={() => deletePost(l.postId, hook)} title="Delete this content card (removes it from RISE)"
                        style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px', display: 'flex' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p style={{ ...metaStyle, marginBottom: '7px' }}>{plan ? (plan.mode === 'dialogue' ? `${l.kind} · ${plan.sections?.length ?? 0} roles to film` : `${l.kind} · retention plan`) : `${l.kind} · ${l.length}${rest.length ? ` · ${bs.length} beats` : ''}`}</p>
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => buildPlan(l.postId, l.script, l.accountId)} disabled={!!planning[l.postId]}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-subtle)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                      {planning[l.postId] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />} Re-plan
                    </button>
                    <button onClick={() => clearPlan(l.postId)} title="Undo the directing — clear this shoot plan"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-subtle)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                      <RotateCcw size={11} /> Undo direction
                    </button>
                  </div>
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
