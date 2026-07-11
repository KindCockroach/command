import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createNote } from '@/lib/db'
import { CRAFT_RULES } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Story Studio step 1: take a tangled multi-story dump and SEPARATE it.
// For each story: map its shape, score it, and ask the editor's questions
// that would make it land harder. This coaches storytelling; it does not
// write captions.
export async function POST(req: NextRequest) {
  const { dump } = await req.json()
  if (!dump?.trim()) return NextResponse.json({ error: 'dump required' }, { status: 400 })

  const res = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are Mandi's story editor — a warm, sharp developmental editor who makes her a better storyteller.

She brain-dumps MULTIPLE stories tangled together. Your job:

1. SEPARATE: find each distinct story in the dump (a story = one moment/experience with its own arc, not a topic). Don't merge; don't invent. 2-8 stories typical.
2. PRESERVE HER WORDS: for each story, quote her raw language for it (reassembled from wherever it appears in the dump).
3. MAP THE SHAPE using this arc: HEADLINE (the one line she'd say BEFORE telling the story, so listeners know where it's going — an orientation, not a curiosity trick) → REVEAL (the turn — the assumption that breaks) → TRUTH (what the story is really about) → HUMAN MOMENT (the concrete scene we can see) → MIC DROP (the last line — a revelation, not advice). Mark which beats she GAVE and which are MISSING. This is STORY shaping, not content shaping — no captions, no CTAs, no hashtags.
4. NAME THE TRANSFORMATION: every story moves someone from X to Y (fear→curiosity, certainty→attention, alone→seen). If there's no transformation, say so — that's the note.
5. SCORE it 1-5 for "would a stranger stop scrolling": 5 = complete arc with a specific scene and a turn; 1 = topic without a story.
6. ASK THE EDITOR'S QUESTIONS — WITH EMPATHY: 2-3 questions per story that would make it land harder ("What did you SEE at that exact moment?" "What were you afraid would happen?"). AND for each question, INFER her likely answer from the tone and feel of her raw words — read between the lines like an editor who's been listening closely. Phrase the inference as a caring check: "I think you mean… / It sounds like what you learned is… / It feels like what you'll do with this is…" — she can accept it, edit it, or replace it. Never invent facts; infer meaning, feeling, and intention only.
7. DRAFT A MIC DROP CANDIDATE from her own material (a revelation, not advice).

${CRAFT_RULES}

Return ONLY valid JSON:
{
  "stories": [{
    "title": "short working title",
    "raw": "her words for THIS story, reassembled",
    "transformation": "from X to Y",
    "beats": { "hook": "the HEADLINE — the line said before the story, or null", "reveal": "...", "truth": "...", "human_moment": "...", "mic_drop": "..." },
    "missing": ["which beats/elements are missing"],
    "strength": 1-5,
    "why_it_matters": "one line: what this story could do for a reader",
    "the_lesson": "the transferable insight a stranger walks away with — the value, stated plainly",
    "the_funny": "where the humor lives (a collision of big idea + ordinary life) or null if none",
    "coach_questions": [{ "question": "the editor question", "inferred": "your empathetic inference of her answer — I think you mean… / it sounds like you learned… — from her tone" }],
    "mic_drop_candidate": "one unforgettable line drafted from her material"
  }]
}`,
    input: `HER DUMP (multiple stories tangled together):\n\n${dump}`,
  })

  try {
    const parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
    // Bank each raw story to Notes — her story vault (also feeds CEO review via raw-capture)
    for (const s of parsed.stories ?? []) {
      try {
        createNote({
          title: `📖 ${s.title}`,
          body: `${s.raw}\n\n— arc: ${s.transformation} · strength ${s.strength}/5${s.missing?.length ? `\n— missing: ${s.missing.join(', ')}` : ''}`,
          category: 'idea',
          tags: ['story', 'raw-capture'],
        })
      } catch { /* banking is best-effort */ }
    }
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not separate the stories — try again' }, { status: 502 })
  }
}
