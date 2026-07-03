'use client'
import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, CheckCircle2, AlertCircle, Clock, Lock, RefreshCw, Image as ImageIcon, Copy, Archive, Pencil, X, Save, Plus } from 'lucide-react'
import type { BrandAccount, ContentPiece } from '@/lib/db'

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
function PostCard({ post, accentColor, onApprove, approving, onChanged }: { post: ContentPiece; accentColor: string; onApprove: (p: ContentPiece) => void; approving: boolean; onChanged?: () => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [answers, setAnswers] = useState<string[]>([])
  const [completing, setCompleting] = useState(false)
  const hasQuestions = (post.open_questions?.length ?? 0) > 0

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
    navigator.clipboard.writeText([post.onscreen_text && `ON-SCREEN: ${post.onscreen_text}`, post.description, post.hashtags].filter(Boolean).join('\n\n'))
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px' }}>
        {/* Approval checkbox */}
        <button
          onClick={e => { e.stopPropagation(); if (isPending && !approving) onApprove(post) }}
          title={isPending ? 'Approve → send to GHL scheduler' : isApproved ? 'Approved — waiting for GHL connection' : isScheduled ? 'Scheduled in GHL' : 'Posted'}
          style={{
            width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, marginTop: '1px',
            border: isPending ? '2px solid var(--border)' : 'none', cursor: isPending ? 'pointer' : 'default',
            background: isPending ? 'transparent' : isApproved ? '#F2A65A' : isScheduled ? '#4CC9F0' : '#3DAA7C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {approving ? <RefreshCw size={10} color="#999" style={{ animation: 'spin 1s linear infinite' }} />
            : !isPending && <CheckCircle2 size={11} color="#fff" />}
        </button>

        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{post.title}</p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '10px', background: `${accentColor}18`, color: accentColor }}>{post.type}</span>
            {hasQuestions && <span style={{ fontSize: '9px', fontWeight: 700, color: '#E05252' }}>❓ NEEDS YOUR ANSWERS</span>}
            {isApproved && <span style={{ fontSize: '9px', fontWeight: 700, color: '#F2A65A' }}>APPROVED — awaiting GHL</span>}
            {isScheduled && <span style={{ fontSize: '9px', fontWeight: 700, color: '#4CC9F0' }}>SCHEDULED{post.scheduled_at ? ` · ${new Date(post.scheduled_at).toLocaleDateString()}` : ''}</span>}
            {post.media_url ? <span style={{ fontSize: '9px', color: '#3DAA7C', fontWeight: 700 }}>📎 media attached</span>
              : post.image_prompt ? <span style={{ fontSize: '9px', color: 'var(--text-subtle)' }}>🎨 prompt ready</span> : null}
          </div>
        </div>
        <button onClick={copyAll} title="Copy post" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: copied ? '#3DAA7C' : 'var(--text-subtle)', padding: '2px', flexShrink: 0 }}>
          {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
        </button>
      </div>

      {open && (
        <div style={{ padding: '0 10px 10px 36px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Open questions — answer here, river finishes the post */}
          {hasQuestions && (
            <div style={{ padding: '10px', background: 'rgba(224,82,82,0.06)', borderRadius: '8px', border: '1px solid rgba(224,82,82,0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#E05252' }}>Answer these — the river finishes the post</p>
              {post.open_questions!.map((q, i) => (
                <div key={i}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{i + 1}. {q}</p>
                  <textarea value={answers[i] ?? ''} onChange={e => setAnswers(a => { const next = [...a]; next[i] = e.target.value; return next })}
                    rows={2} placeholder="Your answer…"
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '7px', border: '1px solid var(--border)', fontSize: '11px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <button onClick={completePost} disabled={completing || answers.filter(a => a?.trim()).length === 0}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: 'none', background: '#E05252', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer', opacity: completing || answers.filter(a => a?.trim()).length === 0 ? 0.6 : 1 }}>
                {completing ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Composing…</> : '🌊 Complete this post'}
              </button>
            </div>
          )}

          {/* Visual: media or prompt */}
          {post.media_url ? (
            <img src={post.media_url} alt="" style={{ width: '100%', borderRadius: '8px', maxHeight: '180px', objectFit: 'cover' }} />
          ) : post.image_prompt ? (
            <div style={{ padding: '8px 10px', background: 'var(--surface-raised)', borderRadius: '8px', borderLeft: `3px solid ${accentColor}` }}>
              <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={10} /> Image / Video Prompt</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{post.image_prompt}</p>
            </div>
          ) : null}

          {post.onscreen_text && (
            <div>
              <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '2px' }}>On-Screen Text / Script</p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>{post.onscreen_text}</p>
            </div>
          )}

          <div>
            <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '2px' }}>Body</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.description}</p>
          </div>

          {post.hashtags && (
            <div>
              <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: '2px' }}>Hashtags / Metadata</p>
              <p style={{ fontSize: '10px', color: accentColor, lineHeight: 1.5, wordBreak: 'break-word' }}>{post.hashtags}</p>
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
  const [editing, setEditing] = useState<Partial<BrandAccount> | null>(null)

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
          <button onClick={() => setEditing({ ...BLANK_ACCOUNT })}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg"
            style={{ background: 'var(--cosmic-midnight)', color: 'var(--soft-light)', border: 'none', cursor: 'pointer' }}>
            <Plus size={12} /> Add Account
          </button>
        </div>
      </div>

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

          if (isFlipped) {
            // ── BACK of card: post queue ──
            const activePosts = [...queued, ...approved, ...scheduled]
            return (
              <div key={acct.id} className="rounded-xl border flex flex-col" style={{ background: 'var(--surface)', borderColor: acct.color, boxShadow: 'var(--shadow-sm)', borderWidth: '2px', maxHeight: '520px' }}>
                <button onClick={() => { setFlipped(null); setShowArchive(false) }}
                  className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                  style={{ borderBottom: '1px solid var(--border)', background: acct.color + '10', border: 'none', cursor: 'pointer', borderRadius: '10px 10px 0 0' }}>
                  <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: 'var(--cosmic-midnight)' }}>
                    {acct.emoji} {acct.handle}
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: acct.color }}>↩ flip back</span>
                </button>

                <div className="flex flex-col gap-2 p-3 overflow-y-auto">
                  {activePosts.length === 0 && (
                    <p className="text-[11px] text-center py-6" style={{ color: 'var(--text-subtle)' }}>
                      No posts queued for this account yet.<br />Generate content and pick <strong>{acct.handle}</strong> as the account.
                    </p>
                  )}
                  {activePosts.map(p => (
                    <PostCard key={p.id} post={p} accentColor={acct.color} onApprove={approve} approving={approvingId === p.id} onChanged={loadContent} />
                  ))}

                  {posted.length > 0 && (
                    <>
                      <button onClick={() => setShowArchive(v => !v)}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mt-1"
                        style={{ color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                        <Archive size={11} /> Archive · {posted.length} posted {showArchive ? '▲' : '▼'}
                      </button>
                      {showArchive && posted.map(p => (
                        <PostCard key={p.id} post={p} accentColor={acct.color} onApprove={approve} approving={false} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )
          }

          // ── FRONT of card ──
          return (
            <div key={acct.id} onClick={() => setFlipped(acct.id)}
              className="rounded-xl border p-4 flex flex-col gap-3 cursor-pointer transition-transform hover:scale-[1.01]"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
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
