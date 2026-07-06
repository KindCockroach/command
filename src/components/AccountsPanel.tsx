'use client'
import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, CheckCircle2, AlertCircle, Clock, Lock, RefreshCw, Copy, Archive, Pencil, X, Save, Plus, CheckSquare, Eye, Heart, MessageCircle, Send, Bookmark } from 'lucide-react'
import type { BrandAccount, ContentPiece } from '@/lib/db'

// ── Platform theming: the flip side wears the platform's colors ───────────────
const PLATFORM_THEMES: Record<string, { color: string; gradient: string; fg: string }> = {
  Instagram: { color: '#E1306C', gradient: 'linear-gradient(90deg, #833AB4 0%, #E1306C 50%, #F77737 100%)', fg: '#fff' },
  TikTok:    { color: '#010101', gradient: 'linear-gradient(90deg, #010101 0%, #2b2b2b 60%, #EE1D52 100%)', fg: '#fff' },
  YouTube:   { color: '#FF0000', gradient: 'linear-gradient(90deg, #CC0000 0%, #FF0000 100%)', fg: '#fff' },
  Facebook:  { color: '#1877F2', gradient: 'linear-gradient(90deg, #1877F2 0%, #4293FB 100%)', fg: '#fff' },
  LinkedIn:  { color: '#0A66C2', gradient: 'linear-gradient(90deg, #0A66C2 0%, #378FE9 100%)', fg: '#fff' },
  Threads:   { color: '#101010', gradient: 'linear-gradient(90deg, #101010 0%, #333 100%)', fg: '#fff' },
  Pinterest: { color: '#E60023', gradient: 'linear-gradient(90deg, #BD081C 0%, #E60023 100%)', fg: '#fff' },
  Beehiiv:   { color: '#FF6719', gradient: 'linear-gradient(90deg, #E85A0C 0%, #FF6719 100%)', fg: '#fff' },
}
const themeFor = (platform: string) => PLATFORM_THEMES[platform] ?? { color: 'var(--purple)', gradient: 'var(--purple)', fg: '#fff' }

// ── Copy-ready caption: strip generator scaffolding, normalize hashtags ──────
function cleanCaption(post: ContentPiece): string {
  let body = post.description || ''
  // If the generator concatenated sections, extract just the caption
  const capMatch = body.match(/(?:^|\n)Caption:\s*([\s\S]*?)(?=\n\n(?:Hook|Script|Headline|Subject|Preview|Description):|$)/)
  if (capMatch) body = capMatch[1].trim()
  else body = body.replace(/^\s*(?:Hook|Script):.*$/gm, '').trim()
  return body
}

function cleanHashtags(post: ContentPiece): string {
  let h = (post.hashtags || '').trim()
  if (!h) return ''
  // Comma-separated → space-separated; ensure each tag has #
  h = h.split(/[,\s]+/).filter(Boolean).map(t => t.startsWith('#') ? t : `#${t.replace(/^#+/, '')}`).join(' ')
  return h
}

const pasteReady = (post: ContentPiece) => [cleanCaption(post), cleanHashtags(post)].filter(Boolean).join('\n\n')

// ── Platform preview: what the post will look like in the wild ───────────────
function PlatformPreviewModal({ post, account, onClose }: { post: ContentPiece; account: BrandAccount; onClose: () => void }) {
  const theme = themeFor(account.platform)
  const caption = cleanCaption(post)
  const hashtags = cleanHashtags(post)
  const [copied, setCopied] = useState(false)
  const handle = account.handle.replace('@', '')
  const isVideo = post.type === 'video' || post.type.includes('reel') || post.platforms?.some(p => p.includes('reel') || p.includes('tiktok'))
  const isYouTube = account.platform === 'YouTube'
  const isThreads = account.platform === 'Threads'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.6)', backdropFilter: 'blur(5px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', background: 'var(--surface)', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}>
        {/* Themed header */}
        <div style={{ background: theme.gradient, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '20px 20px 0 0', position: 'sticky', top: 0, zIndex: 2 }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: theme.fg }}>{account.platform} preview</span>
          <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', color: theme.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Phone-style mock */}
          <div style={{ border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', background: isThreads || account.platform === 'TikTok' ? '#101010' : '#fff' }}>
            {/* Post header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: theme.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>{account.emoji}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: isThreads || account.platform === 'TikTok' ? '#fff' : '#111' }}>{handle}</p>
                {isYouTube && <p style={{ fontSize: '10px', color: '#666' }}>{account.brand_name}</p>}
              </div>
              <span style={{ color: isThreads || account.platform === 'TikTok' ? '#888' : '#999', fontSize: '16px', lineHeight: 0.4 }}>…</span>
            </div>

            {/* Media area */}
            <div style={{ aspectRatio: isYouTube ? '16 / 9' : isVideo ? '9 / 16' : '1 / 1', maxHeight: '380px', background: post.media_url ? '#000' : 'linear-gradient(135deg, #1C1F3B 0%, #3a2d5c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {post.media_url ? (
                post.media_url.match(/\.(mp4|mov|webm)/i)
                  ? <video src={post.media_url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <img src={post.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>🎨 visual to create</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{post.image_prompt || 'No visual yet'}</p>
                </div>
              )}
              {/* On-screen text overlay */}
              {post.onscreen_text && (
                <div style={{ position: 'absolute', bottom: '14px', left: '12px', right: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 900, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.9)', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{post.onscreen_text.split('\n')[0]}</p>
                </div>
              )}
            </div>

            {/* Action row */}
            {!isYouTube && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px', color: isThreads || account.platform === 'TikTok' ? '#fff' : '#111' }}>
                <Heart size={20} /> <MessageCircle size={20} /> <Send size={20} />
                <span style={{ marginLeft: 'auto' }}><Bookmark size={20} /></span>
              </div>
            )}

            {/* Caption */}
            <div style={{ padding: isYouTube ? '10px 12px 14px' : '0 12px 14px' }}>
              {isYouTube ? (
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#111', lineHeight: 1.35 }}>{post.title}</p>
              ) : (
                <p style={{ fontSize: '12px', color: isThreads || account.platform === 'TikTok' ? '#eee' : '#222', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  <strong>{handle}</strong> {caption.length > 240 ? caption.slice(0, 240) + '… more' : caption}
                </p>
              )}
              {hashtags && !isYouTube && <p style={{ fontSize: '11px', color: theme.color === '#010101' || theme.color === '#101010' ? '#7bb0ff' : '#3b5fa8', marginTop: '4px', lineHeight: 1.5 }}>{hashtags.split(' ').slice(0, 8).join(' ')}{hashtags.split(' ').length > 8 ? ' …' : ''}</p>}
            </div>
          </div>

          {/* Copy-ready block — paste without editing */}
          <div style={{ marginTop: '14px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-raised, var(--bg))' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)' }}>Ready to paste — caption + hashtags</p>
              <button onClick={() => { navigator.clipboard.writeText(pasteReady(post)); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: copied ? '#3DAA7C' : theme.color, color: '#fff', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>
                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy all'}
              </button>
            </div>
            <p style={{ padding: '12px', fontSize: '12px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px', overflowY: 'auto', margin: 0 }}>{pasteReady(post)}</p>
          </div>

          {post.onscreen_text && (
            <div style={{ marginTop: '10px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-raised, var(--bg))' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)' }}>On-screen text</p>
                <button onClick={() => navigator.clipboard.writeText(post.onscreen_text!)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 700, fontSize: '10px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Copy size={11} /> Copy
                </button>
              </div>
              <p style={{ padding: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{post.onscreen_text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const BLANK_ACCOUNT: Partial<BrandAccount> = {
  id: '', handle: '', platform: 'Instagram', status: 'planned', priority: 'medium', color: '#E8448A', emoji: '✨',
  brand_name: '', topic: '', bio: '', mission: '', content_format: '', underlying_message: '', problem_message: '',
  solution_message: '', transformation: '', the_how: '', tone: '', beliefs: [], hooks: [], offer: '', offer_price: '', url: '', notes: '',
}

// ── Full account editor: every field of the brand DNA is editable in-station ──
function AccountEditorModal({ account, onSave, onDelete, onClose }: { account: Partial<BrandAccount>; onSave: (a: BrandAccount) => void; onDelete?: (id: string) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<BrandAccount>>({ ...BLANK_ACCOUNT, ...account })
  const [saving, setSaving] = useState(false)
  const isNew = !account.id
  const set = (k: keyof BrandAccount, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.handle) return
    setSaving(true)
    const id = form.id || (form.handle ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
    const res = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id }) })
    onSave(await res.json())
    setSaving(false)
  }

  const fld = { padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const area = { ...fld, resize: 'vertical' as const }
  const lbl = (t: string) => <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-subtle)', marginBottom: '4px' }}>{t}</label>

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>{isNew ? 'New Account' : `Edit ${account.handle}`}</h3>
          <button onClick={onClose} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1.5fr 1fr 1fr', gap: '10px' }}>
            <div>{lbl('Emoji')}<input value={form.emoji ?? ''} onChange={e => set('emoji', e.target.value)} style={{ ...fld, textAlign: 'center', fontSize: '20px' }} /></div>
            <div>{lbl('Handle')}<input value={form.handle ?? ''} onChange={e => set('handle', e.target.value)} placeholder="@handle" style={fld} /></div>
            <div>{lbl('Platform')}
              <select value={form.platform ?? 'Instagram'} onChange={e => set('platform', e.target.value)} style={{ ...fld, cursor: 'pointer' }}>
                {['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Threads', 'Pinterest', 'Beehiiv', 'Facebook'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>{lbl('Brand name')}<input value={form.brand_name ?? ''} onChange={e => set('brand_name', e.target.value)} style={fld} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>{lbl('Status')}
              <select value={form.status ?? 'planned'} onChange={e => set('status', e.target.value)} style={{ ...fld, cursor: 'pointer' }}>
                {['active', 'restricted', 'planned', 'paused'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>{lbl('Priority')}
              <select value={form.priority ?? 'medium'} onChange={e => set('priority', e.target.value)} style={{ ...fld, cursor: 'pointer' }}>
                {['high', 'medium', 'low'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>{lbl('Color')}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="color" value={form.color ?? '#E8448A'} onChange={e => set('color', e.target.value)} style={{ width: '38px', height: '38px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', padding: '2px' }} />
                <input value={form.color ?? ''} onChange={e => set('color', e.target.value)} style={{ ...fld, fontSize: '11px' }} />
              </div>
            </div>
          </div>

          <div>{lbl('Purpose / Mission — what is this account FOR')}<textarea value={form.mission ?? ''} onChange={e => set('mission', e.target.value)} rows={2} style={area} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{lbl('Topic / Niche')}<input value={form.topic ?? ''} onChange={e => set('topic', e.target.value)} style={fld} /></div>
            <div>{lbl('Content format')}<input value={form.content_format ?? ''} onChange={e => set('content_format', e.target.value)} style={fld} /></div>
          </div>
          <div>{lbl('Bio')}<textarea value={form.bio ?? ''} onChange={e => set('bio', e.target.value)} rows={2} style={area} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{lbl('Problem message')}<textarea value={form.problem_message ?? ''} onChange={e => set('problem_message', e.target.value)} rows={2} style={area} /></div>
            <div>{lbl('Solution message')}<textarea value={form.solution_message ?? ''} onChange={e => set('solution_message', e.target.value)} rows={2} style={area} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{lbl('Underlying message')}<input value={form.underlying_message ?? ''} onChange={e => set('underlying_message', e.target.value)} style={fld} /></div>
            <div>{lbl('Transformation (from X to Y)')}<input value={form.transformation ?? ''} onChange={e => set('transformation', e.target.value)} style={fld} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{lbl('Tone')}<input value={form.tone ?? ''} onChange={e => set('tone', e.target.value)} style={fld} /></div>
            <div>{lbl('The how')}<input value={form.the_how ?? ''} onChange={e => set('the_how', e.target.value)} style={fld} /></div>
          </div>

          <div>{lbl('Beliefs (one per line)')}
            <textarea value={(form.beliefs ?? []).join('\n')} onChange={e => set('beliefs', e.target.value.split('\n').filter(Boolean))} rows={3} style={area} />
          </div>
          <div>{lbl('Hook templates (one per line)')}
            <textarea value={(form.hooks ?? []).join('\n')} onChange={e => set('hooks', e.target.value.split('\n').filter(Boolean))} rows={4} style={area} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>{lbl('Offer')}<input value={form.offer ?? ''} onChange={e => set('offer', e.target.value)} style={fld} /></div>
            <div>{lbl('Offer price')}<input value={form.offer_price ?? ''} onChange={e => set('offer_price', e.target.value)} style={fld} /></div>
          </div>
          <div>{lbl('Profile URL')}<input value={form.url ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://instagram.com/..." style={fld} /></div>
          <div>{lbl('Non-negotiable rules / notes (the generator obeys these)')}<textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={3} style={area} /></div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--surface)' }}>
          {!isNew && onDelete ? (
            <button onClick={() => { if (confirm(`Delete ${account.handle}? Its content stays but loses its account link.`)) onDelete(account.id!) }}
              style={{ padding: '9px 14px', borderRadius: '10px', border: 'none', background: 'rgba(224,82,82,0.1)', color: '#E05252', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Delete account</button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.handle}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving || !form.handle ? 0.6 : 1 }}>
              <Save size={13} /> {saving ? 'Saving…' : isNew ? 'Create Account' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type AccountStatus = 'active' | 'restricted' | 'planned' | 'paused'

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:     { label: 'Active',      color: '#3DAA7C', bg: '#E8F7F1',   icon: <CheckCircle2 size={11} /> },
  restricted: { label: 'Restricted',  color: '#E05252', bg: '#FEF2F2',   icon: <AlertCircle size={11} /> },
  planned:    { label: 'Planned',     color: '#F2A65A', bg: '#FEF5EA',   icon: <Clock size={11} /> },
  paused:     { label: 'Paused',      color: '#9B8FA6', bg: '#F5F3F7',   icon: <Lock size={11} /> },
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const PLATFORM_URLS: Record<string, (handle: string) => string> = {
  Instagram: h => `https://instagram.com/${h.replace('@', '').replace(/\s.*/, '')}`,
  TikTok: h => `https://tiktok.com/@${h.replace('@', '').replace(/\s.*/, '')}`,
  YouTube: h => `https://youtube.com/results?search_query=${encodeURIComponent(h)}`,
  LinkedIn: () => 'https://linkedin.com/feed',
  Beehiiv: () => 'https://app.beehiiv.com',
}

function profileUrl(acct: BrandAccount): string {
  if (acct.url) return acct.url
  const fn = PLATFORM_URLS[acct.platform]
  return fn ? fn(acct.handle) : '#'
}

// ── Post card shown on the flip side ──────────────────────────────────────────
function PostCard({ post, accentColor, onApprove, approving, onChanged, onPreview, accounts }: { post: ContentPiece; accentColor: string; onApprove: (p: ContentPiece) => void; approving: boolean; onChanged?: () => void; onPreview?: (p: ContentPiece) => void; accounts?: BrandAccount[] }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [answers, setAnswers] = useState<string[]>([])
  const [completing, setCompleting] = useState(false)
  const hasQuestions = (post.open_questions?.length ?? 0) > 0

  const [marking, setMarking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  // Attach a photo/video to this post — uploads to R2, saves media_url on the card
  const attachMedia = async (file: File) => {
    setUploading(true)
    setUploadErr('')
    try {
      const presign = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'post-media' }),
      }).then(r => r.json())
      if (!presign.uploadUrl) throw new Error(presign.error || 'no upload url')
      const put = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!put.ok) throw new Error(`upload failed (${put.status})`)
      await fetch('/api/content', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, media_url: presign.publicUrl }),
      })
      onChanged?.()
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'upload failed')
    } finally {
      setUploading(false)
    }
  }

  const [moving, setMoving] = useState(false)
  const [showMove, setShowMove] = useState(false)

  // Move a suggestion to a different account — the river recomposes it in that account's voice
  const moveTo = async (targetId: string) => {
    if (targetId === post.account_id) { setShowMove(false); return }
    setMoving(true)
    try {
      const res = await fetch('/api/content/reassign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: post.id, accountId: targetId }),
      })
      if (!res.ok) {
        await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post.id, account_id: targetId }) })
      }
      setShowMove(false)
      onChanged?.()
    } finally {
      setMoving(false)
    }
  }

  // Manual-mode completion: Mandi posted it herself → published + archived, counts toward goals
  const markPosted = async () => {
    setMarking(true)
    try {
      await fetch('/api/content', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, status: 'published' }),
      })
      await fetch('/api/content', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, status: 'archived' }),
      })
      onChanged?.()
    } finally {
      setMarking(false)
    }
  }

  const completePost = async () => {
    setCompleting(true)
    try {
      const res = await fetch('/api/river/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: post.id, answers }),
      })
      const d = await res.json()
      if (d.complete) onChanged?.()
    } finally {
      setCompleting(false)
    }
  }
  const isPending = post.status === 'ready' || post.status === 'held' || post.status === 'in_progress' || post.status === 'idea'
  const isApproved = post.status === 'approved'
  const isScheduled = post.status === 'scheduled'

  const copyAll = () => {
    navigator.clipboard.writeText(pasteReady(post))
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  // Per-section copy button with its own confirmation
  const SectionCopy = ({ text }: { text: string }) => {
    const [ok, setOk] = useState(false)
    return (
      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: ok ? '#3DAA7C' : 'var(--text-muted)', flexShrink: 0 }}>
        {ok ? <CheckCircle2 size={11} /> : <Copy size={11} />} {ok ? 'Copied' : 'Copy'}
      </button>
    )
  }

  const Section = ({ label, text, children, bold }: { label: string; text?: string; children?: React.ReactNode; bold?: boolean }) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-subtle)' }}>{label}</p>
        {text && <SectionCopy text={text} />}
      </div>
      {children ?? <p style={{ fontSize: bold ? '13px' : '12px', fontWeight: bold ? 700 : 400, color: bold ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</p>}
    </div>
  )

  const statusChip = hasQuestions
    ? { label: '❓ Needs your answers', bg: 'rgba(224,82,82,0.1)', color: '#E05252' }
    : isApproved ? { label: 'Approved · awaiting GHL', bg: 'rgba(242,166,90,0.14)', color: '#C47A1A' }
    : isScheduled ? { label: `Scheduled${post.scheduled_at ? ` · ${new Date(post.scheduled_at).toLocaleDateString()}` : ''}`, bg: 'rgba(76,201,240,0.14)', color: '#2B9CC4' }
    : (post.status === 'published' || post.status === 'archived') ? { label: '✓ Posted', bg: 'rgba(61,170,124,0.14)', color: '#3DAA7C' }
    : { label: 'Ready for review', bg: 'var(--surface-raised, rgba(0,0,0,0.04))', color: 'var(--text-muted)' }

  return (
    <div style={{ border: `1px solid ${open ? accentColor : 'var(--border)'}`, borderRadius: '12px', background: 'var(--bg)', flexShrink: 0, transition: 'border-color 0.15s' }}>
      {/* Header row — click to expand */}
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', cursor: 'pointer' }}>
        {/* Approval checkbox */}
        <button
          onClick={e => { e.stopPropagation(); if (isPending && !approving && !hasQuestions) onApprove(post) }}
          title={hasQuestions ? 'Answer its questions first' : isPending ? 'Approve → send to scheduler' : isApproved ? 'Approved — waiting for GHL connection' : isScheduled ? 'Scheduled in GHL' : 'Posted'}
          style={{
            width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, marginTop: '1px',
            border: isPending ? `2px solid ${hasQuestions ? '#E05252' : 'var(--border)'}` : 'none',
            cursor: isPending && !hasQuestions ? 'pointer' : 'default',
            background: isPending ? 'transparent' : isApproved ? '#F2A65A' : isScheduled ? '#4CC9F0' : '#3DAA7C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {approving ? <RefreshCw size={11} color="#999" style={{ animation: 'spin 1s linear infinite' }} />
            : !isPending && <CheckCircle2 size={12} color="#fff" />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>{post.title}</p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '10px', background: `${accentColor}18`, color: accentColor }}>{post.type.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: statusChip.bg, color: statusChip.color }}>{statusChip.label}</span>
            {post.media_url ? <span style={{ fontSize: '9px', color: '#3DAA7C', fontWeight: 700 }}>📎 media</span>
              : post.image_prompt ? <span style={{ fontSize: '9px', color: 'var(--text-subtle)' }}>🎨 prompt ready</span> : null}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          {onPreview && (
            <button onClick={e => { e.stopPropagation(); onPreview(post) }} title="Preview on platform" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', padding: '4px', display: 'flex' }}>
              <Eye size={14} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); copyAll() }} title="Copy paste-ready caption + hashtags" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copied ? '#3DAA7C' : 'var(--text-subtle)', padding: '4px', display: 'flex' }}>
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          </button>
          <span style={{ color: 'var(--text-subtle)', fontSize: '10px', padding: '4px' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Open questions — answer here, river finishes the post */}
          {hasQuestions && (
            <div style={{ padding: '12px', background: 'rgba(224,82,82,0.05)', borderRadius: '10px', border: '1px solid rgba(224,82,82,0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#E05252' }}>Answer these — the river finishes the post</p>
              {post.open_questions!.map((q, i) => (
                <div key={i}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{i + 1}. {q}</p>
                  <textarea value={answers[i] ?? ''} onChange={e => setAnswers(a => { const next = [...a]; next[i] = e.target.value; return next })}
                    rows={2} placeholder="Your answer…"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <button onClick={completePost} disabled={completing || answers.filter(a => a?.trim()).length === 0}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '10px', borderRadius: '8px', border: 'none', background: '#E05252', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', opacity: completing || answers.filter(a => a?.trim()).length === 0 ? 0.6 : 1 }}>
                {completing ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Composing…</> : '🌊 Complete this post'}
              </button>
            </div>
          )}

          {/* Visual: media or prompt */}
          {post.media_url ? (
            <div>
              {/\.(mp4|mov|webm|m4v)(\?|$)/i.test(post.media_url)
                ? <video src={post.media_url} controls style={{ width: '100%', borderRadius: '10px', maxHeight: '260px', background: '#000' }} />
                : <img src={post.media_url} alt="" style={{ width: '100%', borderRadius: '10px', maxHeight: '220px', objectFit: 'cover' }} />}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', cursor: 'pointer', marginTop: '4px' }}>
                {uploading ? 'Uploading…' : 'Replace media'}
                <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) attachMedia(f); e.target.value = '' }} />
              </label>
            </div>
          ) : (
            <>
              {post.image_prompt && <Section label="🎨 Image / Video Prompt" text={post.image_prompt} />}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', borderRadius: '10px', border: '2px dashed var(--border)', cursor: uploading ? 'default' : 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface)' }}>
                {uploading ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</> : <>📎 Attach photo / video to this post</>}
                <input type="file" accept="image/*,video/*" style={{ display: 'none' }} disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) attachMedia(f); e.target.value = '' }} />
              </label>
              {uploadErr && <p style={{ fontSize: '10px', color: '#E05252' }}>⚠ {uploadErr}</p>}
            </>
          )}

          {post.onscreen_text && <Section label="On-Screen Text / Hook" text={post.onscreen_text} bold />}
          <Section label="Body / Caption / Script" text={post.description} />
          {post.hashtags && (
            <Section label="Hashtags / Metadata" text={post.hashtags}>
              <p style={{ fontSize: '11px', color: accentColor, lineHeight: 1.6, wordBreak: 'break-word' }}>{post.hashtags}</p>
            </Section>
          )}

          {/* Move to another account */}
          {accounts && accounts.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMove(v => !v)} disabled={moving}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '9px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                {moving ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Moving &amp; recomposing…</> : <>↔ Move to another account</>}
              </button>
              {showMove && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 5, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', padding: '6px 8px 4px' }}>Rewrite this idea for…</p>
                  {accounts.filter(a => a.id !== post.account_id).map(a => (
                    <button key={a.id} onClick={() => moveTo(a.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '12px', color: 'var(--text)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ fontSize: '15px' }}>{a.emoji}</span>
                      <span style={{ fontWeight: 700 }}>{a.handle}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-subtle)', marginLeft: 'auto' }}>{a.platform}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action bar */}
          {isPending && !hasQuestions && (
            <button onClick={() => onApprove(post)} disabled={approving}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', borderRadius: '10px', border: 'none', background: accentColor, color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: approving ? 0.7 : 1 }}>
              {approving ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Approving…</> : <><CheckCircle2 size={14} /> Approve — send to scheduler</>}
            </button>
          )}
          {(isApproved || isScheduled) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {isApproved && (
                <p style={{ fontSize: '11px', color: '#C47A1A', background: 'rgba(242,166,90,0.1)', padding: '8px 10px', borderRadius: '8px', lineHeight: 1.5 }}>
                  GHL isn&apos;t connected yet, so nothing is scheduled automatically. <strong>Manual mode:</strong> Copy the post above, publish it on the platform yourself, then mark it posted below.
                </p>
              )}
              <button onClick={markPosted} disabled={marking}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', borderRadius: '10px', border: 'none', background: '#3DAA7C', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: marking ? 0.7 : 1 }}>
                {marking ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Archiving…</> : <>📤 I posted this — archive it</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AccountsPanel() {
  const [filter, setFilter] = useState<AccountStatus | 'all'>('all')
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [content, setContent] = useState<ContentPiece[]>([])
  const [flipped, setFlipped] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [ghlConfigured, setGhlConfigured] = useState<boolean | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [queueFilter, setQueueFilter] = useState('all')
  const [editing, setEditing] = useState<Partial<BrandAccount> | null>(null)
  const [previewPost, setPreviewPost] = useState<ContentPiece | null>(null)
  // Bulk edit
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState<{ status: string; priority: string; color: string }>({ status: '', priority: '', color: '' })
  const [bulkSaving, setBulkSaving] = useState(false)

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const applyBulk = async () => {
    if (selected.size === 0) return
    setBulkSaving(true)
    try {
      const updates: Partial<BrandAccount> = {}
      if (bulk.status) updates.status = bulk.status as BrandAccount['status']
      if (bulk.priority) updates.priority = bulk.priority as BrandAccount['priority']
      if (bulk.color) updates.color = bulk.color
      if (!Object.keys(updates).length) return
      for (const id of selected) {
        await fetch('/api/accounts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
      }
      const fresh = await fetch('/api/accounts').then(r => r.json())
      setAccounts(fresh)
      setSelected(new Set())
      setSelectMode(false)
      setBulk({ status: '', priority: '', color: '' })
    } finally {
      setBulkSaving(false)
    }
  }

  const handleAccountSaved = (saved: BrandAccount) => {
    setAccounts(prev => prev.find(a => a.id === saved.id) ? prev.map(a => a.id === saved.id ? saved : a) : [...prev, saved])
    setEditing(null)
  }

  const handleAccountDeleted = async (id: string) => {
    await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' })
    setAccounts(prev => prev.filter(a => a.id !== id))
    setEditing(null)
  }

  const loadContent = useCallback(() => {
    // Fetch everything including held/archived so account stats are complete
    Promise.all([
      fetch('/api/content').then(r => r.json()),
      fetch('/api/content?status=held').then(r => r.json()),
      fetch('/api/content?status=archived').then(r => r.json()),
    ]).then(([main, held, arch]: ContentPiece[][]) => {
      const seen = new Set<number>()
      const all = [...main, ...held, ...arch].filter(c => !seen.has(c.id) && seen.add(c.id))
      setContent(all)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    // Arrived via a "Publish now" link? Open flipped to that account's queue
    const handoff = localStorage.getItem('station-flip-account')
    if (handoff !== null) {
      localStorage.removeItem('station-flip-account')
      if (handoff) { setFlipped(handoff); setQueueFilter('all') }
    }
    fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
    loadContent()
    // GHL sync: check connection + auto-archive anything GHL has posted
    fetch('/api/ghl').then(r => r.json()).then(d => {
      setGhlConfigured(!!d.configured)
      if (d.archived?.length) loadContent()
    }).catch(() => setGhlConfigured(false))
  }, [loadContent])

  const approve = async (post: ContentPiece) => {
    setApprovingId(post.id)
    try {
      await fetch('/api/ghl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: post.id }),
      })
      loadContent()
    } finally {
      setApprovingId(null)
    }
  }

  const postsFor = (acctId: string) => content.filter(c => c.account_id === acctId)

  const sorted = [...accounts]
    .filter(a => filter === 'all' || a.status === filter)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const counts = {
    all: accounts.length,
    active: accounts.filter(a => a.status === 'active').length,
    restricted: accounts.filter(a => a.status === 'restricted').length,
    planned: accounts.filter(a => a.status === 'planned').length,
    paused: accounts.filter(a => a.status === 'paused').length,
  }

  return (
    <div className="space-y-4">
      {editing && (
        <AccountEditorModal account={editing} onSave={handleAccountSaved} onDelete={editing.id ? handleAccountDeleted : undefined} onClose={() => setEditing(null)} />
      )}

      {/* ── FLIP SIDE: layered overlay wearing the platform's colors ── */}
      {(() => {
        const acct = accounts.find(a => a.id === flipped)
        if (!acct) return null
        const theme = themeFor(acct.platform)
        const posts = postsFor(acct.id)
        const queued = posts.filter(p => ['idea', 'in_progress', 'ready', 'held'].includes(p.status))
        const approved = posts.filter(p => p.status === 'approved')
        const scheduled = posts.filter(p => p.status === 'scheduled')
        const posted = posts.filter(p => p.status === 'published' || p.status === 'archived')
        const needsAnswers = queued.filter(p => (p.open_questions?.length ?? 0) > 0)
        const reviewable = queued.filter(p => !(p.open_questions?.length ?? 0))
        const buckets = [
          { key: 'all', label: 'All active', count: queued.length + approved.length + scheduled.length, posts: [...needsAnswers, ...reviewable, ...approved, ...scheduled] },
          { key: 'answers', label: '❓ Needs answers', count: needsAnswers.length, posts: needsAnswers },
          { key: 'review', label: 'To review', count: reviewable.length, posts: reviewable },
          { key: 'approved', label: 'Approved', count: approved.length, posts: approved },
          { key: 'scheduled', label: 'Scheduled', count: scheduled.length, posts: scheduled },
        ]
        const active = buckets.find(b => b.key === queueFilter) ?? buckets[0]
        const shown = showArchive ? posted : active.posts
        const close = () => { setFlipped(null); setShowArchive(false); setQueueFilter('all') }
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.55)', backdropFilter: 'blur(5px)' }} onClick={close} />
            <div style={{ position: 'relative', width: '100%', maxWidth: '880px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '20px', background: 'var(--surface)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
              {/* Platform-branded header */}
              <div style={{ background: theme.gradient, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{acct.emoji}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: theme.fg }}>{acct.handle}</p>
                    <p style={{ fontSize: '11px', color: theme.fg, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acct.platform} · {acct.mission || acct.topic}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => setEditing(acct)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: '9px', border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: theme.fg }}>
                    <Pencil size={11} /> Edit
                  </button>
                  <a href={profileUrl(acct)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: '9px', background: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 700, color: theme.fg, textDecoration: 'none' }}>
                    <ExternalLink size={11} /> Open
                  </a>
                  <button onClick={close} style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.25)', cursor: 'pointer', color: theme.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Queue filter chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                {buckets.filter(b => b.key === 'all' || b.count > 0).map(b => (
                  <button key={b.key} onClick={() => { setQueueFilter(b.key); setShowArchive(false) }}
                    style={{ padding: '5px 11px', borderRadius: '20px', border: `2px solid ${!showArchive && queueFilter === b.key ? theme.color : 'var(--border)'}`, background: !showArchive && queueFilter === b.key ? `${theme.color}12` : 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: !showArchive && queueFilter === b.key ? theme.color : 'var(--text-muted)', fontFamily: 'inherit' }}>
                    {b.label} · {b.count}
                  </button>
                ))}
                {posted.length > 0 && (
                  <button onClick={() => setShowArchive(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 11px', borderRadius: '20px', border: `2px solid ${showArchive ? '#3DAA7C' : 'var(--border)'}`, background: showArchive ? 'rgba(61,170,124,0.1)' : 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: showArchive ? '#3DAA7C' : 'var(--text-subtle)', fontFamily: 'inherit', marginLeft: 'auto' }}>
                    <Archive size={11} /> Archive · {posted.length}
                  </button>
                )}
              </div>

              {/* Post list */}
              <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
                {shown.length === 0 && (
                  <p style={{ fontSize: '12px', textAlign: 'center', padding: '40px 0', color: 'var(--text-subtle)' }}>
                    {showArchive ? 'Nothing posted yet.' : <>Nothing here yet. Generate content and pick <strong>{acct.handle}</strong> as the account — or drop an idea in Quick Capture.</>}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {shown.map(p => (
                    <PostCard key={p.id} post={p} accentColor={theme.color} onApprove={approve} approving={approvingId === p.id} onChanged={loadContent} onPreview={setPreviewPost} accounts={accounts} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Platform preview modal */}
      {previewPost && (() => {
        const acct = accounts.find(a => a.id === previewPost.account_id) ?? accounts.find(a => a.id === flipped)
        return acct ? <PlatformPreviewModal post={previewPost} account={acct} onClose={() => setPreviewPost(null)} /> : null
      })()}
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-bold" style={{ color: 'var(--cosmic-midnight)' }}>Accounts</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Click a card to flip it — see queued posts, approve them, track what&apos;s live. Pencil to edit purpose &amp; brand DNA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ghlConfigured === false && (
            <span className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: '#FEF5EA', color: '#F2A65A' }}>
              GHL not connected — approvals queue until the key is added
            </span>
          )}
          <button onClick={() => { setSelectMode(m => !m); setSelected(new Set()) }}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg"
            style={{ background: selectMode ? 'var(--purple)' : 'var(--surface)', color: selectMode ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <CheckSquare size={12} /> {selectMode ? 'Done selecting' : 'Bulk Edit'}
          </button>
          <button onClick={() => setEditing({ ...BLANK_ACCOUNT })}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg"
            style={{ background: 'var(--cosmic-midnight)', color: 'var(--soft-light)', border: 'none', cursor: 'pointer' }}>
            <Plus size={12} /> Add Account
          </button>
        </div>
      </div>

      {/* Bulk edit bar */}
      {selectMode && (
        <div className="rounded-xl border p-3 flex items-center gap-3 flex-wrap" style={{ background: 'var(--surface)', borderColor: 'var(--purple)', borderWidth: '2px' }}>
          <span className="text-[12px] font-bold" style={{ color: 'var(--purple)' }}>
            {selected.size} selected — click cards to add/remove
          </span>
          <select value={bulk.status} onChange={e => setBulk(b => ({ ...b, status: e.target.value }))}
            style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>
            <option value="">Status: keep as-is</option>
            {['active', 'restricted', 'planned', 'paused'].map(s => <option key={s} value={s}>Status → {s}</option>)}
          </select>
          <select value={bulk.priority} onChange={e => setBulk(b => ({ ...b, priority: e.target.value }))}
            style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>
            <option value="">Priority: keep as-is</option>
            {['high', 'medium', 'low'].map(s => <option key={s} value={s}>Priority → {s}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Color:</span>
            <input type="color" value={bulk.color || '#E8448A'} onChange={e => setBulk(b => ({ ...b, color: e.target.value }))}
              style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', padding: '2px' }} />
            {bulk.color && <button onClick={() => setBulk(b => ({ ...b, color: '' }))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', fontSize: '10px' }}>keep as-is ✕</button>}
          </div>
          <button onClick={applyBulk} disabled={bulkSaving || selected.size === 0 || (!bulk.status && !bulk.priority && !bulk.color)}
            className="ml-auto flex items-center gap-1.5 text-[12px] font-extrabold px-4 py-2 rounded-lg"
            style={{ background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', opacity: bulkSaving || selected.size === 0 || (!bulk.status && !bulk.priority && !bulk.color) ? 0.5 : 1 }}>
            {bulkSaving ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
            Apply to {selected.size}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'active', 'restricted', 'planned', 'paused'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="text-[11px] px-3 py-1.5 rounded-full font-medium capitalize transition-all"
            style={filter === f
              ? { background: 'var(--cosmic-midnight)', color: 'var(--soft-light)' }
              : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
            }>
            {f === 'all' ? 'All' : f} · {counts[f]}
          </button>
        ))}
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map(acct => {
          const s = STATUS_CONFIG[acct.status]
          const posts = postsFor(acct.id)
          const queued = posts.filter(p => ['idea', 'in_progress', 'ready', 'held'].includes(p.status))
          const approved = posts.filter(p => p.status === 'approved')
          const scheduled = posts.filter(p => p.status === 'scheduled')
          const posted = posts.filter(p => p.status === 'published' || p.status === 'archived')
          const isFlipped = flipped === acct.id

          // ── FRONT of card (flip side renders as a layered overlay below) ──
          return (
            <div key={acct.id} onClick={() => selectMode ? toggleSelect(acct.id) : setFlipped(acct.id)}
              className="rounded-xl border p-4 flex flex-col gap-3 cursor-pointer transition-transform hover:scale-[1.01]"
              style={{ background: 'var(--surface)', borderColor: selectMode && selected.has(acct.id) ? 'var(--purple)' : 'var(--border)', borderWidth: selectMode && selected.has(acct.id) ? '2px' : '1px', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
              {selectMode && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderRadius: '6px', border: selected.has(acct.id) ? 'none' : '2px solid var(--border)', background: selected.has(acct.id) ? 'var(--purple)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  {selected.has(acct.id) && <CheckCircle2 size={13} color="#fff" />}
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: acct.color + '18' }}>
                    {acct.emoji}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--cosmic-midnight)' }}>{acct.handle}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{acct.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
                    {s.icon} {s.label}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setEditing(acct) }} title="Edit purpose & brand DNA"
                    style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)', display: 'flex' }}>
                    <Pencil size={12} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide" style={{ background: 'var(--nebula-light)', color: 'var(--electric-nebula)' }}>
                  {acct.brand_name}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {acct.mission || acct.topic}
              </p>

              {/* Station stats */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Queued', n: queued.length, color: 'var(--text-muted)' },
                  { label: 'Approved', n: approved.length, color: '#F2A65A' },
                  { label: 'Scheduled', n: scheduled.length, color: '#4CC9F0' },
                  { label: 'Posted', n: posted.length, color: '#3DAA7C' },
                ].map(st => (
                  <div key={st.label} className="rounded-lg px-1 py-1.5 text-center" style={{ background: 'var(--surface-raised, var(--nebula-light))' }}>
                    <p className="text-[14px] font-extrabold leading-none" style={{ color: st.color }}>{st.n}</p>
                    <p className="text-[8px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-subtle)' }}>{st.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: acct.priority === 'high' ? 'var(--aurora-pink)' : 'var(--text-subtle)' }}>
                  {acct.priority} priority
                </span>
                <a href={profileUrl(acct)} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--electric-nebula)' }}>
                  <ExternalLink size={10} /> Open account
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Security reminder */}
      <div className="rounded-xl border p-4 flex items-start gap-3" style={{ background: 'var(--nebula-light)', borderColor: 'var(--electric-nebula)' }}>
        <Lock size={15} style={{ color: 'var(--electric-nebula)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--electric-nebula)' }}>Security reminder</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Passwords are never stored here. Use a password manager and 2FA on every account. Approving a post here only sends it to your GoHighLevel scheduler.
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
