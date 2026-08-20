import { NextRequest, NextResponse } from 'next/server'
import { fableText } from '@/lib/fable'
import { craftFor } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// A short social caption for the AI Mom Podcast — either for the WHOLE episode
// ("why you'd listen" + a tune-in CTA) or built from ONE of Mandi's verbatim
// quotes (the quote is the hook). Kept deliberately short; a fresh variation each
// call so "Regenerate" gives real alternatives, and the CTA rotates across the
// tune-in / follow-along / find-us-on phrasings.
const CTA_STYLES = [
  'Tune in — link in bio (Spotify, YouTube, Apple).',
  'Follow along — find the podcast on Spotify, YouTube, and Apple, link in bio.',
  'New episode up now — Spotify, YouTube, Apple. Link in bio.',
  'Come listen — the AI Mom Podcast is on Spotify, YouTube, and Apple. Link in bio.',
  'Press play — link in bio for Spotify, YouTube, and Apple.',
]

export async function POST(req: NextRequest) {
  const { mode = 'episode', title = '', takeaway = '', quote = '', variety } = await req.json().catch(() => ({}))

  const cta = CTA_STYLES[Math.floor((typeof variety === 'number' ? variety : Math.random() * CTA_STYLES.length)) % CTA_STYLES.length]

  const source = mode === 'quote'
    ? `ONE VERBATIM LINE Mandi said in the episode (this is the HOOK — open the caption on it or paraphrase it tightly, keep her exact plain words):\n"${quote}"\n\nEPISODE: ${title}`
    : `EPISODE TITLE: ${title}\nEPISODE TAKEAWAY: ${takeaway}`

  const instructions = `You write SHORT Instagram/TikTok captions for the AI Mom Podcast in Mandi Beck's own voice — warm, direct, human, a little wry, plain English. Never corporate, never "arm you with the facts."

Write ONE caption that makes a scrolling mom want to listen to THIS episode:
- ${mode === 'quote' ? 'OPEN on her line (the hook). It is the strongest thing here — do not smooth it into marketer-speak.' : 'Open on a hook in her voice that names the real reason someone would want this episode.'}
- 2-4 short lines total. Paraphrase, don't summarize — say WHY it would land for her, not what the episode "covers."
- Real line breaks between the hook and the rest.
- End with this exact call to action on its own line: "${cta}"
- No hashtags. No links in the body (the CTA already says link in bio). Do not invent facts not implied by the source.

Return ONLY the caption text — no quotes around it, no preamble.

${craftFor('aimompodcast')}`

  try {
    const raw = await fableText({ instructions, input: source, maxTokens: 500, effort: 'medium', useClaude: true })
    const caption = raw.trim().replace(/^["'`]+|["'`]+$/g, '').trim()
    if (!caption) return NextResponse.json({ error: 'Empty caption' }, { status: 502 })
    return NextResponse.json({ caption })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Caption failed' }, { status: 500 })
  }
}
