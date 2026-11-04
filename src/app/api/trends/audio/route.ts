import { NextRequest, NextResponse } from 'next/server'
import { setTrendAudio, getTrendAudio, logActivity, getAllNotes, type TrendSuggestion } from '@/lib/db'
import { researchWithWeb, fableText } from '@/lib/fable'
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

  const instructions = `You are RISE's trending-audio scout. Using live web search, find what SOUNDS/AUDIO are trending on Instagram Reels and TikTok RIGHT NOW (this week). Name real, specific audio a creator could search and use today — song + artist, OR the named original/meme audio AND where it's from (e.g. "'Get Mondays' — from the show Ted"). For EACH, say what it's trending FOR: the exact feeling or situation people are using it to show (e.g. "minor everyday frustration", "the ironic flex", "chaotic family mornings"). Ground everything in current roundups/creator reports — never invent a trend. Mandi's lane: intuition, self-trust, reparenting, mindful + playful content for tired moms (silly-serious), so favor sounds that fit relatable/emotional/funny storytelling, plus a couple broadly-trending ones. Give VARIETY each time — rotate the lead pick.`
  const input = `Return ONLY JSON:
{"sounds":[{"sound":"'Name' — Artist/where it's from","trending_for":"the exact feeling/situation it's used for"}, "... 3-4 total"], "format":"one trending on-screen-text FORMAT to try this week (short, concrete)"}
Name real current audio a creator can find in the app today. No preamble.${avoidList.length ? `\nShe has ALREADY seen these recently — do NOT lead with them; surface something different and current: ${avoidList.join('; ')}.` : ''}`

  const parse = (raw: string) => {
    let p: { sounds?: unknown[]; format?: string } = {}
    try { p = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* fall through */ }
    const sounds = Array.isArray(p.sounds) ? p.sounds.map(s => {
      if (typeof s === 'string') { const [snd, tf] = s.split('—').map(x => x.trim()); return { sound: snd || s.trim(), trending_for: tf || '' } }
      const o = s as { sound?: string; trending_for?: string }
      return { sound: String(o.sound || '').trim(), trending_for: String(o.trending_for || '').trim() }
    }).filter(s => s.sound).slice(0, 4) : []
    return { sounds, format: (p.format ?? '').trim() }
  }
  // Primary: Anthropic (Opus + real web search; needs headroom or the JSON never lands).
  // Fallback: OpenAI web search — so ONE provider being out of credits can't freeze the
  // pulse on a stale song. Whichever has credits keeps the sound fresh.
  type RawSound = { sound: string; trending_for: string }
  const pullAnthropic = async () => parse(await researchWithWeb({ instructions, input, maxTokens: 3000, maxSearches: 4 }))
  const pullOpenAI = async () => parse(await callGPT('research', input, instructions))

  let res: { sounds: RawSound[]; format: string } = { sounds: [], format: '' }
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

  // Stage 2 — ground each sound in HER real recent life so the suggestion tells her
  // exactly what to film and say, not just a vibe to consider.
  let suggestions: TrendSuggestion[] = sounds.map(s => ({ sound: s.sound, trending_for: s.trending_for, use_it: '' }))
  try {
    const recent = getAllNotes().slice(-14).reverse()
      .map(n => `- ${n.title}: ${String(n.body || '').replace(/\s+/g, ' ').slice(0, 160)}`).join('\n').slice(0, 2600)
    const grounding = `You are RISE writing for Mandi (AI Mom): mom of 4 (Preston ~4, twins Jasmine & Max ~2, Lillie ~1), former realtor, builds with AI in nap windows. Voice: silly-serious, warm, daring, strangely-specific, talks TO one tired mom. Her lanes: intuition/self-trust, reparenting, the honest chaos of mom life.

HER RECENT LIFE (use these REAL moments as the raw material — reference the actual thing that happened):
${recent || '(no recent notes — use a believable everyday mom moment in her world)'}

For each trending sound below, write "use_it": 2-3 sentences that (1) point to a specific real/plausible moment from her life, (2) tell her EXACTLY what to film (b-roll — objects, hands, aftermath; NEVER her kids' faces), and (3) give the exact on-screen text to type, in her voice, speaking to the reader. Be concrete and ready-to-shoot, like: "Remember [real moment]? Film [exact shot]. On screen: '[exact words]'." Never name a real person; never show the kids.`
    const sndList = sounds.map((s, i) => `${i + 1}. ${s.sound} — trending for: ${s.trending_for}`).join('\n')
    const raw = await fableText({
      instructions: grounding,
      input: `Sounds:\n${sndList}\n\nReturn ONLY JSON: {"suggestions":[{"sound":"(copy the sound name)","trending_for":"(copy)","use_it":"Remember … Film … On screen: '…'"}]}`,
      json: true, maxTokens: 2200,
    })
    const parsed = JSON.parse(raw) as { suggestions?: TrendSuggestion[] }
    if (Array.isArray(parsed.suggestions) && parsed.suggestions.length) {
      suggestions = parsed.suggestions.map((s, i) => ({
        sound: s.sound || sounds[i]?.sound || '', trending_for: s.trending_for || sounds[i]?.trending_for || '', use_it: String(s.use_it || '').trim(),
      })).filter(s => s.sound)
    }
  } catch { /* keep the research-only suggestions (no use_it) rather than fail */ }

  // Rich one-line strings for back-compat consumers; full objects for the new UI.
  const richStrings = suggestions.map(s => [s.sound, s.trending_for && `trending for ${s.trending_for}`, s.use_it].filter(Boolean).join(' — '))
  let audio = richStrings[0] || sounds[0]?.sound || ''
  const prevLead = (prev?.audio ?? '').toLowerCase()
  if (prevLead && audio.toLowerCase() === prevLead && richStrings.length > 1) audio = richStrings[1]
  setTrendAudio({ audio, format, sounds: richStrings, suggestions })
  logActivity({ type: 'trend_checkin', title: 'Trending audio refreshed', detail: (suggestions[0]?.sound || format).slice(0, 120), icon: '🎵', source: 'audio-scout' })
  return NextResponse.json({ ok: true, trend_audio: getTrendAudio() })
}
