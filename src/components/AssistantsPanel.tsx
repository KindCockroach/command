'use client'
import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { AGENT_META } from '@/lib/agents'
import type { GPTRole } from '@/lib/agents'

const AGENTS: { role: GPTRole; color: string }[] = [
  { role: 'future_her',       color: '#7c3aed' },
  { role: 'strategist',       color: '#e8448a' },
  { role: 'content_director', color: '#f2a65a' },
  { role: 'operator',         color: '#3daa7c' },
  { role: 'healing',          color: '#5a4fcf' },
  { role: 'client_offer',     color: '#0ea5e9' },
  { role: 'research',         color: '#64748b' },
  { role: 'cfo',              color: '#d97706' },
  { role: 'contrarian',       color: '#e05' },
]

export default function AssistantsPanel() {
  const [active, setActive] = useState<GPTRole | null>(null)
  const [msg, setMsg] = useState('')
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!msg.trim() || !active) return
    const userMsg = msg.trim(); setMsg('')
    setHistory(h => [...h, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat', role: active, message: userMsg }) })
      const data = await res.json()
      setHistory(h => [...h, { role: 'ai', text: data.result ?? data.error ?? 'No response' }])
    } finally { setLoading(false) }
  }

  const openAgent = (role: GPTRole) => {
    if (active !== role) { setHistory([]); setMsg('') }
    setActive(role)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Agentic Assistants</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Your executive table. Each one knows you, your mission, and your voice.</p>
      </div>

      {/* Agent grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {AGENTS.map(({ role, color }) => {
          const meta = AGENT_META[role]
          const isActive = active === role
          return (
            <button key={role} onClick={() => openAgent(role)}
              style={{ background: isActive ? `${color}15` : 'var(--surface)', border: `1px solid ${isActive ? color : 'var(--border)'}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{meta.emoji}</div>
              <p style={{ fontSize: '13px', fontWeight: 800, color: isActive ? color : 'var(--text)', marginBottom: '3px' }}>{meta.label}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{meta.desc}</p>
              <p style={{ fontSize: '10px', color: color, marginTop: '6px', opacity: 0.8, fontStyle: 'italic' }}>"{meta.route_when}"</p>
            </button>
          )
        })}
      </div>

      {/* Chat area */}
      {active && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--navy)' }}>
            <span style={{ fontSize: '18px' }}>{AGENT_META[active].emoji}</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{AGENT_META[active].label}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{AGENT_META[active].desc}</p>
            </div>
          </div>

          <div style={{ minHeight: '220px', maxHeight: '380px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px', opacity: 0.5 }}>Say something. Your {AGENT_META[active].label} is ready.</p>
            )}
            {history.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ fontSize: '13px', lineHeight: 1.7, padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'var(--hot-pink)' : 'var(--bg)', color: m.role === 'user' ? '#fff' : 'var(--text)', border: m.role === 'ai' ? '1px solid var(--border)' : 'none', whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px' }}>
                <Loader2 size={14} color="var(--hot-pink)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={`Ask your ${AGENT_META[active].label}...`} rows={2}
              style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', resize: 'none', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
            <button onClick={send} disabled={loading || !msg.trim()} style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: msg.trim() ? 'var(--hot-pink)' : 'var(--border)', color: '#fff', cursor: msg.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, alignSelf: 'flex-end' }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
