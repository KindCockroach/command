'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react'

export interface ResearchItemT {
  headline: string
  source: string
  url: string
  why_it_matters: string
  talk_track: string
}
export interface ResearchBriefT {
  id: number
  date: string
  kind: 'daily' | 'dig'
  topic: string
  account_id: string | null
  items: ResearchItemT[]
  summary: string
  created_at: string
}

// The daily must-reads — 3-5 articles Mandi needs to be aware of today.
// Full-width on Daily Command (under Quick Capture) and at the top of the Research tab.
export default function ResearchBrief({ compact }: { compact?: boolean }) {
  const [brief, setBrief] = useState<ResearchBriefT | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const d = await fetch('/api/research').then(r => r.json()).catch(() => null)
    if (d?.today) setBrief(d.today)
    setFetched(true)
  }, [])
  useEffect(() => { load() }, [load])

  const generate = async () => {
    setLoading(true); setError('')
    const d = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'brief' }) }).then(r => r.json()).catch(() => ({ error: 'connection failed' }))
    if (d.brief) setBrief(d.brief)
    else setError(d.error || 'Research failed')
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: brief ? '1px solid var(--border)' : 'none' }}>
        <span style={{ fontSize: '15px' }}>🔬</span>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Today&apos;s must-reads</span>
        <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>AI · job market · education — what informs your economic awareness</span>
        <button onClick={generate} disabled={loading}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: brief ? 'var(--surface-raised)' : 'var(--purple)', color: brief ? 'var(--text-muted)' : '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
          {loading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Reading the world…</>
            : brief ? <><RefreshCw size={11} /> Re-run</>
            : <>Get today&apos;s brief</>}
        </button>
      </div>

      {error && <p style={{ padding: '10px 16px', fontSize: '12px', color: '#E05252', fontWeight: 600 }}>⚠ {error}</p>}

      {!brief && fetched && !loading && !error && (
        <p style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-subtle)' }}>No brief yet today — hit the button and the research desk reads the news for you.</p>
      )}

      {brief && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {brief.summary && !compact && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, paddingBottom: '4px', borderBottom: '1px dashed var(--border)' }}>{brief.summary}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {brief.items.map((it, i) => (
              <a key={i} href={it.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', padding: '12px', background: 'var(--surface-raised)', borderRadius: '10px', border: '1px solid var(--border)', textDecoration: 'none', transition: 'transform 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>
                <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.4, display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                  <span style={{ flex: 1 }}>{it.headline}</span> <ExternalLink size={11} style={{ color: 'var(--text-subtle)', flexShrink: 0, marginTop: '3px' }} />
                </p>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--purple)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{it.source}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '6px' }}>{it.why_it_matters}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)', lineHeight: 1.5, marginTop: '4px', fontStyle: 'italic' }}>🎙 {it.talk_track}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
