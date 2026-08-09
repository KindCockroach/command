import { NextRequest, NextResponse } from 'next/server'
import { fableText } from '@/lib/fable'
import { createContent } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// THE META RULE — turn "what Mandi asked RISE to do" into build-in-public content.
// So much of the work she asks for is the exact work/result her audience wants;
// documenting the ask → why → how → the stealable prompt IS content of its own.
// POST { ask, why?, how?, save? } → a build-in-public post (saved to content as an
// unassigned 'idea' tagged 'meta' unless save:false).
export async function POST(req: NextRequest) {
  const { ask, why, how, save } = await req.json().catch(() => ({}))
  if (!ask || !String(ask).trim()) return NextResponse.json({ error: 'ask required' }, { status: 400 })

  const out = await fableText({
    maxTokens: 1400,
    instructions: `You document Mandi Beck building in public. She asked her content system (RISE) to do something; that ask — and how it got solved — is content, because her audience (overwhelmed creative moms/founders) wants the SAME result.

Write a short BUILD-IN-PUBLIC post in Mandi's voice: warm, plain, real point of view. STORY-FIRST, never a manifesto. Obey these six moves:
1. OPEN IN A MOMENT, not a claim — a time, a place, a body ("It's 9pm, seventh tab, cold tea"). Never open with a thesis or "Here's what I learned."
2. Show the BEFORE through BEHAVIOR, not adjectives — never "I was overwhelmed"; show what that looked like.
3. KILL throw-pillow sentences — no "the answers are within" abstractions. Concrete detail only.
4. Land the turn on the SMALLEST TRUE DETAIL (the closed tab, the specific prompt she typed) — one image proves the change.
5. LET THE READER draw the lesson — end on the image, not the takeaway. If you state the point, five words, ONCE.
6. SPECIFICITY is the game — name the actual move/prompt so a reader could steal it.

Format with real line breaks: a hook line alone, blank line, short 1-2 sentence paragraphs each separated by a blank line, blank line before a soft closing line.

Return ONLY valid JSON:
{ "title": "short internal title", "onscreen_text": "the hook line", "caption": "the spaced build-in-public post", "takeaway": "one line: the stealable prompt or move", "hashtags": "6-12 single-word hashtags, space-separated, camelCase multi-word ideas" }`,
    input: `WHAT SHE ASKED RISE FOR:\n${ask}\n\nWHY IT MATTERED:\n${why || '(infer from the ask)'}\n\nHOW WE GOT THERE:\n${how || '(infer a plausible, honest process from the ask)'}`,
  })

  let parsed: { title?: string; onscreen_text?: string; caption?: string; takeaway?: string; hashtags?: string }
  try { parsed = JSON.parse(out.match(/\{[\s\S]*\}/)![0]) } catch {
    return NextResponse.json({ error: 'Could not draft the meta post', raw: out }, { status: 502 })
  }

  let piece = null
  if (save !== false) {
    piece = createContent({
      title: parsed.title || 'Meta · build-in-public',
      description: parsed.caption || '',
      status: 'idea',
      type: 'post',
      platforms: [],
      tags: ['meta', 'build-in-public'],
      notes: parsed.takeaway ? `Stealable: ${parsed.takeaway}` : '',
      onscreen_text: parsed.onscreen_text || '',
      hashtags: parsed.hashtags || '',
      river_source: 'meta',
    })
  }
  return NextResponse.json({ ...parsed, piece })
}
