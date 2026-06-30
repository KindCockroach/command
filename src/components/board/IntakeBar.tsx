'use client'
import { useState } from 'react'
import { ContentPiece } from '@/lib/db'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'

interface Props { onIntake: (piece: ContentPiece) => void }

const PLACEHOLDERS = [
  "One word. One phrase. One voice memo worth. Drop it here — we'll build it into content.",
  "What's alive in your head right now? Capture it. We'll make it into 30 pieces.",
  "Type the idea. Hit Enter. Everything else is on me.",
  "What are we working on today, Mandi?",
]

export default function IntakeBar({ onIntake }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ph] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)])

  const submit = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    const res = await fetch('/api/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: input.trim() }) })
    const piece = await res.json()
    onIntake(piece)
    setInput('')
    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)

    // Background enrichment — silently updates the card after ~5s
    if (process.env.NEXT_PUBLIC_OPENAI_ENABLED !== 'false') {
      fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enrich', title: piece.title, description: piece.description }),
      }).then(r => r.json()).then(data => {
        if (data.result && piece.id) {
          fetch('/api/content', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: piece.id, ai_enrichment: data.result }),
          }).catch(() => {})
        }
      }).catch(() => {})
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
          1 idea → 30 pieces
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
          style={success
            ? { background: '#E8F7F1', color: '#3DAA7C' }
            : { background: 'var(--cosmic-midnight)', color: 'var(--soft-light)', opacity: (!input.trim() || loading) ? 0.4 : 1 }
          }
        >
          {loading ? <Loader2 size={14} className="animate-spin" />
           : success ? '✓ Captured'
           : <><ArrowRight size={14} /> Capture</>}
        </button>
      </div>

      <p className="text-[10px] mt-2" style={{ color: 'var(--text-subtle)' }}>
        Enter to capture instantly · Shift+Enter for new line · Lands in Ideas lane · Click any card to expand into full content
      </p>
    </div>
  )
}
