import { NextRequest, NextResponse } from 'next/server'
import { createContent, getBrandAccount, getAudienceContext } from '@/lib/db'
import { fableText } from '@/lib/fable'
import { craftFor } from '@/lib/craft'
import type { ContentType } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ONE-DROP CLIP PIPELINE — kills the Riverside→HeyGen(manual captions)→RISE loop.
// Given a voice clip already in R2 (audioUrl) + an account, it:
//   1. transcribes the clip (her real words),
//   2. writes the POST (statement hook + spaced caption + hashtags, account voice),
//   3. creates the card with the audio attached (file_path) so HeyGen lip-syncs it,
//   4. fires a HeyGen avatar render WITH burned captions (caption:true).
// The card then auto-attaches the captioned MP4 when the render finishes.
export async function POST(req: NextRequest) {
  const { audioUrl, accountId } = await req.json().catch(() => ({}))
  if (!audioUrl) return NextResponse.json({ error: 'audioUrl required' }, { status: 400 })
  const origin = new URL(req.url).origin

  // 1) Transcribe the clip (server compresses big files itself)
  const tRes = await fetch(`${origin}/api/transcribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioUrl }),
  })
  const tData = await tRes.json().catch(() => ({}))
  const transcript = (tData.transcript ?? '').trim()
  if (!transcript) return NextResponse.json({ error: `Couldn't transcribe the clip: ${tData.error ?? 'unknown'}` }, { status: 502 })

  // 2) Write the post FROM the clip's words — in the account's voice, obeying craft laws
  const account = accountId ? getBrandAccount(accountId) : null
  const voice = account
    ? `Account: ${account.handle} (${account.brand_name}). Tone: ${account.tone}. Mission: ${account.mission}. ${account.notes ? `⚠ RULES: ${account.notes}` : ''} ${getAudienceContext(account.audience_id)}`
    : 'Voice: Mandi Beck — warm, plain, no fluff.'
  // This is ALWAYS an avatar/talking-head video (her voice → captioned avatar),
  // so it gets NO on-screen text — the spoken words are the hook (craft SHAPE law).
  // The written hook lives in the caption's first line instead.
  let onscreen = '', caption = '', hashtags = '', title = 'Voice clip'
  try {
    const out = await fableText({
      maxTokens: 1800,
      useClaude: true,
      json: true,
      instructions: `${craftFor(accountId)}\n\n${voice}\n\nMandi recorded the spoken words below — a real voice clip that becomes a CAPTIONED AVATAR VIDEO of her talking. This is a talking-head video, so it gets NO on-screen text overlay; the written hook goes in the caption's first line. Write the POST that ships with it. Return ONLY valid JSON:\n{ "title": "short internal title", "caption": "spaced caption: headline first line IS the hook (carries the golden thread), real line breaks, NO CTA in growth phase", "hashtags": "12-20 single-word hashtags, space-separated, camelCase multi-word ideas" }`,
      input: `SPOKEN WORDS (the audio):\n${transcript.slice(0, 6000)}`,
    })
    const p = JSON.parse(out.match(/\{[\s\S]*\}/)![0])
    caption = p.caption || ''; hashtags = p.hashtags || ''; title = p.title || title
  } catch { /* still create the card with the transcript as script */ }

  // 3) Create the card with the audio attached so HeyGen lip-syncs her real voice
  const piece = createContent({
    title,
    description: caption,
    onscreen_text: onscreen,
    hashtags,
    script: transcript.slice(0, 1500),
    status: 'idea',
    type: 'video' as ContentType,
    platforms: account ? [account.platform.toLowerCase()] : [],
    tags: ['clip', 'one-drop'],
    account_id: accountId ?? null,
    file_path: audioUrl, // HeyGen reads this as the audio to lip-sync
    river_source: 'clip',
  })

  // 4) Fire the captioned avatar render (audio-driven + caption:true). Best-effort:
  // if it can't start, the card still has everything to render with one click.
  let heygen: { started?: boolean; error?: string } = {}
  try {
    const hRes = await fetch(`${origin}/api/heygen/attach`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: piece.id, action: 'start', audioUrl }),
    })
    heygen = await hRes.json().catch(() => ({ error: 'no response' }))
  } catch (e) { heygen = { error: e instanceof Error ? e.message : 'heygen start failed' } }

  return NextResponse.json({ piece, transcriptWords: transcript.split(/\s+/).length, heygen })
}
