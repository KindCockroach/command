import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllContent, updateContent, getBrandAccount, getWatchContext } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Regenerate a post's caption/on-screen text/hashtags from its (edited) prompt.
// If a still image is attached, the model actually looks at it — new ideas from the real visual.
export async function POST(req: NextRequest) {
  const { contentId, prompt } = await req.json()
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const imagePrompt = (prompt ?? piece.image_prompt ?? '').trim()
  const isStillImage = piece.media_url && !/\.(mp4|mov|webm|m4v)(\?|$)/i.test(piece.media_url)

  const voice = account
    ? `ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}\n${account.notes ? `NON-NEGOTIABLE RULES (obey exactly): ${account.notes}` : ''}`
    : 'VOICE: Mandi Beck — warm, direct, no fluff.'

  const textPart = `${voice}
${getWatchContext()}

Rewrite this post. Keep the core idea, but produce a fresh take.
${imagePrompt ? `CREATIVE DIRECTION / PROMPT (from Mandi — honor it):\n${imagePrompt}` : ''}

ORIGINAL:
Title: ${piece.title}
On-screen: ${piece.onscreen_text}
Caption: ${piece.description}
${isStillImage ? '\nAn ACTUAL IMAGE Mandi uploaded is attached — look at it and let what you truly see shape the caption and on-screen text (new ideas welcome).' : ''}

CONTENT AUDIT RULES: lead with HER (reader's) problem/moment, 3-second cold-stranger test, comment-keyword CTA matching the account, no links in captions.
Return ONLY valid JSON: { "title": "...", "onscreen_text": "...", "caption": "full caption with CTA", "hashtags": "15-25 hashtags space-separated" }`

  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: textPart }]
  if (isStillImage) content.push({ type: 'input_image', image_url: piece.media_url })

  try {
    const res = await client.responses.create({
      model: 'gpt-4o',
      instructions: 'You are a professional content strategist. Return only valid JSON.',
      input: [{ role: 'user', content }] as never,
    })
    const parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
    const updated = updateContent(piece.id, {
      title: parsed.title || piece.title,
      onscreen_text: parsed.onscreen_text ?? piece.onscreen_text,
      description: parsed.caption ?? piece.description,
      hashtags: parsed.hashtags ?? piece.hashtags,
      image_prompt: imagePrompt || piece.image_prompt,
    })
    return NextResponse.json({ regenerated: true, saw_image: !!isStillImage, content: updated })
  } catch {
    return NextResponse.json({ error: 'Regenerate failed' }, { status: 502 })
  }
}
