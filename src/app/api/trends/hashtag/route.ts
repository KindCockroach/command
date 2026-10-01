import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, createNote, logActivity } from '@/lib/db'
import { researchWithWeb } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// HASHTAG SCOUT — on-demand. Point RISE at a hashtag (e.g. #healingjourney) and it
// scans the live web for what's trending under it RIGHT NOW, then returns TWO things:
//
//   🧬 FORMATS TO MIRROR   — fill-in-the-blank on-screen-text skeletons → plug-and-play
//                            adlibs for the Format Studio (saved as a trends-source note).
//   🎬 ONLY YOU CAN MAKE    — creative calls only Mandi can film: "use this audio",
//                            "shoot it this angle", "make this one" — the human-only
//                            moves. The Commander surfaces these in "Your Move".
//
// On-demand (NOT the weekly cron): web-search is too slow for the self-looping cron
// (that's what 502'd). Called from the Activity tab's "Scan a hashtag" box.
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set — add it in Railway → Variables so the scout can research.' }, { status: 400 })
  }
  const body = await req.json().catch(() => ({}))
  const rawTag = String(body.tag ?? '').trim().replace(/^#/, '').replace(/[^a-z0-9_]/gi, '')
  if (!rawTag) return NextResponse.json({ error: 'A hashtag is required (e.g. healingjourney).' }, { status: 400 })
  const tag = `#${rawTag}`

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted' || a.status === 'planned')
  const niches = accounts.map(a => `${a.handle}: ${a.topic}`).join('\n') || 'AI for moms, intuition, reparenting, meditation, women\'s empowerment'

  const instructions = `You are RISE's HASHTAG SCOUT. Research what is trending under ${tag} on short-form social (Instagram/TikTok/Reels) RIGHT NOW using live web search — recent roundups, trend reports, creator breakdowns, and what's being written about this tag this month. Ground everything in what you actually find; never invent a trend. Mandi's accounts/niches (so you judge fit):\n${niches}\n\nThe WORDS ARE THE SHOW for her: she mirrors a proven on-screen-text STRUCTURE and fills it with her own story. So when you spot a strong format, write the reusable SKELETON as fill-in-the-blank with [SLOTS], preserving the exact rhythm and number of lines.`

  const input = `Scan ${tag} and return a compact brief in EXACTLY these two sections, headers verbatim:

🧬 FORMATS TO MIRROR
3-5 reusable on-screen-text SKELETONS trending under ${tag}, each as a fill-in-the-blank line with [SLOTS] (keep the exact rhythm/beats), one short line on which of her accounts it fits, and the real buzzwords/phrasings you saw. These are plug-and-play adlib templates.

🎬 ONLY YOU CAN MAKE THIS
3-5 creative calls that only Mandi can physically make — the human-only moves you'd tell her at standup. Each ONE short imperative line, specific: e.g. "Film a POV monologue to [the audio/sound that's climbing] — it fits Be There For Her", "Shoot [this specific idea] from [this angle] because [why it's trending under ${tag}]". Name the audio/sound, the angle, or the exact idea, and the reason it's rising. No skeletons here — these are shoots.

End with one line: "BEST BET: <the single strongest move under ${tag} this week>".`

  try {
    const digest = await researchWithWeb({ instructions, input, maxTokens: 2800, maxSearches: 4 })
    const clean = (digest || '').trim()
    if (!clean) throw new Error('empty digest')

    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const bestBet = (clean.match(/BEST BET:\s*(.+)$/im)?.[1] || '').trim()

    // Save as a trends-source note so BOTH the Format Studio (skeletons) and the
    // Commander (creative calls) pick it up. 'hashtag' + tag:<x> tags make it findable.
    createNote({
      title: `📡 ${tag} — ${dateLabel}`,
      body: clean,
      category: 'idea',
      source: 'rise',
      tags: ['trends', 'trends-source', 'hashtag', `tag:${rawTag.toLowerCase()}`],
    })

    logActivity({
      type: 'trend_checkin',
      title: `Scouted ${tag}`,
      detail: bestBet ? `Best bet: ${bestBet.slice(0, 120)}` : 'Skeletons + creative calls saved to Notes',
      icon: '🔍', source: 'hashtag-scout',
    })

    return NextResponse.json({ ran: true, tag, bestBet, digest: clean })
  } catch (e) {
    logActivity({ type: 'trend_checkin', title: `Hashtag scout failed — ${tag}`, detail: e instanceof Error ? e.message.slice(0, 120) : 'unknown', icon: '🔍', source: 'hashtag-scout' })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'The scout came back empty — try again.' }, { status: 502 })
  }
}
