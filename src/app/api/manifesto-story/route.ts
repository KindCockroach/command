import { NextRequest, NextResponse } from 'next/server'
import { fableText } from '@/lib/fable'
import { createContent, getAllBrandAccounts } from '@/lib/db'
import type { ContentType } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// MANIFESTO → STORY — the repeatable before/after teaching series. Give it a
// manifesto line, a topic, or a raw idea; it returns the flat "before" and the
// story "after" plus the ONE craft move that changed it — a ready teaching
// carousel. POST { input, accountId?, save? }.
export async function POST(req: NextRequest) {
  const { input, accountId, save } = await req.json().catch(() => ({}))
  if (!input || !String(input).trim()) return NextResponse.json({ error: 'input required' }, { status: 400 })

  const acct = accountId ? getAllBrandAccounts().find(a => a.id === accountId) : null
  const voice = acct ? `Write the STORY in ${acct.handle}'s voice (${acct.tone || 'warm, plain'}).` : 'Write the STORY in Mandi Beck\'s voice: warm, plain, no throw-pillow lines.'

  const out = await fableText({
    maxTokens: 1600,
    useClaude: true,
    json: true,
    instructions: `You run Mandi's "Manifesto → Story" teaching series: the same idea written two ways so her audience SEES the difference and learns to fix their own writing.

Take the input and produce:
- MANIFESTO (the "before"): how most people (and her past self) would write it — a flat thesis, an abstraction, a throw-pillow line. 2-3 sentences. Honest, not a strawman.
- STORY (the "after"): the SAME truth rewritten with the six moves — (1) open in a moment not a claim, (2) show the before through behavior not adjectives, (3) no throw-pillow sentences, (4) land the turn on the smallest true detail, (5) let the reader draw the lesson (end on an image), (6) specificity. ${voice}
- THE MOVE: the ONE craft change that did the most work, in one plain sentence a reader can apply.

Return ONLY valid JSON:
{
  "title": "short internal title",
  "topic": "the idea in 3-5 words",
  "manifesto": "the flat before version",
  "story": "the story after version, with real line breaks between short paragraphs",
  "the_move": "the one craft move, one sentence",
  "slide_overlays": ["Manifesto → Story", "❌ The manifesto", "✅ The story", "The one move"],
  "caption": "a short caption that frames the before/after and ends with a soft invite to try it (real line breaks, no throw-pillow lines)",
  "hashtags": "6-10 single-word hashtags, space-separated, camelCase multi-word ideas"
}`,
    input: `INPUT (a manifesto line, topic, or raw idea):\n${input}`,
  })

  let p: Record<string, unknown>
  try { p = JSON.parse(out.match(/\{[\s\S]*\}/)![0]) } catch {
    return NextResponse.json({ error: 'Could not build the before/after', raw: out }, { status: 502 })
  }

  let piece = null
  if (save !== false) {
    const overlays = Array.isArray(p.slide_overlays) ? (p.slide_overlays as string[]).join('\n') : ''
    piece = createContent({
      title: (p.title as string) || 'Manifesto → Story',
      description: (p.caption as string) || '',
      status: 'idea',
      type: 'image' as ContentType, // teaching carousel
      platforms: acct ? [acct.platform.toLowerCase()] : [],
      tags: ['manifesto-story', 'series'],
      account_id: acct?.id ?? null,
      onscreen_text: overlays,
      notes: `BEFORE (manifesto): ${p.manifesto}\n\nAFTER (story): ${p.story}\n\nTHE MOVE: ${p.the_move}`,
      hashtags: (p.hashtags as string) || '',
      river_source: 'manifesto-story',
    })
  }
  return NextResponse.json({ ...p, piece })
}
