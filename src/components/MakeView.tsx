'use client'
import { useEffect, useMemo, useState } from 'react'
import { Search, Copy, Check, Loader2, Clapperboard, PenLine } from 'lucide-react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import MusicLine from './MusicLine'
import { ink } from '@/lib/ink'
import { makeFormat, MAKE_FORMATS, whatToFilm, planFormat, captionOf, objectiveOf, type MakeFormat } from '@/lib/cardFormat'

// CONTENT DAY · MAKE: when she sits down with time, she picks what kind of thing she wants to make
// (talking head, role play, b-roll, carousel) or searches, and every card shows what she needs to
// get to work: the objective, the visual, the song, and the copy already written.

const MONO = 'ui-monospace, "IBM Plex Mono", Menlo, monospace'
const PAGE = 40

type Props = {
  posts: ContentPiece[]
  accounts: BrandAccount[]
  dates: Record<number, string>
  resetIds: Set<number>
  openId: number | null
  onOpened: () => void
  onSaved: (p: ContentPiece) => void
  onReload: () => void
  onFilm: (p: ContentPiece) => void
  canFilm: (p: ContentPiece) => boolean
}

const hasCopy = (p: ContentPiece) => !!captionOf(p)
const missingOf = (p: ContentPiece) => [
  !(p.onscreen_text ?? '').trim() && 'hook',
  !hasCopy(p) && 'caption',
  !p.post_job && 'objective',
].filter(Boolean) as string[]

export default function MakeView({ posts, accounts, dates, resetIds, openId, onOpened, onSaved, onReload, onFilm, canFilm }: Props) {
  const [q, setQ] = useState('')
  const [fmt, setFmt] = useState<MakeFormat | 'all'>(() => { try { return (localStorage.getItem('rise-make-format') as MakeFormat) || 'all' } catch { return 'all' } })
  const [acctF, setAcctF] = useState('')
  const [onlyReset, setOnlyReset] = useState(false)
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [shown, setShown] = useState(PAGE)
  const [writing, setWriting] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')

  const pickFmt = (f: MakeFormat | 'all') => { setFmt(f); setShown(PAGE); try { localStorage.setItem('rise-make-format', f) } catch { /* ok */ } }
  const acct = (id?: string | null) => accounts.find(a => a.id === id)

  // Everything she could still make: not published or archived, not the Reset/episode events themselves.
  const pool = useMemo(() => posts.filter(p => !['published', 'archived'].includes(p.status) && p.type !== 'workshop' && p.type !== 'podcast'), [posts])
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: pool.length }
    for (const p of pool) { const f = makeFormat(p); m[f] = (m[f] ?? 0) + 1 }
    return m
  }, [pool])
  const halfFormed = useMemo(() => pool.filter(p => (p.onscreen_text ?? '').trim() && !hasCopy(p)), [pool])

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return pool.filter(p => {
      if (fmt !== 'all' && makeFormat(p) !== fmt) return false
      if (acctF && p.account_id !== acctF) return false
      if (onlyReset && !resetIds.has(p.id) && !/\breset\b/i.test(`${p.title} ${p.post_job ?? ''} ${(p.tags ?? []).join(' ')}`)) return false
      if (onlyMissing && !missingOf(p).length) return false
      if (!words.length) return true
      const hay = `${p.title} ${p.onscreen_text ?? ''} ${p.script ?? ''} ${captionOf(p)} ${p.post_job ?? ''} ${(p.tags ?? []).join(' ')} ${p.notes ?? ''} ${acct(p.account_id)?.handle ?? ''} #${p.id}`.toLowerCase()
      return words.every(w => hay.includes(w))
    }).sort((a, b) => (dates[a.id] ?? '9999').localeCompare(dates[b.id] ?? '9999') || b.id - a.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, q, fmt, acctF, onlyReset, onlyMissing, dates, resetIds])

  // A card handed over (calendar, Cap's "card #123"): clear the filters so it shows, and open it.
  useEffect(() => {
    if (openId == null) return
    const p = posts.find(x => x.id === openId)
    if (p) {
      setQ(''); setAcctF(''); setOnlyReset(false); setOnlyMissing(false); setFmt('all'); setOpen(p.id)
      const i = [...pool].sort((a, b) => (dates[a.id] ?? '9999').localeCompare(dates[b.id] ?? '9999') || b.id - a.id).findIndex(x => x.id === p.id)
      if (i >= PAGE) setShown(i + 5)
      setTimeout(() => document.getElementById(`make-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    }
    onOpened()
  }, [openId, posts, pool, dates, onOpened])

  const write = async (ids: number[] | null, key: string) => {
    setWriting(w => ({ ...w, [key]: true })); setMsg('')
    try {
      const r = await fetch('/api/cards/prewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids ? { ids } : {}) })
      const d = await r.json().catch(() => ({}))
      if (d.started) {
        setMsg(`Ed is writing ${d.started} card${d.started > 1 ? 's' : ''} now (captions with the call to action, and a song for videos). About 15 seconds each; tap refresh to see them land.`)
        if (ids?.length === 1) setTimeout(onReload, 25000)
      } else if (d.error) setMsg(d.error.replace(/^💸 RISE budget:\s*/, ''))
    } catch { setMsg('Connection error. Try again.') } finally { setWriting(w => ({ ...w, [key]: false })) }
  }

  const copy = (t: string, k: string) => { navigator.clipboard?.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(''), 1400) }).catch(() => {}) }

  const label: React.CSSProperties = { fontFamily: MONO, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--purple)' }
  const chip = (on: boolean): React.CSSProperties => ({ flexShrink: 0, padding: '7px 13px', borderRadius: '99px', border: `2px solid ${on ? 'var(--purple)' : 'var(--border)'}`, background: on ? 'var(--purple-light)' : 'transparent', color: on ? 'var(--purple)' : 'var(--text-muted)', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' })
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }
  const fmtLabel = (f: MakeFormat) => MAKE_FORMATS.find(x => x.key === f)?.label ?? f

  const Section = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '11px', borderBottom: '1px dashed var(--border)' }}>
      <span style={label}>{k}</span>
      <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
  const CopyBtn = ({ t, k }: { t: string; k: string }) => (
    <button onClick={() => copy(t, k)} title="Copy" style={{ ...btn, padding: '4px 8px', fontSize: '11px', marginLeft: 'auto' }}>{copied === k ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}</button>
  )
  const none = <span style={{ color: 'var(--text-subtle)' }}>Not written yet</span>

  const Detail = ({ p }: { p: ContentPiece }) => {
    const visual = [whatToFilm(p), p.frame_plan?.trim() && p.frame_plan.slice(0, 600), p.image_prompt?.trim() && `Image idea: ${p.image_prompt}`, p.cover_note && `Cover: ${p.cover_note}`].filter(Boolean) as string[]
    const caps = (p.platform_posts ?? []).filter(x => x.caption.trim())
    const miss = missingOf(p)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', padding: '14px', marginTop: '8px', borderRadius: '14px', background: 'var(--surface-raised, rgba(124,77,219,0.04))', border: '1px solid var(--border)' }}>
        <Section k="Objective">{p.post_job ? <p>{objectiveOf(p)}{resetIds.has(p.id) ? '. Its call to action: the next Reset.' : ''}</p> : none}{planFormat(p) && <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: 3 }}>Format: {planFormat(p)}</p>}</Section>
        <Section k="Visual">{visual.length ? visual.map((v, i) => <p key={i} style={{ whiteSpace: 'pre-wrap' }}>{v}</p>) : <span style={{ color: 'var(--text-subtle)' }}>Your call</span>}</Section>
        <Section k="Song"><MusicLine p={p} compact onSaved={onSaved} /></Section>
        <Section k="On-screen hook">{p.onscreen_text?.trim() ? <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><p style={{ fontWeight: 800, fontSize: '16px' }}>{p.onscreen_text}</p><CopyBtn t={p.onscreen_text} k={`h${p.id}`} /></div> : none}</Section>
        {(p.script ?? '').trim() && <Section k="Script"><div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><p style={{ whiteSpace: 'pre-wrap' }}>{p.script}</p><CopyBtn t={p.script!} k={`s${p.id}`} /></div></Section>}
        <Section k={caps.length > 1 ? 'Captions' : 'Caption + call to action'}>
          {caps.length ? caps.map(x => (
            <div key={x.platform} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>{x.platform}{x.prefilm ? ' · written from the plan (your footage rewrites it)' : ''}</span>
                <CopyBtn t={x.caption} k={`c${p.id}${x.platform}`} />
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{x.caption}</p>
            </div>
          )) : (p.description ?? '').trim() ? <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><p style={{ whiteSpace: 'pre-wrap' }}>{p.description}</p><CopyBtn t={p.description} k={`d${p.id}`} /></div> : none}
          {(p.hashtags ?? '').trim() && <p style={{ fontSize: '13px', color: 'var(--purple)', marginTop: 4 }}>{p.hashtags}</p>}
        </Section>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {canFilm(p) && <button style={{ ...btn, border: 0, background: 'var(--purple)', color: '#fff' }} onClick={() => onFilm(p)}><Clapperboard size={13} /> Film it (director’s chair)</button>}
          {miss.includes('caption') && (
            <button style={btn} disabled={!!writing[`c${p.id}`]} onClick={() => write([p.id], `c${p.id}`)}>
              {writing[`c${p.id}`] ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <PenLine size={13} />} Have Ed write the caption
            </button>
          )}
          <span style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-subtle)' }}>card #{p.id} · {p.status}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Search + what kind of thing she wants to make */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 10 }}>
        <Search size={15} color="var(--text-muted)" />
        <input value={q} onChange={e => { setQ(e.target.value); setShown(PAGE) }} placeholder="Search cards: a word, a hook, an account, #123" aria-label="Search cards"
          style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: '15px', fontFamily: 'inherit' }} />
        {q && <button onClick={() => setQ('')} style={{ border: 0, background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>Clear</button>}
      </div>
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 8 }} role="group" aria-label="What to make">
        <button style={chip(fmt === 'all')} onClick={() => pickFmt('all')} aria-pressed={fmt === 'all'}>All ({counts.all ?? 0})</button>
        {MAKE_FORMATS.map(f => <button key={f.key} style={chip(fmt === f.key)} onClick={() => pickFmt(f.key)} aria-pressed={fmt === f.key}>{f.label} ({counts[f.key] ?? 0})</button>)}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
        <select value={acctF} onChange={e => setAcctF(e.target.value)} aria-label="Account" style={{ padding: '6px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">Every account</option>
          {accounts.filter(a => pool.some(p => p.account_id === a.id)).map(a => <option key={a.id} value={a.id}>{a.handle}</option>)}
        </select>
        <label style={{ display: 'inline-flex', gap: 5, alignItems: 'center', cursor: 'pointer', color: 'var(--text)' }}><input type="checkbox" checked={onlyReset} onChange={e => setOnlyReset(e.target.checked)} /> Reset promo</label>
        <label style={{ display: 'inline-flex', gap: 5, alignItems: 'center', cursor: 'pointer', color: 'var(--text)' }}><input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} /> Missing copy</label>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11.5, color: 'var(--text-subtle)' }}>{list.length} card{list.length === 1 ? '' : 's'}</span>
      </div>

      {halfFormed.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-raised, var(--surface))', marginBottom: 10, fontSize: 13, color: 'var(--text)' }}>
          <span style={{ flex: 1, minWidth: 200 }}>{halfFormed.length} card{halfFormed.length > 1 ? 's have' : ' has'} a hook but no caption or call to action yet.</span>
          <button style={btn} disabled={!!writing.all} onClick={() => write(null, 'all')}>{writing.all ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <PenLine size={13} />} Have Ed write them all</button>
        </div>
      )}
      {msg && <p role="status" style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10, lineHeight: 1.5 }}>{msg}</p>}

      {!list.length && <p style={{ fontSize: 13, color: 'var(--text-subtle)', padding: '24px 10px', textAlign: 'center' }}>Nothing matches. Try another word or format.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.slice(0, shown).map(p => {
          const a = acct(p.account_id)
          const miss = missingOf(p)
          const isOpen = open === p.id
          return (
            <div key={p.id} id={`make-${p.id}`} style={{ borderRadius: 12, border: `1px solid ${isOpen ? 'var(--purple)' : 'var(--border)'}`, padding: '10px 12px', background: 'var(--surface)' }}>
              <button onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'var(--purple-light)', color: 'var(--purple)' }}>{fmtLabel(makeFormat(p))}</span>
                  {resetIds.has(p.id) && <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'rgba(242,166,90,0.18)', color: '#B96A1E' }}>Reset promo</span>}
                  {a && <span style={{ fontSize: 12, fontWeight: 800, color: ink(a.color) || 'var(--text-muted)' }}>{a.handle}</span>}
                  <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--text-subtle)' }}>{dates[p.id] ?? 'not on the calendar'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: miss.length ? '#B96A1E' : '#2E8B60' }}>{miss.length ? `needs ${miss.join(', ')}` : 'copy ready'}</span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{p.title || `Card #${p.id}`}</p>
                {p.onscreen_text && !isOpen && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{p.onscreen_text}</p>}
              </button>
              {isOpen && Detail({ p })}
            </div>
          )
        })}
      </div>
      {list.length > shown && <button style={{ ...btn, marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={() => setShown(s => s + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button>}
    </div>
  )
}
