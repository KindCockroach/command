'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, Loader2, Trash2, X, Save, Sparkles, Pencil, Search } from 'lucide-react'
import type { Audience, BrandAccount } from '@/lib/db'

// The hybrid interview — Mandi's knowledge first, research sharpens it after
const INTERVIEW: { key: string; q: string; hint: string }[] = [
  { key: 'who', q: 'Who is she?', hint: 'Age range, life stage, work/kids situation — one or two lines.' },
  { key: 'tuesday', q: "What's her Tuesday at 9pm actually like?", hint: 'The scene: where is she, what is she doing, what is she feeling?' },
  { key: 'pain', q: "What pain would she say OUT LOUD — and what is it quietly costing her?", hint: 'Her words for the problem, plus the side effects: sleep, marriage, confidence, money…' },
  { key: 'wants', q: 'What does she secretly want?', hint: 'The desire under the desire. Not "more time" — what would she DO with it?' },
  { key: 'tried', q: 'What has she already tried that failed her?', hint: 'Courses, apps, advice, habits — what let her down and why.' },
  { key: 'words', q: 'What words/phrases make her say "that\'s me!"?', hint: 'Anything you\'ve heard her say in comments, DMs, real life.' },
  { key: 'objections', q: 'Why would she hesitate to follow or buy?', hint: 'Her fears, skepticism, past burns, money story.' },
]

const chip = (color: string) => ({ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', background: `${color}14`, color } as const)

function Chips({ items, color }: { items: string[]; color: string }) {
  if (!items?.length) return null
  return <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{items.map((b, i) => <span key={i} style={chip(color)}>{b}</span>)}</div>
}

const ARRAY_FIELDS: { key: keyof Audience; label: string; color: string }[] = [
  { key: 'pains', label: 'Pains (her words)', color: '#E05252' },
  { key: 'pain_side_effects', label: 'What the pain costs her', color: '#C47A1A' },
  { key: 'desires', label: 'Secret desires', color: '#3DAA7C' },
  { key: 'exact_language', label: 'Her exact language — mirror these', color: '#E8448A' },
  { key: 'trending_phrases', label: 'Trending phrases', color: '#4CC9F0' },
  { key: 'objections', label: 'Objections', color: '#9B8FA6' },
  { key: 'buying_triggers', label: 'Buying triggers', color: '#5A4FCF' },
  { key: 'watering_holes', label: 'Where she scrolls', color: '#748CAB' },
  { key: 'tried_already', label: 'Already tried (failed her)', color: '#64748b' },
]

function AudienceEditor({ audience, onSave, onClose }: { audience: Partial<Audience>; onSave: (a: Audience) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Audience>>({ ...audience })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Audience, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const fld = { padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const lbl = (t: string, c = 'var(--text-subtle)') => <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: c, marginBottom: '4px' }}>{t}</label>

  const save = async () => {
    if (!form.name) return
    setSaving(true)
    const id = form.id || (form.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const res = await fetch('/api/audiences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id }) })
    onSave(await res.json())
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>{audience.id ? `Edit ${audience.name}` : 'New Audience'}</h3>
          <button onClick={onClose} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: '10px' }}>
            <div>{lbl('Emoji')}<input value={form.emoji ?? '👤'} onChange={e => set('emoji', e.target.value)} style={{ ...fld, textAlign: 'center', fontSize: '20px' }} /></div>
            <div>{lbl('Name (persona nickname)')}<input value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder='e.g. "Overwhelmed Dana"' style={fld} /></div>
            <div>{lbl('Life stage')}<input value={form.life_stage ?? ''} onChange={e => set('life_stage', e.target.value)} placeholder="34, two kids under 5, part-time job" style={fld} /></div>
          </div>
          <div>{lbl('Snapshot — one line who she is')}<input value={form.snapshot ?? ''} onChange={e => set('snapshot', e.target.value)} style={fld} /></div>
          <div>{lbl('Her Tuesday reality (the scene)')}<textarea value={form.tuesday_reality ?? ''} onChange={e => set('tuesday_reality', e.target.value)} rows={3} style={{ ...fld, resize: 'vertical' }} /></div>
          {ARRAY_FIELDS.map(f => (
            <div key={f.key}>
              {lbl(f.label, f.color)}
              <textarea value={((form[f.key] as string[]) ?? []).join('\n')} onChange={e => set(f.key, e.target.value.split('\n').filter(Boolean))} rows={3}
                placeholder="One per line" style={{ ...fld, resize: 'vertical' }} />
            </div>
          ))}
          <div>{lbl('Notes / research insights')}<textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...fld, resize: 'vertical' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--surface)' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving || !form.name}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving || !form.name ? 0.6 : 1 }}>
            <Save size={13} /> {saving ? 'Saving…' : 'Save Audience'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AudiencePanel() {
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [accounts, setAccounts] = useState<BrandAccount[]>([])
  const [editing, setEditing] = useState<Partial<Audience> | null>(null)
  const [interviewing, setInterviewing] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [researching, setResearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/audiences').then(r => r.json()).then(setAudiences).catch(() => {})
    fetch('/api/accounts').then(r => r.json()).then(setAccounts).catch(() => {})
  }, [])

  const runResearch = async () => {
    const filled = INTERVIEW.filter(i => answers[i.key]?.trim())
    if (filled.length < 3) { setError('Answer at least 3 questions so the research has your ground truth.'); return }
    setError('')
    setResearching(true)
    try {
      const text = INTERVIEW.map(i => answers[i.key]?.trim() ? `Q: ${i.q}\nA: ${answers[i.key].trim()}` : '').filter(Boolean).join('\n\n')
      const res = await fetch('/api/audiences', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'research', answers: text }),
      })
      const d = await res.json()
      if (d.draft) {
        setInterviewing(false)
        setAnswers({})
        setEditing(d.draft)   // she reviews/sharpens the researched draft before saving
      } else setError(d.error || 'Research failed — try again.')
    } finally { setResearching(false) }
  }

  const remove = async (a: Audience) => {
    const linked = accounts.filter(x => x.audience_id === a.id)
    if (!confirm(`Delete ${a.name}?${linked.length ? ` ${linked.length} account(s) will be unlinked.` : ''}`)) return
    await fetch(`/api/audiences?id=${a.id}`, { method: 'DELETE' })
    setAudiences(prev => prev.filter(x => x.id !== a.id))
  }

  const linkedHandles = (id: string) => accounts.filter(a => a.audience_id === id).map(a => a.handle)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {editing && (
        <AudienceEditor audience={editing}
          onSave={saved => { setAudiences(prev => prev.find(a => a.id === saved.id) ? prev.map(a => a.id === saved.id ? saved : a) : [...prev, saved]); setEditing(null) }}
          onClose={() => setEditing(null)} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--hot-pink)" /> Audience
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Who's listening. One persona per audience — every linked account writes TO her.
          </p>
        </div>
        <button onClick={() => { setInterviewing(v => !v); setError('') }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
          {interviewing ? <X size={13} /> : <Plus size={13} />} {interviewing ? 'Cancel' : 'New Audience — Interview Me'}
        </button>
      </div>

      {/* Interview → research flow */}
      {interviewing && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--hot-pink)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Answer what you know — your words are ground truth. Then <strong>Research &amp; Draft</strong> deep-dives her communities for the exact words, pain side-effects, and trending phrases, and hands you a full draft to review.
          </p>
          {INTERVIEW.map(i => (
            <div key={i.key}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{i.q}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '6px' }}>{i.hint}</p>
              <textarea value={answers[i.key] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i.key]: e.target.value }))} rows={2}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
            </div>
          ))}
          {error && <p style={{ fontSize: '12px', color: '#E05252' }}>⚠ {error}</p>}
          <button onClick={runResearch} disabled={researching}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: researching ? 0.7 : 1 }}>
            {researching ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Researching her world… (30-60s)</> : <><Search size={14} /> Research &amp; Draft Her Profile</>}
          </button>
        </div>
      )}

      {audiences.length === 0 && !interviewing && (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '14px', padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>👤</p>
          <p style={{ fontSize: '14px', fontWeight: 700 }}>No audiences yet</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Hit &quot;Interview Me&quot; — 7 questions, then research does the deep dive. Link her to accounts and every post gets written TO her.</p>
        </div>
      )}

      {/* Library */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
        {audiences.map(a => (
          <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--hot-pink)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '26px' }}>{a.emoji}</span>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>{a.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.life_stage}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                <button onClick={() => setEditing(a)} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><Pencil size={13} /></button>
                <button onClick={() => remove(a)} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-subtle)' }}><Trash2 size={13} /></button>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{a.snapshot}</p>
            {a.tuesday_reality && <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '8px 10px', background: 'var(--bg)', borderRadius: '8px' }}>🕘 {a.tuesday_reality}</p>}
            {a.pains?.length > 0 && <div><p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#E05252', marginBottom: '4px' }}>Pains</p><Chips items={a.pains.slice(0, 4)} color="#E05252" /></div>}
            {a.exact_language?.length > 0 && <div><p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#E8448A', marginBottom: '4px' }}>Her words</p><Chips items={a.exact_language.slice(0, 6)} color="#E8448A" /></div>}
            {a.trending_phrases?.length > 0 && <div><p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#4CC9F0', marginBottom: '4px' }}>Trending with her</p><Chips items={a.trending_phrases.slice(0, 4)} color="#4CC9F0" /></div>}
            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600 }}>
                {linkedHandles(a.id).length ? <>Linked: {linkedHandles(a.id).join(' · ')}</> : 'Not linked to any account yet — link her in Accounts ✏️'}
              </p>
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
