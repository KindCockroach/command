import { NextRequest, NextResponse } from 'next/server'
import { setTrendAudio, getTrendAudio, logActivity } from '@/lib/db'
import { researchWithWeb } from '@/lib/fable'
import { callGPT } from '@/lib/ai'

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
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'No AI key set — add ANTHROPIC_API_KEY or OPENAI_API_KEY in Railway so the scout can research.' }, { status: 400 })
  }

  // What she's already seen — so the scout doesn't keep handing back the same lead
  // sound every refresh (the "it reverted to Iris" problem). We tell it to avoid these
  // as the top pick, and rotate below if it circles back anyway.
  const prev = getTrendAudio()
  const avoid = [prev?.audio, ...(prev?.sounds ?? [])]
    .filter(Boolean).map(s => String(s).split('—')[0].replace(/["“”']/g, '').trim()).filter(Boolean)
  const avoidList = Array.from(new Set(avoid)).slice(0, 6)

  const instructions = `You are RISE's trending-audio scout. Using live web search, find what SOUNDS/AUDIO are trending on Instagram Reels and TikTok RIGHT NOW (this week). Name real, specific tracks (song + artist, or the named original audio) that a creator could search and use today. Ground everything in current roundups/creator reports — never invent a trend. Mandi's lane: intuition, self-trust, reparenting, mindful + playful content for tired women (silly-serious tone), so favor sounds that fit emotional/relatable/aesthetic storytelling, but include a couple of broadly-trending ones too. Give her VARIETY each time — rotate the lead pick, don't keep returning the same evergreen song.`
  const input = `Return ONLY JSON:
{"sounds":["'Track Name' — Artist — one line on the vibe/why it's trending", "... 2-4 total"], "format":"one trending on-screen-text FORMAT to try this week (short, concrete)"}
Name real current tracks a creator can find in the app today. No preamble.${avoidList.length ? `\nShe has ALREADY seen these recently — do NOT lead with them; surface something different and current instead: ${avoidList.join('; ')}.` : ''}`

  const parse = (raw: string) => {
    let p: { sounds?: string[]; format?: string } = {}
    try { p = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* fall through */ }
    return {
      sounds: Array.isArray(p.sounds) ? p.sounds.map(s => String(s).trim()).filter(Boolean).slice(0, 4) : [],
      format: (p.format ?? '').trim(),
    }
  }
  // Primary: Anthropic (Opus + real web search; needs headroom or the JSON never lands).
  // Fallback: OpenAI web search — so ONE provider being out of credits can't freeze the
  // pulse on a stale song. Whichever has credits keeps the sound fresh.
  const pullAnthropic = async () => parse(await researchWithWeb({ instructions, input, maxTokens: 3000, maxSearches: 4 }))
  const pullOpenAI = async () => parse(await callGPT('research', input, instructions))

  let res: { sounds: string[]; format: string } = { sounds: [], format: '' }
  let lastErr: unknown = null
  if (process.env.ANTHROPIC_API_KEY) {
    try { res = await pullAnthropic(); if (!res.sounds.length && !res.format) res = await pullAnthropic() } catch (e) { lastErr = e }
  }
  if (!res.sounds.length && !res.format && process.env.OPENAI_API_KEY) {
    try { res = await pullOpenAI() } catch (e) { lastErr = e }
  }

  const { sounds, format } = res
  if (!sounds.length && !format) {
    const msg = lastErr instanceof Error ? lastErr.message : 'the scout came back empty'
    return NextResponse.json({ error: `Couldn't pull a fresh sound — ${msg}. If you're out of API credits, top up and tap refresh again.` }, { status: 502 })
  }

  let audio = sounds[0] || ''  // the headline sound for the one-glance banner
  // If it circled back to the same lead sound she already has, rotate to the next
  // distinct one so a refresh actually changes.
  const prevLead = (prev?.audio ?? '').toLowerCase()
  if (prevLead && audio.toLowerCase() === prevLead) {
    const alt = sounds.find(s => s.toLowerCase() !== prevLead)
    if (alt) audio = alt
  }
  setTrendAudio({ audio, format, sounds })
  logActivity({ type: 'trend_checkin', title: 'Trending audio refreshed', detail: audio ? audio.slice(0, 120) : format.slice(0, 120), icon: '🎵', source: 'audio-scout' })
  return NextResponse.json({ ok: true, trend_audio: getTrendAudio() })
}
