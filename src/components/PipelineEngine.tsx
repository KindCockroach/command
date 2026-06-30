'use client'
import { useState } from 'react'
import { Zap, Play, Loader2, CheckCircle2, AlertCircle, Video, FileText, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

type PipelineResult = {
  processed: number
  scripted: number
  videos_queued: number
  repurposed: number
  errors: string[]
  log: string[]
}

export default function PipelineEngine() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [includeVideo, setIncludeVideo] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoVideo: includeVideo, maxItems: 5 }),
      })
      const data = await res.json()
      setResult(data)
      setLastRun(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    } catch {
      setResult({ processed: 0, scripted: 0, videos_queued: 0, repurposed: 0, errors: ['Network error'], log: [] })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={14} color="var(--hot-pink)" />
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Pipeline Engine</span>
          {lastRun && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>· last run {lastRun}</span>}
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '3px 8px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          auto: off — run manually or schedule
        </span>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
        Runs your content through the pipeline: <strong>enriched ideas → scripts → 30-piece repurpose plans</strong>.
        Enable HeyGen to also queue avatar videos.
      </p>

      {/* What it does */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {[
          { icon: <FileText size={12} />, label: 'Write scripts', sub: 'for all enriched ideas', color: '#5A4FCF' },
          { icon: <RefreshCw size={12} />, label: 'Generate 30 pieces', sub: 'per scripted item', color: 'var(--hot-pink)' },
          { icon: <Video size={12} />, label: 'Queue videos', sub: 'HeyGen avatar (optional)', color: '#3DAA7C' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ color: s.color, marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>{s.label}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={includeVideo} onChange={e => setIncludeVideo(e.target.checked)}
            style={{ accentColor: 'var(--hot-pink)', width: '14px', height: '14px' }} />
          Include HeyGen videos
        </label>

        <button onClick={run} disabled={running}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', border: 'none', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '12px', background: running ? 'var(--border)' : 'var(--hot-pink)', color: '#fff', transition: 'opacity 0.15s' }}>
          {running
            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running pipeline...</>
            : <><Play size={13} /> Run Pipeline Now</>}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {[
              { label: 'Scripts written', value: result.scripted, color: '#5A4FCF' },
              { label: '30-piece plans', value: result.repurposed, color: 'var(--hot-pink)' },
              { label: 'Videos queued', value: result.videos_queued, color: '#3DAA7C' },
              { label: 'Errors', value: result.errors.length, color: result.errors.length ? '#e05' : 'var(--text-muted)' },
            ].map((s, i) => (
              <div key={i} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div style={{ background: '#fff5f5', border: '1px solid #fcc', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
              {result.errors.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '11px', color: '#c00' }}>
                  <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} /> {e}
                </div>
              ))}
            </div>
          )}

          {result.processed === 0 && result.errors.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3DAA7C' }}>
              <CheckCircle2 size={13} /> Pipeline is caught up — nothing new to process right now.
            </div>
          )}

          {result.log.length > 0 && (
            <div>
              <button onClick={() => setShowLog(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                {showLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showLog ? 'Hide' : 'Show'} run log ({result.log.length} lines)
              </button>
              {showLog && (
                <div style={{ marginTop: '8px', background: 'var(--navy)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto' }}>
                  {result.log.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
