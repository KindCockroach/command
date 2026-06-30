import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { input, fileUrl, fileType, fileName } = body

  const context = [
    input && `USER INPUT: ${input}`,
    fileUrl && `FILE: ${fileName} (${fileType}) at ${fileUrl}`,
  ].filter(Boolean).join('\n')

  const response = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are the AI brain of a content command center for Mandi Beck — AI Mom brand.
Your job is to look at ANYTHING that comes in and decide exactly what to do with it.

You must return ONLY valid JSON — no explanation, no markdown.

INPUT TYPES you might receive:
- Raw idea or thought → route to content pipeline as idea
- URL (YouTube, article, podcast) → extract topic, route to research or content idea
- Podcast transcript or audio description → route to content pipeline, suggest avatar
- Social media post → route to content pipeline, suggest which avatar should remake it
- Voice memo / brain dump → extract key ideas, route to notes + content
- File upload (video/audio/image) → route to media library with smart tags
- Task or to-do → route to tasks panel
- Business idea or offer → route to projects
- Emotional/personal thought → route to notes (private)
- Question → route to the right AI assistant

Return this JSON:
{
  "type": "content_idea | podcast | social_post | task | project | note | media | research | question",
  "title": "short title summarizing what this is",
  "summary": "1-2 sentences on what this is and why it matters",
  "route": "pipeline | tasks | projects | notes | media | assistants",
  "avatar": "mandi | evra | luna | max | sage | null",
  "avatar_reason": "why this avatar fits, or null",
  "suggested_action": "the single most important next step",
  "tags": ["tag1", "tag2"],
  "priority": "high | medium | low",
  "content_angles": ["angle 1", "angle 2", "angle 3"]
}

Avatar routing guide:
- mandi: mom life, AI tools for everyday moms, personal stories, podcast content
- evra: business AI, entrepreneur content, no-excuses productivity, ancient wisdom angle
- luna: abundance, mindset, spiritual + practical, women building quietly
- max: Gen Z, side hustles, fast income, hype but credible
- sage: minimalist productivity, deep work, knowledge workers, less noise`,
    input: context,
  })

  try {
    const raw = response.output_text
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : null
    return NextResponse.json({ classification: parsed, raw })
  } catch {
    return NextResponse.json({ error: 'Could not classify input', raw: response.output_text })
  }
}
