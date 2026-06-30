'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Pin, PinOff, Trash2, X, BookOpen } from 'lucide-react'
import type { Note, NoteCategory } from '@/lib/db'

const CATEGORIES: { value: NoteCategory; label: string; color: string }[] = [
  { value: 'idea',       label: 'Idea',       color: '#e8448a' },
  { value: 'business',   label: 'Business',   color: '#f2a65a' },
  { value: 'personal',   label: 'Personal',   color: '#7c3aed' },
  { value: 'client',     label: 'Client',     color: '#0ea5e9' },
  { value: 'script',     label: 'Script',     color: '#3daa7c' },
  { value: 'framework',  label: 'Framework',  color: '#64748b' },
  { value: 'sop',        label: 'SOP',        color: '#5a4fcf' },
  { value: 'prompt',     label: 'Prompt',     color: '#d97706' },
  { value: 'decision',   label: 'Decision',   color: '#e05' },
  { value: 'reflection', label: 'Reflection', color: '#94a3b8' },
]

const catColor = (c: NoteCategory) => CATEGORIES.find(x => x.value === c)?.color ?? '#94a3b8'
const catLabel = (c: NoteCategory) => CATEGORIES.find(x => x.value === c)?.label ?? c

function NoteCard({ note, onUpdate, onDelete, onSelect }: { note: Note; onUpdate: (id: number, u: Partial<Note>) => void; onDelete: (id: number) => void; onSelect: (n: Note) => void }) {
  return (
    <div onClick={() => onSelect(note)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${catColor(note.category)}`, borderRadius: '10px', padding: '14px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{note.title}</p>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onUpdate(note.id, { pinned: !note.pinned }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? catColor(note.category) : 'var(--text-muted)', padding: '2px', opacity: 0.6 }}>
            {note.pinned ? <Pin size={12} /> : <PinOff size={12} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(note.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', opacity: 0.4 }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{note.body}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: `${catColor(note.category)}18`, color: catColor(note.category) }}>{catLabel(note.category)}</span>
        {note.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>#{t}</span>)}
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
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <select value={draft.category ?? 'idea'} onChange={e => setDraft(d => ({ ...d, category: e.target.value as NoteCategory }))}
            style={{ fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px', border: `1px solid ${catColor(draft.category ?? 'idea')}`, background: `${catColor(draft.category ?? 'idea')}12`, color: catColor(draft.category ?? 'idea'), fontFamily: 'inherit', cursor: 'pointer' }}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 24px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input ref={titleRef} value={draft.title ?? ''} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Title..."
            style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', background: 'none', border: 'none', outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.02em' }} />
          <textarea value={draft.body ?? ''} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
            placeholder="Write anything here..."
            rows={10}
            style={{ fontSize: '14px', color: 'var(--text)', background: 'none', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.8 }} />
          <input value={(draft.tags ?? []).join(', ')} onChange={e => setDraft(d => ({ ...d, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
            placeholder="Tags (comma separated)..."
            style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', outline: 'none', padding: '10px 0 0', fontFamily: 'inherit' }} />
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          <button onClick={() => onSave(draft)} style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>Save Note</button>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'var(--border)', color: 'var(--text)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<NoteCategory | ''>('')
  const [selected, setSelected] = useState<Partial<Note> | null>(null)

  const load = () => {
    const params = new URLSearchParams()
    if (catFilter) params.set('category', catFilter)
    if (search) params.set('search', search)
    fetch(`/api/notes?${params}`).then(r => r.json()).then(setNotes)
  }

  useEffect(() => { load() }, [search, catFilter])

  const save = async (draft: Partial<Note>) => {
    if (!draft.title?.trim()) return
    if (draft.id) {
      const res = await fetch('/api/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const updated = await res.json()
      setNotes(ns => ns.map(n => n.id === updated.id ? updated : n))
    } else {
      const res = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={20} color="var(--hot-pink)" />
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Notes</h2>
        </div>
        <button onClick={() => setSelected({ category: 'idea', tags: [] })} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          <Plus size={14} /> New Note
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }} />
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button onClick={() => setCatFilter('')} style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', borderColor: catFilter === '' ? 'var(--hot-pink)' : 'var(--border)', background: catFilter === '' ? 'rgba(232,68,138,0.1)' : 'transparent', color: catFilter === '' ? 'var(--hot-pink)' : 'var(--text-muted)' }}>All</button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCatFilter(catFilter === c.value ? '' : c.value)}
            style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', borderColor: catFilter === c.value ? c.color : 'var(--border)', background: catFilter === c.value ? `${c.color}18` : 'transparent', color: catFilter === c.value ? c.color : 'var(--text-muted)' }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {notes.map(n => (
          <NoteCard key={n.id} note={n} onUpdate={update} onDelete={remove} onSelect={n => setSelected(n)} />
        ))}
        {notes.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px', opacity: 0.5 }}>No notes yet. Capture something.</p>}
      </div>

      {selected && <NoteModal note={selected} onSave={save} onClose={() => setSelected(null)} />}
    </div>
  )
}
