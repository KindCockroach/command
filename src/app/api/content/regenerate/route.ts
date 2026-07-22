import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getWatchContext, addVoiceLesson, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Regenerate a post from its (edited) prompt and on-screen text.
// If Mandi hand-edited the on-screen text, her words are LAW: only the title,
// caption, and hashtags regenerate — written to serve HER hook — and the diff
// between the machine's version and hers is distilled into a voice lesson that
// every future generation obeys (via craftFor).
// If a still image is attached, the model actually looks at it.
export async function POST(req: NextRequest) {
  const { contentId, prompt, previousOnscreen } = await req.json()
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const imagePrompt = (prompt ?? piece.image_prompt ?? '').trim()
  const isStillImage = piece.media_url && !/\.(mp4|mov|webm|m4v)(\?|$)/i.test(piece.media_url)

  // Mandi edited the hook herself → her on-screen text is locked, and it teaches.
  const onscreenEdited =
    typeof previousOnscreen === 'string' &&
    (piece.onscreen_text ?? '').trim() !== previousOnscreen.trim() &&
    (piece.onscreen_text ?? '').trim() !== ''

  let learnedRule = ''
  if (onscreenEdited) {
    try {
      const out = await fableText({
        instructions: `Mandi threw out the machine's on-screen hook and wrote her own. Study the two versions and distill WHY hers is better into ONE durable craft rule (under 25 words, imperative voice) that a content generator can obey forever. Look for the deep pattern — specificity over description, pain over pictures, tension over symbols — not surface details. Return just the rule.`,
        input: `MACHINE WROTE: ${previousOnscreen}\n\nMANDI REWROTE IT TO: ${piece.onscreen_text}\n\nPOST CONTEXT: ${piece.title} — ${imagePrompt || piece.description?.slice(0, 160)}`,
        maxTokens: 400,
        cheap: true,
      })
      learnedRule = out.trim().replace(/^["']|["']$/g, '')
      if (learnedRule) addVoiceLesson(learnedRule, previousOnscreen, piece.onscreen_text ?? '', piece.account_id)
    } catch { /* lesson capture is best-effort — never block the regenerate */ }
  }

  const voice = account
    ? `ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}\n${account.notes ? `NON-NEGOTIABLE RULES (obey exactly): ${account.notes}` : ''}`
    : 'VOICE: Mandi Beck — warm, direct, no fluff.'

  const lockedBlock = `MANDI'S ON-SCREEN TEXT (LAW — do not change a word, do not paraphrase, it appears exactly as written):
"""${piece.onscreen_text}"""

Your job: write the title, caption, and hashtags AROUND her hook so the whole post serves it.
- The title must be drawn from her on-screen text${imagePrompt ? ' and her creative direction' : ''} — short, internal, evocative.
- The caption continues the emotional register her hook opens (if her hook is a wound, do not bandage it with cheer; deepen it, then turn it).
- Never restate or explain her hook in the caption — extend it.
Return ONLY valid JSON: { "title": "...", "caption": "full caption${account?.offer ? ' with the account CTA if the post earns it' : ''}", "hashtags": "10-20 hashtags space-separated" }`

  const freshBlock = `Rewrite this post. Keep the core idea, but produce a fresh take.
ORIGINAL:
Title: ${piece.title}
On-screen: ${piece.onscreen_text}
Caption: ${piece.description}

Return ONLY valid JSON: { "title": "...", "onscreen_text": "...", "caption": "full caption with CTA", "hashtags": "10-20 hashtags space-separated" }`

  const textPart = `${voice}
${getWatchContext()}

${craftFor(piece.account_id)}

${getAudienceContext(account?.audience_id)}

${imagePrompt ? `CREATIVE DIRECTION / PROMPT (from Mandi — honor it):\n${imagePrompt}\n` : ''}
${onscreenEdited ? lockedBlock : freshBlock}
${isStillImage ? '\nAn ACTUAL IMAGE Mandi uploaded is attached — look at it and let what you truly see shape the caption (never describe it; add what it can\'t say).' : ''}

CONTENT AUDIT RULES: lead with HER (reader's) problem/moment, 3-second cold-stranger test, comment-keyword CTA matching the account, no links in captions.`

  try {
    const output = await fableText({
      instructions: 'You are a professional content strategist. Return only valid JSON.',
      input: textPart,
      imageUrl: isStillImage ? piece.media_url : undefined,
      maxTokens: 4000,
      effort: 'medium',
    })
    const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)![0])
    const updated = updateContent(piece.id, {
      title: parsed.title || piece.title,
      // Her hook is untouchable when she wrote it; otherwise accept the fresh take
      onscreen_text: onscreenEdited ? piece.onscreen_text : (parsed.onscreen_text ?? piece.onscreen_text),
      description: parsed.caption ?? piece.description,
      hashtags: parsed.hashtags ?? piece.hashtags,
      image_prompt: imagePrompt || piece.image_prompt,
    })
    return NextResponse.json({ regenerated: true, locked_onscreen: onscreenEdited, learned_rule: learnedRule || null, saw_image: !!isStillImage, content: updated })
  } catch {
    return NextResponse.json({ error: 'Regenerate failed' }, { status: 502 })
  }
}
