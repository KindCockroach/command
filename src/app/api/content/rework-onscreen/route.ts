import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'
import { learnFromFeedback } from '@/lib/learn'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Rework on-screen text — rewrite ONLY the on-screen hook / slide text of an
// existing post, in place. The sibling of /recaption, but for the overlay that
// stops the scroll instead of the caption. Two modes:
//   • feedback given  → follow it exactly AND learn a durable rule from it
//   • no feedback     → a meaningfully different hook ("another"), fresh angle
// Because the on-screen hook changed, the caption's first line is re-aligned so
// the two-hooks rule still holds (caption opener ≠ on-screen hook) — that's the
// "update the whole post around the new hook" part. Media, script untouched.
// Previous version stays recoverable via the card's undo snapshot.
export async function POST(req: NextRequest) {
  const { contentId, feedback } = await req.json().catch(() => ({}))
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const voice = account
    ? `ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}\n${account.notes ? `NON-NEGOTIABLE RULES (obey exactly): ${account.notes}` : ''}`
    : 'VOICE: Mandi Beck — warm, direct, no fluff.'
  const fb = String(feedback ?? '').trim()

  const isCarousel = piece.type === 'carousel'
  const isVideoPost = piece.type === 'video' || piece.type === 'podcast'
  const shape = isCarousel
    ? 'This is a CAROUSEL: return the on-screen text as ONE line per slide (newline-separated). Slide 1 is the scroll-stopping hook; the middle slides carry the story beats; the LAST slide is the follow line.'
    : isVideoPost
      ? 'This is a VIDEO/REEL: the on-screen text is ONE short line — the scroll-stopping overlay hook. Keep it to a single line.'
      : 'This is a single image: the on-screen text is the hook that renders ON the image — one to two short lines, no more.'

  const prompt = `${voice}

${craftFor(piece.account_id)}

${getAudienceContext(account?.audience_id)}

Rewrite the ON-SCREEN TEXT for this existing post — same media, same moment, same story. ${shape}
The on-screen hook is a STATEMENT, never a question. It must be specific and concrete (a side-effect, a number, a named thing), never a vague tease. Never invent facts about her life; if a detail is missing, write around it.

Because you are changing the on-screen hook, also re-align the CAPTION so its first line is a DIFFERENT door than the new on-screen hook (two-hooks rule) — rewrite only what's needed for that to hold; keep the rest of the caption's substance and her voice.

THE POST:
Current on-screen text:
${piece.onscreen_text ?? '(none)'}
${piece.source_context ? `Her original words behind this post: ${piece.source_context}\n` : ''}Current caption:
${piece.description ?? '(none)'}

${fb
  ? `MANDI'S FEEDBACK on the on-screen text — follow it EXACTLY, it overrides everything else: ${fb}`
  : `Mandi wants ANOTHER on-screen hook — write a meaningfully DIFFERENT one: new angle, fresh line, a different emotional door. Not a light reword of the current one.`}

Return ONLY valid JSON: { "onscreen_text": "the reworked on-screen text${isCarousel ? ' (one line per slide, last line the follow line)' : ''}", "caption": "the full caption with its first line re-aligned so it does not repeat the new on-screen hook", "hashtags": "up to 5 single-word hashtags space-separated (keep the post's existing ones if they still fit)" }`

  try {
    const output = await fableText({
      instructions: 'You rewrite the on-screen hook of a social post in the author\'s voice, obeying her feedback and the craft laws, then re-align the caption opener so the two hooks differ. Return only valid JSON.',
      input: prompt,
      maxTokens: 2500,
      effort: 'medium',
    })
    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'model returned no usable text' }, { status: 502 })
    const parsed = JSON.parse(jsonMatch[0])
    const before = piece.onscreen_text ?? ''
    const nextOnscreen = parsed.onscreen_text ?? before
    const updated = updateContent(piece.id, {
      onscreen_text: nextOnscreen,
      description: parsed.caption ?? piece.description,
      hashtags: parsed.hashtags ?? piece.hashtags,
    })
    // Feedback is a taste signal — turn it into durable voice lessons (training).
    const learned = fb
      ? await learnFromFeedback({ title: piece.title, accountId: piece.account_id, feedback: fb, before, after: nextOnscreen }).catch(() => [])
      : []
    return NextResponse.json({ reworked: true, content: updated, learned })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'rework failed' }, { status: 502 })
  }
}
