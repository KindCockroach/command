'use client'
import { useState, useRef, useEffect } from 'react'
import { Loader2, Send, Paperclip, X } from 'lucide-react'
import CommanderModal from './CommanderModal'

type Action = { type: string; label: string; payload: Record<string, string> }
type Attach = { url: string; type: string; name: string }
type Msg = { role: 'user' | 'assistant'; content: string; actions?: Action[]; attach?: Attach | null }

const STORAGE_KEY = 'rise-commander-chat-v1'
const GREETING = "I'm here. What are we working on? Drop an image, a video, an idea — or just talk it through with me. Tell me to store it, sort it, or tear it up across accounts, and I'll do it."

export default function CommanderChat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attach, setAttach] = useState<Attach | null>(null)
  const [uploading, setUploading] = useState(false)
  const [actStatus, setActStatus] = useState<Record<string, string>>({})
  const [shredInput, setShredInput] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p)) setMessages(p) } } catch { /* fresh */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))) } catch { /* non-fatal */ }
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const upload = async (f: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('folder', f.type.startsWith('image') ? 'images' : f.type.startsWith('video') ? 'videos' : 'files')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (d.publicUrl) setAttach({ url: d.publicUrl, type: f.type, name: f.name })
    } catch { /* ignore */ } finally { setUploading(false) }
  }

  const send = async () => {
    const text = input.trim()
    if ((!text && !attach) || loading) return
    const userMsg: Msg = { role: 'user', content: text || (attach ? `(${attach.name})` : ''), attach }
    const next: Msg[] = [...messages, userMsg]
    setMessages(next); setInput(''); const sentAttach = attach; setAttach(null); setLoading(true)
    try {
      const res = await fetch('/api/commander/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })), attachment: sentAttach }),
      })
      const d = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: d.reply || d.error || 'Something glitched — say that again?', actions: Array.isArray(d.actions) ? d.actions : [] }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection hiccup — try that once more.' }])
    } finally { setLoading(false) }
  }

  const runAction = async (key: string, a: Action) => {
    if (a.type === 'shred') { setShredInput(a.payload.input || ''); setActStatus(s => ({ ...s, [key]: '🔱 opened' })); return }
    setActStatus(s => ({ ...s, [key]: '…' }))
    try {
      if (a.type === 'store_note') {
        const r = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: a.payload.title || 'Note', body: a.payload.body || '', category: 'idea', tags: ['commander'] }) })
        setActStatus(s => ({ ...s, [key]: r.ok ? '✓ Saved to Notes' : 'failed' }))
      } else if (a.type === 'create_task') {
        const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: a.payload.title, notes: a.payload.notes || '', priority: a.payload.priority || 'medium', due_date: a.payload.due_date || null }) })
        setActStatus(s => ({ ...s, [key]: r.ok ? '✓ Task added' : 'failed' }))
      } else if (a.type === 'compose_post') {
        const r = await fetch('/api/river', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: a.payload.brief, accountId: a.payload.account_id, source: 'commander-chat' }) })
        const d = await r.json()
        setActStatus(s => ({ ...s, [key]: r.ok && d.piece ? `✓ Composed for ${d.account?.handle ?? a.payload.account_id} — approve in Accounts` : 'couldn\'t compose' }))
      } else {
        setActStatus(s => ({ ...s, [key]: 'unknown action' }))
      }
    } catch { setActStatus(s => ({ ...s, [key]: 'failed — try again' })) }
  }

  const bubble = (role: 'user' | 'assistant') => ({
    maxWidth: '82%', padding: '10px 13px',
    borderRadius: role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    background: role === 'user' ? 'var(--purple)' : 'var(--surface-raised)',
    color: role === 'user' ? '#fff' : 'var(--text)',
    fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap' as const,
    alignSelf: role === 'user' ? 'flex-end' as const : 'flex-start' as const,
  })

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '440px', maxHeight: '640px' }}
      onDragOver={e => { e.preventDefault() }}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) upload(f) }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '9px', background: 'var(--purple-light)' }}>
        <span style={{ fontSize: '18px' }}>⚡</span>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>The Commander</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Your partner behind the whole station · Claude Fable 5</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setActStatus({}); try { localStorage.removeItem(STORAGE_KEY) } catch {} }}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-subtle)', fontSize: '11px', fontWeight: 700, padding: '4px 9px', cursor: 'pointer' }}>New chat</button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={bubble('assistant')}>{GREETING}</div>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <div style={{ ...bubble(m.role), maxWidth: '100%' }}>
              {m.attach && <div style={{ fontSize: '11px', opacity: 0.85, marginBottom: m.content ? '5px' : 0 }}>📎 {m.attach.name}</div>}
              {m.content}
            </div>
            {m.actions && m.actions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {m.actions.map((a, ai) => {
                  const key = `${i}-${ai}`
                  const st = actStatus[key]
                  const done = st && st !== '…'
                  return (
                    <button key={ai} onClick={() => runAction(key, a)} disabled={st === '…' || (!!done && st.startsWith('✓'))}
                      style={{ fontSize: '12px', fontWeight: 700, padding: '6px 11px', borderRadius: '9px', border: '1px solid var(--purple)', cursor: st === '…' ? 'default' : 'pointer', background: done && st.startsWith('✓') ? '#EAF7F0' : 'var(--surface)', color: done && st.startsWith('✓') ? '#2E8B60' : 'var(--purple)' }}>
                      {st === '…' ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite', display: 'inline', verticalAlign: 'middle' }} /> working…</> : done ? st : a.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ ...bubble('assistant'), display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)' }}>
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {attach && (
        <div style={{ padding: '8px 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', background: 'var(--purple-light)', borderRadius: '8px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            📎 {attach.name}
            <button onClick={() => setAttach(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple)', padding: 0, display: 'flex' }}><X size={12} /></button>
          </span>
        </div>
      )}

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach an image, video, or file"
          style={{ padding: '10px', background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={14} />}
        </button>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Talk to me, or drop something in… (Enter to send)"
          rows={1}
          style={{ flex: 1, resize: 'none', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '120px', outline: 'none' }} />
        <button onClick={send} disabled={loading || (!input.trim() && !attach)}
          style={{ padding: '10px 14px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', cursor: loading || (!input.trim() && !attach) ? 'default' : 'pointer', opacity: (!input.trim() && !attach) ? 0.5 : 1, display: 'flex', alignItems: 'center', fontWeight: 800 }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </div>

      {shredInput !== null && <CommanderModal input={shredInput} onClose={() => setShredInput(null)} />}
    </div>
  )
}
