import { NextResponse } from 'next/server'
import { getAllNotes } from '@/lib/db'

export const dynamic = 'force-dynamic'

// TREND PULSE for the top of Quick Post. Its ONE job: hand her a SOUND to film to this
// week (and a format to try) — a universal cue, not account strategy. It scans back
// across recent trend notes (weekly digests + hashtag scouts) to find whichever one
// actually NAMED a sound, so the audio field isn't empty just because the newest note
// was a strategy digest.
export function GET() {
  const notes = getAllNotes()
    .filter(n => (n.tags ?? []).includes('trends') && (n.body ?? '').trim())
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  if (!notes.length) return NextResponse.json({ pulse: null })

  const cleanLine = (l: string) => l.replace(/^[-*•\d.\s]+/, '').replace(/\*\*/g, '').trim()

  // AUDIO — the first line across recent notes that names a sound/song to pair.
  let audio = ''
  let audioFrom = ''
  for (const n of notes) {
    const hit = (n.body ?? '').split('\n').map(l => l.trim())
      .find(l => /\b(audio|sound|song|track)\b/i.test(l) && /["'"]|\(|\b[A-Z][a-z]+ [A-Z]/.test(l) && l.length > 15 && !/FORMATS TO MIRROR|🧬/i.test(l))
    if (hit) { audio = cleanLine(hit).slice(0, 220); audioFrom = (n.title ?? '').replace(/^📡\s*/, ''); break }
  }

  // FORMAT — a reusable skeleton to try (first fill-in-the-blank line found).
  let format = ''
  for (const n of notes) {
    const hit = (n.body ?? '').split('\n').map(l => l.trim())
      .find(l => l.includes('[') && l.includes(']') && l.length > 16 && !/FORMATS TO MIRROR/i.test(l))
    if (hit) { format = cleanLine(hit).slice(0, 180); break }
  }

  return NextResponse.json({
    pulse: {
      audio,
      audio_from: audioFrom,
      format,
      when: notes[0].created_at ?? null,
    },
  })
}
