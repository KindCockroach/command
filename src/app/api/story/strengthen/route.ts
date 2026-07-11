import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CRAFT_RULES } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Story Studio step 2: she answers the editor's questions → the story is
// rebuilt STRONGER, in her voice, with her new details. Still a story —
// not a caption. Returns the improved story + updated shape + what improved.
export async function POST(req: NextRequest) {
  const { story, answers } = await req.json()
  if (!story) return NextResponse.json({ error: 'story required' }, { status: 400 })

  const res = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are Mandi's story editor. She answered your questions about one of her stories. Rebuild the story STRONGER — in HER voice, using HER new details. This is still a STORY (something she could tell out loud in 30-60 seconds), not a caption or post.

Rules:
- Her words and details are the material. Add nothing that didn't happen.
- Open on the concrete scene (the human moment), not the summary.
- Land the transformation (from X to Y) without naming it clinically.
- End on the mic drop — a revelation, not advice.
- Cut everything that doesn't serve the turn. Shorter and sharper beats longer.
${CRAFT_RULES}

Return ONLY valid JSON:
{
  "title": "sharpened title",
  "story": "the rebuilt story, told in her voice (30-60s spoken length)",
  "transformation": "from X to Y",
  "beats": { "hook": "the HEADLINE — the line said before the story to orient the listener", "reveal": "...", "truth": "...", "human_moment": "...", "mic_drop": "..." },
  "strength": 1-5,
  "what_improved": "one line: what her answers unlocked",
  "the_lesson": "the transferable insight a stranger walks away with",
  "the_funny": "where the humor lives, or null",
  "coach_questions": [{ "question": "remaining question ONLY if something still blocks a 5", "inferred": "your empathetic inference of her answer from tone — is this what you mean?" }],
  "mic_drop_candidate": "the closing line"
}`,
    input: `THE STORY (current draft):\n${JSON.stringify(story)}\n\nHER ANSWERS TO YOUR QUESTIONS:\n${answers ?? '(none — just tighten it)'}`,
  })

  try {
    const parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not strengthen — try again' }, { status: 502 })
  }
}
