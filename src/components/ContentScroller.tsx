'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, CheckCircle2, Copy, RefreshCw, ExternalLink, ArrowRight, Trash2, Download, Pause, FolderPlus, Eye } from 'lucide-react'
import type { ContentPiece, BrandAccount } from '@/lib/db'
import { PlatformPreviewModal } from './AccountsPanel'

// One-by-one review scroller for a pipeline lane — arrows, full content view.
export default function ContentScroller({ status, label, onClose }: { status: string; label: string; onClose: () => void }) {
  const [items, setItems] = useState<ContentPiece[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [i, setI] = useState(0)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/content?status=${status}`).then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ]).then(([c, a]) => { setItems(c); setAccounts(a); setLoading(false) }).catch(() => setLoading(false))
  }, [status])

  const next = useCallback(() => setI(x => Math.min(x + 1, items.length - 1)), [items.length])
  const prev = useCallback(() => setI(x => Math.max(x - 1, 0)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  const p = items[i]
  const acct = p ? accounts.find(a => a.id === p.account_id) : null
  const media = p?.media_urls?.length ? p.media_urls : (p?.media_url ? [p.media_url] : [])

  const approve = async () => {
    if (!p) return
    setApproving(true)
    try {
      await fetch('/api/ghl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: p.id }) })
      setItems(prev2 => prev2.filter(x => x.id !== p.id))
      setI(x => Math.min(x, Math.max(items.length - 2, 0)))
    } finally { setApproving(false) }
  }

  // Remove the current card from the local list and keep the index valid
  const dropCurrent = () => {
    if (!p) return
    setItems(prev2 => prev2.filter(x => x.id !== p.id))
    setI(x => Math.min(x, Math.max(items.length - 2, 0)))
  }

  const moveForward = async () => {
    if (!p) return
    const nextStatus = status === 'idea' ? 'in_progress' : 'ready'
    await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: nextStatus }) })
    dropCurrent()
  }

  // Pause — park the card in the 'held' lane (same idea as pausing a goal)
  const pause = async () => {
    if (!p) return
    await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'held' }) })
    dropCurrent()
  }

  // Promote a seed into a full Project, then remove it from the content lane
  const toProject = async () => {
    if (!p) return
    if (!confirm(`Turn "${p.title}" into a Project? It leaves the content pipeline and becomes a project you can build out.`)) return
    const body = [p.description, p.onscreen_text, p.hashtags].filter(Boolean).join('\n\n')
    await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: p.title, description: p.description ?? '', notes: body, status: 'active', priority: 'medium' }) })
    await fetch(`/api/content?id=${p.id}`, { method: 'DELETE' })
    dropCurrent()
  }

  const remove = async () => {
    if (!p) return
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return
    await fetch(`/api/content?id=${p.id}`, { method: 'DELETE' })
    dropCurrent()
  }

  const openOnAccount = () => {
    if (!p?.account_id) return
    localStorage.setItem('station-flip-account', p.account_id)
    window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view: 'accounts' } }))
    onClose()
  }

  // Slide lines for Canva Bulk Create — parse numbered "Slide N: ..." lines (fallback: any multi-line onscreen text)
  const slideLines = (p?.onscreen_text ?? '').split('\n').map(l => l.replace(/^\s*Slide\s*\d+\s*[:.\-–]\s*/i, '').trim()).filter(Boolean)

  const exportCanvaCsv = () => {
    if (!p || slideLines.length < 2) return
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = ['slide,text', ...slideLines.map((l, idx) => `${idx + 1},${esc(l)}`)].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${p.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}-slides.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copyAll = () => {
    if (!p) return
    navigator.clipboard.writeText([p.description, p.hashtags].filter(Boolean).join('\n\n'))
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.6)', backdropFilter: 'blur(5px)' }} onClick={onClose} />

      {/* Left arrow */}
      <button onClick={prev} disabled={i === 0}
        style={{ position: 'relative', zIndex: 2, width: '46px', height: '46px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.92)', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
        <ChevronLeft size={22} color="#1C1F3B" />
      </button>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '20px', background: 'var(--surface)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{label} · {items.length ? `${i + 1} / ${items.length}` : '0'}</p>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '18px' }}>
          {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading…</p>}
          {!loading && !p && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Nothing left in this lane. 🎉</p>}
          {p && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</p>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {acct && <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: `${acct.color}16`, color: acct.color }}>{acct.emoji} {acct.handle}</span>}
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'var(--bg)', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>{p.type.replace(/_/g, ' ')}</span>
                  {media.length > 0 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#3DAA7C' }}>📎 {media.length > 1 ? `${media.length} slides` : 'media'}</span>}
                </div>
              </div>

              {media.length > 0 && (
                /\.(mp4|mov|webm)/i.test(media[0])
                  ? <video src={media[0]} controls style={{ width: '100%', maxHeight: '240px', borderRadius: '12px', background: '#000' }} />
                  : <img src={media[0]} alt="" onClick={() => window.open(media[0], '_blank')} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', cursor: 'zoom-in' }} />
              )}
              {media.length === 0 && p.image_prompt && (
                <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '10px', borderLeft: '3px solid var(--purple)' }}>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '3px' }}>🎨 Visual to create</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.image_prompt}</p>
                </div>
              )}

              {p.onscreen_text && (
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '3px' }}>On-screen</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.onscreen_text}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '3px' }}>Caption / body</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{p.description}</p>
              </div>
              {p.hashtags && <p style={{ fontSize: '10px', color: acct?.color ?? 'var(--purple)', lineHeight: 1.5, wordBreak: 'break-word' }}>{p.hashtags}</p>}
            </div>
          )}
        </div>

        {p && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {status !== 'ready' && (
              <button onClick={moveForward}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', borderRadius: '10px', border: 'none', background: acct?.color ?? 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
                <ArrowRight size={14} /> {status === 'idea' ? 'Start building' : 'Mark ready ✓'}
              </button>
            )}
            {status === 'ready' && (
              <button onClick={approve} disabled={approving}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', borderRadius: '10px', border: 'none', background: acct?.color ?? 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: approving ? 0.7 : 1 }}>
                {approving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />} Approve
              </button>
            )}
            {acct && (
              <button onClick={() => setPreview(true)} title="Preview as it will look on the feed"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                <Eye size={13} /> Preview
              </button>
            )}
            <button onClick={copyAll} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: copied ? '#3DAA7C' : 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
            </button>
            {slideLines.length >= 2 && (
              <button onClick={exportCanvaCsv} title="Download slide lines as CSV for Canva Bulk Create"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--purple)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                <Download size={13} /> Canva CSV
              </button>
            )}
            {p.account_id && (
              <button onClick={openOnAccount} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                <ExternalLink size={13} /> Full card
              </button>
            )}
            <button onClick={toProject} title="Turn this into a Project"
              style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <FolderPlus size={13} />
            </button>
            <button onClick={pause} title="Pause — park in Held"
              style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Pause size={13} />
            </button>
            <button onClick={remove} title="Delete this card"
              style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: '#d05', cursor: 'pointer' }}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Right arrow */}
      <button onClick={next} disabled={i >= items.length - 1}
        style={{ position: 'relative', zIndex: 2, width: '46px', height: '46px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.92)', cursor: i >= items.length - 1 ? 'default' : 'pointer', opacity: i >= items.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '12px', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
        <ChevronRight size={22} color="#1C1F3B" />
      </button>
      {preview && p && acct && <PlatformPreviewModal post={p} account={acct} onClose={() => setPreview(false)} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
