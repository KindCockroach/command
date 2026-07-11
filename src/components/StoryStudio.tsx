'use client'
import { useState } from 'react'
import { PenLine, Loader2, Sparkles, CheckCheck, Waves, ChevronDown, ChevronUp } from 'lucide-react'

type Beats = { hook: string | null; reveal: string | null; truth: string | null; human_moment: string | null; mic_drop: string | null }
type Story = {
  title: string
  raw?: string
  story?: string
  transformation: string
  beats: Beats
  missing?: string[]
  strength: number
  why_it_matters?: string
  what_improved?: string
  coach_questions: string[]
  mic_drop_candidate: string
}

const BEAT_META: { key: keyof Beats; label: string }[] = [
  { key: 'hook', label: 'Hook' },
  { key: 'reveal', label: 'Reveal' },
  { key: 'truth', label: 'Truth' },
  { key: 'human_moment', label: 'Human moment' },
  { key: 'mic_drop', label: 'Mic drop' },
]

function StrengthMeter({ n }: { n: number }) {
  return (
    <span title={`${n}/5 — would a stranger stop scrolling?`} style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ width: '14px', height: '5px', borderRadius: '3px', background: i <= n ? (n >= 4 ? '#3DAA7C' : n >= 3 ? '#F2A65A' : '#E05252') : 'var(--border)' }} />
      ))}
    </span>
  )
}

function StoryCard({ initial }: { initial: Story }) {
  const [story, setStory] = useState<Story>(initial)
  const [open, setOpen] = useState(true)
  const [answers, setAnswers] = useState<string[]>([])
  const [working, setWorking] = useState(false)
  const [riverMsg, setRiverMsg] = useState('')
  const [filed, setFiled] = useState(false)

  const text = story.story ?? story.raw ?? ''

  const strengthen = async () => {
    setWorking(true)
    try {
      const qa = story.coach_questions.map((q, i) => answers[i]?.trim() ? `Q: ${q}\nA: ${answers[i].trim()}` : '').filter(Boolean).join('\n\n')
      const res = await fetch('/api/story/strengthen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story, answers: qa || undefined }),
      })
      const d = await res.json()
      if (!d.error) { setStory({ ...d, raw: story.raw }); setAnswers([]) }
    } finally { setWorking(false) }
  }

  const sendToRiver = async () => {
    setRiverMsg('')
    const res = await fetch('/api/river', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: `POLISHED STORY — "${story.title}" (transformation: ${story.transformation}, mic drop: "${story.mic_drop_candidate}"):\n\n${text}`, source: 'story' }),
    }).then(r => r.json()).catch(() => ({ error: true }))
    if (res.account) { setRiverMsg(`✓ Filed under ${res.account.emoji} ${res.account.handle}`); setFiled(true) }
    else setRiverMsg(res.error ? 'River error — try again' : '✓ Filed to pipeline')
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${story.strength >= 4 ? '#3DAA7C' : story.strength >= 3 ? '#F2A65A' : '#E05252'}`, borderRadius: '14px', overflow: 'hidden' }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{story.title}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{story.transformation}{story.why_it_matters ? ` · ${story.why_it_matters}` : ''}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <StrengthMeter n={story.strength} />
          {open ? <ChevronUp size={14} color="var(--text-subtle)" /> : <ChevronDown size={14} color="var(--text-subtle)" />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {story.what_improved && <p style={{ fontSize: '11px', color: '#3DAA7C', fontWeight: 600 }}>✦ {story.what_improved}</p>}

          {/* The story itself */}
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '12px 14px', background: 'var(--bg)', borderRadius: '10px' }}>{text}</p>

          {/* Shape map */}
          <div>
            <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-subtle)', marginBottom: '6px' }}>The shape</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {BEAT_META.map(b => {
                const v = story.beats?.[b.key]
                const missing = !v || story.missing?.some(m => m.toLowerCase().includes(b.key.replace('_', ' ')))
                return (
                  <div key={b.key} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, minWidth: '96px', color: missing ? '#E05252' : '#3DAA7C' }}>{missing ? '○' : '●'} {b.label}</span>
                    <span style={{ fontSize: '11px', color: missing ? 'var(--text-subtle)' : 'var(--text-muted)', fontStyle: missing ? 'italic' : 'normal', lineHeight: 1.4 }}>{v || 'missing — this is where it leaks'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mic drop */}
          {story.mic_drop_candidate && (
            <div style={{ padding: '10px 14px', background: 'rgba(107,45,110,0.07)', borderRadius: '10px', borderLeft: '3px solid var(--purple)' }}>
              <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--purple)', marginBottom: '3px' }}>Mic drop candidate</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontStyle: 'italic' }}>“{story.mic_drop_candidate}”</p>
            </div>
          )}

          {/* Editor's questions → strengthen */}
          {story.coach_questions?.length > 0 && (
            <div style={{ padding: '12px', background: 'rgba(232,68,138,0.05)', border: '1px solid rgba(232,68,138,0.2)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hot-pink)' }}>Your editor asks — answer any, then strengthen</p>
              {story.coach_questions.map((q, i) => (
                <div key={i}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{q}</p>
                  <textarea value={answers[i] ?? ''} onChange={e => setAnswers(a => { const n = [...a]; n[i] = e.target.value; return n })} rows={2}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={strengthen} disabled={working}
              style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--hot-pink)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', opacity: working ? 0.7 : 1 }}>
              {working ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Rebuilding…</> : <><Sparkles size={13} /> Strengthen this story</>}
            </button>
            <button onClick={sendToRiver} disabled={filed}
              style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: filed ? 'none' : '1px solid var(--border)', background: filed ? '#E8F7F1' : 'var(--surface)', color: filed ? '#3DAA7C' : 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: filed ? 'default' : 'pointer' }}>
              {filed ? <><CheckCheck size={13} /> {riverMsg}</> : <><Waves size={13} /> Ready — send to River</>}
            </button>
          </div>
          {riverMsg && !filed && <p style={{ fontSize: '11px', color: '#E05252' }}>{riverMsg}</p>}
        </div>
      )}
    </div>
  )
}

export default function StoryStudio() {
  const [dump, setDump] = useState('')
  const [splitting, setSplitting] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [error, setError] = useState('')

  const split = async () => {
    if (!dump.trim()) return
    setSplitting(true)
    setError('')
    try {
      const res = await fetch('/api/story/split', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dump }),
      })
      const d = await res.json()
      if (d.stories) { setStories(d.stories); setDump('') }
      else setError(d.error || 'Could not separate the stories.')
    } finally { setSplitting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--purple)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <PenLine size={15} color="var(--purple)" />
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--purple)' }}>Story Studio</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
          Dump everything — all the tangled stories at once. Your editor separates them, maps each one&apos;s shape, scores it, and asks the questions that make it land. Each story banks to Notes automatically.
        </p>
        <textarea value={dump} onChange={e => setDump(e.target.value)} rows={8}
          placeholder="Brain-dump your update — every story, in any order, however tangled. The studio will untangle it…"
          style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7, marginBottom: '12px' }} />
        <button onClick={split} disabled={splitting || !dump.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '13px', background: splitting || !dump.trim() ? 'var(--border)' : 'var(--purple)', color: '#fff', fontFamily: 'inherit', opacity: splitting ? 0.8 : 1 }}>
          {splitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Untangling your stories…</> : <><Sparkles size={14} /> Separate My Stories</>}
        </button>
        {error && <p style={{ fontSize: '12px', color: '#E05252', marginTop: '8px' }}>⚠ {error}</p>}
      </div>

      {stories.length > 0 && (
        <>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Found <strong>{stories.length} distinct stor{stories.length === 1 ? 'y' : 'ies'}</strong> — each banked to Notes. Strengthen the weak ones; send the strong ones to the river.
          </p>
          {stories.map((s, i) => <StoryCard key={i} initial={s} />)}
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
