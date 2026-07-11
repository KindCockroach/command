import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllContent, updateContent, getBrandAccount, getWatchContext, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Move a content piece to a different account AND rewrite it in that account's voice,
// respecting the new account's non-negotiable content rules.
export async function POST(req: NextRequest) {
  const { contentId, accountId } = await req.json()
  if (!contentId || !accountId) return NextResponse.json({ error: 'contentId and accountId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = getBrandAccount(accountId)
  if (!account) return NextResponse.json({ error: 'account not found' }, { status: 404 })

  try {
    const res = await client.responses.create({
      model: 'gpt-4o',
      instructions: `You are rewriting an existing post so it fits a DIFFERENT brand account. Keep the underlying idea/story, but re-voice everything for the new account.

NEW ACCOUNT:
Handle: ${account.handle} (${account.brand_name})
Topic: ${account.topic}
Mission: ${account.mission}
Tone: ${account.tone}
Transformation: ${account.transformation}
${account.offer ? `Offer: ${account.offer}` : ''}
${account.notes ? `NON-NEGOTIABLE RULES (obey exactly, they override everything): ${account.notes}` : ''}
${account.hooks?.length ? `Hook templates to riff on: ${account.hooks.slice(0, 6).join(' | ')}` : ''}
${getWatchContext()}

${craftFor(accountId)}

${getAudienceContext(account?.audience_id)}

CONTENT AUDIT RULES: lead with HER (reader's) problem, 3-second cold-stranger test, comment-keyword CTA matching this account, no links in captions.

Return ONLY valid JSON:
{ "title": "...", "onscreen_text": "...", "caption": "full caption with CTA", "hashtags": "15-25 hashtags space-separated", "image_prompt": "visual prompt fitting the new account" }`,
      input: `ORIGINAL POST (for ${piece.account_id ?? 'no account'}):\nTitle: ${piece.title}\nOn-screen: ${piece.onscreen_text}\nBody: ${piece.description}\nHashtags: ${piece.hashtags}\nImage prompt: ${piece.image_prompt}\n\nRewrite it for ${account.handle}.`,
    })

    const parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
    const updated = updateContent(piece.id, {
      account_id: accountId,
      title: parsed.title || piece.title,
      description: parsed.caption || piece.description,
      onscreen_text: parsed.onscreen_text ?? piece.onscreen_text,
      hashtags: parsed.hashtags ?? piece.hashtags,
      image_prompt: parsed.image_prompt ?? piece.image_prompt,
      platforms: [account.platform.toLowerCase()],
      status: piece.status === 'idea' ? 'idea' : 'ready',
    })
    return NextResponse.json({ moved: true, content: updated, account })
  } catch {
    // Rewrite failed — still move it so the card lands under the new account
    const updated = updateContent(piece.id, { account_id: accountId })
    return NextResponse.json({ moved: true, rewritten: false, content: updated, account })
  }
}
