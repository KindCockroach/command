import { NextRequest, NextResponse } from 'next/server'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { input, fileUrl, fileType, fileName } = body

  const context = [
    input && `USER INPUT: ${input}`,
    fileUrl && `FILE: ${fileName} (${fileType}) at ${fileUrl}`,
  ].filter(Boolean).join('\n')

  const raw = await fableText({
    maxTokens: 1500,
    effort: 'low',
    imageUrl: fileType?.startsWith('image') ? fileUrl : undefined,
    instructions: `You are RISE Command Center — the intake brain for Mandi Beck's AI Mom content station.
Something just landed in Quick Capture. Your first job is to make Mandi feel HEARD, then decide where it belongs.

Return ONLY valid JSON — no explanation, no markdown.

Two things matter most:
1. "received" — one warm, specific line proving you actually read what she gave you (echo a real detail back, in her voice — not generic). This is her receipt.
2. "understood" — TRUE only if you have enough to sort and act on it confidently. If you're missing the ONE thing that would change where this goes or how it's written (which account, which kid, real numbers, whether it's a task vs a post, permission to share), set FALSE and ask.
   - When FALSE: put 1-3 SHARP questions in "questions" — only the ones that actually change the sort. Never ask filler. If you can sort it fine as-is, ask nothing and set TRUE.

Return this JSON:
{
  "received": "warm one-liner echoing a real detail back to her",
  "understood": true | false,
  "questions": ["only if understood is false — 1 to 3 sharp questions", "..."],
  "type": "content_idea | podcast | social_post | task | project | note | media | research | question",
  "title": "short title summarizing what this is",
  "summary": "1-2 sentences on what this is and why it matters",
  "route": "pipeline | tasks | projects | notes | media | assistants",
  "avatar": "the best account/avatar id, or null",
  "avatar_reason": "why this avatar fits, or null",
  "suggested_action": "the single most important next step",
  "tags": ["tag1", "tag2"],
  "priority": "high | medium | low",
  "content_angles": ["angle 1", "angle 2", "angle 3"]
}

INPUT TYPES: raw idea → pipeline · URL → research/idea · transcript → pipeline · social post → pipeline (suggest avatar) · brain dump → notes + content · file → media · to-do → tasks · offer/business → projects · personal/emotional → notes · question → assistants.`,
    input: context,
  })

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : null
    if (parsed && !Array.isArray(parsed.questions)) parsed.questions = []
    return NextResponse.json({ classification: parsed, raw })
  } catch {
    return NextResponse.json({ error: 'Could not classify input', raw })
  }
}
