'use client'
import { useState } from 'react'
import { ContentPiece } from '@/lib/db'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'

interface Props { onIntake: (piece: ContentPiece) => void }

const PLACEHOLDERS = [
  "One word. One phrase. One voice memo worth. Drop it here — the river sorts and composes it.",
  "What's alive in your head right now? The river will find its account and build the post.",
  "Type the idea. Hit Enter. The sorting hat does the rest.",
  "What are we working on today, Mandi?",
]

type Verdict = {
  complete: boolean
  account: { handle: string; emoji: string; color: string } | null
  open_questions: string[]
}

export default function IntakeBar({ onIntake }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [ph] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)])

  const submit = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setVerdict(null)
    try {
      // Through the River: sorted to an account, composed if it stands alone
      const res = await fetch('/api/river', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), source: 'kanban' }),
      })
      const d = await res.json()
      if (d.piece) {
        onIntake(d.piece)
        setInput('')
        setVerdict({ complete: d.complete, account: d.account, open_questions: d.open_questions ?? [] })
        setTimeout(() => setVerdict(null), 12000)
      } else {
        // River unavailable — fall back to plain intake so nothing is lost
        const fb = await fetch('/api/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: input.trim() }) })
        const piece = await fb.json()
        onIntake(piece)
        setInput('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles size={14} style={{ color: 'var(--aurora-pink)' }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          What are we working on today?
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--aurora-light)', color: 'var(--aurora-pink)' }}>
          🌊 idea → the river → post-card
        </span>
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder={ph}
          rows={2}
          className="flex-1 px-3 py-2.5 rounded-lg border text-[13px] resize-none transition-all"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-raised)', color: 'var(--cosmic-midnight)' }}
          onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--electric-nebula)'}
          onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)'}
        />
        <button
          onClick={submit}
          disabled={loading || !input.trim()}
          className="flex items-center gap-1.5 text-[13px] px-4 rounded-lg font-semibold transition-all min-w-[100px] justify-center"
          style={verdict
            ? { background: '#E8F7F1', color: '#3DAA7C' }
            : { background: 'var(--cosmic-midnight)', color: 'var(--soft-light)', opacity: (!input.trim() || loading) ? 0.4 : 1 }
          }
        >
          {loading ? <Loader2 size={14} className="animate-spin" />
           : verdict ? '✓ Sorted'
           : <><ArrowRight size={14} /> Capture</>}
        </button>
      </div>

      {verdict ? (
        <div className="mt-2 px-3 py-2 rounded-lg text-[11px]" style={{ background: verdict.complete ? '#E8F7F1' : '#FEF5EA', color: verdict.complete ? '#3DAA7C' : '#C47A1A' }}>
          {verdict.complete && verdict.account
            ? <>🌊 Complete post composed and filed under <strong style={{ color: verdict.account.color }}>{verdict.account.emoji} {verdict.account.handle}</strong> — approve it on the flipped account card.</>
            : verdict.account
              ? <>🌊 Sorted to <strong>{verdict.account.handle}</strong> but it needs you: {verdict.open_questions.join(' · ') || 'more detail'}. Answer on its card in Accounts.</>
              : <>🌊 Captured to the pipeline.</>}
        </div>
      ) : (
        <p className="text-[10px] mt-2" style={{ color: 'var(--text-subtle)' }}>
          Enter to capture · Shift+Enter for new line · The river sorts it to an account and composes the post — or asks you what&apos;s missing
        </p>
      )}
    </div>
  )
}
