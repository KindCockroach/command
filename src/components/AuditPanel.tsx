'use client'
import { useState, useEffect } from 'react'
import { Radar, Plus, Sparkles, Loader2, Trash2, X, ExternalLink, Users, MessageSquareQuote, KeyRound, LayoutTemplate, RefreshCw, TrendingUp } from 'lucide-react'
import type { WatchAccount } from '@/lib/db'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Threads', 'LinkedIn', 'Pinterest']

const fmtFollowers = (n?: number) => {
  if (!n) return null
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

const timeAgo = (iso?: string | null) => {
  if (!iso) return 'never'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

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

// Count term frequency across all tracked accounts → what the whole niche is saying
function topTerms(watched: WatchAccount[], field: 'buzzwords' | 'keywords', limit = 25): { term: string; count: number }[] {
  const counts = new Map<string, number>()
  watched.forEach(w => (w[field] ?? []).forEach(t => {
    const k = t.toLowerCase().trim()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }))
  return [...counts.entries()].map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count).slice(0, limit)
}

export default function AuditPanel() {
  const [watched, setWatched] = useState<WatchAccount[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ handle: '', platform: 'Instagram', niche: '', why_watching: '', followers: '', pastedContent: '' })
  const [saving, setSaving] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<number | null>(null)
  const [analyzingAll, setAnalyzingAll] = useState(false)
  const [pasteFor, setPasteFor] = useState<number | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [view, setView] = useState<'accounts' | 'intelligence'>('accounts')

  useEffect(() => {
    fetch('/api/watch').then(r => r.json()).then(setWatched).catch(() => {})
  }, [])

  const addAccount = async () => {
    if (!form.handle.trim()) return
    setSaving(true)
    try {
      const created: WatchAccount = await fetch('/api/watch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: form.handle, platform: form.platform, niche: form.niche, why_watching: form.why_watching, followers: form.followers ? Number(form.followers) : undefined }),
      }).then(r => r.json())
      setWatched(prev => [...prev, created])
      const pasted = form.pastedContent
      setAdding(false)
      setForm({ handle: '', platform: 'Instagram', niche: '', why_watching: '', followers: '', pastedContent: '' })
      setAnalyzingId(created.id)
      const analyzed = await fetch('/api/watch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', id: created.id, pastedContent: pasted || undefined }),
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

  const reanalyzeAll = async () => {
    setAnalyzingAll(true)
    try {
      for (const w of watched) {
        setAnalyzingId(w.id)
        const analyzed = await fetch('/api/watch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'analyze', id: w.id }),
        }).then(r => r.json())
        if (analyzed.id) setWatched(prev => prev.map(x => x.id === analyzed.id ? analyzed : x))
      }
    } finally {
      setAnalyzingId(null)
      setAnalyzingAll(false)
    }
  }

  const updateFollowers = async (w: WatchAccount, value: string) => {
    const followers = Number(value.replace(/[^0-9]/g, '')) || 0
    await fetch('/api/watch', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id, followers }) })
    setWatched(prev => prev.map(x => x.id === w.id ? { ...x, followers } : x))
  }

  const remove = async (id: number) => {
    if (!confirm('Stop tracking this account?')) return
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

  const filtered = watched.filter(w => platformFilter === 'all' || w.platform === platformFilter)
  const platformCounts = PLATFORMS.map(p => ({ p, n: watched.filter(w => w.platform === p).length })).filter(x => x.n > 0)
  const allBuzz = topTerms(watched, 'buzzwords')
  const allKeys = topTerms(watched, 'keywords')
  const allFormats = [...new Set(watched.flatMap(w => w.formats ?? []))]
  const allHooks = watched.flatMap(w => (w.top_hooks ?? []).map(h => ({ hook: h, handle: w.handle })))
  const totalReach = watched.reduce((sum, w) => sum + (w.followers ?? 0), 0)

  const fld = { padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radar size={20} color="var(--hot-pink)" /> Trends Radar
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Track 10–20 winning accounts. Their formats, buzzwords, keywords, and hooks feed every generator and the concept engine.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {watched.length > 0 && (
            <button onClick={reanalyzeAll} disabled={analyzingAll}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', opacity: analyzingAll ? 0.7 : 1 }}>
              {analyzingAll ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
              {analyzingAll ? 'Auditing all…' : 'Audit all'}
            </button>
          )}
          <button onClick={() => setAdding(a => !a)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
            {adding ? <X size={13} /> : <Plus size={13} />} {adding ? 'Cancel' : 'Track Account'}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {watched.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
          {[
            { icon: <Users size={13} />, label: 'Tracked', value: String(watched.length), color: 'var(--hot-pink)' },
            { icon: <TrendingUp size={13} />, label: 'Combined reach', value: fmtFollowers(totalReach) ?? '—', color: '#3DAA7C' },
            { icon: <MessageSquareQuote size={13} />, label: 'Buzzwords', value: String(allBuzz.length), color: '#E8448A' },
            { icon: <KeyRound size={13} />, label: 'Keywords', value: String(allKeys.length), color: '#5A4FCF' },
            { icon: <LayoutTemplate size={13} />, label: 'Formats', value: String(allFormats.length), color: '#F2A65A' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: s.color, marginBottom: '4px' }}>{s.icon}<span style={{ fontSize: '18px', fontWeight: 900 }}>{s.value}</span></div>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* View + platform filters */}
      {watched.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {([['accounts', 'Accounts'], ['intelligence', 'Intelligence']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: view === id ? 'var(--purple)' : 'var(--surface)', color: view === id ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
          {view === 'accounts' && platformCounts.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => setPlatformFilter('all')} style={{ padding: '4px 10px', borderRadius: '20px', border: `2px solid ${platformFilter === 'all' ? 'var(--hot-pink)' : 'var(--border)'}`, background: 'transparent', fontSize: '10px', fontWeight: 700, cursor: 'pointer', color: platformFilter === 'all' ? 'var(--hot-pink)' : 'var(--text-muted)', fontFamily: 'inherit' }}>All · {watched.length}</button>
              {platformCounts.map(({ p, n }) => (
                <button key={p} onClick={() => setPlatformFilter(p)} style={{ padding: '4px 10px', borderRadius: '20px', border: `2px solid ${platformFilter === p ? 'var(--hot-pink)' : 'var(--border)'}`, background: 'transparent', fontSize: '10px', fontWeight: 700, cursor: 'pointer', color: platformFilter === p ? 'var(--hot-pink)' : 'var(--text-muted)', fontFamily: 'inherit' }}>{p} · {n}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {adding && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--hot-pink)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
            <input value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} placeholder="@handle" style={fld} />
            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={{ ...fld, cursor: 'pointer' }}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
            <input value={form.followers} onChange={e => setForm(f => ({ ...f, followers: e.target.value }))} placeholder="Followers (e.g. 85000)" style={fld} />
          </div>
          <input value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} placeholder="Niche (e.g. AI for moms, ADHD women, homeschool)" style={fld} />
          <input value={form.why_watching} onChange={e => setForm(f => ({ ...f, why_watching: e.target.value }))} placeholder="Why track them? What are they winning at?" style={fld} />
          <textarea value={form.pastedContent} onChange={e => setForm(f => ({ ...f, pastedContent: e.target.value }))} rows={3}
            placeholder="Optional but powerful: paste 3-5 of their recent captions/hooks — the audit extracts their real patterns instead of guessing" style={{ ...fld, resize: 'vertical' }} />
          <button onClick={addAccount} disabled={saving || !form.handle.trim()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving || !form.handle.trim() ? 0.6 : 1 }}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            {saving ? 'Adding + auditing…' : 'Track & Audit'}
          </button>
        </div>
      )}

      {watched.length === 0 && !adding && (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '14px', padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>📡</p>
          <p style={{ fontSize: '14px', fontWeight: 700 }}>No accounts on the radar yet</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Add the 10-20 accounts winning in your niches. Their patterns sharpen every post the station writes.</p>
        </div>
      )}

      {/* ── INTELLIGENCE VIEW: aggregated across all tracked accounts ── */}
      {view === 'intelligence' && watched.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E8448A', marginBottom: '10px' }}>🔥 Buzzword cloud — bigger badge = more accounts using it</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {allBuzz.map(({ term, count }) => (
                <span key={term} style={{ fontSize: `${Math.min(10 + count * 3, 19)}px`, fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: `rgba(232,68,138,${Math.min(0.06 + count * 0.06, 0.3)})`, color: '#E8448A' }}>
                  {term}{count > 1 && <sup style={{ fontSize: '9px', marginLeft: '2px' }}>×{count}</sup>}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5A4FCF', marginBottom: '10px' }}>🔑 Keyword cloud — discovery terms across the niche</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {allKeys.map(({ term, count }) => (
                <span key={term} style={{ fontSize: `${Math.min(10 + count * 3, 19)}px`, fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: `rgba(90,79,207,${Math.min(0.06 + count * 0.06, 0.3)})`, color: '#5A4FCF' }}>
                  {term}{count > 1 && <sup style={{ fontSize: '9px', marginLeft: '2px' }}>×{count}</sup>}
                </span>
              ))}
            </div>
          </div>

          {allHooks.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--hot-pink)', marginBottom: '10px' }}>🪝 Hook templates worth stealing (structure, not content)</p>
              {allHooks.map((h, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '5px', borderLeft: '3px solid var(--hot-pink)', display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>{h.hook}</p>
                  <span style={{ fontSize: '10px', color: 'var(--text-subtle)', flexShrink: 0 }}>{h.handle}</span>
                </div>
              ))}
            </div>
          )}

          {allFormats.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F2A65A', marginBottom: '10px' }}>🎬 Winning formats across the radar</p>
              {allFormats.map((f, i) => (
                <p key={i} style={{ fontSize: '12px', color: 'var(--text)', padding: '6px 10px', background: 'var(--bg)', borderRadius: '7px', marginBottom: '4px' }}>· {f}</p>
              ))}
            </div>
          )}

          <p style={{ fontSize: '11px', color: 'var(--text-subtle)', textAlign: 'center' }}>
            All of this is injected automatically into every generator and the calendar concept engine.
          </p>
        </div>
      )}

      {/* ── ACCOUNTS VIEW ── */}
      {view === 'accounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {filtered.map(w => (
            <div key={w.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{w.handle}</p>
                    {w.followers ? <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', background: 'rgba(61,170,124,0.12)', color: '#3DAA7C' }}>{fmtFollowers(w.followers)}</span> : null}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{w.platform} · {w.niche}</p>
                  <p style={{ fontSize: '9px', color: 'var(--text-subtle)', marginTop: '2px' }}>Last audited: {timeAgo(w.last_analyzed)}</p>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <a href={profileUrl(w)} target="_blank" rel="noopener noreferrer" title="Open account" style={{ padding: '5px', color: 'var(--purple)', display: 'flex' }}>
                    <ExternalLink size={13} />
                  </a>
                  <button onClick={() => remove(w.id)} title="Stop tracking" style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {w.why_watching && <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{w.why_watching}</p>}
              {w.engagement_note && <p style={{ fontSize: '11px', color: '#3DAA7C', padding: '6px 10px', background: 'rgba(61,170,124,0.07)', borderRadius: '7px' }}>📊 {w.engagement_note}</p>}

              {(w.top_hooks?.length ?? 0) > 0 && (
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '4px' }}>Hook templates</p>
                  {w.top_hooks!.map((h, i) => <p key={i} style={{ fontSize: '11px', color: 'var(--text)', padding: '4px 8px', background: 'var(--bg)', borderRadius: '6px', marginBottom: '3px', borderLeft: '3px solid var(--hot-pink)' }}>{h}</p>)}
                </div>
              )}

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

              {/* Follower update */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input defaultValue={w.followers ?? ''} placeholder="Update followers"
                  onBlur={e => { if (e.target.value !== String(w.followers ?? '')) updateFollowers(w, e.target.value) }}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '11px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                <span style={{ fontSize: '9px', color: 'var(--text-subtle)' }}>followers</span>
              </div>

              {pasteFor === w.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={3} placeholder="Paste their recent captions/hooks here…" style={fld} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => reanalyze(w, pasteText)} disabled={analyzingId === w.id}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                      Audit pasted content
                    </button>
                    <button onClick={() => { setPasteFor(null); setPasteText('') }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', fontSize: '11px', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setPasteFor(w.id)} disabled={analyzingId === w.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-muted)', marginTop: 'auto' }}>
                  {analyzingId === w.id ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Auditing…</> : <><Sparkles size={11} /> Re-audit with fresh content</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
