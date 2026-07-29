import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'
import { learnFromFeedback } from '@/lib/learn'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Recaption — rewrite ONLY the caption of an existing post, in place. Two modes:
//   • feedback given  → follow it exactly AND learn a durable rule from it (training)
//   • no feedback     → a meaningfully different caption ("🔁 another"), fresh angle
// Leaves the on-screen hook, script, and media untouched — she never has to delete
// the post to try again, and the previous version is recoverable via the card's undo.
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

  const prompt = `${voice}

${craftFor(piece.account_id)}

${getAudienceContext(account?.audience_id)}

Rewrite ONLY the caption for this existing post — same media, same moment. Do NOT change the on-screen hook: the caption's first line must be a DIFFERENT door than the on-screen hook (two-hooks rule). Never invent facts about her life; if a detail is missing, write around it.

THE POST:
On-screen hook (do NOT repeat it as the caption's first line): ${piece.onscreen_text ?? '(none)'}
${piece.source_context ? `Her original words behind this post: ${piece.source_context}\n` : ''}Current caption:
${piece.description ?? '(none)'}

${fb
  ? `MANDI'S FEEDBACK — follow it EXACTLY, it overrides everything else: ${fb}`
  : `Mandi wants ANOTHER option — write a meaningfully DIFFERENT caption: new angle, fresh first line, a different emotional door. Not a light reword of the current one.`}

Return ONLY valid JSON: { "caption": "the full ready-to-post caption, ending with the same style of CTA as before", "hashtags": "8-20 single-word hashtags space-separated (keep the post's existing ones if they still fit)" }`

  try {
    const output = await fableText({
      instructions: 'You rewrite a single Instagram caption in the author\'s voice, obeying her feedback and the craft laws. Return only valid JSON.',
      input: prompt,
      maxTokens: 2000,
      effort: 'medium',
    })
    const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)![0])
    const before = piece.description ?? ''
    const nextCaption = parsed.caption ?? before
    const updated = updateContent(piece.id, {
      description: nextCaption,
      hashtags: parsed.hashtags ?? piece.hashtags,
    })
    // Feedback is a taste signal — turn it into durable voice lessons (training).
    const learned = fb
      ? await learnFromFeedback({ title: piece.title, accountId: piece.account_id, feedback: fb, before, after: nextCaption }).catch(() => [])
      : []
    return NextResponse.json({ recaptioned: true, content: updated, learned })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'recaption failed' }, { status: 502 })
  }
}
