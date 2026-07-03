'use client'
import { useState, useEffect } from 'react'
import { Radar, Plus, Sparkles, Loader2, Trash2, X, ExternalLink } from 'lucide-react'
import type { WatchAccount } from '@/lib/db'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Threads', 'LinkedIn', 'Pinterest']

function Chips({ items, color }: { items: string[]; color: string }) {
  if (!items?.length) return null
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {items.map((b, i) => (
        <span key={i} style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', background: `${color}14`, color }}>{b}</span>
      ))}
    </div>
  )
}

export default function AuditPanel() {
  const [watched, setWatched] = useState<WatchAccount[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ handle: '', platform: 'Instagram', niche: '', why_watching: '', pastedContent: '' })
  const [saving, setSaving] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<number | null>(null)
  const [pasteFor, setPasteFor] = useState<number | null>(null)
  const [pasteText, setPasteText] = useState('')

  useEffect(() => {
    fetch('/api/watch').then(r => r.json()).then(setWatched).catch(() => {})
  }, [])

  const addAccount = async () => {
    if (!form.handle.trim()) return
    setSaving(true)
    try {
      // Create, then immediately analyze so the card arrives with intelligence
      const created: WatchAccount = await fetch('/api/watch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: form.handle, platform: form.platform, niche: form.niche, why_watching: form.why_watching }),
      }).then(r => r.json())
      setWatched(prev => [...prev, created])
      setAdding(false)
      setForm({ handle: '', platform: 'Instagram', niche: '', why_watching: '', pastedContent: '' })
      setAnalyzingId(created.id)
      const analyzed = await fetch('/api/watch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', id: created.id, pastedContent: form.pastedContent || undefined }),
      }).then(r => r.json())
      if (analyzed.id) setWatched(prev => prev.map(w => w.id === analyzed.id ? analyzed : w))
    } finally {
      setSaving(false)
      setAnalyzingId(null)
    }
  }

  const reanalyze = async (w: WatchAccount, pasted?: string) => {
    setAnalyzingId(w.id)
    try {
      const analyzed = await fetch('/api/watch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', id: w.id, pastedContent: pasted || undefined }),
      }).then(r => r.json())
      if (analyzed.id) setWatched(prev => prev.map(x => x.id === analyzed.id ? analyzed : x))
    } finally {
      setAnalyzingId(null)
      setPasteFor(null)
      setPasteText('')
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Stop watching this account?')) return
    await fetch(`/api/watch?id=${id}`, { method: 'DELETE' })
    setWatched(prev => prev.filter(w => w.id !== id))
  }

  const profileUrl = (w: WatchAccount) => {
    const h = w.handle.replace('@', '')
    if (w.platform === 'TikTok') return `https://tiktok.com/@${h}`
    if (w.platform === 'YouTube') return `https://youtube.com/@${h}`
    if (w.platform === 'Threads') return `https://threads.net/@${h}`
    if (w.platform === 'Pinterest') return `https://pinterest.com/${h}`
    if (w.platform === 'LinkedIn') return `https://linkedin.com/in/${h}`
    return `https://instagram.com/${h}`
  }

  const fld = { padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radar size={20} color="var(--hot-pink)" /> Audit Radar
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Track 10–20 winning accounts. Their formats, buzzwords, and keywords feed every generator automatically.
          </p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          {adding ? <X size={13} /> : <Plus size={13} />} {adding ? 'Cancel' : 'Watch Account'}
        </button>
      </div>

      {adding && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--hot-pink)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <input value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} placeholder="@handle" style={fld} />
            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={{ ...fld, cursor: 'pointer' }}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <input value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} placeholder="Niche (e.g. AI for moms, ADHD women, homeschool)" style={fld} />
          <input value={form.why_watching} onChange={e => setForm(f => ({ ...f, why_watching: e.target.value }))} placeholder="Why watch them? What are they winning at?" style={fld} />
          <textarea value={form.pastedContent} onChange={e => setForm(f => ({ ...f, pastedContent: e.target.value }))} rows={3}
            placeholder="Optional but powerful: paste 3-5 of their recent captions/hooks here — the analysis will extract their real patterns instead of guessing" style={{ ...fld, resize: 'vertical' }} />
          <button onClick={addAccount} disabled={saving || !form.handle.trim()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving || !form.handle.trim() ? 0.6 : 1 }}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            {saving ? 'Adding + analyzing…' : 'Add & Analyze'}
          </button>
        </div>
      )}

      {watched.length === 0 && !adding && (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '14px', padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>📡</p>
          <p style={{ fontSize: '14px', fontWeight: 700 }}>No accounts on the radar yet</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Add the 10-20 accounts winning in your niches. Their patterns will sharpen every post the station writes.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {watched.map(w => (
          <div key={w.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{w.handle}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{w.platform} · {w.niche}</p>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <a href={profileUrl(w)} target="_blank" rel="noopener noreferrer" title="Open account" style={{ padding: '5px', color: 'var(--electric-nebula, var(--purple))', display: 'flex' }}>
                  <ExternalLink size={13} />
                </a>
                <button onClick={() => remove(w.id)} title="Remove" style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {w.why_watching && <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{w.why_watching}</p>}

            {w.formats?.length > 0 && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '4px' }}>Winning formats</p>
                {w.formats.map((f, i) => <p key={i} style={{ fontSize: '11px', color: 'var(--text)', padding: '4px 8px', background: 'var(--bg)', borderRadius: '6px', marginBottom: '3px' }}>· {f}</p>)}
              </div>
            )}

            {w.buzzwords?.length > 0 && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '4px' }}>Buzzwords</p>
                <Chips items={w.buzzwords} color="#E8448A" />
              </div>
            )}

            {w.keywords?.length > 0 && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '4px' }}>Keywords</p>
                <Chips items={w.keywords} color="#5A4FCF" />
              </div>
            )}

            {w.notes && <p style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '8px 10px', background: 'var(--bg)', borderRadius: '8px', lineHeight: 1.5 }}>{w.notes}</p>}

            {pasteFor === w.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={3} placeholder="Paste their recent captions/hooks here…" style={fld} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => reanalyze(w, pasteText)} disabled={analyzingId === w.id}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                    Analyze pasted content
                  </button>
                  <button onClick={() => { setPasteFor(null); setPasteText('') }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', fontSize: '11px', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setPasteFor(w.id)} disabled={analyzingId === w.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-muted)', marginTop: 'auto' }}>
                {analyzingId === w.id ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</> : <><Sparkles size={11} /> Re-analyze with fresh content</>}
              </button>
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
