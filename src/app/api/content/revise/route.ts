import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Revise — Mandi edited the post's fields by hand; Fable integrates her changes
// and re-aligns the rest to the Craft Laws WITHOUT undoing anything she wrote.
// Her edits are creative direction, not suggestions. Contrast: /regenerate
// rewrites from the prompt; /revise builds around her words.
export async function POST(req: NextRequest) {
  const { contentId, edits } = await req.json().catch(() => ({}))
  if (!contentId || !edits) return NextResponse.json({ error: 'contentId and edits required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const voice = account
    ? `ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}\n${account.notes ? `NON-NEGOTIABLE RULES (obey exactly): ${account.notes}` : ''}`
    : 'VOICE: Mandi Beck — warm, direct, no fluff.'

  const prompt = `${voice}

${craftFor(piece.account_id)}

${getAudienceContext(account?.audience_id)}

Mandi hand-edited this post. Everything she changed or added is CREATIVE DIRECTION — keep every idea, fact, phrase, and word choice she introduced. Your job is to integrate her edits and re-align the rest of the post to the Craft Laws around them: side-effect specificity, headline (first line) ≠ hook (on-screen), a cohesive story arc in the body, curiosity gap as the last line. Where her edit conflicts with a Law, her edit wins — polish around it, never over it. Do NOT invent facts about her life.

BEFORE (the machine's version):
Title: ${piece.title}
On-screen: ${piece.onscreen_text ?? ''}
Script: ${piece.script ?? ''}
Caption: ${piece.description ?? ''}

AFTER (Mandi's edited version — this is the direction):
Title: ${edits.title ?? piece.title}
On-screen: ${edits.onscreen_text ?? piece.onscreen_text ?? ''}
Script: ${edits.script ?? piece.script ?? ''}
Caption: ${edits.description ?? piece.description ?? ''}

Return ONLY valid JSON: { "title": "...", "onscreen_text": "...", "script": "...", "caption": "full ready-to-post caption (headline first line, curiosity gap last line, hashtags at the end)", "hashtags": "up to 5 hashtags space-separated" }`

  try {
    const output = await fableText({
      instructions: 'You are a master storyteller integrating the author\'s own edits into her post. Her words are the direction — build around them, never over them. Return only valid JSON.',
      input: prompt,
      maxTokens: 3000,
      effort: 'medium',
    })
    const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)![0])
    const updated = updateContent(piece.id, {
      title: parsed.title || edits.title || piece.title,
      onscreen_text: parsed.onscreen_text ?? edits.onscreen_text ?? piece.onscreen_text,
      script: parsed.script ?? edits.script ?? piece.script,
      description: parsed.caption ?? edits.description ?? piece.description,
      hashtags: parsed.hashtags ?? edits.hashtags ?? piece.hashtags,
      image_prompt: edits.image_prompt ?? piece.image_prompt,
    })
    return NextResponse.json({ revised: true, content: updated })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'revise failed' }, { status: 502 })
  }
}
