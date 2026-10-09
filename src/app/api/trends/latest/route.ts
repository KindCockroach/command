import { NextResponse } from 'next/server'
import { getAllNotes } from '@/lib/db'

export const dynamic = 'force-dynamic'

// LATEST TREND PULSE — the one-glance "what's trending this week" for the top of
// Quick Post: the best bet + a trending audio/sound if the scout caught one. Reads
// the most recent trends note (weekly digest or a hashtag scout). Read-only.
export function GET() {
  const note = getAllNotes()
    .filter(n => (n.tags ?? []).includes('trends') && (n.body ?? '').trim())
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]
  if (!note) return NextResponse.json({ pulse: null })

  const body = note.body ?? ''
  const bestBet = (body.match(/BEST BET:\s*(.+)$/im)?.[1] || '').trim()
  // First line that names a sound/audio/song to pair.
  const audioLine = body.split('\n')
    .map(l => l.trim())
    .find(l => /\b(audio|sound|song|track)\b/i.test(l) && l.length > 12 && !/🧬|FORMATS TO MIRROR/i.test(l)) || ''

  return NextResponse.json({
    pulse: {
      title: (note.title ?? '').replace(/^📡\s*/, ''),
      best_bet: bestBet,
      audio: audioLine.replace(/^[-*•\d.]+\s*/, '').replace(/\*\*/g, '').slice(0, 220),
      when: note.created_at ?? null,
    },
  })
}
