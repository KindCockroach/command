import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllContent, updateContent, getWatchContext, getBrandAccount, getAudienceContext } from '@/lib/db'
import { CRAFT_RULES } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Cross-reference a story (or an existing post) with the Trends Radar:
// how to FRAME it to ride what's working, and what it needs to LOOK like,
// frame by frame. Works pre-river (pass story) or on a card (pass contentId).
export async function POST(req: NextRequest) {
  const { story, contentId } = await req.json()

  let subject = ''
  let piece = null
  if (contentId) {
    piece = getAllContent().find(c => c.id === Number(contentId))
    if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })
    subject = `TITLE: ${piece.title}\nON-SCREEN: ${piece.onscreen_text}\nCAPTION: ${piece.description}`
  } else if (story) {
    subject = typeof story === 'string' ? story : `TITLE: ${story.title}\nSTORY: ${story.story ?? story.raw}\nTRANSFORMATION: ${story.transformation}\nMIC DROP: ${story.mic_drop_candidate ?? ''}`
  } else {
    return NextResponse.json({ error: 'story or contentId required' }, { status: 400 })
  }

  const account = piece?.account_id ? getBrandAccount(piece.account_id) : null
  const watch = getWatchContext()

  const res = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are a trend-savvy creative director. Cross-reference this story with what's CURRENTLY winning (the tracked-accounts intelligence below) and produce a production plan: how to frame it, and exactly what it looks like frame by frame.

${watch || 'No tracked-account intelligence yet — use current platform-native conventions for short vertical video.'}
${account ? `ACCOUNT: ${account.handle} — ${account.topic}. Tone: ${account.tone}. ${account.notes ? `RULES: ${account.notes}` : ''}` : ''}
${piece ? getAudienceContext(account?.audience_id) : ''}
${CRAFT_RULES}

Return ONLY valid JSON:
{
  "framing": "2-3 sentences: the angle that makes THIS story ride what's trending right now — which winning format/pattern it maps onto and why",
  "trend_refs": ["2-4 specific patterns/formats from the tracked accounts this borrows (formatting, not content)"],
  "frames": [
    { "t": "0-3s", "visual": "exactly what we SEE (shot, subject, movement)", "onscreen": "exact overlay text", "note": "why this beat works / trend it rides" }
    // 5-9 frames covering the full piece, in time order
  ],
  "sound": "audio direction: trending-sound vibe or spoken/VO",
  "diy_todo": "if any frame needs Mandi to personally film something or generate in Higgsfield, say exactly what; else null"
}`,
    input: `THE STORY / POST:\n${subject}`,
  })

  try {
    const parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
    // Persist onto the card when framing an existing post
    if (piece) {
      const planText = `FRAMING: ${parsed.framing}\n\nFRAME BY FRAME:\n${(parsed.frames ?? []).map((f: { t: string; visual: string; onscreen: string; note?: string }) => `[${f.t}] SEE: ${f.visual}\n  TEXT: ${f.onscreen}${f.note ? `\n  WHY: ${f.note}` : ''}`).join('\n')}\n\nSOUND: ${parsed.sound ?? ''}${parsed.diy_todo ? `\n\n🎬 YOUR TO-DO: ${parsed.diy_todo}` : ''}\nTREND REFS: ${(parsed.trend_refs ?? []).join(' · ')}`
      updateContent(piece.id, { frame_plan: planText })
    }
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not build the frame plan' }, { status: 502 })
  }
}
