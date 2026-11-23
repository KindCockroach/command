'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ContentPiece, BrandAccount, Character, Db } from '@/lib/db'
import { parseScript, isChildCharacter, type ScriptLine } from '@/lib/characters'
import { RefreshCw, Camera, Clapperboard, Loader2, ChevronLeft, ChevronRight, Check, X, Plus } from 'lucide-react'
import CardMedia from './CardMedia'

// CONTENT DAY is EXCLUSIVELY for filming: the director's chair. The script, the emotion to hit,
// the context that sells the acting. Not a place to plan or coordinate content (that's Cap's
// plan and the calendar).
//
// • Only posts that still need filming: a card with a video on it, or one she marked Filmed ✓,
//   leaves the deck.
// • CHARACTER RAIL: batch the shoot by outfit. Tap a character → only that character's cards.
// • FILM view (default): the script big, her character's lines front and center, the director
//   strip beside it. ← → (or swipe) moves to the next card in the SAME character.
// • POST view: the card as it will publish (caption, hashtags, status, account). Toggle back.

const MONO = 'ui-monospace, "IBM Plex Mono", Menlo, monospace'
const UNTAGGED = '__untagged'

type PlanLine = { text: string; emotion: string; camera: string }
type ShootPlan = {
  mode: 'dialogue' | 'solo'
  title?: string
  sections?: { role: string; setup: string; lines: PlanLine[] }[]
  beats?: { label: string; cue: string; text: string; emotion: string; camera: string }[]
}

const isVideo = (u?: string | null) => !!u && /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(u)
const hasVideo = (p: ContentPiece) => isVideo(p.media_url) || (p.media_urls ?? []).some(isVideo)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

// Faceless posts (trend clips, text on screen, b-roll, voiceover only) aren't filmed by Mandi.
function isFaceless(p: ContentPiece): boolean {
  const blob = `${p.script ?? ''} ${p.frame_plan ?? ''} ${p.notes ?? ''} ${p.post_job ?? ''}`.toLowerCase()
  return /no[- ]?face|faceless|trend(ing)? clip|text[- ]on[- ]screen|b[- ]?roll only|voice[- ]?over only|no talking|don'?t show your face|do not show your face|on[- ]screen only|stock (clip|footage)|\bcapcut\b/.test(blob)
}

function readPlan(p: ContentPiece): ShootPlan | null {
  if (!p.shoot_plan) return null
  try { const x = JSON.parse(p.shoot_plan); return x && (x.sections?.length || x.beats?.length) ? x : null } catch { return null }
}

// Match a plan line (emotion + camera) to a script line by its opening words.
function planCue(plan: ShootPlan | null, text: string): { emotion?: string; camera?: string } {
  if (!plan) return {}
  const k = norm(text).slice(0, 28)
  if (!k) return {}
  const all: { text: string; emotion: string; camera: string }[] = [...(plan.sections ?? []).flatMap(s => s.lines ?? []), ...(plan.beats ?? [])]
  const hit = all.find(l => { const n = norm(l.text); return n.startsWith(k) || k.startsWith(n.slice(0, 28)) })
  return hit ? { emotion: hit.emotion, camera: hit.camera } : {}
}

export default function ContentDay() {
  const [posts, setPosts] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [roster, setRoster] = useState<Character[]>([])
  const [dates, setDates] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'film' | 'post'>('film')          // always opens in Film
  const [character, setCharacter] = useState<string>('')
  const [idx, setIdx] = useState(0)
  const [filmedNow, setFilmedNow] = useState<number[]>([])           // filmed this session: greyed at the bottom
  const [planning, setPlanning] = useState<Record<number, boolean>>({})
  const [err, setErr] = useState('')
  const [addName, setAddName] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/characters').then(r => r.json()).catch(() => ({})),   // tags untagged cards first
      fetch('/api/content').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/plan').then(r => r.json()).catch(() => ({})),
    ]).then(([ch, c, a, pl]) => {
      setRoster(Array.isArray(ch?.characters) ? ch.characters : [])
      setPosts(Array.isArray(c) ? c : [])
      setAccounts(Array.isArray(a) ? a : [])
      const d: Record<number, string> = {}
      for (const i of (pl?.calendar ?? []) as { content_id: number; date: string }[]) if (!d[i.content_id] || i.date < d[i.content_id]) d[i.content_id] = i.date
      setDates(d)
    }).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const rosterDb = useMemo(() => ({ characters: roster.map(r => ({ ...r })) }) as unknown as Db, [roster])
  const acct = (id?: string | null) => accounts.find(a => a.id === id)

  // The shoot list: scripted, not faceless, no video yet, not filmed (unless filmed just now).
  const shoot = useMemo(() => posts.filter(p =>
    !['published', 'archived'].includes(p.status) && (p.script ?? '').trim() && !isFaceless(p) && !hasVideo(p)
    && (!p.filmed_at || filmedNow.includes(p.id))
  ), [posts, filmedNow])

  // Character rail: counts are UNFILMED cards (the batch size for that outfit).
  const rail = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of shoot) {
      if (p.filmed_at) continue
      const cs = p.characters?.length ? p.characters : [UNTAGGED]
      for (const c of cs) counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    const order = roster.map(r => r.name)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
  }, [shoot, roster])

  // Pick the character: the last one she used if it still has cards, else the biggest batch.
  useEffect(() => {
    if (!rail.length) return
    if (character && rail.some(([c]) => c === character)) return
    let saved = ''
    try { saved = localStorage.getItem('rise-contentday-character') || '' } catch { /* ok */ }
    setCharacter(rail.some(([c]) => c === saved) ? saved : rail[0][0]); setIdx(0)
  }, [rail, character])
  const pick = (c: string) => { setCharacter(c); setIdx(0); try { localStorage.setItem('rise-contentday-character', c) } catch { /* ok */ } }

  // The deck for this character: soonest date first; filmed ones drop to the bottom.
  const deck = useMemo(() => shoot
    .filter(p => character === UNTAGGED ? !p.characters?.length : (p.characters ?? []).includes(character))
    .sort((a, b) => (a.filmed_at ? 1 : 0) - (b.filmed_at ? 1 : 0) || (dates[a.id] ?? '9999').localeCompare(dates[b.id] ?? '9999') || a.id - b.id)
  , [shoot, character, dates])
  const left = deck.filter(p => !p.filmed_at).length
  const cur = deck[Math.min(idx, Math.max(0, deck.length - 1))]

  const go = useCallback((d: number) => setIdx(i => deck.length ? (i + d + deck.length) % deck.length : 0), [deck.length])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current; touch.current = null
    if (!s) return
    const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }

  const patch = (id: number, body: Partial<ContentPiece>) =>
    fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) }).then(r => r.json()).catch(() => null)

  // Filmed ✓ → greys out and drops to the bottom of the batch; it's gone next time she opens.
  const markFilmed = async (p: ContentPiece) => {
    const on = !p.filmed_at
    const at = on ? new Date().toISOString() : null
    setPosts(ps => ps.map(x => x.id === p.id ? { ...x, filmed_at: at } : x))
    if (on) setFilmedNow(f => [...f, p.id])
    const r = await patch(p.id, { filmed_at: at })
    if (!r || r.error) { setErr('Couldn’t save that. Try again.'); setPosts(ps => ps.map(x => x.id === p.id ? { ...x, filmed_at: p.filmed_at ?? null } : x)) }
    // Stay on the next unfilmed card in this character (the filmed one moved to the bottom).
    if (on) setIdx(i => Math.min(i, Math.max(0, left - 2)))
  }

  // Direction (emotion + camera per line) for a card that hasn't been directed yet.
  const direct = async (p: ContentPiece) => {
    setPlanning(x => ({ ...x, [p.id]: true })); setErr('')
    try {
      const r = await fetch('/api/shootplan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: p.script, accountId: p.account_id }) })
      const d = await r.json().catch(() => ({}))
      if (d.plan) {
        const sp = JSON.stringify(d.plan)
        setPosts(ps => ps.map(x => x.id === p.id ? { ...x, shoot_plan: sp } : x))
        await patch(p.id, { shoot_plan: sp })
      } else setErr(d.error || 'Couldn’t direct it. Try again.')
    } catch { setErr('Connection error') } finally { setPlanning(x => ({ ...x, [p.id]: false })) }
  }

  const setChars = async (p: ContentPiece, names: string[]) => {
    setPosts(ps => ps.map(x => x.id === p.id ? { ...x, characters: names, characters_by: 'mandi' } : x))
    const r = await patch(p.id, { characters: names })
    if (r && !r.error) { setPosts(ps => ps.map(x => x.id === p.id ? r : x)); fetch('/api/characters').then(x => x.json()).then(d => Array.isArray(d?.characters) && setRoster(d.characters)).catch(() => {}) }
  }

  // ── styles ──
  const label: React.CSSProperties = { fontFamily: MONO, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--purple)' }
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }
  const charName = (c: string) => c === UNTAGGED ? 'No character' : c

  // ── FILM view pieces ──
  const ScriptBlock = ({ p }: { p: ContentPiece }) => {
    const plan = readPlan(p)
    const { lines } = parseScript(rosterDb, p.script ?? '')
    const spoken = lines.filter(l => !l.direction)
    const speakers = new Set(spoken.map(l => l.speaker).filter(Boolean))
    const dialogue = speakers.size > 1
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: dialogue ? '12px' : '14px' }}>
        {spoken.map((l: ScriptLine, i) => {
          const mine = !dialogue || l.speaker === character || character === UNTAGGED || (!l.speaker && !character)
          const child = isChildCharacter(l.speaker ?? (dialogue ? null : character))
          const cue = planCue(plan, l.text)
          return (
            <div key={i} style={{
              opacity: mine ? 1 : 0.45,
              padding: mine && dialogue ? '10px 14px' : dialogue ? '2px 14px' : '0',
              borderRadius: child && mine ? '18px' : '10px',
              background: mine && dialogue ? (child ? 'rgba(232,68,138,0.09)' : 'rgba(124,77,219,0.08)') : 'transparent',
              borderStyle: mine && dialogue ? (child ? 'dashed' : 'solid') : 'none',
              borderColor: child ? 'rgba(232,68,138,0.45)' : 'var(--purple)',
              borderWidth: mine && dialogue ? (child ? '2px' : '0 0 0 4px') : 0,
            }}>
              {dialogue && l.speaker && <p style={{ ...label, color: child ? '#D0397A' : 'var(--purple)', marginBottom: '3px' }}>{l.speaker}{mine ? '' : ' · cue'}</p>}
              <p style={{
                fontSize: mine ? (dialogue ? '22px' : '24px') : '15px',
                lineHeight: 1.35, fontWeight: mine ? 800 : 600, letterSpacing: '-0.01em',
                color: child && mine ? '#B42D6A' : 'var(--text)',
                fontStyle: child && mine ? 'italic' : 'normal',
              }}>{l.text}</p>
              {mine && (cue.emotion || cue.camera) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px' }}>
                  {cue.emotion && <span style={{ fontSize: '12px', fontWeight: 700, fontStyle: 'italic', padding: '2px 10px', borderRadius: '99px', background: 'rgba(242,166,90,0.18)', color: '#B96A1E' }}>{cue.emotion}</span>}
                  {cue.camera && <span style={{ fontFamily: MONO, fontSize: '11.5px', color: 'var(--text-muted)' }}>🎥 {cue.camera}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const DirectorStrip = ({ p }: { p: ContentPiece }) => {
    const plan = readPlan(p)
    const { lines } = parseScript(rosterDb, p.script ?? '')
    const dirs = lines.filter(l => l.direction)
    const pick = (re: RegExp) => dirs.filter(l => re.test(l.direction!)).map(l => l.text).filter(Boolean)
    const section = plan?.sections?.find(s => norm(s.role) === norm(character)) ?? plan?.sections?.[0]
    const myLines = plan?.sections ? (section?.lines ?? []) : (plan?.beats ?? [])
    const emotions = Array.from(new Set(myLines.map(l => l.emotion).filter(Boolean)))
    const onscreen = [p.onscreen_text, ...pick(/overlay|on ?screen|text/i)].filter(Boolean) as string[]
    const shot = [section?.setup, ...pick(/visual|shot|camera|setup|scene/i), !plan && !dirs.length ? (p.frame_plan ?? '').slice(0, 240) : ''].filter(Boolean) as string[]
    const context = [p.post_job || p.title, ...pick(/note/i)].filter(Boolean) as string[]
    const her = (p.source_context ?? '').trim()
    const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '11px', borderBottom: '1px dashed var(--border)' }}>
        <span style={label}>{k}</span>
        <div style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.45 }}>{children}</div>
      </div>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', padding: '14px', borderRadius: '14px', background: 'var(--surface-raised, rgba(124,77,219,0.04))', border: '1px solid var(--border)' }}>
        <Row k="Emotion to hit">
          {emotions.length ? emotions.join(' → ') : (
            <button style={{ ...btn, padding: '6px 10px', borderColor: 'var(--purple)', color: 'var(--purple)' }} disabled={!!planning[p.id]} onClick={() => direct(p)}>
              {planning[p.id] ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Directing…</> : <><Clapperboard size={12} /> Direct this</>}
            </button>
          )}
        </Row>
        <Row k="What sells the moment">
          {context.map((c, i) => <p key={i}>{c}</p>)}
          {her && <p style={{ marginTop: '5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Your words: “{her.slice(0, 220)}{her.length > 220 ? '…' : ''}”</p>}
        </Row>
        <Row k="On-screen text">{onscreen.length ? onscreen.map((o, i) => <p key={i} style={{ fontWeight: 700 }}>{o}</p>) : <span style={{ color: 'var(--text-subtle)' }}>None</span>}</Row>
        <Row k="Shot and setup">{shot.length ? shot.map((s, i) => <p key={i}>{s}</p>) : <span style={{ color: 'var(--text-subtle)' }}>Your call</span>}</Row>
      </div>
    )
  }

  // ── POST view: the card as it will publish ──
  const PostView = ({ p }: { p: ContentPiece }) => {
    const a = acct(p.account_id)
    const chars = p.characters ?? []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'baseline' }}>
          {a && <span style={{ fontSize: '13px', fontWeight: 800, color: a.color || 'var(--text)' }}>{a.emoji ? `${a.emoji} ` : ''}{a.handle}</span>}
          <span style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-subtle)' }}>{p.status}{dates[p.id] ? ` · ${dates[p.id]}` : ' · not on the calendar'}</span>
        </div>
        {p.onscreen_text && <div><p style={label}>On-screen</p><p style={{ fontSize: '16px', fontWeight: 800 }}>{p.onscreen_text}</p></div>}
        {(p.description ?? '').trim() && <div><p style={label}>Caption</p><p style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.description}</p></div>}
        {(p.hashtags ?? '').trim() && <p style={{ fontSize: '13px', color: 'var(--purple)' }}>{p.hashtags}</p>}
        <div>
          <p style={label}>Characters</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '5px' }}>
            {chars.map(c => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 6px 4px 10px', borderRadius: '99px', background: 'var(--purple-light)', color: 'var(--purple)', fontSize: '12px', fontWeight: 700 }}>
                {c}<button aria-label={`Remove ${c}`} onClick={() => setChars(p, chars.filter(x => x !== c))} style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', padding: '1px' }}><X size={12} /></button>
              </span>
            ))}
            <form onSubmit={e => { e.preventDefault(); const n = addName.trim(); if (n && !chars.includes(n)) setChars(p, [...chars, n]); setAddName('') }} style={{ display: 'inline-flex', gap: '4px' }}>
              <input list="rise-characters" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Add or name a new one" style={{ padding: '5px 9px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12px', width: '170px' }} />
              <button type="submit" style={{ ...btn, padding: '5px 8px' }} aria-label="Add character"><Plus size={13} /></button>
              <datalist id="rise-characters">{roster.map(r => <option key={r.name} value={r.name} />)}</datalist>
            </form>
          </div>
        </div>
        <CardMedia contentId={p.id} onChanged={load} />
      </div>
    )
  }

  return (
    <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* Header + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(120deg, var(--purple-light), transparent)' }}>
        <Camera size={18} color="var(--purple)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--purple)' }}>Director’s chair</p>
          <p style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.1 }}>Content Day</p>
        </div>
        <div role="group" aria-label="View" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          {(['film', 'post'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
              style={{ padding: '7px 11px', border: 0, background: view === v ? 'var(--purple)' : 'var(--surface)', color: view === v ? '#fff' : 'var(--text-muted)', fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              {v === 'film' ? '🎬 Film' : '📄 Post'}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} title="Refresh" style={{ ...btn, padding: '7px 9px', color: 'var(--text-muted)' }}>
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
        </button>
      </div>

      {/* Character rail: batch size per outfit */}
      {rail.length > 0 && (
        <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
          {rail.map(([c, n]) => {
            const on = c === character
            const child = isChildCharacter(c)
            const tone = child ? '#D0397A' : 'var(--purple)'
            return (
              <button key={c} onClick={() => pick(c)} aria-pressed={on}
                style={{ flexShrink: 0, padding: '7px 13px', borderRadius: '99px', border: `2px solid ${on ? tone : 'var(--border)'}`, background: on ? (child ? 'rgba(232,68,138,0.12)' : 'var(--purple-light)') : 'transparent', color: on ? tone : 'var(--text-muted)', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {charName(c)} ({n})
              </button>
            )
          })}
        </div>
      )}

      <div style={{ padding: '14px' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {loading && !posts.length && <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '14px', textAlign: 'center' }}>Setting up the chair…</p>}
        {!loading && !shoot.length && (
          <p style={{ fontSize: '13px', color: 'var(--text-subtle)', padding: '28px 14px', textAlign: 'center', lineHeight: 1.6 }}>Nothing left to film. 🎬<br />Cards with a script and no video show up here.</p>
        )}
        {err && <p style={{ fontSize: '12px', color: '#C0392B', marginBottom: '8px' }}>{err}</p>}

        {cur && (
          <>
            {/* Deck nav: same character, next shot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <button onClick={() => go(-1)} disabled={deck.length < 2} aria-label="Previous card" style={{ ...btn, padding: '7px' }}><ChevronLeft size={16} /></button>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                <p style={{ fontFamily: MONO, fontSize: '11.5px', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.min(idx, deck.length - 1) + 1} of {deck.length} · {charName(character)} · {left} left to film
                </p>
                <p style={{ fontSize: '12px', fontWeight: 700, color: acct(cur.account_id)?.color || 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {acct(cur.account_id) ? `${acct(cur.account_id)!.emoji ?? ''} ${acct(cur.account_id)!.handle}`.trim() : ''}{dates[cur.id] ? ` · ${dates[cur.id]}` : ''}{cur.characters && cur.characters.length > 1 ? ` · with ${cur.characters.filter(c => c !== character).join(', ')}` : ''}
                </p>
              </div>
              <button onClick={() => go(1)} disabled={deck.length < 2} aria-label="Next card" style={{ ...btn, padding: '7px' }}><ChevronRight size={16} /></button>
            </div>

            <div style={{ opacity: cur.filmed_at ? 0.5 : 1, transition: 'opacity .2s' }}>
              {view === 'film' ? (
                <div className="cd-film">
                  <div>{ScriptBlock({ p: cur })}</div>
                  {DirectorStrip({ p: cur })}
                </div>
              ) : PostView({ p: cur })}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => markFilmed(cur)}
                style={{ ...btn, padding: '11px 18px', fontSize: '14px', border: 0, background: cur.filmed_at ? '#2E8B60' : 'var(--purple)', color: '#fff' }}>
                <Check size={15} /> {cur.filmed_at ? 'Filmed ✓ (tap to undo)' : 'Filmed ✓'}
              </button>
              {cur.filmed_at && <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Moved to the bottom. It leaves Content Day next time you open it.</span>}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
.cd-film { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
@media (min-width: 860px) { .cd-film { grid-template-columns: minmax(0, 1.7fr) minmax(240px, 1fr); align-items: start; } }`}</style>
    </div>
  )
}
