import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// "Clean up copy" — one click on a post → rewrites its COPY to the craft bar in
// the account's voice. Fixes caption spacing/hook/curiosity-gap, kills question
// hooks, and sets on-screen text to the RIGHT thing for the format: EMPTY for a
// talking/avatar/dropped video, numbered slides for a carousel, 1-2 lines for a
// single image. Never touches media, account, or type — Mandi keeps her visuals
// and finishes the images herself. Keeps the underlying idea; invents no new facts.
export async function POST(req: NextRequest) {
  const { contentId } = await req.json().catch(() => ({}))
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const voice = account
    ? `ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}\n${account.notes ? `NON-NEGOTIABLE RULES (obey exactly): ${account.notes}` : ''}`
    : 'VOICE: Mandi Beck — warm, plain, no fluff.'

  const isVideo = piece.type === 'video' || piece.type === 'podcast' || (piece.platforms ?? []).some(p => /reel|tiktok|youtube/i.test(p))
  const isCarousel = piece.type === 'carousel' || (piece.media_urls?.length ?? 0) > 1
  const isYouTube = (account?.platform ?? '').toLowerCase() === 'youtube'
  const format = isVideo ? 'TALKING/AVATAR VIDEO' : isCarousel ? 'CAROUSEL' : 'SINGLE IMAGE/POST'

  const prompt = `${voice}

${craftFor(piece.account_id)}

${getAudienceContext(account?.audience_id)}

CLEAN UP THIS EXISTING POST'S COPY so it fully obeys the craft laws — this is a polish of what's already here, not a new post. Keep the underlying idea, story, and facts; do NOT invent new events about her life. The caption MUST use real line breaks (headline first line carries the golden thread; short paragraphs; curiosity-gap last line; NO CTA in growth phase; NO question hooks anywhere). Fix the on-screen text for the format below.

FORMAT: ${format}
- TALKING/AVATAR VIDEO → onscreen_text = "" (EMPTY). The spoken words are the hook; never stamp text on a talking video.
- CAROUSEL → onscreen_text = numbered "Slide 1: …" lines, 5-8, a progression, each standalone.
- SINGLE IMAGE/POST → onscreen_text = 1-2 bold overlay STATEMENT lines (never a question).
${isYouTube ? 'This is a YOUTUBE account → the caption opens with a click-worthy TITLE line, then a description that hooks before the fold; obey the YOUTUBE law.' : ''}

THE POST NOW:
Title: ${piece.title}
On-screen: ${piece.onscreen_text ?? '(none)'}
${piece.script ? `Script: ${piece.script}\n` : ''}Caption: ${piece.description ?? '(none)'}

Return ONLY valid JSON: { "title": "short internal title", "onscreen_text": "per the FORMAT rule above", "caption": "the full cleaned-up, properly spaced caption", "hashtags": "8-20 single-word hashtags space-separated" }`

  try {
    const output = await fableText({
      instructions: 'You clean up an existing social post\'s copy to the craft laws, in the author\'s voice, inventing no new facts. Return only valid JSON.',
      input: prompt,
      maxTokens: 2500,
      useClaude: true,
      json: true,
    })
    const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)![0])
    const updated = updateContent(piece.id, {
      title: parsed.title || piece.title,
      // A talking/avatar video NEVER carries on-screen text, whatever the model returns.
      onscreen_text: isVideo ? '' : (parsed.onscreen_text ?? piece.onscreen_text),
      description: parsed.caption ?? piece.description,
      hashtags: parsed.hashtags ?? piece.hashtags,
    })
    return NextResponse.json({ polished: true, content: updated })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'polish failed' }, { status: 502 })
  }
}
