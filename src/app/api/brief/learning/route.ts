import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Her's Brief · "Today's one learning thing" (Phase 8 A3). Her asks Mandi ONCE for the kids' ages
// and homeschool days (Mandi's call, Nov 25) and remembers them. Then one cheap call a day
// (gpt-4o-mini), cached, age-appropriate, varied against the last 14 days.
// GET → { ask: true } until she answers, else { text }. POST { kids } saves her answer.
const todayCT = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)
const FALLBACK = 'Follow one of their questions for twenty minutes. That counts. That’s the whole lesson.'

export async function GET() {
  const db = readDb()
  const kids = db.her_profile?.kids_note?.trim()
  if (!kids) return NextResponse.json({ ask: true, question: 'How old are your kids, and which days (if any) do you homeschool? I’ll ask once and remember.' })
  const today = todayCT()
  const cur = db.learning_daily
  if (cur?.date === today && cur.text) return NextResponse.json({ text: cur.text, cached: true })

  const recent = (cur?.history ?? []).slice(-14).map(h => h.text)
  let text = ''
  try {
    text = (await fableText({
      cheap: true,
      maxTokens: 160,
      instructions: `You suggest ONE learning thing a busy mom can do with her kids today, in 1–2 short sentences. Concrete (what to do, with what's in the house), playful, 20 minutes or less, no screens, no buying anything. Fit these kids: ${kids}. If today isn't a homeschool day for them, make it a tiny at-home moment instead. Don't repeat or closely echo any of these recent ones: ${recent.join(' | ') || 'none yet'}. Return only the suggestion.`,
      input: `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' })}.`,
    })).trim().replace(/^["“]|["”]$/g, '')
  } catch { /* budget cap or no key: fall back below */ }
  if (!text) return NextResponse.json({ text: cur?.text || FALLBACK, cached: true })
  const d = readDb()
  d.learning_daily = { date: today, text, history: [...(d.learning_daily?.history ?? []), { date: today, text }].slice(-30) }
  writeDb(d)
  return NextResponse.json({ text, cached: false })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const kids = typeof body?.kids === 'string' ? body.kids.trim().slice(0, 500) : ''
  if (!kids) return NextResponse.json({ error: 'Tell me their ages first.' }, { status: 400 })
  const d = readDb()
  d.her_profile = { ...(d.her_profile ?? {}), kids_note: kids, kids_saved_at: new Date().toISOString() }
  d.learning_daily = undefined // regenerate today's with the real ages
  writeDb(d)
  return NextResponse.json({ ok: true })
}
