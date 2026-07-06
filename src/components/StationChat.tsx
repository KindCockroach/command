'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles, Paperclip, Image as ImageIcon } from 'lucide-react'

interface Message {
  role: 'user' | 'ai'
  text: string
  image?: string // base64 data URL
  ts: number
}

const STATION_PROMPT = `You are the RISE Station AI — the central intelligence of Mandi Beck's content and business operating system.

WHO YOU ARE: A brilliant, warm, direct AI advisor who knows everything about Mandi's business and speaks like a trusted partner, not a tool. You are powered by her Command Center and you have full context on her world.

WHO MANDI IS: Mom of 4, AI Mom brand, building an AI-powered content empire during nap times. She runs aiworksforyou.co, has 5 AI avatar accounts (Mandi/AI Mom 🎈, Evra Scales the gator 🐊, Luna 🌙, Max ⚡, Sage 🪴), a podcast, and a Command Center called RISE Station. Her voice is warm, bold, direct, plain English.

YOUR JOB IN THIS CHAT:
- Answer any question about her business, content, avatars, or strategy
- Generate content on demand (scripts, hooks, captions, emails)
- Help her think through decisions
- Route tasks and ideas when she describes them
- Be genuinely useful in under 3 sentences when possible — she's busy

RULES:
- Never be corporate or robotic
- Match her energy — if she's excited, be excited. If she needs clarity, be clear.
- Always offer a next step
- If she drops a link or idea, immediately tell her what to do with it`

export default function StationChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hey Mandi 👋 I'm your RISE Station AI. Drop an idea, image, or ask me anything.", ts: Date.now() }
  ])
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  const loadImage = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => setPendingImage(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) loadImage(file)
  }, [loadImage])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) { const file = item.getAsFile(); if (file) loadImage(file) }
  }, [loadImage])

  const send = async () => {
    if ((!input.trim() && !pendingImage) || loading) return
    const text = input.trim()
    const image = pendingImage
    setInput('')
    setPendingImage(null)
    setMessages(m => [...m, { role: 'user', text: text || '(image)', image: image ?? undefined, ts: Date.now() }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'strategist',
          message: text || 'Please analyze this image and tell me what you see and how it relates to my business.',
          image,
          systemOverride: STATION_PROMPT,
          history: messages.slice(-12).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
        }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'ai', text: data.result ?? data.error ?? 'Something went wrong — try again.', ts: Date.now() }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Connection issue — check your Railway env variables are set.', ts: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 200, width: '52px', height: '52px', borderRadius: '50%', background: 'var(--purple)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(107,45,110,0.4)', transition: 'all 0.2s', color: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{ position: 'fixed', bottom: '88px', right: '24px', zIndex: 199, width: '360px', maxHeight: '540px', background: 'var(--surface)', border: `2px solid ${dragging ? 'var(--purple)' : 'var(--border)'}`, borderRadius: '18px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'border-color 0.15s' }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} style={{ color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>RISE Station</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Drop images · Paste screenshots · Ask anything</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>

          {/* Drag overlay */}
          {dragging && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(107,45,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ textAlign: 'center', color: 'var(--purple)' }}>
                <ImageIcon size={32} />
                <p style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>Drop image here</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? 'var(--purple)' : 'var(--surface-raised)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)', overflow: 'hidden' }}>
                  {m.image && <img src={m.image} alt="" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />}
                  {m.text !== '(image)' && <p style={{ padding: '10px 13px', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{m.text}</p>}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--surface-raised)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--purple)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Pending image preview */}
          {pendingImage && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg)' }}>
              <img src={pendingImage} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>Image ready to send</span>
              <button onClick={() => setPendingImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={13} /></button>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) loadImage(f); e.target.value = '' }} />
            <button onClick={() => fileRef.current?.click()} title="Attach image"
              style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pendingImage ? 'var(--purple)' : 'var(--text-muted)', flexShrink: 0 }}>
              <Paperclip size={14} />
            </button>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              onPaste={handlePaste}
              placeholder="Ask anything, drop or paste an image..."
              rows={1} style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', resize: 'none', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 }} />
            <button onClick={send} disabled={loading || (!input.trim() && !pendingImage)}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--purple)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: (!input.trim() && !pendingImage) ? 0.5 : 1, flexShrink: 0 }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
