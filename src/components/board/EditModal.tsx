'use client'
import { useState, useEffect } from 'react'
import { ContentPiece } from '@/lib/db'
import { X, Trash2, CheckCircle, Send, Repeat2, Sparkles, Loader2, Copy, Volume2 } from 'lucide-react'

const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'facebook', 'linkedin', 'pinterest', 'beehiiv', 'substack', 'email']
const TYPES = ['video', 'podcast', 'post', 'image', 'workshop', 'other'] as const
const STATUSES = [
  { value: 'idea',        label: '🌱 Idea' },
  { value: 'in_progress', label: '⚡ In Progress' },
  { value: 'ready',       label: '✨ Ready to Publish' },
  { value: 'published',   label: '🚀 Published' },
  { value: 'archived',    label: '📦 Archived' },
] as const

interface Props {
  piece: ContentPiece | null
  onClose: () => void
  onSave: (updated: ContentPiece) => void
  onDelete: (id: number) => void
}

export default function EditModal({ piece, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Partial<ContentPiece>>({})
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tab, setTab] = useState<'edit' | 'expand' | 'voice'>('edit')
  const [expanding, setExpanding] = useState(false)
  const [expanded, setExpanded] = useState('')
  const [synthesizing, setSynthesizing] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (piece) { setForm({ ...piece }); setTagInput(''); setExpanded(''); setAudioUrl('') } }, [piece])
  if (!piece) return null

  const set = (k: keyof ContentPiece, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const togglePlatform = (p: string) => {
    const cur = (form.platforms ?? []) as string[]
    set('platforms', cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p])
  }
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '')
    if (!t) return
    const cur = (form.tags ?? []) as string[]
    if (!cur.includes(t)) set('tags', [...cur, t])
    setTagInput('')
  }
  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: piece.id }) })
    onSave(await res.json())
    setSaving(false)
  }
  const handleDelete = async () => {
    if (!confirm('Delete this content piece?')) return
    await fetch(`/api/content?id=${piece.id}`, { method: 'DELETE' })
    onDelete(piece.id)
  }
  const handleExpand = async () => {
    setExpanding(true)
    setExpanded('')
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'expand', title: form.title, description: form.description, notes: form.notes, transcript: form.transcript }),
    })
    const data = await res.json()
    setExpanded(data.result ?? data.error ?? 'Something went wrong.')
    setExpanding(false)
  }
  const handleSynthesize = async () => {
    const text = form.transcript || form.notes || form.description || form.title || ''
    if (!text) return
    setSynthesizing(true)
    const res = await fetch('/api/elevenlabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'synthesize', text: text.slice(0, 2500) }),
    })
    if (res.ok) {
      const blob = await res.blob()
      setAudioUrl(URL.createObjectURL(blob))
    }
    setSynthesizing(false)
  }
  const copyExpanded = () => {
    navigator.clipboard.writeText(expanded)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fieldStyle = {
    background: 'var(--surface-raised)',
    borderColor: 'var(--border)',
    color: 'var(--ink)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    transition: 'border-color 0.15s',
    outline: 'none',
  }

  const lbl = (t: string) => (
    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>{t}</label>
  )

  const TAB_STYLE = (active: boolean) => ({
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--hot-pink)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button style={TAB_STYLE(tab === 'edit')} onClick={() => setTab('edit')}>Edit</button>
            <button style={TAB_STYLE(tab === 'expand')} onClick={() => setTab('expand')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={11} /> 1→30 Expand</span>
            </button>
            <button style={TAB_STYLE(tab === 'voice')} onClick={() => setTab('voice')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Volume2 size={11} /> Voice</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={handleDelete} style={{ fontSize: '11px', color: '#E05252', padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={11} /> Delete
            </button>
            <button onClick={onClose} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── EDIT TAB ── */}
        {tab === 'edit' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>{lbl('Title')}<input value={form.title ?? ''} onChange={e => set('title', e.target.value)} style={fieldStyle} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} /></div>
            <div>{lbl('Description')}<textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={2} style={{ ...fieldStyle, resize: 'none' }} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>{lbl('Type')}<select value={form.type ?? 'post'} onChange={e => set('type', e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>{TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
              <div>{lbl('Status')}<select value={form.status ?? 'idea'} onChange={e => set('status', e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>{STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            </div>
            <div>
              {lbl('Platforms')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PLATFORMS.map(p => {
                  const sel = ((form.platforms ?? []) as string[]).includes(p)
                  return <button key={p} onClick={() => togglePlatform(p)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${sel ? 'var(--hot-pink)' : 'var(--border)'}`, background: sel ? 'var(--hot-pink)' : 'var(--surface)', color: sel ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s', textTransform: 'capitalize' }}>{p}</button>
                })}
              </div>
            </div>
            <div>
              {lbl('Tags')}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag + Enter" style={{ ...fieldStyle, flex: 1 }} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                <button onClick={addTag} style={{ fontSize: '11px', padding: '0 14px', borderRadius: '8px', border: 'none', background: 'var(--hot-pink-light)', color: 'var(--hot-pink)', fontWeight: 700, cursor: 'pointer' }}>Add</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {((form.tags ?? []) as string[]).map(t => (
                  <span key={t} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', background: 'var(--idea-bg)', color: 'var(--idea-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    #{t} <button onClick={() => set('tags', ((form.tags ?? []) as string[]).filter(x => x !== t))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}><X size={9} /></button>
                  </span>
                ))}
              </div>
            </div>
            <div>{lbl('Notes / Context')}<textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Ideas, links, reminders, voice memo summary…" style={{ ...fieldStyle, resize: 'none' }} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} /></div>
            <div>{lbl('Transcript / Script — paste raw content here')}<textarea value={form.transcript ?? ''} onChange={e => set('transcript', e.target.value)} rows={6} placeholder="Raw transcript from Riverside, voice memo, or CapCut export…" style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} /></div>
          </div>
        )}

        {/* ── EXPAND TAB ── */}
        {tab === 'expand' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--hot-pink-light)', border: '1px solid var(--hot-pink)' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--hot-pink-dark)', marginBottom: '6px' }}>🎯 Content Developer GPT — 1 idea → 30 pieces</p>
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Paste your transcript or notes in the Edit tab, then hit Expand. Your Content Developer GPT will generate hooks, captions, emails, pins, scripts, and more — in your voice.
              </p>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Expanding: <span style={{ color: 'var(--ink)' }}>{form.title}</span></p>
              {(form.transcript || form.notes || form.description) && <p style={{ fontSize: '10px', color: 'var(--idea-color)', marginTop: '4px' }}>✓ Content detected — ready to expand</p>}
              {!(form.transcript || form.notes || form.description) && <p style={{ fontSize: '10px', color: '#E05252', marginTop: '4px' }}>⚠ Add notes or a transcript in the Edit tab first for best results</p>}
            </div>
            <button onClick={handleExpand} disabled={expanding} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: expanding ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', opacity: expanding ? 0.7 : 1 }}>
              {expanding ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Expanding with AI…</> : <><Sparkles size={16} /> Expand to 30 Pieces</>}
            </button>
            {expanded && (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                  <button onClick={copyExpanded} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '7px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Copy size={11} /> {copied ? 'Copied!' : 'Copy all'}
                  </button>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', lineHeight: 1.7, padding: '16px', borderRadius: '12px', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--ink)', fontFamily: 'inherit', maxHeight: '420px', overflowY: 'auto' }}>{expanded}</pre>
              </div>
            )}
          </div>
        )}

        {/* ── VOICE TAB ── */}
        {tab === 'voice' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--progress-bg)', border: '1px solid var(--progress-color)' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--progress-color)', marginBottom: '6px' }}>🎙 ElevenLabs Voice Synthesis</p>
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Turn your transcript or script into Mandi's voice for podcast intros, voiceovers, or avatar audio. Uses your ElevenLabs voice clone.
              </p>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Will synthesize: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{((form.transcript || form.notes || form.description || form.title || '').slice(0, 120))}…</span></p>
            </div>
            <button onClick={handleSynthesize} disabled={synthesizing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', background: 'var(--progress-color)', color: '#fff', border: 'none', cursor: synthesizing ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', opacity: synthesizing ? 0.7 : 1 }}>
              {synthesizing ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Synthesizing…</> : <><Volume2 size={16} /> Generate Audio</>}
            </button>
            {audioUrl && (
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>🎵 Your audio is ready:</p>
                <audio controls src={audioUrl} style={{ width: '100%' }} />
                <a href={audioUrl} download="ai-mom-audio.mp3" style={{ display: 'block', marginTop: '10px', fontSize: '11px', color: 'var(--progress-color)', textDecoration: 'none', fontWeight: 600 }}>⬇ Download MP3</a>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          {!['published', 'archived'].includes(form.status ?? '') && (
            <button onClick={async () => { set('status', 'published'); await new Promise(r => setTimeout(r, 50)); handleSave() }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px', borderRadius: '10px', background: 'var(--ready-bg)', color: 'var(--ready-color)', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              <Send size={12} /> Mark Published
            </button>
          )}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button onClick={onClose} style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 16px', borderRadius: '10px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              <CheckCircle size={12} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
