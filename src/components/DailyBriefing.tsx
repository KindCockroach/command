'use client'
import { useState, useEffect } from 'react'
import { Sparkles, Loader2, RefreshCw, Target, AlertCircle, CheckCircle2, Star } from 'lucide-react'
import type { ContentPiece } from '@/lib/db'
import type { DailyBriefing } from '@/lib/ai'

export default function DailyBriefingPanel({ content }: { content: ContentPiece[] }) {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const buildSummary = (items: ContentPiece[]) => {
    const byStatus = (s: string) => items.filter(x => x.status === s)
    const lines = [
      `Total pipeline items: ${items.length}`,
      `Ideas: ${byStatus('idea').length} — ${byStatus('idea').slice(0, 3).map(x => x.title).join(', ')}`,
      `In Progress: ${byStatus('in_progress').length} — ${byStatus('in_progress').slice(0, 3).map(x => x.title).join(', ')}`,
      `Ready to publish: ${byStatus('ready').length} — ${byStatus('ready').map(x => x.title).join(', ')}`,
    ]
    const stale = items.filter(x => {
      const days = (Date.now() - new Date(x.updated_at || x.created_at).getTime()) / 86400000
      return days > 3 && x.status !== 'ready'
    })
    if (stale.length) lines.push(`Stale (3+ days no movement): ${stale.map(x => x.title).join(', ')}`)
    return lines.join('\n')
  }

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'briefing', pipeline_summary: buildSummary(content) }),
      })
      const data = await res.json()
      if (data.result) {
        setBriefing(data.result)
        setLastRun(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  // Auto-run once on mount
  useEffect(() => { generate() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ background: 'var(--navy)', borderRadius: '16px', padding: '20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      {/* bg glow */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(232,68,138,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={14} color="var(--hot-pink)" />
          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--hot-pink)' }}>What Needs You Today</span>
          {lastRun && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>· {lastRun}</span>}
        </div>
        <button onClick={generate} disabled={loading} title="Refresh briefing"
          style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.35)', padding: '4px', display: 'flex', alignItems: 'center' }}>
          {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
        </button>
      </div>

      {loading && !briefing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          CEO GPT reviewing your pipeline...
        </div>
      )}

      {briefing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Headline */}
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>{briefing.headline}</p>

          {/* Needle mover */}
          <div style={{ background: 'rgba(232,68,138,0.15)', border: '1px solid rgba(232,68,138,0.3)', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Target size={14} color="var(--hot-pink)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--hot-pink)', marginBottom: '4px' }}>Move the needle</p>
              <p style={{ fontSize: '13px', color: '#fff', lineHeight: 1.5 }}>{briefing.needle_mover}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Stuck */}
            {briefing.stuck_items.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertCircle size={12} color="#F2A65A" />
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F2A65A' }}>Stuck</span>
                </div>
                {briefing.stuck_items.map((item, i) => (
                  <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', lineHeight: 1.4 }}>· {item}</p>
                ))}
              </div>
            )}

            {/* Ready */}
            {briefing.ready_to_publish.length > 0 && (
              <div style={{ background: 'rgba(61,170,124,0.1)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <CheckCircle2 size={12} color="#3DAA7C" />
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3DAA7C' }}>Publish now</span>
                </div>
                {briefing.ready_to_publish.map((item, i) => (
                  <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', lineHeight: 1.4 }}>· {item}</p>
                ))}
              </div>
            )}
          </div>

          {/* From Future Me */}
          {briefing.from_future_me && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '4px 0' }}>
              <Star size={12} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: '3px' }} />
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.5 }}>
                2027 Mandi: "{briefing.from_future_me}"
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
