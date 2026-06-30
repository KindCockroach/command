'use client'
import { useState, useEffect } from 'react'
import { Star, CheckCheck } from 'lucide-react'
import type { VisionEntry, VisionType } from '@/lib/db'

const VISION_SECTIONS: { type: VisionType; label: string; emoji: string; placeholder: string; color: string }[] = [
  { type: 'future_self',        label: 'Letter from Future Her',        emoji: '🔮', placeholder: "It's 2027. Write to yourself from there...", color: '#7c3aed' },
  { type: 'identity',           label: 'Who I Am Becoming',              emoji: '✨', placeholder: 'I am a woman who...', color: 'var(--hot-pink)' },
  { type: 'season',             label: 'The Season I\'m In',            emoji: '🌱', placeholder: 'This is the season of...', color: '#3daa7c' },
  { type: 'why',                label: 'Why This Matters',              emoji: '❤️', placeholder: 'The real reason I\'m building this is...', color: '#f2a65a' },
  { type: 'no_longer_available', label: 'No Longer Available For',       emoji: '🚫', placeholder: 'I am no longer available for...', color: '#64748b' },
  { type: 'evidence',           label: 'Evidence I\'m Becoming Her',    emoji: '📌', placeholder: 'Proof that I am already the woman I said I would be...', color: '#0ea5e9' },
]

function VisionCard({ section, entry, onSave }: { section: typeof VISION_SECTIONS[0]; entry?: VisionEntry; onSave: (type: VisionType, content: string) => void }) {
  const [editing, setEditing] = useState(!entry?.content)
  const [draft, setDraft] = useState(entry?.content ?? '')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!draft.trim()) return
    onSave(section.type, draft)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${section.color}`, borderRadius: '14px', padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '16px' }}>{section.emoji}</span>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: section.color }}>{section.label}</span>
        </div>
        {!editing && entry?.content && (
          <button onClick={() => { setDraft(entry.content); setEditing(true) }} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={section.placeholder}
            rows={4}
            autoFocus
            style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${section.color}40`, fontSize: '14px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', lineHeight: 1.7 }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={save} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', border: 'none', background: section.color, color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              <CheckCheck size={13} /> Save
            </button>
            {entry?.content && <button onClick={() => setEditing(false)} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'var(--border)', color: 'var(--text)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.8, fontStyle: section.type === 'future_self' ? 'italic' : 'normal', opacity: 0.9 }}>
          {entry?.content ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Click to write...</span>}
        </p>
      )}
    </div>
  )
}

export default function VisionPanel() {
  const [entries, setEntries] = useState<VisionEntry[]>([])

  useEffect(() => { fetch('/api/vision').then(r => r.json()).then(setEntries) }, [])

  const save = async (type: VisionType, content: string) => {
    const res = await fetch('/api/vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, content }) })
    const updated = await res.json()
    setEntries(prev => {
      const filtered = prev.filter(e => e.type !== type)
      return [...filtered, updated]
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Star size={20} color="var(--hot-pink)" fill="var(--hot-pink)" />
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Vision + Identity</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Stay connected to who you are becoming.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {VISION_SECTIONS.map(section => (
          <VisionCard
            key={section.type}
            section={section}
            entry={entries.find(e => e.type === section.type)}
            onSave={save}
          />
        ))}
      </div>
    </div>
  )
}
