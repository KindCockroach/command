'use client'
import { useState, useRef } from 'react'
import { Loader2, Send, Waves, CheckCheck, ImageIcon, X } from 'lucide-react'
import { AGENT_META } from '@/lib/agents'
import type { GPTRole } from '@/lib/agents'

// Map a label the CEO might name → role, for the "route to X" button
const LABEL_TO_ROLE: Record<string, GPTRole> = Object.fromEntries(
  (Object.keys(AGENT_META) as GPTRole[]).map(r => [AGENT_META[r].label.toLowerCase(), r])
)
function parseRoute(text: string): { role: GPTRole; why: string } | null {
  const m = text.match(/🔀\s*Route:\s*([^\n—-]+)[—-]\s*([^\n]+)/i)
  if (!m) return null
  const role = LABEL_TO_ROLE[m[1].trim().toLowerCase()]
  return role ? { role, why: m[2].trim() } : null
}

const AGENTS: { role: GPTRole; color: string }[] = [
  { role: 'anchor',           color: '#E05252' },
  { role: 'ceo',              color: '#C9956A' },
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
  const [active, setActive] = useState<GPTRole | null>(() => {
    // Arrived via "Talk to your CEO" (or similar) handoff?
    if (typeof window !== 'undefined') {
      const handoff = localStorage.getItem('station-open-agent')
      if (handoff) { localStorage.removeItem('station-open-agent'); return handoff as GPTRole }
    }
    return null
  })
  const [msg, setMsg] = useState(() => {
    // Handed a repair prompt / question from another tab? Pre-fill it, ready to send.
    if (typeof window !== 'undefined') {
      const pre = localStorage.getItem('station-agent-prefill')
      if (pre) { localStorage.removeItem('station-agent-prefill'); return pre }
    }
    return ''
  })
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const convNoteId = useRef<number | null>(null)

  const loadImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => { if (e.target?.result) setPendingImage(e.target.result as string) }
    reader.readAsDataURL(file)
  }
  const [riverIdx, setRiverIdx] = useState<number | null>(null)   // message currently being sent
  const [riverDone, setRiverDone] = useState<Record<number, string>>({})

  const sendToRiver = async (i: number, text: string) => {
    setRiverIdx(i)
    try {
      const res = await fetch('/api/river', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `FROM ${active ? AGENT_META[active].label : 'assistant'} CONVERSATION:\n\n${text}`, source: 'assistants' }),
      })
      const d = await res.json()
      setRiverDone(prev => ({
        ...prev,
        [i]: d.complete && d.account ? `✓ Filed under ${d.account.emoji} ${d.account.handle}`
          : d.account ? `Sorted to ${d.account.handle} — needs: ${(d.open_questions ?? []).join(' · ') || 'detail'}`
          : d.error ? 'River error' : 'Filed to pipeline',
      }))
    } catch {
      setRiverDone(prev => ({ ...prev, [i]: 'Connection failed' }))
    } finally {
      setRiverIdx(null)
    }
  }

  const send = async () => {
    if ((!msg.trim() && !pendingImage) || !active) return
    const userMsg = msg.trim(); setMsg('')
    const image = pendingImage; setPendingImage(null)
    setHistory(h => [...h, { role: 'user', text: userMsg || '(image)' }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat', role: active, message: userMsg, image, history: history.slice(-12).map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.text })) }) })
      const data = await res.json()
      const reply = data.result ?? data.error ?? 'No response'
      setHistory(h => { const next = [...h, { role: 'ai' as const, text: reply }]; logConversation(userMsg, next); return next })
    } finally { setLoading(false) }
  }

  // Log this agent conversation to Notes (one growing note per agent session)
  const logConversation = async (firstUser: string, turns: { role: 'user' | 'ai'; text: string }[]) => {
    if (!active) return
    const body = `${AGENT_META[active].label} conversation\n\n` + turns.map(t => `${t.role === 'ai' ? AGENT_META[active].label : 'You'}: ${t.text}`).join('\n\n')
    try {
      if (convNoteId.current) {
        await fetch('/api/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: convNoteId.current, body }) })
      } else {
        const res = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `💬 ${AGENT_META[active].label}: ${firstUser.slice(0, 40)}`, body, category: 'idea', tags: ['conversation', active] }) })
        const n = await res.json()
        convNoteId.current = n.id
      }
    } catch { /* best-effort */ }
  }

  const openAgent = (role: GPTRole) => {
    if (active !== role) { setHistory([]); setMsg(''); convNoteId.current = null }
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
                  {/* CEO routing suggestion → one-click switch */}
                  {m.role === 'ai' && (() => {
                    const r = parseRoute(m.text)
                    return r ? (
                      <button onClick={() => openAgent(r.role)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                        {AGENT_META[r.role].emoji} Continue with {AGENT_META[r.role].label} →
                      </button>
                    ) : null
                  })()}
                </div>
                {m.role === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <button onClick={() => sendToRiver(i, m.text)} disabled={riverIdx === i || !!riverDone[i]}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: riverDone[i] ? '#E8F7F1' : 'transparent', fontSize: '10px', fontWeight: 700, cursor: riverDone[i] ? 'default' : 'pointer', color: riverDone[i] ? '#3DAA7C' : 'var(--text-muted)' }}>
                      {riverIdx === i ? <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Sorting…</>
                        : riverDone[i] ? <><CheckCheck size={10} /> {riverDone[i]}</>
                        : <><Waves size={10} /> Send to River</>}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px' }}>
                <Loader2 size={14} color="var(--hot-pink)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = Array.from(e.dataTransfer.files).find(x => x.type.startsWith('image/')); if (f) loadImage(f) }}
            style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: dragging ? 'rgba(107,45,110,0.06)' : 'transparent' }}>
            {pendingImage && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: '4px 6px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <img src={pendingImage} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '5px' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>image attached</span>
                <button onClick={() => setPendingImage(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px', display: 'flex' }}><X size={12} /></button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => fileRef.current?.click()} title="Attach image" style={{ padding: '9px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-muted)', alignSelf: 'flex-end', display: 'flex' }}>
                <ImageIcon size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) loadImage(f); e.target.value = '' }} />
              <textarea value={msg} onChange={e => setMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                onPaste={e => { const f = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile(); if (f) { e.preventDefault(); loadImage(f) } }}
                placeholder={`Ask your ${AGENT_META[active].label}... (drop or paste an image)`} rows={2}
                style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', resize: 'none', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
              <button onClick={send} disabled={loading || (!msg.trim() && !pendingImage)} style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: (msg.trim() || pendingImage) ? 'var(--hot-pink)' : 'var(--border)', color: '#fff', cursor: (msg.trim() || pendingImage) ? 'pointer' : 'not-allowed', fontWeight: 700, alignSelf: 'flex-end' }}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
