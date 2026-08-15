'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import type { ContentPiece, BrandAccount } from '@/lib/db'

type Msg = { role: 'user' | 'ai'; text: string }

// Purpose Commander Chat — talk to the Commander about ONE post to finish it.
// It answers, and it edits the post live (via /api/content/develop). The caption
// preview at the top updates as you go, so you watch the post come together.
export default function PostChat({ post, account, onClose, onChanged }: {
  post: ContentPiece
  account: BrandAccount | null
  onClose: () => void
  onChanged: (updated: ContentPiece) => void
}) {
  const [current, setCurrent] = useState<ContentPiece>(post)
  const openQ = current.open_questions ?? []
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'ai',
    text: `Let's finish "${post.title}"${account ? ` for ${account.handle}` : ''}. ` +
      (openQ.length
        ? `First — I need this from you: ${openQ.join(' · ')}`
        : `Tell me what to change, or just talk it through and I'll shape the copy as we go.`),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages, loading])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    const history = messages
    setMessages(m => [...m, { role: 'user', text: msg }])
    setInput(''); setLoading(true)
    try {
      const r = await fetch('/api/content/develop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: post.id, message: msg, history }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setMessages(m => [...m, { role: 'ai', text: d.reply ?? 'Done.' }])
        if (d.content) { setCurrent(d.content); onChanged(d.content) }
      } else {
        setMessages(m => [...m, { role: 'ai', text: `⚠ ${d.error ?? 'something went wrong'}` }])
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠ connection error — try again' }])
    } finally { setLoading(false) }
  }

  const bubble = (role: Msg['role']): React.CSSProperties => ({
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '85%', padding: '9px 12px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    background: role === 'user' ? 'var(--purple)' : 'var(--surface-raised)',
    color: role === 'user' ? '#fff' : 'var(--text)',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.6)', backdropFilter: 'blur(5px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '560px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', borderRadius: '18px', background: 'var(--surface)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '15px' }}>⚡</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Finish: {current.title}</p>
              {account && <p style={{ fontSize: '10px', fontWeight: 700, color: account.color }}>{account.emoji} {account.handle}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}><X size={17} /></button>
        </div>

        {/* Live caption preview */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', maxHeight: '150px', overflowY: 'auto', flexShrink: 0 }}>
          <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '3px' }}>Caption — updates as we talk</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{current.description || '(no caption yet)'}</p>
          {current.onscreen_text && <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '6px', whiteSpace: 'pre-wrap' }}>📱 {current.onscreen_text}</p>}
        </div>

        {/* Conversation */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {messages.map((m, i) => <div key={i} style={bubble(m.role)}>{m.text}</div>)}
          {loading && <div style={bubble('ai')}><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /></div>}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Answer, or tell me what to change… (Shift+Enter for a new line)"
            rows={2}
            style={{ flex: 1, resize: 'vertical', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', lineHeight: 1.5, minHeight: '48px', maxHeight: '180px', outline: 'none' }} />
          <button onClick={send} disabled={loading || !input.trim()}
            style={{ padding: '11px 14px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', cursor: loading || !input.trim() ? 'default' : 'pointer', opacity: !input.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', fontWeight: 800 }}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
