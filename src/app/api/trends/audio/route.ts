import { NextRequest, NextResponse } from 'next/server'
import { setTrendAudio, getTrendAudio, logActivity } from '@/lib/db'
import { researchWithWeb } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// FRESH TRENDING AUDIO — keeps the Quick Post pulse ahead of the wave. Web-researches
// what sounds/audio are trending on Instagram Reels + TikTok RIGHT NOW, plus one
// trending on-screen-text format, and stores today's pick. Runs on demand (a "refresh"
// tap) or daily. HONEST LIMIT: reflects current trend roundups/creator reports — a few
// days behind the absolute bleeding edge, since the platforms don't expose live charts.
//
// GET  → return the stored pick (no research)
// POST → do a fresh web pull, store it, return it
export function GET() {
  return NextResponse.json({ trend_audio: getTrendAudio() })
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const key = new URL(req.url).searchParams.get('key')
    // allow either the cron key or an in-app call (no key) — keep it simple
    if (key && key !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set — add it in Railway so the scout can research.' }, { status: 400 })
  }

  const instructions = `You are RISE's trending-audio scout. Using live web search, find what SOUNDS/AUDIO are trending on Instagram Reels and TikTok RIGHT NOW (this week). Name real, specific tracks (song + artist, or the named original audio) that a creator could search and use today. Ground everything in current roundups/creator reports — never invent a trend. Mandi's lane: intuition, self-trust, reparenting, mindful + playful content for tired women (silly-serious tone), so favor sounds that fit emotional/relatable/aesthetic storytelling, but include a couple of broadly-trending ones too.`
  const input = `Return ONLY JSON:
{"sounds":["'Track Name' — Artist — one line on the vibe/why it's trending", "... 2-4 total"], "format":"one trending on-screen-text FORMAT to try this week (short, concrete)"}
Name real current tracks a creator can find in the app today. No preamble.`

  try {
    const raw = await researchWithWeb({ instructions, input, maxTokens: 1500, maxSearches: 4 })
    let p: { sounds?: string[]; format?: string } = {}
    try { p = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* fall through */ }
    const sounds = Array.isArray(p.sounds) ? p.sounds.map(s => String(s).trim()).filter(Boolean).slice(0, 4) : []
    const format = (p.format ?? '').trim()
    if (!sounds.length && !format) return NextResponse.json({ error: 'The scout came back empty — try again.' }, { status: 502 })

    const audio = sounds[0] || ''  // the headline sound for the one-glance banner
    setTrendAudio({ audio, format, sounds })
    logActivity({ type: 'trend_checkin', title: 'Trending audio refreshed', detail: audio ? audio.slice(0, 120) : format.slice(0, 120), icon: '🎵', source: 'audio-scout' })
    return NextResponse.json({ ok: true, trend_audio: getTrendAudio() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'scout failed' }, { status: 502 })
  }
}
