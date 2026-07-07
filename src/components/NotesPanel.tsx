'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Search, Pin, PinOff, Trash2, X, BookOpen, Archive } from 'lucide-react'
import type { Note } from '@/lib/db'

// Time buckets (relative to now, recomputed every render/load)
const BUCKETS: { key: string; label: string; maxHours: number | null }[] = [
  { key: '48h',  label: 'New · 48h',    maxHours: 48 },
  { key: '7d',   label: '< 7 days',     maxHours: 24 * 7 },
  { key: '30d',  label: '< 30 days',    maxHours: 24 * 30 },
  { key: '6mo',  label: '< 6 months',   maxHours: 24 * 182 },
  { key: 'archive', label: 'Archive',   maxHours: null },
]

const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3600000

function NoteCard({ note, onUpdate, onDelete, onSelect }: { note: Note; onUpdate: (id: number, u: Partial<Note>) => void; onDelete: (id: number) => void; onSelect: (n: Note) => void }) {
  const h = hoursSince(note.created_at)
  const age = h < 48 ? `${Math.max(1, Math.round(h))}h ago` : h < 24 * 30 ? `${Math.round(h / 24)}d ago` : new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <div onClick={() => onSelect(note)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--hot-pink)', borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'box-shadow 0.15s', opacity: note.archived ? 0.7 : 1 }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{note.title}</p>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onUpdate(note.id, { pinned: !note.pinned }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? 'var(--hot-pink)' : 'var(--text-muted)', padding: '2px', opacity: 0.6 }}>
            {note.pinned ? <Pin size={12} /> : <PinOff size={12} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(note.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', opacity: 0.4 }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{note.body}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600 }}>{age}</span>
        {note.archived && <span style={{ fontSize: '9px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '3px' }}><Archive size={9} /> archived</span>}
        {note.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>#{t}</span>)}
      </div>
    </div>
  )
}

function NoteModal({ note, onSave, onClose }: { note: Partial<Note>; onSave: (n: Partial<Note>) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Partial<Note>>(note)
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => { titleRef.current?.focus() }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '18px', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '8px 24px 16px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input ref={titleRef} value={draft.title ?? ''} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Title..."
            style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.02em' }} />
          <textarea value={draft.body ?? ''} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
            placeholder="Write anything here..."
            rows={12}
            style={{ fontSize: '14px', color: 'var(--text)', background: 'none', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.8 }} />
          <input value={(draft.tags ?? []).join(', ')} onChange={e => setDraft(d => ({ ...d, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
            placeholder="Tags (comma separated)..."
            style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', outline: 'none', padding: '10px 0 0', fontFamily: 'inherit' }} />
        </div>
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
  const [source, setSource] = useState<'all' | 'ideas' | 'chats' | 'pinned'>('all')
  const [selected, setSelected] = useState<Partial<Note> | null>(null)

  const load = () => { fetch('/api/notes').then(r => r.json()).then(setNotes) }
  useEffect(() => { load() }, [])

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
  const isChat = (n: Note) => n.tags.includes('conversation')
  const searched = useMemo(() => {
    let list = notes.filter(n => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)))
    if (source === 'chats') list = list.filter(isChat)
    else if (source === 'ideas') list = list.filter(n => !isChat(n))
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
          {([['all', 'All'], ['ideas', '💡 Ideas'], ['chats', '💬 Chats'], ['pinned', '📌 Pinned']] as const).map(([k, lbl]) => (
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
          <NoteCard key={n.id} note={n} onUpdate={update} onDelete={remove} onSelect={openNote} />
        ))}
        {visible.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px', opacity: 0.5 }}>
            {bucket === 'archive' ? 'Nothing archived yet.' : 'No notes in this window. Capture something, or widen the range.'}
          </p>
        )}
      </div>

      {selected && <NoteModal note={selected} onSave={save} onClose={() => setSelected(null)} />}
    </div>
  )
}
