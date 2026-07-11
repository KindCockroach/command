import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllContent, createContent, getBrandAccount, getWatchContext, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import type { ContentType } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Duplicate a post to ANOTHER account, re-voiced for it. Original stays put.
export async function POST(req: NextRequest) {
  const { contentId, accountId } = await req.json()
  if (!contentId || !accountId) return NextResponse.json({ error: 'contentId and accountId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })
  const account = getBrandAccount(accountId)
  if (!account) return NextResponse.json({ error: 'account not found' }, { status: 404 })

  const makeCopy = (fields: Partial<{ title: string; onscreen_text: string; caption: string; hashtags: string; image_prompt: string }>) =>
    createContent({
      title: fields.title || piece.title,
      description: fields.caption || piece.description,
      status: 'ready',
      type: piece.type as ContentType,
      platforms: [account.platform.toLowerCase()],
      tags: [...(piece.tags ?? []).filter(t => t !== 'variation'), 'duplicate'],
      notes: `Duplicated from #${piece.id} (${piece.account_id ?? 'unassigned'})`,
      account_id: accountId,
      onscreen_text: fields.onscreen_text ?? piece.onscreen_text,
      hashtags: fields.hashtags ?? piece.hashtags,
      image_prompt: fields.image_prompt ?? piece.image_prompt,
      media_urls: piece.media_urls,
      media_url: piece.media_url,
      river_source: 'duplicate',
    })

  try {
    const res = await client.responses.create({
      model: 'gpt-4o',
      instructions: `Re-voice this post for a different account. Keep the core idea; rewrite it in the new account's voice and rules.
NEW ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}
${account.notes ? `NON-NEGOTIABLE RULES (obey exactly): ${account.notes}` : ''}
${getWatchContext()}

${craftFor(accountId)}

${getAudienceContext(account?.audience_id)}
CONTENT AUDIT RULES: lead with HER (reader's) problem, 3-second cold-stranger test, comment-keyword CTA for this account, no links in captions.
Return ONLY valid JSON: { "title": "...", "onscreen_text": "...", "caption": "full caption with CTA", "hashtags": "15-25 hashtags space-separated", "image_prompt": "visual prompt fitting the new account" }`,
      input: `ORIGINAL:\nTitle: ${piece.title}\nOn-screen: ${piece.onscreen_text}\nCaption: ${piece.description}\nHashtags: ${piece.hashtags}\nImage prompt: ${piece.image_prompt}`,
    })
    const parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
    return NextResponse.json({ duplicated: true, content: makeCopy(parsed), account })
  } catch {
    // Re-voice failed — still duplicate verbatim so nothing is lost
    return NextResponse.json({ duplicated: true, rewritten: false, content: makeCopy({}), account })
  }
}
