'use client'
import { useState, useEffect } from 'react'
import { Loader2, Zap, Video, Copy, CheckCircle2, ChevronDown, ChevronUp, Plus, Edit3, Trash2, X, Save } from 'lucide-react'
import type { AvatarRecord } from '@/lib/db'

type Tab = 'roster' | 'create' | 'queue'

interface GeneratedScript {
  avatarId: string
  hook: string
  body: string
  cta: string
  platform: string
  topic: string
}

const BLANK_AVATAR: Partial<AvatarRecord> = {
  id: '', name: '', emoji: '🤖', tagline: '', niche: '', personality: '',
  voiceStyle: '', targetAudience: '', instagramHandle: '', primaryPlatform: 'Instagram',
  accentColor: '#E8448A', bgColor: '#F3E8F4', systemPrompt: '', hookFormulas: [], ctaTemplate: '',
  heygen_photo_id: '', elevenlabs_voice_id: '',
}

function AvatarEditorModal({ avatar, onSave, onClose }: { avatar: Partial<AvatarRecord>; onSave: (a: AvatarRecord) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<AvatarRecord>>({ ...BLANK_AVATAR, ...avatar })
  const [hookInput, setHookInput] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof AvatarRecord, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const addHook = () => { const h = hookInput.trim(); if (!h) return; set('hookFormulas', [...(form.hookFormulas ?? []), h]); setHookInput('') }
  const removeHook = (i: number) => set('hookFormulas', (form.hookFormulas ?? []).filter((_, idx) => idx !== i))

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    const id = form.id || slugify(form.name ?? '')
    const method = avatar.id ? 'PATCH' : 'POST'
    const res = await fetch('/api/avatars', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id }) })
    const saved = await res.json()
    onSave(saved)
    setSaving(false)
  }

  const fld = { padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const lbl = (t: string) => <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>{t}</label>

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>{avatar.id ? `Edit ${avatar.name}` : 'New Avatar'}</h3>
          <button onClick={onClose} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Identity row */}
          <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 1fr', gap: '12px' }}>
            <div>
              {lbl('Emoji')}
              <input value={form.emoji ?? ''} onChange={e => set('emoji', e.target.value)} style={{ ...fld, textAlign: 'center', fontSize: '24px' }} />
            </div>
            <div>
              {lbl('Name')}
              <input value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Nora" style={fld} />
            </div>
            <div>
              {lbl('Handle')}
              <input value={form.instagramHandle ?? ''} onChange={e => set('instagramHandle', e.target.value)} placeholder="@handle" style={fld} />
            </div>
          </div>

          <div>
            {lbl('Tagline')}
            <input value={form.tagline ?? ''} onChange={e => set('tagline', e.target.value)} placeholder="One-line description of what this avatar does" style={fld} />
          </div>

          <div>
            {lbl('Niche')}
            <input value={form.niche ?? ''} onChange={e => set('niche', e.target.value)} placeholder="e.g. AI for moms, Gen Z side hustles, spiritual business..." style={fld} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {lbl('Primary Platform')}
              <select value={form.primaryPlatform ?? 'Instagram'} onChange={e => set('primaryPlatform', e.target.value)} style={{ ...fld, cursor: 'pointer' }}>
                {['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Instagram + TikTok', 'Instagram + LinkedIn', 'TikTok + Instagram'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                {lbl('Accent Color')}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="color" value={form.accentColor ?? '#E8448A'} onChange={e => set('accentColor', e.target.value)} style={{ width: '36px', height: '36px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', padding: '2px' }} />
                  <input value={form.accentColor ?? ''} onChange={e => set('accentColor', e.target.value)} style={{ ...fld, fontSize: '11px' }} />
                </div>
              </div>
              <div>
                {lbl('Bg Color')}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="color" value={form.bgColor ?? '#F3E8F4'} onChange={e => set('bgColor', e.target.value)} style={{ width: '36px', height: '36px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', padding: '2px' }} />
                  <input value={form.bgColor ?? ''} onChange={e => set('bgColor', e.target.value)} style={{ ...fld, fontSize: '11px' }} />
                </div>
              </div>
            </div>
          </div>

          <div>
            {lbl('Target Audience')}
            <input value={form.targetAudience ?? ''} onChange={e => set('targetAudience', e.target.value)} placeholder="Who does this avatar speak to?" style={fld} />
          </div>

          <div>
            {lbl('Personality')}
            <textarea value={form.personality ?? ''} onChange={e => set('personality', e.target.value)} rows={3} placeholder="How does this avatar show up? Tone, quirks, non-negotiables..." style={{ ...fld, resize: 'vertical' }} />
          </div>

          <div>
            {lbl('Voice Style')}
            <textarea value={form.voiceStyle ?? ''} onChange={e => set('voiceStyle', e.target.value)} rows={2} placeholder="Fast and punchy? Slow and ethereal? Short sentences? Swamp metaphors?" style={{ ...fld, resize: 'vertical' }} />
          </div>

          <div>
            {lbl('System Prompt (AI instructions)')}
            <textarea value={form.systemPrompt ?? ''} onChange={e => set('systemPrompt', e.target.value)} rows={4} placeholder="Full character instructions for the AI. Include voice rules, non-negotiables, and offer info." style={{ ...fld, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} />
          </div>

          <div>
            {lbl('Hook Formulas')}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input value={hookInput} onChange={e => setHookInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHook()} placeholder="Add a hook formula and press Enter" style={{ ...fld, flex: 1 }} />
              <button onClick={addHook} style={{ padding: '9px 14px', borderRadius: '8px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
            </div>
            {(form.hookFormulas ?? []).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', background: 'var(--surface-raised)', borderRadius: '8px', marginBottom: '4px', borderLeft: `3px solid ${form.accentColor ?? '#E8448A'}` }}>
                <span style={{ fontSize: '12px', color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{h}</span>
                <button onClick={() => removeHook(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '0', flexShrink: 0 }}><X size={12} /></button>
              </div>
            ))}
          </div>

          <div>
            {lbl('CTA Template')}
            <input value={form.ctaTemplate ?? ''} onChange={e => set('ctaTemplate', e.target.value)} placeholder="e.g. Comment WISH and I'll DM you the exact workflow" style={fld} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {lbl('HeyGen Photo ID')}
              <input value={form.heygen_photo_id ?? ''} onChange={e => set('heygen_photo_id', e.target.value)} placeholder="From HeyGen dashboard" style={fld} />
            </div>
            <div>
              {lbl('ElevenLabs Voice ID')}
              <input value={form.elevenlabs_voice_id ?? ''} onChange={e => set('elevenlabs_voice_id', e.target.value)} placeholder="From ElevenLabs dashboard" style={fld} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving || !form.name ? 0.6 : 1 }}>
            <Save size={13} /> {saving ? 'Saving…' : avatar.id ? 'Save Changes' : 'Create Avatar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AvatarsPanel() {
  const [tab, setTab] = useState<Tab>('roster')
  const [avatars, setAvatars] = useState<AvatarRecord[]>([])
  const [selected, setSelected] = useState<string>('mandi')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('Instagram Reels')
  const [loading, setLoading] = useState(false)
  const [scripts, setScripts] = useState<GeneratedScript[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState<string | null>(null)
  const [videoResults, setVideoResults] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Partial<AvatarRecord> | null>(null)
  const [riverLoading, setRiverLoading] = useState<string | null>(null)
  const [riverResults, setRiverResults] = useState<Record<string, string>>({})

  const fileToRiver = async (s: GeneratedScript) => {
    const key = `${s.avatarId}-${s.topic}`
    const av = avatars.find(a => a.id === s.avatarId)
    setRiverLoading(key)
    try {
      const res = await fetch('/api/river', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: `AVATAR SCRIPT — ${av?.name ?? s.avatarId} (${av?.instagramHandle ?? ''}) for ${s.platform}:\nTOPIC: ${s.topic}\nHOOK: ${s.hook}\nBODY: ${s.body}\nCTA: ${s.cta}`,
          source: 'avatars',
        }),
      })
      const d = await res.json()
      setRiverResults(prev => ({
        ...prev,
        [key]: d.complete && d.account ? `✓ Filed under ${d.account.emoji} ${d.account.handle}`
          : d.account ? `Sorted to ${d.account.handle} — needs answers` : d.error ? 'River error' : 'Filed',
      }))
    } catch {
      setRiverResults(prev => ({ ...prev, [key]: 'Connection failed' }))
    } finally {
      setRiverLoading(null)
    }
  }

  useEffect(() => {
    fetch('/api/avatars').then(r => r.json()).then(setAvatars).catch(() => {})
  }, [])

  const avatar = avatars.find(a => a.id === selected) ?? avatars[0]

  const generateScript = async (avatarId: string) => {
    if (!topic.trim()) return
    const av = avatars.find(a => a.id === avatarId)
    if (!av) return
    setLoading(true)
    try {
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
      setScripts(s => [{ avatarId, topic, platform, ...parsed }, ...s])
    } finally {
      setLoading(false)
    }
  }

  const generateAllAvatars = async () => {
    if (!topic.trim()) return
    setLoading(true)
    for (const av of avatars) { await generateScript(av.id) }
    setLoading(false)
  }

  const copyScript = (s: GeneratedScript) => {
    navigator.clipboard.writeText(`${s.hook}\n\n${s.body}\n\n${s.cta}`)
    setCopied(`${s.avatarId}-${s.topic}`)
    setTimeout(() => setCopied(null), 2000)
  }

  const launchVideo = async (s: GeneratedScript) => {
    const key = `${s.avatarId}-${s.topic}`
    setVideoLoading(key)
    try {
      const res = await fetch('/api/heygen/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: `${s.hook} ${s.body} ${s.cta}`, avatarId: s.avatarId }) })
      const data = await res.json()
      setVideoResults(r => ({ ...r, [key]: data.videoId ?? 'error' }))
    } catch {
      setVideoResults(r => ({ ...r, [key]: 'error' }))
    } finally {
      setVideoLoading(null)
    }
  }

  const deleteAvatar = async (id: string) => {
    if (!confirm('Delete this avatar? This cannot be undone.')) return
    await fetch(`/api/avatars?id=${id}`, { method: 'DELETE' })
    setAvatars(prev => prev.filter(a => a.id !== id))
    if (selected === id) setSelected(avatars[0]?.id ?? '')
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'roster', label: 'Avatar Roster' },
    { id: 'create', label: 'Generate Content' },
    { id: 'queue', label: 'Script Queue' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {editing && (
        <AvatarEditorModal
          avatar={editing}
          onSave={saved => {
            setAvatars(prev => prev.find(a => a.id === saved.id) ? prev.map(a => a.id === saved.id ? saved : a) : [...prev, saved])
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Avatar Studio</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{avatars.length} AI influencer personas. One command center.</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ fontSize: '13px', fontWeight: 600, padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', border: 'none', background: tab === t.id ? 'var(--purple)' : 'var(--surface-raised)', color: tab === t.id ? '#fff' : 'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROSTER ── */}
      {tab === 'roster' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {avatars.map(av => (
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

              <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setExpanded(expanded === av.id ? null : av.id)}
                  style={{ flex: 1, padding: '8px 16px', background: 'var(--surface-raised)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  View persona
                  {expanded === av.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button onClick={() => setEditing(av)} style={{ padding: '8px 12px', border: 'none', borderLeft: '1px solid var(--border)', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Edit3 size={13} />
                </button>
              </div>

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
                  {av.hookFormulas.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Hook Formulas</p>
                      {av.hookFormulas.map((h, i) => (
                        <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--surface-raised)', borderRadius: '8px', marginBottom: '4px', borderLeft: `3px solid ${av.accentColor}` }}>{h}</div>
                      ))}
                    </div>
                  )}
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setSelected(av.id); setTab('create') }}
                      style={{ flex: 1, padding: '9px', background: av.accentColor, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      Generate Content
                    </button>
                    <button onClick={() => deleteAvatar(av.id)}
                      style={{ padding: '9px 12px', background: 'rgba(220,0,0,0.08)', color: '#e05', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Avatar card */}
          <button onClick={() => setEditing({ ...BLANK_AVATAR })}
            style={{ background: 'var(--surface)', border: '2px dashed var(--border)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-subtle)', width: '100%' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={24} />
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>Add New Avatar</p>
            <p style={{ fontSize: '12px', textAlign: 'center' }}>Create a new AI influencer persona with custom voice, niche, and hook formulas</p>
          </button>
        </div>
      )}

      {/* ── GENERATE CONTENT ── */}
      {tab === 'create' && avatar && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {avatars.map(av => (
              <button key={av.id} onClick={() => setSelected(av.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', border: `2px solid ${selected === av.id ? av.accentColor : 'var(--border)'}`, background: selected === av.id ? av.bgColor : 'var(--surface)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '18px' }}>{av.emoji}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: selected === av.id ? av.accentColor : 'var(--text-muted)' }}>{av.name}</span>
              </button>
            ))}
          </div>

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
                placeholder={`What should ${avatar.name} talk about?`}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>PLATFORM</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
                {['Instagram Reels', 'TikTok', 'YouTube Shorts', 'LinkedIn', 'Facebook Reels'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => generateScript(selected)} disabled={loading || !topic.trim()}
                style={{ flex: 1, padding: '11px', background: avatar.accentColor, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                Generate for {avatar.name}
              </button>
              <button onClick={generateAllAvatars} disabled={loading || !topic.trim()}
                style={{ flex: 1, padding: '11px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                Generate for All {avatars.length}
              </button>
            </div>
          </div>

          {scripts.filter(s => s.avatarId === selected).map((s, i) => {
            const av = avatars.find(a => a.id === s.avatarId)
            if (!av) return null
            const key = `${s.avatarId}-${s.topic}`
            const isCopied = copied === key
            const vidId = videoResults[key]
            return (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', borderLeft: `4px solid ${av.accentColor}` }}>
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
                      {videoLoading === key ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Video size={12} />}
                      {vidId ? 'Rendering...' : 'Make Video'}
                    </button>
                    <button onClick={() => fileToRiver(s)} disabled={riverLoading === key || !!riverResults[key]}
                      title="Send through the River — becomes a post-card under the best account"
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: riverResults[key] ? '#E8F7F1' : 'var(--surface)', cursor: riverResults[key] ? 'default' : 'pointer', fontSize: '12px', fontWeight: 600, color: riverResults[key] ? '#3DAA7C' : 'var(--text-muted)' }}>
                      {riverLoading === key ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : riverResults[key] ? <CheckCircle2 size={12} /> : '🌊'}
                      {riverResults[key] ?? 'File'}
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
                  {vidId && vidId !== 'error' && <div style={{ padding: '10px', background: '#E8F7F1', borderRadius: '8px', fontSize: '12px', color: '#3DAA7C', fontWeight: 600 }}>✓ Video rendering in HeyGen — ID: {vidId}</div>}
                  {vidId === 'error' && <div style={{ padding: '10px', background: '#FEF5EA', borderRadius: '8px', fontSize: '12px', color: '#F2A65A', fontWeight: 600 }}>⚠ Video launch failed — check HeyGen photo ID for {av.name}</div>}
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
              const av = avatars.find(a => a.id === s.avatarId)
              if (!av) return null
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
                  <button onClick={() => copyScript(s)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: isCopied ? '#3DAA7C' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {isCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
