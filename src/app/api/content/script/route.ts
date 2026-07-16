import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllContent, updateContent, getBrandAccount, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Turn a post into a natural SPOKEN script (for an avatar / talking to camera),
// written to be said out loud — not a caption read aloud. Saves to the script field.
export async function POST(req: NextRequest) {
  const { contentId } = await req.json()
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const voice = account
    ? `Account voice — ${account.handle} (${account.brand_name}). Tone: ${account.tone}. Mission: ${account.mission}. ${account.notes ? `NON-NEGOTIABLE RULES: ${account.notes}` : ''} ${getAudienceContext(account.audience_id)}`
    : 'Voice: Mandi Beck — warm, direct AI Mom educator.'
  const source = [piece.title, piece.onscreen_text, piece.description].filter(Boolean).join('\n\n')

  try {
    const res = await client.responses.create({
      model: 'gpt-4o',
      instructions: `${craftFor(piece.account_id)}\n\nWrite a natural SPOKEN script for a creator/avatar to say straight to camera — first person, conversational, exactly how a real person actually talks. NOT a caption read aloud, NOT written prose. 20–35 seconds (roughly 60–95 words). Open with a spoken hook that stops the scroll, deliver one clear idea, end on a line that lands. No hashtags, no emojis, no "link in bio," no stage directions or scene notes — only the words she says out loud (the avatar reads this literally).\n\n${voice}`,
      input: `Turn this post idea into that spoken script:\n\n${source}`,
    })
    const script = ((res as { output_text?: string }).output_text ?? '').trim()
    if (!script) return NextResponse.json({ error: 'no script generated' }, { status: 502 })
    const updated = updateContent(piece.id, { script })
    return NextResponse.json({ script, content: updated })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'generation failed' }, { status: 502 })
  }
}
