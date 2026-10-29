'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Newspaper, ExternalLink, Bookmark, BookmarkCheck, Check, X } from 'lucide-react'

// HEADLINES on Daily Command — pull this week's real news, flag any to a "read later"
// list. Lives here (moved off the Podcast tab). RISE just hands her the stories.
type Headline = { headline: string; outlet?: string; url: string; why?: string }
type Saved = Headline & { id: number; read?: boolean; created_at: string }

export default function HeadlinesPanel() {
  const [headlines, setHeadlines] = useState<Headline[]>([])
  const [saved, setSaved] = useState<Saved[]>([])
  const [pulling, setPulling] = useState(false)
  const [err, setErr] = useState('')

  const loadSaved = useCallback(() => {
    fetch('/api/news').then(r => r.json()).then(d => setSaved(Array.isArray(d.saved) ? d.saved : [])).catch(() => {})
  }, [])
  useEffect(() => { loadSaved() }, [loadSaved])

  const savedUrls = new Set(saved.map(s => s.url))

  const pull = async () => {
    if (pulling) return
    setPulling(true); setErr('')
    try {
      const d = await fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pull: true }) }).then(r => r.json())
      if (Array.isArray(d.headlines) && d.headlines.length) setHeadlines(d.headlines)
      else setErr(d.error || 'No headlines came back — try again.')
    } catch { setErr('Couldn’t reach the news desk — try again.') }
    setPulling(false)
  }

  const saveOne = async (h: Headline) => {
    setSaved(s => [{ ...h, id: -Date.now(), read: false, created_at: new Date().toISOString() }, ...s])  // optimistic
    try {
      const d = await fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ save: h }) }).then(r => r.json())
      if (d.saved) loadSaved()
    } catch { /* keep optimistic */ }
  }
  const toggleRead = async (s: Saved) => {
    setSaved(list => list.map(x => x.id === s.id ? { ...x, read: !x.read } : x))
    try { await fetch('/api/news', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, read: !s.read }) }) } catch { /* ignore */ }
  }
  const remove = async (s: Saved) => {
    setSaved(list => list.filter(x => x.id !== s.id))
    try { await fetch(`/api/news?id=${s.id}`, { method: 'DELETE' }) } catch { /* ignore */ }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #C2477E', borderRadius: '14px', padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <Newspaper size={15} color="#C2477E" />
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C2477E' }}>This week&rsquo;s headlines</span>
        <button onClick={pull} disabled={pulling}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: pulling ? 'var(--border)' : '#C2477E', color: '#fff', borderRadius: '9px', padding: '7px 13px', fontSize: '12px', fontWeight: 800, cursor: pulling ? 'default' : 'pointer' }}>
          {pulling ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> reading the web…</> : <><Newspaper size={13} /> Pull headlines</>}
        </button>
      </div>

      {err && <p style={{ fontSize: '12px', color: '#C2477E', marginBottom: '10px' }}>{err}</p>}

      {/* Freshly pulled — flag any to read later */}
      {headlines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: saved.length ? '16px' : 0 }}>
          {headlines.map((h, i) => {
            const isSaved = savedUrls.has(h.url)
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '11px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                  <a href={h.url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textDecoration: 'none', lineHeight: 1.35 }}>{h.headline}</a>
                  <button onClick={() => !isSaved && saveOne(h)} disabled={isSaved} title="Read later"
                    style={{ flexShrink: 0, border: 'none', background: 'none', cursor: isSaved ? 'default' : 'pointer', color: isSaved ? '#2E8B60' : 'var(--text-subtle)', fontWeight: 800, fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {isSaved ? <><BookmarkCheck size={13} /> Saved</> : <><Bookmark size={13} /> Read later</>}
                  </button>
                </div>
                {(h.outlet || h.why) && <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.45 }}>{h.outlet ? <strong>{h.outlet}. </strong> : ''}{h.why}</p>}
                <a href={h.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--purple)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><ExternalLink size={10} /> Read it</a>
              </div>
            )
          })}
        </div>
      )}

      {/* Read-later list */}
      {saved.length > 0 ? (
        <div>
          <p style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', marginBottom: '7px' }}>📑 Read later ({saved.filter(s => !s.read).length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {saved.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', opacity: s.read ? 0.5 : 1 }}>
                <button onClick={() => toggleRead(s)} title={s.read ? 'Mark unread' : 'Mark read'}
                  style={{ flexShrink: 0, marginTop: '2px', width: '15px', height: '15px', borderRadius: '4px', border: s.read ? 'none' : '2px solid var(--text-subtle)', background: s.read ? '#2E8B60' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  {s.read && <Check size={10} color="#fff" />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', textDecoration: s.read ? 'line-through' : 'none', lineHeight: 1.35 }}>{s.headline}</a>
                  {s.outlet && <span style={{ fontSize: '10.5px', color: 'var(--text-subtle)', marginLeft: '6px' }}>{s.outlet}</span>}
                </div>
                <button onClick={() => remove(s)} title="Remove" style={{ flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px' }}><X size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      ) : headlines.length === 0 && !pulling && !err ? (
        <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>Pull this week&rsquo;s real headlines, then tap <strong>Read later</strong> on any you want to come back to.</p>
      ) : null}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
