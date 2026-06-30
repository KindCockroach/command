'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, Archive, Zap, Loader2, Copy, Video, Volume2, Sparkles, ArrowLeft } from 'lucide-react'

type GPTRole = 'content_dev' | 'ceo' | 'future_me' | 'ops'
const ROLES: { id: GPTRole; label: string; emoji: string; desc: string }[] = [
  { id: 'content_dev', label: 'Content Developer', emoji: '✍️', desc: 'Turn ideas into 30 pieces. Hooks, captions, scripts, emails.' },
  { id: 'ceo',         label: 'CEO Advisor',        emoji: '🧠', desc: 'Strategy, offers, priorities, revenue decisions.' },
  { id: 'future_me',   label: 'Future Me',          emoji: '🌟', desc: 'Talk to 2027 Mandi. Grounded. Clear. Built it.' },
  { id: 'ops',         label: 'Ops Specialist',     emoji: '⚙️', desc: 'Systems, workflows, next steps, execution.' },
]

export default function StudioView() {
  const [activeRole, setActiveRole] = useState<GPTRole>('content_dev')
  const [chat, setChat] = useState('')
  const [chatResult, setChatResult] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const [scriptTopic, setScriptTopic] = useState('')
  const [scriptDuration, setScriptDuration] = useState<'30s'|'60s'|'3min'>('60s')
  const [script, setScript] = useState('')
  const [scriptLoading, setScriptLoading] = useState(false)

  const [videoScript, setVideoScript] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoResult, setVideoResult] = useState('')

  const [voiceText, setVoiceText] = useState('')
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')

  const [copied, setCopied] = useState<string>('')

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const askGPT = async () => {
    if (!chat.trim() || chatLoading) return
    setChatLoading(true); setChatResult('')
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat', role: activeRole, message: chat }) })
    const data = await res.json()
    setChatResult(data.result ?? data.error)
    setChatLoading(false)
  }

  const generateScript = async () => {
    if (!scriptTopic.trim() || scriptLoading) return
    setScriptLoading(true); setScript('')
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'script', topic: scriptTopic, duration: scriptDuration }) })
    const data = await res.json()
    setScript(data.result ?? data.error)
    setScriptLoading(false)
  }

  const generateVideo = async () => {
    if (!videoScript.trim() || videoLoading) return
    setVideoLoading(true); setVideoResult('')
    const res = await fetch('/api/heygen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate_video', script: videoScript }) })
    const data = await res.json()
    setVideoResult(JSON.stringify(data, null, 2))
    setVideoLoading(false)
  }

  const generateVoice = async () => {
    if (!voiceText.trim() || voiceLoading) return
    setVoiceLoading(true); setAudioUrl('')
    const res = await fetch('/api/elevenlabs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'synthesize', text: voiceText }) })
    if (res.ok) { const blob = await res.blob(); setAudioUrl(URL.createObjectURL(blob)) }
    else { const d = await res.json(); setAudioUrl('error: ' + (d.error || 'unknown')) }
    setVoiceLoading(false)
  }

  const NAV_LINK = { color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }
  const CARD = { background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' }
  const BTN_PRIMARY = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', width: '100%' }
  const TEXTAREA = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--cream-deep)', fontSize: '13px', resize: 'vertical' as const, outline: 'none', fontFamily: 'inherit', color: 'var(--ink)', lineHeight: 1.6 }
  const SECTION_LABEL = { fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🎈</span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>AI Mom</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hot-pink)', marginLeft: '4px' }}>Studio</span>
          </div>
          <nav style={{ display: 'flex', gap: '4px' }}>
            <Link href="/" style={NAV_LINK}><ArrowLeft size={12} /> Pipeline</Link>
            <Link href="/archive" style={NAV_LINK}><Archive size={12} /> Archive</Link>
            <span style={{ ...NAV_LINK, background: 'var(--hot-pink)', color: '#fff' }}><Zap size={12} /> Studio</span>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--hot-pink)' }}>Production</p>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--navy)' }}>Content Studio</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* ── GPT Chat ── */}
          <div style={{ ...CARD, gridColumn: '1 / -1' }}>
            <div style={SECTION_LABEL}><Sparkles size={13} style={{ color: 'var(--hot-pink)' }} /> Your GPT Brain — Talk to your team</div>

            {/* Role selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setActiveRole(r.id)}
                  style={{ fontSize: '12px', fontWeight: 700, padding: '8px 16px', borderRadius: '10px', border: `2px solid ${activeRole === r.id ? 'var(--hot-pink)' : 'var(--border)'}`, background: activeRole === r.id ? 'var(--hot-pink-light)' : 'var(--surface-raised)', color: activeRole === r.id ? 'var(--hot-pink-dark)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {r.emoji} {r.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', padding: '10px 14px', background: 'var(--cream-deep)', borderRadius: '8px' }}>
              {ROLES.find(r => r.id === activeRole)?.desc}
            </p>

            <textarea value={chat} onChange={e => setChat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askGPT() } }} rows={3} placeholder={`Ask your ${ROLES.find(r => r.id === activeRole)?.label}… (Enter to send)`} style={TEXTAREA} />
            <button onClick={askGPT} disabled={chatLoading || !chat.trim()} style={{ ...BTN_PRIMARY, marginTop: '10px', opacity: chatLoading || !chat.trim() ? 0.5 : 1 }}>
              {chatLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Thinking…</> : `Ask ${ROLES.find(r => r.id === activeRole)?.emoji} ${ROLES.find(r => r.id === activeRole)?.label}`}
            </button>

            {chatResult && (
              <div style={{ marginTop: '16px', position: 'relative' }}>
                <button onClick={() => copy(chatResult, 'chat')} style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', padding: '4px 10px', borderRadius: '6px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Copy size={10} style={{ display: 'inline', marginRight: '4px' }} />{copied === 'chat' ? 'Copied!' : 'Copy'}
                </button>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '13px', lineHeight: 1.7, padding: '16px', borderRadius: '12px', background: 'var(--cream-deep)', border: '1px solid var(--border)', color: 'var(--ink)', fontFamily: 'inherit', maxHeight: '400px', overflowY: 'auto' }}>{chatResult}</pre>
              </div>
            )}
          </div>

          {/* ── Script Generator ── */}
          <div style={CARD}>
            <div style={SECTION_LABEL}><Video size={13} style={{ color: 'var(--progress-color)' }} /> Script Generator</div>
            <input value={scriptTopic} onChange={e => setScriptTopic(e.target.value)} placeholder="Topic (e.g. 'AI saved my morning routine')" style={{ ...TEXTAREA, resize: 'none', marginBottom: '10px' }} />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {(['30s', '60s', '3min'] as const).map(d => (
                <button key={d} onClick={() => setScriptDuration(d)} style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', border: `1.5px solid ${scriptDuration === d ? 'var(--hot-pink)' : 'var(--border)'}`, background: scriptDuration === d ? 'var(--hot-pink-light)' : 'transparent', color: scriptDuration === d ? 'var(--hot-pink-dark)' : 'var(--text-muted)', cursor: 'pointer' }}>{d}</button>
              ))}
            </div>
            <button onClick={generateScript} disabled={scriptLoading || !scriptTopic.trim()} style={{ ...BTN_PRIMARY, opacity: scriptLoading || !scriptTopic.trim() ? 0.5 : 1 }}>
              {scriptLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Writing…</> : '✍️ Generate Script'}
            </button>
            {script && (
              <div style={{ marginTop: '14px', position: 'relative' }}>
                <button onClick={() => copy(script, 'script')} style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  {copied === 'script' ? 'Copied!' : 'Copy'}
                </button>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: 1.7, padding: '14px', borderRadius: '10px', background: 'var(--cream-deep)', border: '1px solid var(--border)', fontFamily: 'inherit', color: 'var(--ink)', maxHeight: '320px', overflowY: 'auto' }}>{script}</pre>
                <button onClick={() => setVideoScript(script)} style={{ marginTop: '8px', fontSize: '11px', padding: '6px 14px', borderRadius: '8px', background: 'var(--hot-pink-light)', color: 'var(--hot-pink-dark)', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  → Send to HeyGen
                </button>
              </div>
            )}
          </div>

          {/* ── HeyGen Video ── */}
          <div style={CARD}>
            <div style={SECTION_LABEL}><Video size={13} style={{ color: '#FF6B35' }} /> HeyGen Avatar Video</div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Generate a 9:16 avatar video for Reels/TikTok. Set your HEYGEN_API_KEY in .env.local first.</p>
            <textarea value={videoScript} onChange={e => setVideoScript(e.target.value)} rows={5} placeholder="Paste the script for your avatar to read…" style={{ ...TEXTAREA, marginBottom: '10px' }} />
            <button onClick={generateVideo} disabled={videoLoading || !videoScript.trim()} style={{ ...BTN_PRIMARY, background: '#FF6B35', opacity: videoLoading || !videoScript.trim() ? 0.5 : 1 }}>
              {videoLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : '🎬 Generate Avatar Video'}
            </button>
            {videoResult && (
              <pre style={{ marginTop: '12px', whiteSpace: 'pre-wrap', fontSize: '11px', padding: '12px', borderRadius: '10px', background: 'var(--cream-deep)', border: '1px solid var(--border)', color: 'var(--ink)', maxHeight: '200px', overflowY: 'auto' }}>{videoResult}</pre>
            )}
          </div>

          {/* ── ElevenLabs Voice ── */}
          <div style={{ ...CARD, gridColumn: '1 / -1' }}>
            <div style={SECTION_LABEL}><Volume2 size={13} style={{ color: 'var(--progress-color)' }} /> ElevenLabs Voice — Mandi's voice clone</div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Synthesize podcast intros, voiceovers, or avatar audio. Set ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID in .env.local.</p>
            <textarea value={voiceText} onChange={e => setVoiceText(e.target.value)} rows={4} placeholder="Type or paste the text to speak…" style={{ ...TEXTAREA, marginBottom: '10px' }} />
            <button onClick={generateVoice} disabled={voiceLoading || !voiceText.trim()} style={{ ...BTN_PRIMARY, background: 'var(--progress-color)', opacity: voiceLoading || !voiceText.trim() ? 0.5 : 1 }}>
              {voiceLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Synthesizing…</> : '🎙 Generate Voice'}
            </button>
            {audioUrl && !audioUrl.startsWith('error') && (
              <div style={{ marginTop: '14px', padding: '14px', borderRadius: '12px', background: 'var(--cream-deep)', border: '1px solid var(--border)' }}>
                <audio controls src={audioUrl} style={{ width: '100%' }} />
                <a href={audioUrl} download="ai-mom-voice.mp3" style={{ display: 'block', marginTop: '8px', fontSize: '11px', color: 'var(--progress-color)', fontWeight: 700, textDecoration: 'none' }}>⬇ Download MP3</a>
              </div>
            )}
            {audioUrl.startsWith('error') && <p style={{ color: '#E05252', fontSize: '12px', marginTop: '10px' }}>{audioUrl}</p>}
          </div>

        </div>

        {/* API Keys setup guide */}
        <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--navy)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>🔑 Connect your APIs — edit <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>app-src/.env.local</code></p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { name: 'OpenAI (ChatGPT GPTs)', key: 'OPENAI_API_KEY', where: 'platform.openai.com/api-keys', note: 'Also add your 4 Assistant IDs' },
              { name: 'HeyGen (Avatar Video)', key: 'HEYGEN_API_KEY', where: 'app.heygen.com/settings → API', note: 'Also add avatar IDs' },
              { name: 'ElevenLabs (Voice)', key: 'ELEVENLABS_API_KEY', where: 'elevenlabs.io → Profile → API', note: 'Also add your voice clone ID' },
              { name: 'YouTube (coming next)', key: 'YOUTUBE_API_KEY', where: 'console.cloud.google.com', note: 'Enables direct upload + stats' },
            ].map(item => (
              <div key={item.key} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{item.name}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{item.key}</p>
                <p style={{ fontSize: '10px', color: 'var(--hot-pink)' }}>→ {item.where}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ background: 'var(--navy)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Command Center 5.0 · <span style={{ color: 'var(--hot-pink)', fontWeight: 700 }}>she said she would and so she did</span></p>
      </footer>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
