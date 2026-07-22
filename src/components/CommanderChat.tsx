'use client'
import { useState, useRef, useEffect } from 'react'
import { Loader2, Send } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }
const STORAGE_KEY = 'rise-commander-chat-v1'
const GREETING = "I'm here. What are we working on? Tell me what's on your plate — a decision, a mess to sort, a post to shape, or just think out loud with me."

export default function CommanderChat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) { const p = JSON.parse(saved); if (Array.isArray(p)) setMessages(p) }
    } catch { /* fresh start */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))) } catch { /* non-fatal */ }
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/commander/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) })
      const d = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: d.reply || d.error || 'Something glitched — say that again?' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection hiccup — try that once more.' }])
    } finally { setLoading(false) }
  }

  const bubble = (role: 'user' | 'assistant') => ({
    maxWidth: '82%',
    padding: '10px 13px',
    borderRadius: role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    background: role === 'user' ? 'var(--purple)' : 'var(--surface-raised)',
    color: role === 'user' ? '#fff' : 'var(--text)',
    fontSize: '13px',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap' as const,
    alignSelf: role === 'user' ? 'flex-end' as const : 'flex-start' as const,
  })

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '420px', maxHeight: '620px' }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '9px', background: 'var(--purple-light)' }}>
        <span style={{ fontSize: '18px' }}>⚡</span>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>The Commander</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Your partner behind the whole station · Claude Fable 5</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); try { localStorage.removeItem(STORAGE_KEY) } catch {} }}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-subtle)', fontSize: '11px', fontWeight: 700, padding: '4px 9px', cursor: 'pointer' }}>New chat</button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={bubble('assistant')}>{GREETING}</div>
        {messages.map((m, i) => <div key={i} style={bubble(m.role)}>{m.content}</div>)}
        {loading && (
          <div style={{ ...bubble('assistant'), display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)' }}>
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Talk to me… (Enter to send, Shift+Enter for a new line)"
          rows={1}
          style={{ flex: 1, resize: 'none', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '120px', outline: 'none' }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding: '10px 14px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', cursor: loading || !input.trim() ? 'default' : 'pointer', opacity: !input.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, fontSize: '13px' }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
