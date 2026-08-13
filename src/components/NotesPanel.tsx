'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Search, Pin, PinOff, Trash2, X, BookOpen, Archive, Send, Sparkles, Copy, Check, Pencil, Eye, User, Bot } from 'lucide-react'
import type { Note, NoteSource } from '@/lib/db'
import CommanderModal from './CommanderModal'

type Acct = { id: string; handle: string; emoji: string; color: string; status: string }
type SendResult = { ok: boolean; msg: string }

// Who wrote a note. Honors an explicit source; otherwise infers from title/tags so
// the 100+ existing notes bucket correctly without a migration.
function noteSource(n: Pick<Note, 'source' | 'title' | 'tags'>): NoteSource {
  if (n.source === 'rise' || n.source === 'mine') return n.source
  const t = n.title || ''
  const tags = n.tags || []
  const riseTag = ['research', 'transcript', 'episode-kit', 'deliverables', 'media', 'media-story', 'trends-source', 'river-research', '1-30', 'conversation', 'brief'].some(x => tags.includes(x))
  const riseTitle = /transcript|research:|research —|deliverables|media story|trends source|1→30|1->30|ep kit|episode kit|daily brief/i.test(t) || /^\s*[🔬🔍📄🎙📊🧠📎✨🎧🗞📡]/u.test(t)
  return riseTag || riseTitle ? 'rise' : 'mine'
}

// A tiny, dependency-free markdown renderer for the READ view — headings, bold,
// blockquotes, lists, rules, and clickable links. Keeps RISE's briefings legible
// instead of dumping raw markdown at her.
function md(text: string): React.ReactNode {
  const linkify = (s: string, keyBase: string): React.ReactNode[] => {
    const out: React.ReactNode[] = []
    // [label](url) first, then bare urls; also **bold**
    const parts = s.split(/(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+|\*\*[^*]+\*\*)/g)
    parts.forEach((p, i) => {
      const mdlink = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (mdlink) { out.push(<a key={`${keyBase}-${i}`} href={mdlink[2]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hot-pink)', textDecoration: 'underline', wordBreak: 'break-word' }}>{mdlink[1]}</a>); return }
      if (/^https?:\/\//.test(p)) { out.push(<a key={`${keyBase}-${i}`} href={p} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hot-pink)', textDecoration: 'underline', wordBreak: 'break-word' }}>{p}</a>); return }
      const b = p.match(/^\*\*([^*]+)\*\*$/)
      if (b) { out.push(<strong key={`${keyBase}-${i}`}>{b[1]}</strong>); return }
      if (p) out.push(<span key={`${keyBase}-${i}`}>{p}</span>)
    })
    return out
  }
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks: React.ReactNode[] = []
  let list: React.ReactNode[] = []
  const flush = () => { if (list.length) { blocks.push(<ul key={`ul-${blocks.length}`} style={{ margin: '6px 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>{list}</ul>); list = [] } }
  lines.forEach((raw, i) => {
    const line = raw.trimEnd()
    if (/^###\s+/.test(line)) { flush(); blocks.push(<h4 key={i} style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', margin: '14px 0 4px' }}>{linkify(line.replace(/^###\s+/, ''), `h4${i}`)}</h4>); return }
    if (/^##\s+/.test(line)) { flush(); blocks.push(<h3 key={i} style={{ fontSize: '15px', fontWeight: 900, color: 'var(--hot-pink)', letterSpacing: '-0.01em', margin: '18px 0 6px' }}>{linkify(line.replace(/^##\s+/, ''), `h3${i}`)}</h3>); return }
    if (/^#\s+/.test(line)) { flush(); blocks.push(<h2 key={i} style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)', margin: '10px 0 8px' }}>{linkify(line.replace(/^#\s+/, ''), `h2${i}`)}</h2>); return }
    if (/^\s*[-•]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) { list.push(<li key={i} style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text)' }}>{linkify(line.replace(/^\s*(?:[-•]|\d+\.)\s+/, ''), `li${i}`)}</li>); return }
    if (/^>\s?/.test(line)) { flush(); blocks.push(<blockquote key={i} style={{ borderLeft: '3px solid var(--hot-pink)', paddingLeft: '12px', margin: '8px 0', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>{linkify(line.replace(/^>\s?/, ''), `bq${i}`)}</blockquote>); return }
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) { flush(); blocks.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />); return }
    if (!line.trim()) { flush(); return }
    flush(); blocks.push(<p key={i} style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text)', margin: '0 0 10px' }}>{linkify(line, `p${i}`)}</p>)
  })
  flush()
  return <div>{blocks}</div>
}

// Plain-text preview for cards: strip markdown noise so the 3-line teaser reads clean.
const plainPreview = (s: string) => (s || '')
  .replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '').replace(/^>\s?/gm, '').replace(/^\s*[-•]\s+/gm, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()

const SOURCE_BADGE: Record<NoteSource, { label: string; color: string; Icon: typeof User }> = {
  mine: { label: 'You', color: 'var(--hot-pink)', Icon: User },
  rise: { label: 'RISE', color: 'var(--purple)', Icon: Bot },
}

// Time buckets (relative to now, recomputed every render/load)
const BUCKETS: { key: string; label: string; maxHours: number | null }[] = [
  { key: '48h',  label: 'New · 48h',    maxHours: 48 },
  { key: '7d',   label: '< 7 days',     maxHours: 24 * 7 },
  { key: '30d',  label: '< 30 days',    maxHours: 24 * 30 },
  { key: '6mo',  label: '< 6 months',   maxHours: 24 * 182 },
  { key: 'archive', label: 'Archive',   maxHours: null },
]

const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3600000

function NoteCard({ note, accounts, onUpdate, onDelete, onSelect, onSendToAccount, onExpand, onShred }: {
  note: Note; accounts: Acct[];
  onUpdate: (id: number, u: Partial<Note>) => void;
  onDelete: (id: number) => void;
  onSelect: (n: Note) => void;
  onSendToAccount: (n: Note, accountId: string) => Promise<SendResult>;
  onExpand: (n: Note) => Promise<SendResult>;
  onShred: (n: Note) => void;
}) {
  const h = hoursSince(note.created_at)
  const age = h < 48 ? `${Math.max(1, Math.round(h))}h ago` : h < 24 * 30 ? `${Math.round(h / 24)}d ago` : new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async (fn: () => Promise<SendResult>) => {
    setMenu(false); setBusy(true); setMsg('')
    try { const r = await fn(); setMsg(r.msg) } catch { setMsg('Send failed — try again') }
    setBusy(false)
    setTimeout(() => setMsg(''), 7000)
  }
  const item = { display: 'flex', alignItems: 'center', gap: '7px', width: '100%', textAlign: 'left' as const, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '7px', fontSize: '12px', color: 'var(--text)' }
  const hov = (on: boolean) => (e: React.MouseEvent) => ((e.currentTarget as HTMLButtonElement).style.background = on ? 'var(--bg)' : 'none')
  const src = SOURCE_BADGE[noteSource(note)]

  return (
    <div onClick={() => onSelect(note)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${src.color}`, borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'box-shadow 0.15s', opacity: note.archived ? 0.7 : 1 }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{note.title}</p>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <button title="Send to…" disabled={busy} onClick={e => { e.stopPropagation(); setMenu(m => !m) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: menu ? 'var(--hot-pink)' : 'var(--text-muted)', padding: '2px', opacity: busy ? 0.4 : 0.7 }}>
              <Send size={12} />
            </button>
            {menu && (
              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '22px', zIndex: 30, width: '218px', maxHeight: '280px', overflow: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.22)', padding: '6px' }}>
                <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', padding: '4px 8px' }}>Compose a post for</p>
                {accounts.length === 0 && <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px' }}>No accounts loaded.</p>}
                {accounts.map(a => (
                  <button key={a.id} onClick={() => run(() => onSendToAccount(note, a.id))} style={item} onMouseEnter={hov(true)} onMouseLeave={hov(false)}>
                    <span>{a.emoji}</span> {a.handle}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', margin: '6px 4px' }} />
                <button onClick={() => { setMenu(false); onShred(note) }} style={{ ...item, fontWeight: 700, color: 'var(--purple)' }} onMouseEnter={hov(true)} onMouseLeave={hov(false)}>
                  🔱 Shred &amp; Compose (across accounts)
                </button>
                <button onClick={() => run(() => onExpand(note))} style={{ ...item, fontWeight: 700, color: 'var(--hot-pink)' }} onMouseEnter={hov(true)} onMouseLeave={hov(false)}>
                  <Sparkles size={12} /> Expand 1→30 stream
                </button>
              </div>
            )}
          </div>
          <button title={copied ? 'Copied!' : 'Copy note'} onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(note.body || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#3DAA7C' : 'var(--text-muted)', padding: '2px', opacity: copied ? 1 : 0.6 }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onUpdate(note.id, { pinned: !note.pinned }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? 'var(--hot-pink)' : 'var(--text-muted)', padding: '2px', opacity: 0.6 }}>
            {note.pinned ? <Pin size={12} /> : <PinOff size={12} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(note.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', opacity: 0.4 }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{plainPreview(note.body)}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: src.color, background: 'color-mix(in srgb, currentColor 12%, transparent)', padding: '2px 6px', borderRadius: '5px' }}>
          <src.Icon size={9} /> {src.label}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600 }}>{age}</span>
        {note.archived && <span style={{ fontSize: '9px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '3px' }}><Archive size={9} /> archived</span>}
        {note.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>#{t}</span>)}
        {(busy || msg) && <span style={{ fontSize: '10px', fontWeight: 700, marginLeft: 'auto', color: busy ? 'var(--text-muted)' : msg.startsWith('✓') ? '#2C9E6B' : 'var(--hot-pink)' }}>{busy ? 'sending…' : msg}</span>}
      </div>
    </div>
  )
}

function NoteModal({ note, onSave, onClose, accounts, onSendToAccount, onExpand, onShred, onCreate }: {
  note: Partial<Note>; onSave: (n: Partial<Note>) => void; onClose: () => void;
  accounts: Acct[]; onSendToAccount: (n: Note, accountId: string) => Promise<SendResult>;
  onExpand: (n: Note) => Promise<SendResult>; onShred: (n: Note) => void;
  onCreate: (n: Note) => void;
}) {
  const [draft, setDraft] = useState<Partial<Note>>(note)
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  // Existing notes open in a clean READ view; new notes open straight in edit.
  const [mode, setMode] = useState<'read' | 'edit'>(note.id ? 'read' : 'edit')
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (mode === 'edit') titleRef.current?.focus() }, [mode])
  const curKey = noteSource({ source: draft.source, title: draft.title ?? '', tags: draft.tags ?? [] })
  const src = SOURCE_BADGE[curKey]
  // Show the Medium/Newsletter generators on episode-ish notes (a transcript or kit
  // is the source material). Each result saves as a NEW draft, teed up for approval.
  const isEpisode = /transcript|ep(?:isode)?\s*kit|deliverables|episode/i.test(draft.title ?? '') ||
    ['transcript', 'episode-kit', 'deliverables'].some(t => (draft.tags ?? []).includes(t)) ||
    (draft.body ?? '').length > 1800
  const [genBusy, setGenBusy] = useState<null | 'medium' | 'newsletter'>(null)
  const [genMsg, setGenMsg] = useState('')

  const genDeliverable = async (kind: 'medium' | 'newsletter') => {
    setGenBusy(kind); setGenMsg('')
    const epTitle = (draft.title ?? 'Episode').replace(/^[^A-Za-z0-9]+/, '').replace(/—.*$/, '').trim().slice(0, 48)
    try {
      const res = await fetch('/api/podcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: kind, transcript: draft.body ?? '', title: epTitle }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setGenMsg(d.error || 'Failed — try again'); setGenBusy(null); return }
      let title = '', body = '', tags: string[] = []
      if (kind === 'medium' && d.medium_article) {
        const m = d.medium_article
        const secs = (m.sections ?? []).map((s: { heading: string; body: string }) => `## ${s.heading}\n${s.body}`).join('\n\n')
        const sources = m.sources?.length ? `\n\n## Sources\n${m.sources.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}` : ''
        title = `📰 Medium — ${epTitle}`
        body = `# ${m.title}\n*${m.subtitle}*\n\n${secs}${m.closing ? `\n\n${m.closing}` : ''}${sources}`
        tags = ['medium', 'needs-approval', 'aimompodcast']
      } else if (kind === 'newsletter' && (d.newsletter_body || d.newsletter_subject)) {
        title = `✉️ Newsletter — ${epTitle}`
        body = `**Subject:** ${d.newsletter_subject ?? ''}\n\n${d.newsletter_body ?? ''}`
        tags = ['newsletter', 'substack', 'needs-approval', 'aimompodcast']
      } else { setGenMsg('Came back empty — try again'); setGenBusy(null); return }
      const cr = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, category: 'script', source: 'rise', tags }),
      })
      const created = await cr.json().catch(() => null)
      if (created?.id) { onCreate(created); setGenMsg('✓ Draft saved — teed up for approval') }
      else setGenMsg('Saved, but could not open it')
    } catch { setGenMsg('Connection error — try again') }
    setGenBusy(null)
  }
  // Manual override: flip a note between "You" and "RISE" and persist it (modal stays open).
  const flipSource = async () => {
    const next: NoteSource = curKey === 'mine' ? 'rise' : 'mine'
    setDraft(d => ({ ...d, source: next }))
    if (draft.id) { try { await fetch('/api/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, source: next }) }) } catch { /* best-effort */ } }
  }

  const asNote = () => ({ ...draft, id: draft.id ?? 0, tags: draft.tags ?? [] }) as Note
  const run = async (fn: () => Promise<SendResult>) => {
    setMenu(false); setBusy(true); setMsg('')
    try { const r = await fn(); setMsg(r.msg) } catch { setMsg('Send failed — try again') }
    setBusy(false); setTimeout(() => setMsg(''), 7000)
  }
  const menuItem = { display: 'flex', alignItems: 'center', gap: '7px', width: '100%', textAlign: 'left' as const, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '7px', fontSize: '12px', color: 'var(--text)' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '18px', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          {draft.id ? (
            <div style={{ position: 'relative' }}>
              <button title="Send to…" disabled={busy} onClick={() => setMenu(m => !m)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: menu ? 'var(--hot-pink)' : 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: menu ? '#fff' : 'var(--text-muted)', padding: '6px 11px', fontSize: '12px', fontWeight: 700, opacity: busy ? 0.5 : 1 }}>
                <Send size={13} /> {busy ? 'sending…' : msg && !menu ? msg.slice(0, 30) : 'Send to…'}
              </button>
              {menu && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '38px', zIndex: 30, width: '230px', maxHeight: '300px', overflow: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.22)', padding: '6px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', padding: '4px 8px' }}>Compose a post for</p>
                  {accounts.map(a => (
                    <button key={a.id} onClick={() => run(() => onSendToAccount(asNote(), a.id))} style={menuItem} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span>{a.emoji}</span> {a.handle}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', margin: '6px 4px' }} />
                  <button onClick={() => { setMenu(false); onShred(asNote()); onClose() }} style={{ ...menuItem, fontWeight: 700, color: 'var(--purple)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    🔱 Shred &amp; Compose (across accounts)
                  </button>
                  <button onClick={() => run(() => onExpand(asNote()))} style={{ ...menuItem, fontWeight: 700, color: 'var(--hot-pink)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Sparkles size={12} /> Expand 1→30 stream
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <button title={mode === 'read' ? 'Edit' : 'Read'} onClick={() => setMode(m => (m === 'read' ? 'edit' : 'read'))}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px 11px', fontSize: '12px', fontWeight: 700 }}>
            {mode === 'read' ? <><Pencil size={13} /> Edit</> : <><Eye size={13} /> Read</>}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        {mode === 'read' ? (
          <div style={{ padding: '10px 28px 20px', flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <button onClick={flipSource} title={`Click to move to ${curKey === 'mine' ? 'RISE' : 'You'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: src.color, background: 'color-mix(in srgb, currentColor 12%, transparent)', padding: '3px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                <src.Icon size={10} /> {src.label === 'You' ? 'Your writing' : 'RISE generated'} ⇄
              </button>
              {(draft.tags ?? []).slice(0, 4).map(t => <span key={t} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>#{t}</span>)}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 14px' }}>{draft.title}</h1>
            {isEpisode && draft.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '0 0 16px', padding: '12px', background: 'var(--surface-raised)', borderRadius: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', width: '100%' }}>Turn this episode into…</span>
                <button onClick={() => genDeliverable('medium')} disabled={!!genBusy}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 13px', borderRadius: '9px', border: 'none', background: genBusy === 'medium' ? 'var(--border)' : 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: genBusy ? 'default' : 'pointer' }}>
                  {genBusy === 'medium' ? '📰 Researching + writing (~2 min)…' : '📰 Medium article'}
                </button>
                <button onClick={() => genDeliverable('newsletter')} disabled={!!genBusy}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 13px', borderRadius: '9px', border: 'none', background: genBusy === 'newsletter' ? 'var(--border)' : 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: genBusy ? 'default' : 'pointer' }}>
                  {genBusy === 'newsletter' ? '✉️ Writing…' : '✉️ Newsletter'}
                </button>
                {genMsg && <span style={{ fontSize: '11px', fontWeight: 700, color: genMsg.startsWith('✓') ? '#2C9E6B' : 'var(--hot-pink)' }}>{genMsg}</span>}
              </div>
            )}
            <div style={{ fontFamily: 'inherit' }}>{md(draft.body ?? '')}</div>
          </div>
        ) : (
        <div style={{ padding: '8px 24px 16px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input ref={titleRef} value={draft.title ?? ''} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Title..."
            style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.02em' }} />
          <textarea value={draft.body ?? ''} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
            placeholder="Write anything here... (markdown supported — ## heading, **bold**, - list, > quote, [text](link))"
            rows={12}
            style={{ fontSize: '14px', color: 'var(--text)', background: 'none', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.8 }} />
          <input value={(draft.tags ?? []).join(', ')} onChange={e => setDraft(d => ({ ...d, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
            placeholder="Tags (comma separated)..."
            style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', outline: 'none', padding: '10px 0 0', fontFamily: 'inherit' }} />
        </div>
        )}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => onSave(draft)} style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>Save Note</button>
          {draft.id && (
            <button onClick={() => onSave({ ...draft, archived: !draft.archived })} style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Archive size={13} /> {draft.archived ? 'Unarchive' : 'Archive'}
            </button>
          )}
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'var(--border)', color: 'var(--text)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginLeft: 'auto' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [bucket, setBucket] = useState('48h')
  const [sortBy, setSortBy] = useState<'created' | 'updated'>('created')
  const [source, setSource] = useState<'all' | 'mine' | 'rise' | 'pinned'>('all')
  const [selected, setSelected] = useState<Partial<Note> | null>(null)
  const [accounts, setAccounts] = useState<Acct[]>([])
  const [shredNote, setShredNote] = useState<Note | null>(null)

  const load = () => { fetch('/api/notes').then(r => r.json()).then(setNotes) }
  useEffect(() => { load() }, [])
  useEffect(() => {
    fetch('/api/accounts').then(r => r.json())
      .then((d: Acct[]) => setAccounts(d.filter(a => a.status === 'active' || a.status === 'restricted')))
      .catch(() => {})
  }, [])

  // Send a note to the River to compose a post for a specific account (account is LAW there).
  const sendToAccount = async (note: Note, accountId: string): Promise<SendResult> => {
    try {
      const res = await fetch('/api/river', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `${note.title}\n\n${note.body}`, source: 'notes', accountId }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.piece) return { ok: true, msg: `✓ Composed for ${d.account?.handle ?? accountId} — approve in Accounts` }
      return { ok: false, msg: d.error || 'Send failed' }
    } catch { return { ok: false, msg: 'Connection failed' } }
  }

  // Send a note to the 1→30 Content Developer; save the expansion back as a new note.
  const expandNote = async (note: Note): Promise<SendResult> => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'expand', title: note.title, notes: note.body }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.result) {
        const cr = await fetch('/api/notes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `${note.title} — 1→30`, body: d.result, category: 'script', source: 'rise', tags: ['1-30', ...(note.tags ?? []).slice(0, 2)] }),
        })
        const created = await cr.json().catch(() => null)
        if (created?.id) { setNotes(ns => [created, ...ns]); setSelected(created) }
        return { ok: true, msg: '✓ Expanded — opened the new note' }
      }
      return { ok: false, msg: d.error || 'Expand failed' }
    } catch { return { ok: false, msg: 'Connection failed' } }
  }

  const save = async (draft: Partial<Note>) => {
    if (!draft.title?.trim()) return
    if (draft.id) {
      const res = await fetch('/api/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const updated = await res.json()
      setNotes(ns => ns.map(n => n.id === updated.id ? updated : n))
    } else {
      const res = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, category: 'idea' }) })
      const created = await res.json()
      setNotes(ns => [created, ...ns])
    }
    setSelected(null)
  }

  const update = async (id: number, updates: Partial<Note>) => {
    const res = await fetch('/api/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
    const updated = await res.json()
    setNotes(ns => ns.map(n => n.id === id ? updated : n))
  }

  const remove = async (id: number) => {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    setNotes(ns => ns.filter(n => n.id !== id))
  }

  // Opening a note no longer archives it — archive is a manual choice only
  const openNote = (n: Note) => setSelected(n)

  const q = search.toLowerCase()
  const searched = useMemo(() => {
    let list = notes.filter(n => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)))
    if (source === 'mine') list = list.filter(n => noteSource(n) === 'mine')
    else if (source === 'rise') list = list.filter(n => noteSource(n) === 'rise')
    else if (source === 'pinned') list = list.filter(n => n.pinned)
    return list
  }, [notes, q, source])

  const stamp = (n: Note) => new Date(sortBy === 'updated' ? (n.updated_at || n.created_at) : n.created_at).getTime()

  const counts = useMemo(() => {
    const active = searched.filter(n => !n.archived)
    const c: Record<string, number> = { archive: searched.filter(n => n.archived).length }
    for (const b of BUCKETS) {
      if (b.maxHours != null) c[b.key] = active.filter(n => hoursSince(sortBy === 'updated' ? (n.updated_at || n.created_at) : n.created_at) <= b.maxHours!).length
    }
    return c
  }, [searched, sortBy])

  const visible = useMemo(() => {
    const b = BUCKETS.find(x => x.key === bucket)!
    const inWindow = (n: Note) => hoursSince(sortBy === 'updated' ? (n.updated_at || n.created_at) : n.created_at) <= (b.maxHours ?? Infinity)
    let list = b.key === 'archive' ? searched.filter(n => n.archived) : searched.filter(n => !n.archived && inWindow(n))
    list = [...list].sort((a, b2) => (Number(b2.pinned) - Number(a.pinned)) || (stamp(b2) - stamp(a)))
    return list
  }, [searched, bucket, sortBy])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={20} color="var(--hot-pink)" />
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Notes</h2>
        </div>
        <button onClick={() => setSelected({ tags: [] })} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          <Plus size={14} /> New Note
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all notes..."
          style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }} />
      </div>

      {/* Source filter + sort (non-chronological organizers) */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {([['all', 'All'], ['mine', '✍️ My writing'], ['rise', '🤖 RISE'], ['pinned', '📌 Pinned']] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setSource(k)}
              style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: source === k ? 'var(--purple)' : 'var(--surface)', color: source === k ? '#fff' : 'var(--text-muted)' }}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 700 }}>Sort by</span>
          {([['created', 'Created'], ['updated', 'Updated']] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setSortBy(k)}
              style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '7px', border: `1px solid ${sortBy === k ? 'var(--hot-pink)' : 'var(--border)'}`, cursor: 'pointer', background: sortBy === k ? 'rgba(232,68,138,0.1)' : 'transparent', color: sortBy === k ? 'var(--hot-pink)' : 'var(--text-muted)' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Time buckets */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {BUCKETS.map(b => {
          const isArchive = b.key === 'archive'
          const on = bucket === b.key
          return (
            <button key={b.key} onClick={() => setBucket(b.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, padding: '5px 13px', borderRadius: '20px', border: '1px solid', cursor: 'pointer',
                borderColor: on ? (isArchive ? 'var(--text-muted)' : 'var(--hot-pink)') : 'var(--border)',
                background: on ? (isArchive ? 'rgba(148,163,184,0.12)' : 'rgba(232,68,138,0.1)') : 'transparent',
                color: on ? (isArchive ? 'var(--text-muted)' : 'var(--hot-pink)') : 'var(--text-muted)' }}>
              {isArchive && <Archive size={11} />}{b.label} · {counts[b.key] ?? 0}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {visible.map(n => (
          <NoteCard key={n.id} note={n} accounts={accounts} onUpdate={update} onDelete={remove} onSelect={openNote} onSendToAccount={sendToAccount} onExpand={expandNote} onShred={setShredNote} />
        ))}
        {visible.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px', opacity: 0.5 }}>
            {bucket === 'archive' ? 'Nothing archived yet.' : 'No notes in this window. Capture something, or widen the range.'}
          </p>
        )}
      </div>

      {selected && <NoteModal note={selected} onSave={save} onClose={() => setSelected(null)} accounts={accounts} onSendToAccount={sendToAccount} onExpand={expandNote} onShred={setShredNote} onCreate={(n) => { setNotes(ns => [n, ...ns]); setSelected(n) }} />}
      {shredNote && <CommanderModal input={`${shredNote.title}\n\n${shredNote.body}`} onClose={() => setShredNote(null)} />}
    </div>
  )
}
