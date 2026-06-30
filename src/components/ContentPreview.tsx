'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Copy, CheckCheck, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react'
import type { RepurposeOutput } from '@/lib/ai'

// ── Types ────────────────────────────────────────────────────────────────────

type Platform = 'instagram' | 'tiktok' | 'youtube' | 'substack' | 'linkedin' | 'x' | 'pinterest'

type PreviewContent = {
  platform: Platform
  label: string
  emoji: string
  color: string
  items: { label: string; text: string }[]
}

// ── Editable text block ───────────────────────────────────────────────────────

function EditableText({ value, onChange, multiline = true }: { value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)

  if (multiline) return (
    <textarea
      ref={ref as React.RefObject<HTMLTextAreaElement>}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      style={{ width: '100%', border: editing ? '1px solid rgba(232,68,138,0.5)' : '1px solid transparent', borderRadius: '6px', padding: '6px 8px', fontSize: 'inherit', fontFamily: 'inherit', lineHeight: 'inherit', color: 'inherit', background: editing ? 'rgba(232,68,138,0.04)' : 'transparent', resize: 'vertical', outline: 'none', cursor: 'text', minHeight: '60px', transition: 'border 0.15s' }}
    />
  )
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      style={{ width: '100%', border: editing ? '1px solid rgba(232,68,138,0.5)' : '1px solid transparent', borderRadius: '6px', padding: '4px 8px', fontSize: 'inherit', fontFamily: 'inherit', color: 'inherit', background: editing ? 'rgba(232,68,138,0.04)' : 'transparent', outline: 'none', cursor: 'text', transition: 'border 0.15s' }}
    />
  )
}

// ── CopyBtn ───────────────────────────────────────────────────────────────────

function CopyBtn({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: small ? '3px 8px' : '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: copied ? 'rgba(61,170,124,0.2)' : 'rgba(255,255,255,0.08)', color: copied ? '#3DAA7C' : 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}>
      {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Platform Previews ─────────────────────────────────────────────────────────

function InstagramPreview({ content }: { content: PreviewContent }) {
  const [caption, setCaption] = useState(content.items.find(i => i.label === 'Caption (Medium)')?.text ?? '')
  const [hooks, setHooks] = useState(content.items.filter(i => i.label.startsWith('Hook')).map(i => i.text))
  const [activeHook, setActiveHook] = useState(0)

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Post card */}
      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 800 }}>M</div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#000', margin: 0 }}>ai.mom.at.work</p>
            <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>AI Mom · Just now</p>
          </div>
        </div>
        {/* Image area */}
        <div style={{ aspectRatio: '1', background: 'linear-gradient(135deg, #1C1F3B 0%, #2D3058 50%, #E8448A22 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Hook</p>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <EditableText value={hooks[activeHook] ?? ''} onChange={v => { const n=[...hooks]; n[activeHook]=v; setHooks(n) }} />
          </div>
          <div style={{ position: 'absolute', bottom: '12px', display: 'flex', gap: '5px' }}>
            {hooks.map((_, i) => <div key={i} onClick={() => setActiveHook(i)} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === activeHook ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer' }} />)}
          </div>
        </div>
        {/* Actions */}
        <div style={{ padding: '10px 14px 2px', display: 'flex', gap: '14px', color: '#000' }}>
          <span style={{ fontSize: '22px' }}>🤍</span><span style={{ fontSize: '22px' }}>💬</span><span style={{ fontSize: '22px' }}>✈️</span>
        </div>
        {/* Caption */}
        <div style={{ padding: '6px 14px 16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>ai.mom.at.work </span>
          <EditableText value={caption} onChange={setCaption} />
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}><CopyBtn text={caption} /></div>
    </div>
  )
}

function TikTokPreview({ content }: { content: PreviewContent }) {
  const [caption, setCaption] = useState(content.items.find(i => i.label === 'Caption (Short)')?.text ?? '')
  const [hook, setHook] = useState(content.items.find(i => i.label.startsWith('Hook'))?.text ?? '')

  return (
    <div style={{ maxWidth: '340px', margin: '0 auto' }}>
      <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', aspectRatio: '9/16', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1C1F3B 0%, #2D3058 40%, rgba(232,68,138,0.15) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: '10px' }}>Hook overlay</p>
            <EditableText value={hook} onChange={setHook} />
          </div>
        </div>
        {/* Right action bar */}
        <div style={{ position: 'absolute', right: '12px', bottom: '80px', display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center', color: '#fff', fontSize: '22px' }}>
          <div>🤍<div style={{ fontSize: '10px', textAlign: 'center' }}>47.2K</div></div>
          <div>💬<div style={{ fontSize: '10px', textAlign: 'center' }}>892</div></div>
          <div>↗️<div style={{ fontSize: '10px', textAlign: 'center' }}>Share</div></div>
        </div>
        {/* Bottom bar */}
        <div style={{ padding: '12px 16px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
          <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: '0 0 4px' }}>@aimomatwork</p>
          <EditableText value={caption} onChange={setCaption} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '6px' }}>🎵 Original Sound · AI Mom</p>
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}><CopyBtn text={`${hook}\n\n${caption}`} /></div>
    </div>
  )
}

function YouTubePreview({ content }: { content: PreviewContent }) {
  const item = content.items[0] ?? { label: 'Title', text: '', sub: '' }
  const [title, setTitle] = useState(item.text)
  const [desc, setDesc] = useState(item.label.includes('·') ? item.label.split('·')[1]?.trim() : content.items[1]?.text ?? '')

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #1C1F3B 0%, #2D3058 60%, rgba(232,68,138,0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: '#FF0000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '28px', marginLeft: '4px' }}>▶</span>
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f0f0f', lineHeight: 1.4 }}>
            <EditableText value={title} onChange={setTitle} multiline={false} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '12px', color: '#606060' }}>
            <span>AI Mom</span><span>·</span><span>1.2K views</span><span>·</span><span>2 hours ago</span>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#0f0f0f', lineHeight: 1.6 }}>
            <EditableText value={desc} onChange={setDesc} />
          </div>
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}><CopyBtn text={`${title}\n\n${desc}`} /></div>
    </div>
  )
}

function SubstackPreview({ content }: { content: PreviewContent }) {
  const [subject, setSubject] = useState(content.items[0]?.text ?? '')
  const [body, setBody] = useState(content.items[1]?.text ?? '')

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        {/* Substack header */}
        <div style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FF6719', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' }}>N</div>
          <div>
            <p style={{ margin: 0, fontFamily: '-apple-system, sans-serif', fontSize: '14px', fontWeight: 700 }}>Not Your Mom's Advice</p>
            <p style={{ margin: 0, fontFamily: '-apple-system, sans-serif', fontSize: '12px', color: '#888' }}>by Mandi Beck</p>
          </div>
        </div>
        <div style={{ padding: '28px 32px' }}>
          {/* Subject */}
          <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.3, marginBottom: '20px', color: '#0f0f0f' }}>
            <EditableText value={subject} onChange={setSubject} multiline={false} />
          </div>
          <div style={{ width: '40px', height: '3px', background: '#FF6719', borderRadius: '2px', marginBottom: '20px' }} />
          {/* Body */}
          <div style={{ fontSize: '17px', lineHeight: 1.8, color: '#1a1a1a' }}>
            <EditableText value={body} onChange={setBody} />
          </div>
          <div style={{ marginTop: '24px', padding: '16px', background: '#FFF7F0', borderRadius: '8px', borderLeft: '3px solid #FF6719' }}>
            <p style={{ margin: 0, fontSize: '13px', fontFamily: '-apple-system, sans-serif', color: '#888' }}>← Edit the text above. Your Substack brand colors apply automatically.</p>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}><CopyBtn text={`${subject}\n\n${body}`} /></div>
    </div>
  )
}

function LinkedInPreview({ content }: { content: PreviewContent }) {
  const [post, setPost] = useState(content.items[0]?.text ?? '')

  return (
    <div style={{ maxWidth: '540px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
        <div style={{ padding: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px', flexShrink: 0 }}>M</div>
          <div>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'rgba(0,0,0,0.9)' }}>Mandi Beck</p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(0,0,0,0.6)' }}>AI Mom · Building an AI-powered content empire · 1st</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(0,0,0,0.45)' }}>Just now · 🌐</p>
          </div>
        </div>
        <div style={{ padding: '0 16px 12px', fontSize: '14px', color: 'rgba(0,0,0,0.9)', lineHeight: 1.6 }}>
          <EditableText value={post} onChange={setPost} />
        </div>
        <div style={{ borderTop: '1px solid #e0e0e0', padding: '8px 16px', display: 'flex', gap: '16px', fontSize: '13px', color: 'rgba(0,0,0,0.6)' }}>
          <span>👍 Like</span><span>💬 Comment</span><span>↗️ Repost</span><span>✉️ Send</span>
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}><CopyBtn text={post} /></div>
    </div>
  )
}

function XPreview({ content }: { content: PreviewContent }) {
  const [tweets, setTweets] = useState(content.items.map(i => i.text))

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {tweets.map((tweet, idx) => (
        <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e7e7e7' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>M</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#000' }}>Mandi Beck</span>
                <span style={{ fontSize: '13px', color: '#666' }}>@mandibeck · {idx === 0 ? 'now' : `${idx * 2}s`}</span>
              </div>
              <EditableText value={tweet} onChange={v => { const n=[...tweets]; n[idx]=v; setTweets(n) }} />
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#666' }}>
                <span>💬</span><span>🔁</span><span>🤍</span><span>📤</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><CopyBtn text={tweets.join('\n\n')} /></div>
    </div>
  )
}

function PinterestPreview({ content }: { content: PreviewContent }) {
  const [pins, setPins] = useState(content.items.map(i => i.text))

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {pins.slice(0, 4).map((pin, idx) => (
          <div key={idx} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ aspectRatio: '2/3', background: `linear-gradient(135deg, hsl(${idx * 60 + 300}, 60%, 25%) 0%, hsl(${idx * 60 + 330}, 70%, 35%) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>{pin}</p>
            </div>
            <div style={{ padding: '8px 10px 10px' }}>
              <EditableText value={pin} onChange={v => { const n=[...pins]; n[idx]=v; setPins(n) }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}><CopyBtn text={pins.join('\n')} /></div>
    </div>
  )
}

// ── Build platform tabs from RepurposeOutput ──────────────────────────────────

function buildPlatforms(output: RepurposeOutput): PreviewContent[] {
  return [
    {
      platform: 'instagram', label: 'Instagram', emoji: '📸', color: '#E1306C',
      items: [
        ...output.reels_hooks.map((h, i) => ({ label: `Hook ${i + 1}`, text: h })),
        { label: 'Caption (Short)', text: output.captions.short },
        { label: 'Caption (Medium)', text: output.captions.medium },
        { label: 'Caption (Long)', text: output.captions.long },
      ],
    },
    {
      platform: 'tiktok', label: 'TikTok', emoji: '🎵', color: '#69C9D0',
      items: [
        ...output.tiktok_angles.map((a, i) => ({ label: `Hook ${i + 1}`, text: a.hook })),
        { label: 'Caption (Short)', text: output.captions.short },
      ],
    },
    {
      platform: 'youtube', label: 'YouTube', emoji: '▶️', color: '#FF0000',
      items: output.youtube.map(y => ({ label: y.title, text: y.title, sub: y.description })),
    },
    {
      platform: 'substack', label: 'Substack', emoji: '📝', color: '#FF6719',
      items: [
        { label: 'Subject', text: output.email_subjects[0] ?? '' },
        { label: 'Body', text: output.newsletter_angle },
      ],
    },
    {
      platform: 'linkedin', label: 'LinkedIn', emoji: '💼', color: '#0A66C2',
      items: output.linkedin_posts.map((p, i) => ({ label: `Post ${i + 1}`, text: p })),
    },
    {
      platform: 'x', label: 'X / Twitter', emoji: '✖️', color: '#000',
      items: output.thread_tweet.map((t, i) => ({ label: `Tweet ${i + 1}`, text: t })),
    },
    {
      platform: 'pinterest', label: 'Pinterest', emoji: '📌', color: '#E60023',
      items: output.pinterest_pins.map((p, i) => ({ label: `Pin ${i + 1}`, text: p })),
    },
  ]
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function ContentPreview({ output, onClose }: { output: RepurposeOutput; onClose: () => void }) {
  const platforms = buildPlatforms(output)
  const [active, setActive] = useState<Platform>('instagram')
  const current = platforms.find(p => p.platform === active)!

  // Trap scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const idx = platforms.findIndex(p => p.platform === active)
  const prev = () => setActive(platforms[(idx - 1 + platforms.length) % platforms.length].platform)
  const next = () => setActive(platforms[(idx + 1) % platforms.length].platform)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: 'rgba(15,15,25,0.95)', backdropFilter: 'blur(8px)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Edit3 size={14} color="var(--hot-pink)" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Platform Preview</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Click any text to edit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginRight: '8px' }}>
            {idx + 1} / {platforms.length}
          </span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 14px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <X size={13} /> Close
          </button>
        </div>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', flexShrink: 0 }}>
        {platforms.map(p => (
          <button key={p.platform} onClick={() => setActive(p.platform)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', fontSize: '12px', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              background: active === p.platform ? p.color : 'transparent',
              borderColor: active === p.platform ? p.color : 'rgba(255,255,255,0.1)',
              color: active === p.platform ? '#fff' : 'rgba(255,255,255,0.45)',
            }}>
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      {/* Preview area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: '700px' }}>
          {active === 'instagram' && <InstagramPreview content={current} />}
          {active === 'tiktok'    && <TikTokPreview content={current} />}
          {active === 'youtube'   && <YouTubePreview content={current} />}
          {active === 'substack'  && <SubstackPreview content={current} />}
          {active === 'linkedin'  && <LinkedInPreview content={current} />}
          {active === 'x'         && <XPreview content={current} />}
          {active === 'pinterest' && <PinterestPreview content={current} />}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <button onClick={prev} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
          <ChevronLeft size={13} /> Previous
        </button>
        <span style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', padding: '0 8px' }}>
          {current.emoji} {current.label}
        </span>
        <button onClick={next} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}
