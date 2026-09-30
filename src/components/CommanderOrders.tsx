'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ArrowRight, Sparkles, MessageCircle, Send, Loader2 } from 'lucide-react'

type Move = { title: string; why: string; where?: string }
type Orders = { generated_at: string; doing: string[]; your_move: Move[] }

// "Your move" — the Commander commanding Mandi back. She runs RISE autonomously and
// tells Mandi the human-only next actions, ranked by cash impact. Cached once/day.
export default function CommanderOrders() {
  const [orders, setOrders] = useState<Orders | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState('')
  // Ask the Commander about a specific move (bidirectional — she commands, you question back).
  const [askIdx, setAskIdx] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [askBusy, setAskBusy] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  // Check items off as you do them. DURABLE (not per-day) + told to the server so
  // the Commander never re-suggests a task you've already handled, even reworded.
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  useEffect(() => { try { const s = localStorage.getItem('rise-yourmove-checked'); if (s) setChecked(JSON.parse(s)) } catch { /* fresh */ } }, [])
  const toggleChecked = (title: string) => setChecked(c => {
    const nowDone = !c[title]
    const n = { ...c, [title]: nowDone }
    try { localStorage.setItem('rise-yourmove-checked', JSON.stringify(n)) } catch { /* ok */ }
    fetch('/api/commander/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nowDone ? { done: title } : { undone: title }) }).catch(() => {})
    return n
  })

  const ask = async (m: Move, idx: number) => {
    if (!q.trim()) return
    setAskBusy(true)
    const msg = `In today's "Your Move" briefing you told me: "${m.title}" — ${m.why}${m.where ? ` (where: ${m.where})` : ''}.\n\nMy question: ${q.trim()}`
    try {
      const d = await fetch('/api/commander/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: msg }] }) }).then(r => r.json())
      setAnswers(a => ({ ...a, [idx]: d.reply || d.error || 'No answer came back — try asking in the Commander tab.' }))
    } catch { setAnswers(a => ({ ...a, [idx]: 'Connection error — try again.' })) }
    setAskBusy(false); setQ('')
  }

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true)
    fetch(`/api/commander/orders${refresh ? '?refresh=1' : ''}`)
      .then(r => r.json())
      .then(d => { if (d.orders) setOrders(d.orders); else setErr(d.error || 'Could not brief right now') })
      .catch(() => setErr('Connection error'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="rise-magic" style={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'linear-gradient(160deg, var(--surface), var(--surface-raised))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '18px' }}>⚡</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.01em' }}>Your move</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Your ranked priorities right now — projects, content &amp; money, highest-impact first</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing || loading} title="Re-brief now"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
          <RefreshCw size={12} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} /> {refreshing ? 'Thinking…' : 'Re-brief'}
        </button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>The Commander is reading your station…</p>}
        {!loading && err && <p style={{ fontSize: '12px', color: '#E0912F' }}>{err}</p>}

        {orders && (
          <>
            {/* YOUR MOVE — the human-only actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {orders.your_move.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Nothing blocking you right now — I&apos;m handling it. Keep the ideas coming. 🌊</p>
              )}
              {orders.your_move.map((m, i) => {
                const done = !!checked[m.title]
                return (
                <div key={i} style={{ display: 'flex', gap: '11px', padding: '11px 12px', borderRadius: '12px', background: 'var(--surface)', border: `1px solid ${done ? 'var(--border)' : i === 0 ? 'var(--purple)' : 'var(--border)'}`, boxShadow: !done && i === 0 ? 'var(--shadow-sm)' : 'none', opacity: done ? 0.55 : 1, transition: 'opacity .15s' }}>
                  <button onClick={() => toggleChecked(m.title)} title={done ? 'Mark not done' : 'Check off — done'}
                    style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '8px', border: done ? 'none' : `2px solid ${i === 0 ? 'var(--purple)' : 'var(--border)'}`, background: done ? '#2E8B60' : 'transparent', color: done ? '#fff' : i === 0 ? 'var(--purple)' : 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}>{done ? '✓' : i + 1}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none' }}>{m.title}</p>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.45, marginTop: '2px' }}>{m.why}</p>
                    {m.where && <p style={{ fontSize: '10.5px', color: 'var(--purple)', fontWeight: 700, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowRight size={11} /> {m.where}</p>}

                    {/* Ask the Commander about this move */}
                    <button onClick={() => { setAskIdx(askIdx === i ? null : i); setQ('') }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '7px', padding: '4px 9px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '10.5px', cursor: 'pointer' }}>
                      <MessageCircle size={11} /> {askIdx === i ? 'Cancel' : 'Ask about this'}
                    </button>

                    {askIdx === i && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '7px' }}>
                        <input value={q} onChange={e => setQ(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') ask(m, i) }}
                          placeholder="e.g. what exactly is this? is $97 right?"
                          style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12px', outline: 'none' }} />
                        <button onClick={() => ask(m, i)} disabled={askBusy || !q.trim()}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 11px', borderRadius: '9px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: askBusy || !q.trim() ? 'default' : 'pointer', opacity: askBusy || !q.trim() ? 0.6 : 1 }}>
                          {askBusy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
                        </button>
                      </div>
                    )}
                    {answers[i] && (
                      <div style={{ marginTop: '8px', padding: '10px 11px', borderRadius: '10px', background: 'var(--purple-light)', borderLeft: '3px solid var(--purple)' }}>
                        <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--purple)', marginBottom: '3px' }}>⚡ The Commander</p>
                        <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{answers[i]}</p>
                      </div>
                    )}
                  </div>
                </div>
                )
              })}
            </div>

            {/* WHAT I'M HANDLING — the calm reassurance */}
            {orders.doing.length > 0 && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '11px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}><Sparkles size={11} /> I&apos;m handling</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {orders.doing.map((d, i) => (
                    <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45, display: 'flex', gap: '7px' }}><span style={{ color: '#2E8B60' }}>✓</span> {d}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
