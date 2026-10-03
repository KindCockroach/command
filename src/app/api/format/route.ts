import { NextRequest, NextResponse } from 'next/server'
import { getAllNotes, createContent } from '@/lib/db'
import { fableText } from '@/lib/fable'
import { craftFor } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// MIRROR-THE-FORMAT STUDIO. The words are the show: pick a proven on-screen-text
// SKELETON, and RISE fills the [slots] with this account's story + Bridget's
// specifics — same skeleton, her words. GET lists the formats (evergreen winners +
// whatever this week's Trends digest captured). POST { skeleton, accountId } mirrors
// it into a post. POST { save, ... } drops it in the queue.

type Fmt = { id: string; name: string; skeleton: string; fits: string; source: 'evergreen' | 'trending' }

// Proven, always-available formats (her winners + the ones trending in her space).
const EVERGREEN: Fmt[] = [
  { id: 'compliment', name: 'Compliment subversion', skeleton: '"[a compliment people give her]." Thanks — [the dry, self-aware truth underneath].', fits: 'confidence · intuition · reparenting', source: 'evergreen' },
  { id: 'pov-override', name: 'POV — your knowing, overridden', skeleton: 'POV: [someone] just overrode your intuition with their logic. Again.', fits: 'intuition · @mandij0y · @mandijoybeck', source: 'evergreen' },
  { id: 'for-the-woman', name: 'For the woman who…', skeleton: 'For the woman who [pain], [pain], while [cost].\nYou\'ve [behavior].\nNow it\'s time to [the turn].', fits: 'empowerment · Be There For Her', source: 'evergreen' },
  { id: 'big-number', name: 'Before / after (big number)', skeleton: 'Before I [milestone] I\'d [loss or struggle].\nToday I [result].\n[the one true thing that changed].', fits: 'transformation · success', source: 'evergreen' },
  { id: 'i-replaced', name: '"I replaced my [X]"', skeleton: 'I replaced my entire [task or role] with [tool or shift]. Here\'s what happened.', fits: 'AI · @aimomatwork', source: 'evergreen' },
  { id: 'breaking', name: 'Breaking-news framing', skeleton: 'Breaking: [tool/thing] just made [hard thing] accessible to [the audience who thought they couldn\'t].', fits: 'AI · news-jacking', source: 'evergreen' },
]

// Pull fresh skeletons out of the latest weekly Trends digest note.
function trendingFormats(): Fmt[] {
  const note = getAllNotes().find(n => /Weekly Trends/i.test(n.title ?? '') && (n.tags ?? []).includes('weekly'))
  if (!note?.body) return []
  const body = note.body
  const start = body.search(/FORMATS TO MIRROR/i)
  const section = start >= 0 ? body.slice(start) : body
  const out: Fmt[] = []
  section.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    // A skeleton line has [slots] or a quoted template; keep those.
    if ((line.includes('[') && line.includes(']')) && line.length > 12 && !/FORMATS TO MIRROR/i.test(line)) {
      const skeleton = line.replace(/^[-*•\d.]+\s*/, '').replace(/^\*\*|\*\*/g, '').trim()
      if (skeleton.length > 12) out.push({ id: `trend-${i}`, name: 'This week', skeleton, fits: 'from your Trends digest', source: 'trending' })
    }
  })
  return out.slice(0, 8)
}

export async function GET() {
  return NextResponse.json({ formats: [...trendingFormats(), ...EVERGREEN] })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (body.save) {
    const { accountId, title, onscreen, caption, hashtags } = body
    const piece = createContent({
      title: title || 'Mirrored post',
      onscreen_text: onscreen || '',
      description: caption || '',
      hashtags: Array.isArray(hashtags) ? hashtags.join(' ') : (hashtags || ''),
      status: accountId ? 'ready' : 'idea',
      account_id: accountId || null,
      tags: ['mirror'],
      river_source: 'format-studio',
    })
    return NextResponse.json({ piece })
  }

  const { skeleton, accountId, topic } = body
  if (!skeleton) return NextResponse.json({ error: 'skeleton required' }, { status: 400 })

  const instructions = `${craftFor(accountId)}

You are MIRRORING a proven format. Reuse the skeleton EXACTLY — the same beats, the same rhythm, the same number of lines — and fill the [slots] with THIS account's real story/angle and Bridget's specifics. Same skeleton, her words. Do not change the shape; only swap the content. Obey the account's voice and Craft Law 0 (growth-phase: the caption gives, it does not hard-sell).
${topic ? `Build it around this topic/angle: ${topic}` : 'Pick the strongest true angle for this account.'}

Return ONLY valid JSON:
{ "title": "short internal title", "onscreen": "the filled skeleton — the scroll-stopping on-screen text, mirroring the format line-for-line", "caption": "the caption in her voice that carries this account's arc/promise (spaced, real line breaks)", "hashtags": ["3-5 real relevant hashtags"] }`

  // maxTokens must leave room for adaptive THINKING + the JSON on Sonnet 5 — 1600 got
  // eaten by thinking and streamed back empty. Retry once if the first pass is blank.
  const write = () => fableText({ useClaude: true, json: true, maxTokens: 3500, instructions, input: `THE FORMAT SKELETON TO MIRROR (keep its exact shape):\n${skeleton}` })
  const parse = (raw: string) => { try { return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { return {} } }
  let p: { title?: string; onscreen?: string; caption?: string; hashtags?: string[] } = parse(await write())
  if (!p.onscreen && !p.caption) p = parse(await write())
  if (!p.onscreen && !p.caption) return NextResponse.json({ error: 'The writer came back empty — try again.' }, { status: 502 })
  return NextResponse.json({
    title: p.title || 'Mirrored post',
    onscreen: p.onscreen || '',
    caption: p.caption || '',
    hashtags: Array.isArray(p.hashtags) ? p.hashtags.slice(0, 6) : [],
  })
}
