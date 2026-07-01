'use client'
import { useState } from 'react'
import { Sparkles, Loader2, Plus, Minus, CheckCircle2, X } from 'lucide-react'

type ContentOrder = { type: string; qty: number }

const CONTENT_TYPES = [
  {
    id: 'instagram_post',
    label: 'Instagram Post',
    icon: '📸',
    color: '#E1306C',
    components: ['Caption body', '20–30 hashtags', 'Alt text', 'Angle/hook'],
  },
  {
    id: 'instagram_reel',
    label: 'Instagram Reel',
    icon: '🎬',
    color: '#833AB4',
    components: ['Hook (3-sec opener)', 'Full spoken script', 'Caption + CTA', 'Hashtags', 'B-roll suggestions'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    color: '#010101',
    components: ['Scroll-stop hook', '30–60s script', 'Caption', 'Hashtags', 'Sound vibe'],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    components: ['SEO headline', 'Full description', 'Tags', 'Thumbnail concept', 'Opening hook script'],
  },
  {
    id: 'medium_article',
    label: 'Medium Article',
    icon: '✍️',
    color: '#000000',
    components: ['Clickable title', 'Subtitle', '600–900 word body', 'Topic tags'],
  },
  {
    id: 'substack',
    label: 'Substack',
    icon: '📬',
    color: '#FF6719',
    components: ['Subject line', 'Preview text', '400–700 word body', 'P.S. line'],
  },
  {
    id: 'email',
    label: 'Email',
    icon: '📧',
    color: '#5A4FCF',
    components: ['Subject line', 'Preview text', 'Full body', 'CTA button text'],
  },
  {
    id: 'facebook_post',
    label: 'Facebook Post',
    icon: '👥',
    color: '#1877F2',
    components: ['Long-form caption', 'Engagement hook'],
  },
  {
    id: 'threads',
    label: 'Threads',
    icon: '🧵',
    color: '#000000',
    components: ['Short punchy post (under 500 chars)', 'Hot take angle'],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    icon: '📌',
    color: '#E60023',
    components: ['SEO pin title', 'Description', 'Board suggestion', 'Image concept', 'Keywords'],
  },
]

interface Props {
  projectName: string
  projectDescription: string
  projectNotes: string
  onDone: (count: number) => void
}

export default function ContentOrderForm({ projectName, projectDescription, projectNotes, onDone }: Props) {
  const [orders, setOrders] = useState<Record<string, number>>({})
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ created: number } | null>(null)
  const [expandedType, setExpandedType] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOrders(prev => {
      if (prev[id]) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: 1 }
    })
  }

  const setQty = (id: string, delta: number) => {
    setOrders(prev => {
      const current = prev[id] ?? 1
      const next = Math.max(1, Math.min(30, current + delta))
      return { ...prev, [id]: next }
    })
  }

  const totalPieces = Object.values(orders).reduce((a, b) => a + b, 0)

  const generate = async () => {
    if (totalPieces === 0) return
    setGenerating(true)
    setResult(null)
    try {
      const contentOrders = Object.entries(orders).map(([type, qty]) => ({ type, qty }))
      const res = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, projectDescription, projectNotes, orders: contentOrders }),
      })
      const data = await res.json()
      setResult({ created: data.created ?? 0 })
      onDone(data.created ?? 0)
    } catch {
      setResult({ created: 0 })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {CONTENT_TYPES.map(ct => {
          const selected = orders[ct.id] !== undefined
          const qty = orders[ct.id] ?? 1
          const expanded = expandedType === ct.id

          return (
            <div key={ct.id} style={{
              border: `2px solid ${selected ? ct.color : 'var(--border)'}`,
              borderRadius: '10px',
              overflow: 'hidden',
              background: selected ? `${ct.color}08` : 'var(--bg)',
              transition: 'border-color 0.15s, background 0.15s',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', cursor: 'pointer' }}
                onClick={() => toggle(ct.id)}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                  border: selected ? 'none' : '2px solid var(--border)',
                  background: selected ? ct.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <CheckCircle2 size={12} color="#fff" />}
                </div>
                <span style={{ fontSize: '13px' }}>{ct.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: selected ? ct.color : 'var(--text)', flex: 1 }}>{ct.label}</span>
                <button
                  onClick={e => { e.stopPropagation(); setExpandedType(expanded ? null : ct.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: 'var(--text-muted)', padding: '2px 4px' }}>
                  {expanded ? '▲' : '▼'}
                </button>
              </div>

              {/* Components preview */}
              {expanded && (
                <div style={{ padding: '0 12px 10px', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 4px' }}>Includes</p>
                  {ct.components.map((c, i) => (
                    <div key={i} style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 0' }}>· {c}</div>
                  ))}
                </div>
              )}

              {/* Qty picker — only when selected */}
              {selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderTop: '1px solid var(--border)', background: `${ct.color}10` }}
                  onClick={e => e.stopPropagation()}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>Quantity</span>
                  <button onClick={() => setQty(ct.id, -1)} style={qBtnSt}><Minus size={10} /></button>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: ct.color, minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => setQty(ct.id, 1)} style={qBtnSt}><Plus size={10} /></button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary + generate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px', flexWrap: 'wrap' }}>
        {totalPieces > 0 && (
          <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--purple)' }}>{totalPieces} pieces</strong> across {Object.keys(orders).length} format{Object.keys(orders).length !== 1 ? 's' : ''}
          </div>
        )}
        {result && (
          <span style={{ fontSize: '11px', color: '#3daa7c', fontWeight: 700 }}>
            ✓ {result.created} assets in Content Pipeline → Ready to Publish
          </span>
        )}
        <button onClick={generate} disabled={generating || totalPieces === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: (generating || totalPieces === 0) ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '12px', background: totalPieces === 0 ? 'var(--border)' : 'var(--purple)', color: '#fff', opacity: (generating && totalPieces > 0) ? 0.7 : 1, fontFamily: 'inherit' }}>
          {generating ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={13} /> Generate {totalPieces > 0 ? totalPieces : ''} Assets</>}
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const qBtnSt: React.CSSProperties = {
  width: '22px', height: '22px', borderRadius: '6px', border: '1px solid var(--border)',
  background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text)',
}
