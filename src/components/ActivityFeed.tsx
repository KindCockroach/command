'use client'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, Activity } from 'lucide-react'

type Ev = { id: number; ts: string; type: string; title: string; detail?: string; icon?: string; source?: string; account_id?: string | null }

// The station's SPINE, made visible — a running feed of everything that happens
// (drops, transcripts, scheduled posts, the weekly trend check-in). The same
// events the Commander reads to "keep an eye." Read-only, auto-refreshing.
function rel(ts: string): string {
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

const TYPE_TINT: Record<string, string> = {
  drop: '#5A4FCF', transcribed: '#2B9CC4', post_approved: '#2E8B60', trend_checkin: '#C2477E',
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/activity?limit=40').then(r => r.json())
      .then(d => setEvents(Array.isArray(d.events) ? d.events : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(load, 60000)   // keep the spine fresh
    return () => clearInterval(t)
  }, [load])

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={14} style={{ color: 'var(--purple)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>Activity</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>The station&apos;s spine — what RISE has seen and done</p>
        </div>
        <button onClick={load} title="Refresh" style={{ border: 'none', background: 'var(--surface-raised)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', display: 'flex' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', padding: '8px 2px' }}>
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Reading the feed…
        </div>
      ) : events.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text-subtle)', padding: '6px 2px', lineHeight: 1.5 }}>
          Nothing logged yet. Drop a file, transcribe an episode, or approve a post — it&apos;ll show up here, and the Commander will see it too. 🌱
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '340px', overflowY: 'auto' }}>
          {events.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 8px', borderRadius: '9px', borderLeft: `3px solid ${TYPE_TINT[e.type] ?? 'var(--border)'}` }}>
              <span style={{ fontSize: '15px', lineHeight: 1.3, flexShrink: 0 }}>{e.icon || '•'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, wordBreak: 'break-word' }}>{e.title}</p>
                {e.detail && <p style={{ fontSize: '11px', color: 'var(--text-subtle)', lineHeight: 1.4 }}>{e.detail}</p>}
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-subtle)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '1px' }}>{rel(e.ts)}</span>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
