'use client'
import { useState, useRef, useEffect } from 'react'
import { Loader2, Send, Paperclip, X } from 'lucide-react'
import CommanderModal from './CommanderModal'
import { parseReceipts, receiptLine, withReceipts, shredRequest, announceDataChanged, type CommanderReceipt } from '@/lib/commanderActions'

type Attach = { url: string; type: string; name: string }
type Msg = { role: 'user' | 'assistant'; content: string; receipts?: CommanderReceipt[]; attach?: Attach | null }

const STORAGE_KEY = 'rise-commander-chat-v1'
const GREETING = "I'm here. What are we working on? Drop an image, a video, an idea — or just talk it through with me. Tell me to save it to a card, store it, or tear it up across accounts — you'll see a receipt for everything I actually do."

export default function CommanderChat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attach, setAttach] = useState<Attach | null>(null)
  const [uploading, setUploading] = useState(false)
  const [shredInput, setShredInput] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p)) setMessages(p) } } catch { /* fresh */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))) } catch { /* non-fatal */ }
    // Scroll ONLY inside the chat's message list — never the page. scrollIntoView
    // was yanking the whole window down so Mandi landed below the chat and had to
    // scroll back up; setting the list's own scrollTop keeps the page put.
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
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
        // Earlier receipts ride along as short text so "edit that card" has its id.
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.role === 'assistant' ? withReceipts(m.content, m.receipts) : m.content })), attachment: sentAttach }),
      })
      const d = await res.json()
      // The tools already ran on the server. Receipts are what actually happened.
      const receipts = parseReceipts(d.receipts)
      const fallback = d.error ? `⚠ ${d.error}` : receipts.length ? '' : '⚠ No reply came back and nothing was done — say that again?'
      setMessages(m => [...m, { role: 'assistant', content: d.reply || fallback, receipts, attach: sentAttach }])
      announceDataChanged(receipts)
      // shred creates nothing on its own — it opens the cross-account preview.
      const shred = shredRequest(receipts)
      if (shred !== null) setShredInput(shred)
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection hiccup — try that once more.' }])
    } finally { setLoading(false) }
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
          <button onClick={() => { setMessages([]); try { localStorage.removeItem(STORAGE_KEY) } catch {} }}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-subtle)', fontSize: '11px', fontWeight: 700, padding: '4px 9px', cursor: 'pointer' }}>New chat</button>
        )}
      </div>

      <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={bubble('assistant')}>{GREETING}</div>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            {(m.content || m.attach) && <div style={{ ...bubble(m.role), maxWidth: '100%' }}>
              {m.attach && (
                m.attach.type?.startsWith('image')
                  ? <img src={m.attach.url} alt={m.attach.name} title={m.attach.name} onClick={() => window.open(m.attach!.url, '_blank')}
                      style={{ display: 'block', maxWidth: '180px', maxHeight: '180px', borderRadius: '10px', marginBottom: m.content ? '6px' : 0, cursor: 'zoom-in', objectFit: 'cover' }} />
                  : <div style={{ fontSize: '11px', opacity: 0.85, marginBottom: m.content ? '5px' : 0 }}>📎 {m.attach.name}</div>
              )}
              {m.content}
            </div>}
            {m.receipts && m.receipts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {m.receipts.map((r, ri) => (
                  <div key={ri} style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.45, padding: '6px 10px', borderRadius: '9px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: `1px solid ${r.ok ? 'rgba(61,170,124,0.45)' : 'rgba(224,82,82,0.45)'}`, background: r.ok ? '#EAF7F0' : 'rgba(224,82,82,0.08)', color: r.ok ? '#2E8B60' : '#C0392B' }}>
                    {receiptLine(r)}
                  </div>
                ))}
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
          {attach.type?.startsWith('image') ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={attach.url} alt={attach.name} title={attach.name} style={{ maxWidth: '84px', maxHeight: '84px', borderRadius: '10px', objectFit: 'cover', display: 'block', border: '1px solid var(--border)' }} />
              <button onClick={() => setAttach(null)} title="Remove" style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: 'var(--purple)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
            </div>
          ) : (
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)', background: 'var(--purple-light)', borderRadius: '8px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              📎 {attach.name}
              <button onClick={() => setAttach(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple)', padding: 0, display: 'flex' }}><X size={12} /></button>
            </span>
          )}
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
          placeholder="Talk to me, or drop something in… (Shift+Enter for a new line)"
          rows={4}
          style={{ flex: 1, resize: 'vertical', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', lineHeight: 1.5, minHeight: '96px', maxHeight: '300px', outline: 'none' }} />
        <button onClick={send} disabled={loading || (!input.trim() && !attach)}
          style={{ padding: '10px 14px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', cursor: loading || (!input.trim() && !attach) ? 'default' : 'pointer', opacity: (!input.trim() && !attach) ? 0.5 : 1, display: 'flex', alignItems: 'center', fontWeight: 800 }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </div>

      {shredInput !== null && <CommanderModal input={shredInput} onClose={() => setShredInput(null)} />}
    </div>
  )
}
