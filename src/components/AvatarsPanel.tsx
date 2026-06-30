'use client'
import { useState } from 'react'
import { AVATAR_LIST, AVATARS, type AvatarId } from '@/lib/avatars'
import { Loader2, Zap, Video, Copy, CheckCircle2, ChevronDown, ChevronUp, Plus } from 'lucide-react'

type Tab = 'roster' | 'create' | 'queue'

interface GeneratedScript {
  avatarId: AvatarId
  hook: string
  body: string
  cta: string
  platform: string
  topic: string
}

export default function AvatarsPanel() {
  const [tab, setTab] = useState<Tab>('roster')
  const [selected, setSelected] = useState<AvatarId>('mandi')
  const [expanded, setExpanded] = useState<AvatarId | null>(null)
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('Instagram Reels')
  const [loading, setLoading] = useState(false)
  const [scripts, setScripts] = useState<GeneratedScript[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState<string | null>(null)
  const [videoResults, setVideoResults] = useState<Record<string, string>>({})

  const avatar = AVATARS[selected]

  const generateScript = async (avatarId: AvatarId) => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const av = AVATARS[avatarId]
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'content_director',
          message: `Generate a ${platform} script for this avatar persona:

NAME: ${av.name}
PERSONALITY: ${av.personality}
VOICE STYLE: ${av.voiceStyle}
TARGET AUDIENCE: ${av.targetAudience}
NICHE: ${av.niche}
HOOK FORMULAS TO CHOOSE FROM:
${av.hookFormulas.map((h, i) => `${i + 1}. ${h}`).join('\n')}
CTA TEMPLATE: ${av.ctaTemplate}

TOPIC FOR THIS VIDEO: ${topic}

Return ONLY valid JSON in this exact format:
{
  "hook": "the opening 1-2 sentences that stop the scroll",
  "body": "the main content — 3-5 sentences max, teaches or proves the hook",
  "cta": "the call to action at the end"
}

Stay 100% in character as ${av.name}. Match their voice exactly. Keep the whole script under 45 seconds when spoken aloud.`,
        }),
      })
      const data = await res.json()
      let parsed
      try {
        const raw = data.result ?? data.output ?? ''
        const match = raw.match(/\{[\s\S]*\}/)
        parsed = match ? JSON.parse(match[0]) : { hook: raw, body: '', cta: av.ctaTemplate }
      } catch {
        parsed = { hook: data.result ?? 'Could not generate', body: '', cta: av.ctaTemplate }
      }
      const script: GeneratedScript = { avatarId, topic, platform, ...parsed }
      setScripts(s => [script, ...s])
    } finally {
      setLoading(false)
    }
  }

  const generateAllAvatars = async () => {
    if (!topic.trim()) return
    setLoading(true)
    for (const av of AVATAR_LIST) {
      await generateScript(av.id)
    }
    setLoading(false)
  }

  const copyScript = (s: GeneratedScript) => {
    const text = `${s.hook}\n\n${s.body}\n\n${s.cta}`
    navigator.clipboard.writeText(text)
    setCopied(`${s.avatarId}-${s.topic}`)
    setTimeout(() => setCopied(null), 2000)
  }

  const launchVideo = async (s: GeneratedScript) => {
    const key = `${s.avatarId}-${s.topic}`
    setVideoLoading(key)
    try {
      const res = await fetch('/api/heygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: `${s.hook} ${s.body} ${s.cta}`,
          avatarId: s.avatarId,
        }),
      })
      const data = await res.json()
      if (data.videoId) {
        setVideoResults(r => ({ ...r, [key]: data.videoId }))
      }
    } catch {
      setVideoResults(r => ({ ...r, [key]: 'error' }))
    } finally {
      setVideoLoading(null)
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'roster', label: 'Avatar Roster' },
    { id: 'create', label: 'Generate Content' },
    { id: 'queue', label: 'Script Queue' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Avatar Studio</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>5 AI influencer personas. One command center.</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ fontSize: '13px', fontWeight: 600, padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                background: tab === t.id ? 'var(--purple)' : 'var(--surface-raised)',
                color: tab === t.id ? '#fff' : 'var(--text-muted)',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROSTER ── */}
      {tab === 'roster' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {AVATAR_LIST.map(av => (
            <div key={av.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', borderTop: `4px solid ${av.accentColor}` }}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: av.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                  {av.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>{av.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', background: av.bgColor, color: av.accentColor }}>{av.instagramHandle}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', fontStyle: 'italic' }}>{av.tagline}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}>{av.niche}</p>
                </div>
              </div>

              <button onClick={() => setExpanded(expanded === av.id ? null : av.id)}
                style={{ width: '100%', padding: '8px 16px', background: 'var(--surface-raised)', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                View persona details
                {expanded === av.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {expanded === av.id && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Personality</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{av.personality}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Target Audience</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{av.targetAudience}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Hook Formulas</p>
                    {av.hookFormulas.map((h, i) => (
                      <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--surface-raised)', borderRadius: '8px', marginBottom: '4px', borderLeft: `3px solid ${av.accentColor}` }}>
                        {h}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '10px', background: av.bgColor, borderRadius: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: av.accentColor, marginBottom: '3px' }}>CTA Template</p>
                    <p style={{ fontSize: '12px', color: 'var(--text)' }}>{av.ctaTemplate}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ padding: '8px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600 }}>PRIMARY PLATFORM</p>
                      <p style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 700, marginTop: '2px' }}>{av.primaryPlatform}</p>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--surface-raised)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600 }}>HEYGEN STATUS</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px', color: av.heygen_photo_id ? '#3DAA7C' : '#F2A65A' }}>
                        {av.heygen_photo_id ? '✓ Configured' : '⚠ Needs photo ID'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(av.id); setTab('create') }}
                    style={{ width: '100%', padding: '9px', background: av.accentColor, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Generate Content for {av.name}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add Avatar card */}
          <div style={{ background: 'var(--surface)', border: '2px dashed var(--border)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-subtle)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={24} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>Add New Avatar</p>
            <p style={{ fontSize: '12px', textAlign: 'center' }}>Create a new AI influencer persona with custom voice, niche, and hook formulas</p>
          </div>
        </div>
      )}

      {/* ── GENERATE CONTENT ── */}
      {tab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar selector */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {AVATAR_LIST.map(av => (
              <button key={av.id} onClick={() => setSelected(av.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', border: `2px solid ${selected === av.id ? av.accentColor : 'var(--border)'}`, background: selected === av.id ? av.bgColor : 'var(--surface)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '18px' }}>{av.emoji}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: selected === av.id ? av.accentColor : 'var(--text-muted)' }}>{av.name}</span>
              </button>
            ))}
          </div>

          {/* Topic input */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: avatar.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{avatar.emoji}</div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{avatar.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>{avatar.tagline}</p>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>CONTENT TOPIC</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)}
                placeholder={`What should ${avatar.name} talk about? E.g. "How I used ChatGPT to write a week of captions in 12 minutes"`}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>PLATFORM</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
                {['Instagram Reels', 'TikTok', 'YouTube Shorts', 'LinkedIn', 'Facebook Reels'].map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => generateScript(selected)} disabled={loading || !topic.trim()}
                style={{ flex: 1, padding: '11px', background: avatar.accentColor, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Generate for {avatar.name}
              </button>
              <button onClick={generateAllAvatars} disabled={loading || !topic.trim()}
                style={{ flex: 1, padding: '11px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Generate for ALL 5 Avatars
              </button>
            </div>
          </div>

          {/* Scripts output */}
          {scripts.filter(s => s.avatarId === selected || tab === 'queue').map((s, i) => {
            const av = AVATARS[s.avatarId]
            const key = `${s.avatarId}-${s.topic}`
            const isCopied = copied === key
            const vidId = videoResults[key]
            return (
              <div key={i} style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: '14px', overflow: 'hidden', borderLeft: `4px solid ${av.accentColor}` }}>
                <div style={{ padding: '14px 16px', background: av.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{av.emoji}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: av.accentColor }}>{av.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)', padding: '2px 8px', background: 'rgba(0,0,0,0.06)', borderRadius: '20px' }}>{s.platform}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => copyScript(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: isCopied ? '#3DAA7C' : 'var(--text-muted)' }}>
                      {isCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={() => launchVideo(s)} disabled={videoLoading === key}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: 'none', background: av.accentColor, cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#fff', opacity: videoLoading === key ? 0.7 : 1 }}>
                      {videoLoading === key ? <Loader2 size={12} className="animate-spin" /> : <Video size={12} />}
                      {vidId ? 'Rendering...' : 'Make Video'}
                    </button>
                  </div>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Hook (first 3 seconds)</p>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>{s.hook}</p>
                  </div>
                  {s.body && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Body</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.body}</p>
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', background: av.bgColor, borderRadius: '8px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: av.accentColor, marginBottom: '3px' }}>CTA</p>
                    <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{s.cta}</p>
                  </div>
                  {vidId && vidId !== 'error' && (
                    <div style={{ padding: '10px', background: '#E8F7F1', borderRadius: '8px', fontSize: '12px', color: '#3DAA7C', fontWeight: 600 }}>
                      ✓ Video rendering in HeyGen — ID: {vidId}
                    </div>
                  )}
                  {vidId === 'error' && (
                    <div style={{ padding: '10px', background: '#FEF5EA', borderRadius: '8px', fontSize: '12px', color: '#F2A65A', fontWeight: 600 }}>
                      ⚠ Video launch failed — check HeyGen photo ID for {av.name}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── QUEUE ── */}
      {tab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scripts.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '48px', textAlign: 'center', color: 'var(--text-subtle)' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>📭</p>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>No scripts yet</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Go to Generate Content and create your first batch</p>
            </div>
          ) : (
            scripts.map((s, i) => {
              const av = AVATARS[s.avatarId]
              const key = `${s.avatarId}-${s.topic}`
              const isCopied = copied === key
              return (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px', borderLeft: `4px solid ${av.accentColor}` }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{av.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: av.accentColor }}>{av.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{s.platform}</span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{s.hook}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Topic: {s.topic}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => copyScript(s)}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: isCopied ? '#3DAA7C' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                    <button onClick={() => launchVideo(s)}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', background: av.accentColor, cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Video size={12} /> Video
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
