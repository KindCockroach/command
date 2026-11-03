'use client'
import { useState, useEffect, useCallback } from 'react'
import { Newspaper, ExternalLink, ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react'

// NEWS ARCHIVE — lives in the Media tab. Every headline RISE pulls (on Daily Command)
// is auto-saved here, so the links are never lost. Search by text or by the date they
// were pulled (date range). Collapsed by default so it doesn't crowd the media grid.
type Item = { id: number; headline: string; outlet?: string; url: string; why?: string; pulled_at?: string; created_at: string }

const dayLabel = (iso?: string) => {
  if (!iso) return 'Earlier'
  const d = new Date(iso), now = new Date()
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(now) - start(d)) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

export default function NewsArchive() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({ scope: 'archive' })
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    if (q.trim()) p.set('q', q.trim())
    fetch(`/api/news?${p.toString()}`).then(r => r.json())
      .then(d => setItems(Array.isArray(d.archive) ? d.archive : []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [from, to, q])
  // Load once when first opened, and whenever a filter changes while open.
  useEffect(() => { if (open) load() }, [open, load])

  // Group by pull day.
  const groups: { day: string; items: Item[] }[] = []
  for (const it of items) {
    const key = dayLabel(it.pulled_at ?? it.created_at)
    const g = groups.find(x => x.day === key)
    if (g) g.items.push(it); else groups.push({ day: key, items: [it] })
  }

  const fld: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 9px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text)' }}>
        <Newspaper size={16} color="#C2477E" />
        <span style={{ fontSize: '13px', fontWeight: 900 }}>News archive</span>
        <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>every headline you&rsquo;ve pulled — searchable by date</span>
        {open ? <ChevronUp size={16} style={{ marginLeft: 'auto', color: 'var(--text-subtle)' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto', color: 'var(--text-subtle)' }} />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: '180px', ...fld, padding: '0 9px' }}>
              <Search size={13} color="var(--text-subtle)" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search headlines…" style={{ border: 'none', background: 'none', outline: 'none', color: 'var(--text)', fontSize: '12px', padding: '7px 0', width: '100%' }} />
            </div>
            <label style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '5px' }}>from <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={fld} /></label>
            <label style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '5px' }}>to <input type="date" value={to} onChange={e => setTo(e.target.value)} style={fld} /></label>
            {(from || to || q) && <button onClick={() => { setFrom(''); setTo(''); setQ('') }} style={{ ...fld, cursor: 'pointer', fontWeight: 700, color: 'var(--purple)' }}>Clear</button>}
          </div>

          {loading ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12.5px', padding: '14px 0' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> loading…</div>
          ) : items.length === 0 ? (
            <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', padding: '10px 0', lineHeight: 1.5 }}>No headlines archived{(from || to || q) ? ' for that search' : ' yet'}. Pull headlines on Daily Command and they&rsquo;ll land here automatically.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '460px', overflowY: 'auto' }}>
              {groups.map(g => (
                <div key={g.day}>
                  <p style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-subtle)', marginBottom: '7px' }}>{g.day} · {g.items.length}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {g.items.map(it => (
                      <div key={it.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 11px' }}>
                        <a href={it.url} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', textDecoration: 'none', lineHeight: 1.35 }}>{it.headline}</a>
                        {(it.outlet || it.why) && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.4 }}>{it.outlet ? <strong>{it.outlet}. </strong> : ''}{it.why}</p>}
                        <a href={it.url} target="_blank" rel="noreferrer" style={{ fontSize: '10.5px', color: 'var(--purple)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><ExternalLink size={10} /> {it.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
