import { NextResponse } from 'next/server'
import { getAllNotes } from '@/lib/db'

export const dynamic = 'force-dynamic'

// RECENTLY PULLED TRENDS — the running log of what the auto-run (weekly check-in) and
// the hashtag scout have pulled, newest first, for the Trends tab. Reads the saved
// trend notes so she can see the work RISE did while she was away.
export function GET() {
  const notes = getAllNotes()
    .filter(n => (n.tags ?? []).includes('trends') && (n.body ?? '').trim())
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 20)

  const pulls = notes.map(n => {
    const body = n.body ?? ''
    const bestBet = (body.match(/BEST BET:\s*(.+)$/im)?.[1] || '').trim()
    const audio = (body.split('\n').map(l => l.trim())
      .find(l => /\b(audio|sound|song|track)\b/i.test(l) && l.length > 12 && !/🧬|FORMATS TO MIRROR/i.test(l)) || '')
      .replace(/^[-*•\d.]+\s*/, '').replace(/\*\*/g, '').slice(0, 200)
    const isHashtag = (n.tags ?? []).includes('hashtag')
    return {
      id: n.id,
      title: (n.title ?? '').replace(/^📡\s*/, ''),
      kind: isHashtag ? 'hashtag' : 'weekly',
      when: n.created_at ?? null,
      best_bet: bestBet,
      audio,
      body,
    }
  })

  return NextResponse.json({ pulls })
}
