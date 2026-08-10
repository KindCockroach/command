import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount } from '@/lib/db'
import { fableText } from '@/lib/fable'
import { craftFor } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Mandi answers a stuck post's open questions → the river finishes composing it
export async function POST(req: NextRequest) {
  const { contentId, answers } = await req.json()
  if (!contentId || !answers) return NextResponse.json({ error: 'contentId and answers required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const qa = (piece.open_questions ?? []).map((q, i) => `Q: ${q}\nA: ${answers[i] ?? ''}`).join('\n\n')

  const output = await fableText({
    maxTokens: 3000,
    effort: 'medium',
    instructions: `You are the RIVER — finishing a post that was waiting on details only Mandi could provide.
${account ? `ACCOUNT VOICE: ${account.handle} (${account.brand_name}) — ${account.tone}. Mission: ${account.mission}.` : 'VOICE: Mandi Beck — warm, direct, no fluff.'}

${craftFor(piece.account_id)}

Return ONLY valid JSON:
{
  "title": "short internal title",
  "onscreen_text": "the HOOK — a statement, never a question (law 2a); does not repeat the headline",
  "body": "complete ready-to-post caption. First line = the HEADLINE (a statement, a second door, never repeats the hook). Real line breaks between short paragraphs.",
  "image_prompt": "detailed AI image/video prompt with tension, no baked-in text unless single image",
  "hashtags": "12-20 single-word hashtags, space-separated, camelCase multi-word ideas"
}`,
    input: `ORIGINAL RAW INPUT:\n${piece.description}\n\nMANDI'S ANSWERS:\n${qa}\n\nNow compose the complete post.`,
  })

  try {
    const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)![0])
    const updated = updateContent(piece.id, {
      title: parsed.title || piece.title,
      description: parsed.body,
      onscreen_text: parsed.onscreen_text || piece.onscreen_text,
      image_prompt: parsed.image_prompt || piece.image_prompt,
      hashtags: parsed.hashtags || piece.hashtags,
      status: 'ready',
      open_questions: [],
    })
    return NextResponse.json({ complete: true, piece: updated })
  } catch {
    return NextResponse.json({ error: 'Could not compose from answers', raw: output }, { status: 502 })
  }
}
