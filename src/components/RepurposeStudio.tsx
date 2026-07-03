'use client'
import { useState } from 'react'
import { Copy, CheckCheck, Zap, ChevronDown, ChevronUp, Loader2, Sparkles, Video, Mail, Pin, BookOpen, MessageSquare, Hash, Link2, FileText, Layout } from 'lucide-react'
import type { RepurposeOutput } from '@/lib/ai'
import ContentPreview from './ContentPreview'

// ── Copy button ──
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button onClick={copy} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--ready-color)' : 'var(--text-muted)', padding: '2px 4px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', transition: 'color 0.15s' }}>
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Section card ──
function Section({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${accent}` }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: accent, fontWeight: 700, fontSize: '13px' }}>
          {icon} {title}
        </div>
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>
      {open && <div style={{ padding: '0 18px 18px' }}>{children}</div>}
    </div>
  )
}

// ── Single item row ──
function Item({ text, sub }: { text: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '6px' }}>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{text}</p>
        {sub && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</p>}
      </div>
      <CopyBtn text={text} />
    </div>
  )
}

const PLATFORMS = ['Instagram Reels', 'TikTok', 'YouTube', 'Email', 'Pinterest', 'LinkedIn', 'X/Twitter', 'Newsletter', 'Stories']

export default function RepurposeStudio() {
  // Input state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [transcript, setTranscript] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [activeRole, setActiveRole] = useState<'strategist' | 'cfo' | 'operator' | 'contrarian' | 'content_director' | 'future_her'>('content_director')

  // Output state
  const [result, setResult] = useState<RepurposeOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false)

  // Chat state
  const [chatMsg, setChatMsg] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  // River state
  const [riverStatus, setRiverStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [riverMsg, setRiverMsg] = useState('')

  const fileToRiver = async () => {
    if (!result) return
    setRiverStatus('sending')
    try {
      const input = `REPURPOSED CONTENT PACKAGE — "${title || 'Untitled'}":\n\nCORE MESSAGE: ${result.summary}\n\nBEST CAPTION:\n${result.captions?.medium ?? result.captions?.short ?? ''}\n\nTOP REEL HOOK: ${result.reels_hooks?.[0] ?? ''}\n\nOFFER BRIDGE: ${result.offer_bridge ?? ''}`
      const res = await fetch('/api/river', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, source: 'repurpose' }),
      })
      const d = await res.json()
      setRiverMsg(d.complete && d.account ? `✓ Post-card filed under ${d.account.emoji} ${d.account.handle} — approve it in Accounts`
        : d.account ? `Sorted to ${d.account.handle} — needs: ${(d.open_questions ?? []).join(' · ') || 'detail'}` : d.error ? 'River error' : 'Filed to pipeline')
      setRiverStatus('done')
    } catch {
      setRiverMsg('Connection failed')
      setRiverStatus('done')
    }
  }

  const togglePlatform = (p: string) =>
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const handleRepurpose = async () => {
    if (!title && !transcript) { setError('Add at least a title or transcript.'); return }
    setError(''); setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'repurpose', title, description, notes, transcript, platforms: selectedPlatforms }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data.result)
    } catch {
      setError('Network error — check that the server is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleChat = async () => {
    if (!chatMsg.trim()) return
    const userMsg = chatMsg.trim()
    setChatMsg('')
    setChatHistory(h => [...h, { role: 'user', text: userMsg }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', role: activeRole, message: userMsg }),
      })
      const data = await res.json()
      setChatHistory(h => [...h, { role: 'ai', text: data.result ?? data.error ?? 'No response' }])
    } catch {
      setChatHistory(h => [...h, { role: 'ai', text: 'Error — check API key.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const ROLES = [
    { id: 'content_director' as const, label: 'Content Director', emoji: '🎙️', desc: 'Podcast, social, hooks, copy' },
    { id: 'strategist' as const,       label: 'Strategist',       emoji: '🗺️', desc: 'Big picture & sequencing' },
    { id: 'cfo' as const,              label: 'CFO',              emoji: '💰', desc: 'Money, ROI, cash flow' },
    { id: 'operator' as const,         label: 'Operator',         emoji: '⚙️', desc: 'Tasks, timelines, execution' },
    { id: 'contrarian' as const,       label: 'Contrarian',       emoji: '🔥', desc: 'Hard truth, blind spots' },
    { id: 'future_her' as const,       label: 'Future Her',       emoji: '🔮', desc: 'Legacy, perspective, long view' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>← Pipeline</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>🎙 Repurpose Studio</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--hot-pink)', background: 'rgba(232,68,138,0.15)', padding: '2px 8px', borderRadius: '20px' }}>1 → 30</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {ROLES.map(r => (
            <button key={r.id} onClick={() => setActiveRole(r.id)}
              style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', border: activeRole === r.id ? '1px solid var(--hot-pink)' : '1px solid rgba(255,255,255,0.12)', background: activeRole === r.id ? 'rgba(232,68,138,0.2)' : 'transparent', color: activeRole === r.id ? 'var(--hot-pink)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr 340px', gap: 0, maxHeight: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* ── LEFT: Input panel ── */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--surface)' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)', marginBottom: '12px' }}>Content Input</p>

            <label style={labelStyle}>Title / Episode Name</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Reset Button Episode" style={inputStyle} />

            <label style={labelStyle}>Description / Hook</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this about? The angle, the emotional hook..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

            <label style={labelStyle}>Notes / Context</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Extra context, key points, offers to mention..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

            <label style={labelStyle}>Transcript / Script</label>
            <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste full transcript or script here..." rows={8} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} />
          </div>

          <div>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '8px' }}>Target Platforms</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', transition: 'all 0.1s',
                    background: selectedPlatforms.includes(p) ? 'var(--hot-pink)' : 'transparent',
                    borderColor: selectedPlatforms.includes(p) ? 'var(--hot-pink)' : 'var(--border)',
                    color: selectedPlatforms.includes(p) ? '#fff' : 'var(--text-muted)',
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: '12px', color: '#e05', background: '#fee', padding: '10px 12px', borderRadius: '8px' }}>{error}</p>}

          <button onClick={handleRepurpose} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '14px', background: loading ? 'var(--border)' : 'var(--hot-pink)', color: '#fff', transition: 'opacity 0.15s', letterSpacing: '-0.01em' }}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating 30 pieces...</> : <><Sparkles size={16} /> Generate 1→30 Content</>}
          </button>
        </div>

        {/* ── CENTER: Output ── */}
        <div style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)' }}>
              <Zap size={40} style={{ opacity: 0.2 }} />
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.5 }}>Add content + hit Generate</p>
              <p style={{ fontSize: '12px', opacity: 0.4 }}>Your Content Dev GPT will expand one piece into 30</p>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
              <Loader2 size={32} color="var(--hot-pink)" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Your Content Dev GPT is writing 30 pieces...</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.6 }}>hooks · angles · captions · emails · pins · threads</p>
            </div>
          )}

          {result && (
            <>
              {/* Preview + river */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setPreviewOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: '2px solid var(--hot-pink)', background: 'rgba(232,68,138,0.08)', color: 'var(--hot-pink)', cursor: 'pointer', fontWeight: 800, fontSize: '13px', transition: 'background 0.15s' }}>
                  <Layout size={15} /> Preview All Platforms
                </button>
                <button onClick={fileToRiver} disabled={riverStatus !== 'idle'}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: riverStatus === 'done' ? '#3daa7c' : 'var(--purple)', color: '#fff', cursor: riverStatus === 'idle' ? 'pointer' : 'default', fontWeight: 800, fontSize: '13px' }}>
                  {riverStatus === 'sending' ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sorting…</> : riverStatus === 'done' ? '✓ Filed' : '🌊 Compose & File'}
                </button>
                {riverMsg && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{riverMsg}</span>}
              </div>

              {/* Summary banner */}
              <div style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)', borderRadius: '14px', padding: '18px 20px', color: '#fff' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)', marginBottom: '6px' }}>Core Message</p>
                <p style={{ fontSize: '14px', lineHeight: 1.6, opacity: 0.9 }}>{result.summary}</p>
              </div>

              {/* Offer bridge */}
              {result.offer_bridge && (
                <div style={{ background: 'rgba(232,68,138,0.08)', border: '1px solid rgba(232,68,138,0.25)', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Link2 size={14} color="var(--hot-pink)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)', marginBottom: '4px' }}>Offer Bridge</p>
                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{result.offer_bridge}</p>
                  </div>
                  <CopyBtn text={result.offer_bridge} />
                </div>
              )}

              <Section icon={<Video size={14} />} title="Instagram Reels Hooks" accent="#E8448A">
                {result.reels_hooks.map((h, i) => <Item key={i} text={h} />)}
              </Section>

              <Section icon={<Zap size={14} />} title="TikTok Angles" accent="#69C9D0">
                {result.tiktok_angles.map((a, i) => <Item key={i} text={a.hook} sub={a.angle} />)}
              </Section>

              <Section icon={<Video size={14} />} title="YouTube" accent="#FF0000">
                {result.youtube.map((y, i) => (
                  <div key={i} style={{ background: 'var(--bg)', borderRadius: '8px', padding: '12px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', flex: 1 }}>{y.title}</p>
                      <CopyBtn text={`${y.title}\n\n${y.description}`} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{y.description}</p>
                  </div>
                ))}
              </Section>

              <Section icon={<FileText size={14} />} title="Captions" accent="#5A4FCF">
                {(['short', 'medium', 'long'] as const).map(len => (
                  <div key={len} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{len}</span>
                      <CopyBtn text={result.captions[len]} />
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, background: 'var(--bg)', borderRadius: '8px', padding: '10px 12px' }}>{result.captions[len]}</p>
                  </div>
                ))}
              </Section>

              <Section icon={<Mail size={14} />} title="Email Subjects" accent="#F2A65A">
                {result.email_subjects.map((s, i) => <Item key={i} text={s} />)}
              </Section>

              <Section icon={<BookOpen size={14} />} title="Newsletter (Substack)" accent="#3DAA7C">
                <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, flex: 1 }}>{result.newsletter_angle}</p>
                  <CopyBtn text={result.newsletter_angle} />
                </div>
              </Section>

              <Section icon={<Pin size={14} />} title="Pinterest Pins" accent="#E60023">
                {result.pinterest_pins.map((p, i) => <Item key={i} text={p} />)}
              </Section>

              <Section icon={<Link2 size={14} />} title="LinkedIn Posts" accent="#0A66C2">
                {result.linkedin_posts.map((p, i) => <Item key={i} text={p} />)}
              </Section>

              <Section icon={<MessageSquare size={14} />} title="Story Ideas" accent="#F56040">
                {result.story_ideas.map((s, i) => <Item key={i} text={s} />)}
              </Section>

              <Section icon={<Hash size={14} />} title="X / Twitter Thread" accent="#000">
                {result.thread_tweet.map((t, i) => (
                  <Item key={i} text={t} sub={`Tweet ${i + 1}/${result.thread_tweet.length}`} />
                ))}
              </Section>
            </>
          )}
        </div>

        {/* ── RIGHT: GPT Chat ── */}
        <div style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)' }}>
              {ROLES.find(r => r.id === activeRole)?.emoji} {ROLES.find(r => r.id === activeRole)?.label} GPT
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {ROLES.find(r => r.id === activeRole)?.desc}
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatHistory.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '40px', opacity: 0.5 }}>
                <p>Ask your {ROLES.find(r => r.id === activeRole)?.label} GPT anything.</p>
                <p style={{ marginTop: '6px', fontSize: '11px' }}>Try: "What should I post this week?" or "Give me a strategy for this content."</p>
              </div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                <div style={{ fontSize: '12px', lineHeight: 1.6, padding: '10px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'var(--hot-pink)' : 'var(--bg)', color: m.role === 'user' ? '#fff' : 'var(--text)', border: m.role === 'ai' ? '1px solid var(--border)' : 'none', whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 13px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px' }}>
                <Loader2 size={14} color="var(--hot-pink)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>

          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <textarea
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat() } }}
              placeholder="Ask your GPT brain..."
              rows={2}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', resize: 'none', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)' }}
            />
            <button onClick={handleChat} disabled={chatLoading || !chatMsg.trim()}
              style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: chatMsg.trim() ? 'var(--hot-pink)' : 'var(--border)', color: '#fff', cursor: chatMsg.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '12px', transition: 'background 0.15s', alignSelf: 'flex-end' }}>
              Send
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {previewOpen && result && (
        <ContentPreview output={result} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '5px', marginTop: '10px' }
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' as const, outline: 'none' }
