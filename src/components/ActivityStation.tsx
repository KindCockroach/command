'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, RefreshCw, Moon, Send, MessageCircle, Search } from 'lucide-react'

// THE ACTIVITY STATION — the window into RISE while Mandi's away. A running, grouped
// feed of everything the station did (drops, transcripts, drafts, approvals, the
// weekly trend check-in), a "while you were away" summary, clickable event detail,
// and a chat so she can ask RISE about its own feed. This is how she watches it
// become agentic without being present.

type Ev = { id: number; ts: string; type: string; title: string; detail?: string; icon?: string; source?: string; account_id?: string | null; content_id?: number | null }
type Msg = { role: 'user' | 'assistant'; content: string }

const TYPE_TINT: Record<string, string> = {
  drop: '#5A4FCF', transcribed: '#2B9CC4', post_created: '#7C3AED', post_approved: '#2E8B60',
  trend_checkin: '#C2477E', note: '#C9956A', daily_draft: '#3daa7c', published: '#2E8B60',
}
const tint = (t: string) => TYPE_TINT[t] ?? 'var(--border)'

function rel(ts: string): string {
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}
function dayKey(ts: string): string {
  const d = new Date(ts), now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActivityStation() {
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<number | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [asking, setAsking] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)
  // Hashtag scout
  const [tag, setTag] = useState('')
  const [scouting, setScouting] = useState(false)
  const [scout, setScout] = useState<{ tag: string; bestBet?: string; digest: string } | null>(null)
  const [scoutErr, setScoutErr] = useState('')

  const load = useCallback(() => {
    fetch('/api/activity?limit=200').then(r => r.json())
      .then(d => setEvents(Array.isArray(d.events) ? [...d.events].reverse() : []))  // newest first
      .catch(() => {}).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest' }) }, [msgs, asking])

  // "While you were away" — the last 24h, counted by kind.
  const since = Date.now() - 24 * 3600000
  const recent = events.filter(e => new Date(e.ts).getTime() >= since)
  const counts = recent.reduce((m, e) => { m[e.type] = (m[e.type] ?? 0) + 1; return m }, {} as Record<string, number>)
  const LABELS: Record<string, string> = { post_created: 'posts drafted', post_approved: 'approved', published: 'published', transcribed: 'transcribed', drop: 'drops', trend_checkin: 'trend check-in', daily_draft: 'daily draft', note: 'notes saved' }
  const summary = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n} ${LABELS[t] ?? t.replace(/_/g, ' ')}`)

  // Group the feed by day.
  const groups: { day: string; items: Ev[] }[] = []
  for (const e of events) {
    const k = dayKey(e.ts)
    const g = groups.find(x => x.day === k)
    if (g) g.items.push(e); else groups.push({ day: k, items: [e] })
  }

  const ask = async () => {
    const text = q.trim()
    if (!text || asking) return
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next); setQ(''); setAsking(true)
    // Give the Commander the recent feed as context (invisible), then her question.
    const digest = events.slice(0, 40).map(e => `${rel(e.ts)} · ${e.title}${e.detail ? ` — ${e.detail}` : ''}`).join('\n')
    const sent = next.map((m, i) => i === next.length - 1
      ? { role: m.role, content: `${m.content}\n\n(RISE ACTIVITY FEED FOR CONTEXT — this is what you've been doing:\n${digest}\n)` }
      : { role: m.role, content: m.content })
    try {
      const d = await fetch('/api/commander/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: sent }) }).then(r => r.json())
      setMsgs(m => [...m, { role: 'assistant', content: d.reply || d.error || 'Say that again?' }])
    } catch { setMsgs(m => [...m, { role: 'assistant', content: 'Connection hiccup — try again.' }]) }
    setAsking(false)
  }

  const runScout = async () => {
    const t = tag.trim().replace(/^#/, '')
    if (!t || scouting) return
    setScouting(true); setScout(null); setScoutErr('')
    try {
      const d = await fetch('/api/trends/hashtag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: t }) }).then(r => r.json())
      if (d.error) setScoutErr(d.error)
      else { setScout({ tag: d.tag, bestBet: d.bestBet, digest: d.digest }); load() }
    } catch { setScoutErr('The scout timed out — try a narrower tag, or try again.') }
    setScouting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1, background: 'linear-gradient(115deg, #5A4FCF, #2B9CC4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Activity</h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>What RISE has been doing — while you were away, and right now.</p>
        </div>
        <button onClick={load} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '9px 13px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} /> Refresh
        </button>
      </div>

      {/* While you were away */}
      <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'linear-gradient(150deg, var(--purple-light), transparent)', padding: '15px 17px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: summary.length ? '8px' : 0 }}>
          <Moon size={15} color="var(--purple)" />
          <p style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>While you were away (last 24h)</p>
        </div>
        {summary.length
          ? <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>RISE handled <strong>{summary.join(' · ')}</strong>.</p>
          : <p style={{ fontSize: '12.5px', color: 'var(--text-subtle)' }}>Quiet the last day — nothing new logged. Drop something in or let the schedulers run.</p>}
      </div>

      {/* Hashtag scout — point RISE at a tag, get plug-and-play skeletons + film-this calls */}
      <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
          <Search size={15} color="var(--purple)" />
          <p style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>Scout a hashtag</p>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>what&apos;s trending → skeletons to adlib + shoots only you can film</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={tag} onChange={e => setTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') runScout() }}
            placeholder="#healingjourney"
            style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', outline: 'none' }} />
          <button onClick={runScout} disabled={scouting || !tag.trim()} className="rise-tactile" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: tag.trim() ? 'var(--purple)' : 'var(--border)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: tag.trim() ? 'pointer' : 'default' }}>
            {scouting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> scanning the web…</> : 'Scout'}
          </button>
        </div>
        {scouting && <p style={{ fontSize: '11.5px', color: 'var(--text-subtle)', marginTop: '8px' }}>Reading live trend reports — this takes a bit. Results save to Notes and feed your Format Studio + Commander.</p>}
        {scoutErr && <p style={{ fontSize: '12px', color: '#C2477E', marginTop: '8px' }}>{scoutErr}</p>}
        {scout && (
          <div style={{ marginTop: '11px', borderTop: '1px solid var(--border)', paddingTop: '11px' }}>
            {scout.bestBet && <p style={{ fontSize: '12.5px', color: 'var(--text)', marginBottom: '8px' }}><strong>Best bet:</strong> {scout.bestBet}</p>}
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{scout.digest}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '8px' }}>Saved to Notes as <strong>📡 {scout.tag}</strong> — skeletons are live in the Format Studio, the film-this calls go to your Commander.</p>
          </div>
        )}
      </div>

      {/* Ask RISE about its feed */}
      <div className="rise-float" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 15px', borderBottom: msgs.length ? '1px solid var(--border)' : 'none' }}>
          <MessageCircle size={15} color="var(--purple)" />
          <p style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>Ask RISE about its feed</p>
        </div>
        {msgs.length > 0 && (
          <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '9px 12px', borderRadius: m.role === 'user' ? '13px 13px 4px 13px' : '13px 13px 13px 4px', background: m.role === 'user' ? 'var(--purple)' : 'var(--surface-raised)', color: m.role === 'user' ? '#fff' : 'var(--text)', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
            ))}
            {asking && <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '12px' }}><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> thinking…</div>}
            <div ref={chatEnd} />
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 15px' }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }}
            placeholder="e.g. what did you draft last night? why that account?"
            style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', outline: 'none' }} />
          <button onClick={ask} disabled={asking || !q.trim()} className="rise-tactile" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 15px', borderRadius: '10px', border: 'none', background: q.trim() ? 'var(--purple)' : 'var(--border)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: q.trim() ? 'pointer' : 'default' }}>
            {asking ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
          </button>
        </div>
      </div>

      {/* The feed, grouped by day */}
      {loading && events.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', padding: '20px', justifyContent: 'center' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Reading the feed…</div>
      ) : events.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-subtle)', padding: '30px', textAlign: 'center', lineHeight: 1.6 }}>Nothing logged yet. As RISE drafts, transcribes, checks trends, and you approve posts — every move shows up here. 🌱</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groups.map(g => (
            <div key={g.day}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', marginBottom: '8px' }}>{g.day}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {g.items.map(e => (
                  <div key={e.id} onClick={() => setOpen(o => o === e.id ? null : e.id)}
                    className="rise-float" style={{ borderRadius: '12px', border: '1px solid var(--border)', borderLeft: `3px solid ${tint(e.type)}`, background: 'var(--surface)', padding: '11px 13px', cursor: (e.detail || e.content_id) ? 'pointer' : 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
                      <span style={{ fontSize: '17px', lineHeight: 1.2, flexShrink: 0 }}>{e.icon || '•'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>{e.title}</p>
                        {e.detail && open !== e.id && <p style={{ fontSize: '11.5px', color: 'var(--text-subtle)', lineHeight: 1.45, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</p>}
                        {open === e.id && e.detail && <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.55, marginTop: '5px', whiteSpace: 'pre-wrap' }}>{e.detail}</p>}
                        {open === e.id && (
                          <div style={{ display: 'flex', gap: '10px', marginTop: '7px', flexWrap: 'wrap' }}>
                            {e.source && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)' }}>via {e.source}</span>}
                            {e.account_id && <span style={{ fontSize: '10px', fontWeight: 700, color: tint(e.type) }}>{e.account_id}</span>}
                            {e.content_id && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)' }}>post #{e.content_id}</span>}
                            <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>{new Date(e.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-subtle)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }}>{rel(e.ts)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
