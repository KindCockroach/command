import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllContent, createContent, getBrandAccount, getWatchContext, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import type { ContentType } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Spin N complete variations of a post → each becomes its own sibling card
// under the same account (Greg's volume/test-many model).
export async function POST(req: NextRequest) {
  const { contentId, count = 5, command } = await req.json()
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const n = Math.max(2, Math.min(10, Number(count)))

  const voice = account
    ? `ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}\n${account.notes ? `NON-NEGOTIABLE RULES (obey exactly): ${account.notes}` : ''}`
    : 'VOICE: Mandi Beck — warm, direct, no fluff.'

  const res = await client.responses.create({
    model: 'gpt-4o',
    instructions: `Generate ${n} DISTINCT variations of one post — for volume testing (post them all, let engagement pick the winner). Each variation keeps the core idea but changes the angle/hook meaningfully.
${voice}
${getWatchContext()}

${craftFor(piece.account_id)}

${getAudienceContext(account?.audience_id)}
${command ? `MANDI'S DIRECTION FOR THE VARIATIONS (follow it exactly): ${command}` : 'Vary the hook mechanic across the set: question, stat, bold claim, reframe, permission-slip, story-open, contrarian.'}

CONTENT AUDIT RULES: lead with HER (reader's) problem, 3-second cold-stranger test, comment-keyword CTA matching the account, no links in captions.

Return ONLY a valid JSON array of exactly ${n} items:
[{ "angle": "short label", "title": "...", "onscreen_text": "...", "caption": "full caption with CTA", "hashtags": "15-25 hashtags space-separated" }]`,
    input: `ORIGINAL POST:\nTitle: ${piece.title}\nOn-screen: ${piece.onscreen_text}\nCaption: ${piece.description}\nHashtags: ${piece.hashtags}\nImage prompt: ${piece.image_prompt}`,
  })

  try {
    const items = JSON.parse(res.output_text.match(/\[[\s\S]*\]/)![0]) as Array<Record<string, string>>
    const setTag = `varset-${piece.id}`
    const created = items.slice(0, n).map(v => createContent({
      title: v.title || `${piece.title} — ${v.angle ?? 'variation'}`,
      description: v.caption || piece.description,
      status: 'ready',
      type: piece.type as ContentType,
      platforms: piece.platforms,
      tags: [...(piece.tags ?? []), 'variation', setTag],
      notes: `Variation of #${piece.id}${v.angle ? ` · ${v.angle}` : ''}`,
      account_id: piece.account_id,
      onscreen_text: v.onscreen_text ?? '',
      hashtags: v.hashtags ?? piece.hashtags,
      image_prompt: piece.image_prompt,
      media_urls: piece.media_urls,
      media_url: piece.media_url,
      river_source: 'variations',
    }))
    return NextResponse.json({ created: created.length, variations: created })
  } catch {
    return NextResponse.json({ error: 'Could not generate variations' }, { status: 502 })
  }
}
