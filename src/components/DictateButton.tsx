'use client'
import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

// Speak instead of typing. Uses the browser's own speech recognition (Chrome, Safari):
// no upload, no AI cost. Hidden where the browser can't do it.
type Rec = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error?: string }) => void) | null }
type RecCtor = new () => Rec

export default function DictateButton({ onText, onSpoken, title = 'Speak' }: { onText: (text: string) => void; onSpoken?: () => void; title?: string }) {
  const [on, setOn] = useState(false)
  const [ok, setOk] = useState(false)
  const rec = useRef<Rec | null>(null)
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOk(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => rec.current?.stop()
  }, [])
  if (!ok) return null
  const start = () => {
    const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
    const C = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!C) return
    const r = new C()
    r.lang = 'en-US'; r.continuous = true; r.interimResults = false
    r.onresult = e => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript
      if (t.trim()) { onText(t.trim()); onSpoken?.() }
    }
    r.onend = () => setOn(false)
    r.onerror = () => setOn(false)
    rec.current = r
    r.start(); setOn(true)
  }
  return (
    <button type="button" onClick={() => (on ? rec.current?.stop() : start())} title={on ? 'Stop' : title} aria-label={on ? 'Stop listening' : title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid var(--border,#E7E1D6)', background: on ? '#B23A48' : 'var(--surface,#fff)', color: on ? '#fff' : 'var(--text)', borderRadius: 999, padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
      {on ? <><Square size={12} /> Listening… tap to stop</> : <><Mic size={13} /> {title}</>}
    </button>
  )
}
