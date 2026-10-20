import { NextResponse } from 'next/server'
import { getAllNotes, getTrendAudio } from '@/lib/db'

export const dynamic = 'force-dynamic'

// TREND PULSE for the top of Quick Post. Its ONE job: hand her a SOUND to film to this
// week (and a format to try) — a universal cue, not account strategy. It scans back
// across recent trend notes (weekly digests + hashtag scouts) to find whichever one
// actually NAMED a sound, so the audio field isn't empty just because the newest note
// was a strategy digest.
export function GET() {
  // Prefer today's FRESH trending-audio pick (the audio scout) — trends move fast.
  const fresh = getTrendAudio()
  if (fresh && (fresh.audio || fresh.format)) {
    const ageDays = (Date.now() - new Date(fresh.when).getTime()) / 86400000
    return NextResponse.json({
      pulse: {
        audio: fresh.audio || '',
        audio_from: ageDays < 1.2 ? 'fresh today' : `${Math.round(ageDays)}d ago`,
        format: fresh.format || '',
        sounds: fresh.sounds ?? [],
        when: fresh.when,
      },
    })
  }

  const notes = getAllNotes()
    .filter(n => (n.tags ?? []).includes('trends') && (n.body ?? '').trim())
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  if (!notes.length) return NextResponse.json({ pulse: null })

  // Strip bullets/bold, and drop the account-attribution tail ("— fits @x…") so the
  // banner shows just the universal cue.
  const cleanLine = (l: string) => l
    .replace(/^[-*•\d.\s]+/, '').replace(/\*\*/g, '')
    .replace(/\s[—–-]\s*(fits|because|which|angle)\b.*$/i, '')
    .trim()

  // AUDIO — a line that actually NAMES a sound (in quotes or a Proper-case parenthetical),
  // short enough to be a real cue (not a research-narration blob), and not narration.
  const namesSound = (l: string) => /["“”]/.test(l) || /\([A-Z][^)]{2,30}\)/.test(l)
  const isNarration = (l: string) => /^(i['’]?ll|let me|good signal|i hit|okay|here['’]?s|the move)/i.test(l)
  let audio = ''
  let audioFrom = ''
  for (const n of notes) {
    const hit = (n.body ?? '').split('\n').map(l => l.trim())
      .find(l => /\b(audio|sound|song|track)\b/i.test(l) && namesSound(l) && l.length > 15 && l.length < 240 && !isNarration(l) && !/FORMATS TO MIRROR|🧬/i.test(l))
    if (hit) { audio = cleanLine(hit).slice(0, 200); audioFrom = (n.title ?? '').replace(/^📡\s*/, ''); break }
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
