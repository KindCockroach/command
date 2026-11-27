import { NextRequest, NextResponse } from 'next/server'
import { quickCaption, postIt } from '@/lib/quickCaption'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Phase 8 · B5: Quick Caption. POST {context, wants, mediaUrl?, mediaType?, frames?, transcript?, accountId?}
// → a ready card with only what she ticked. POST {action:'post', id} → "Post it" (published + today's calendar).
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b?.action === 'post') {
    const r = postIt(Number(b.id))
    return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
  }
  const r = await quickCaption({ context: String(b?.context ?? ''), wants: { caption: !!b?.wants?.caption, hashtags: !!b?.wants?.hashtags, onscreen: !!b?.wants?.onscreen, cta: !!b?.wants?.cta, sound: !!b?.wants?.sound },
    mediaUrl: b?.mediaUrl || undefined, mediaType: b?.mediaType || undefined, frames: Array.isArray(b?.frames) ? b.frames : undefined, transcript: b?.transcript || undefined, accountId: b?.accountId || undefined })
  return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
}
