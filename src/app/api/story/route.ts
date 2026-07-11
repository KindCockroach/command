import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CRAFT_RULES } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { freeWrite, title } = await req.json()
  if (!freeWrite) return NextResponse.json({ error: 'freeWrite required' }, { status: 400 })

  const prompt = `You are Mandi Beck's story editor and content director. Process this free write into content that could ONLY have come from THIS story.

MANDI'S VOICE: Direct, warm, zero fluff. Funny when it's real. Mom of 4, homeschooler, AI educator, stand-up dabbler, inner-child healing advocate. She does NOT perform emotions — she lives them and reports back. Honest before polished.

${CRAFT_RULES}

THE SPECIFICITY LAW — this overrides everything:
Every single line you write must contain a SPECIFIC detail from HER free write: a name, an object, a quote, a number, a place, a moment. If a line could be pasted onto anyone else's story, DELETE IT and write one that couldn't.

QUALITY BAR — study the difference:
❌ BANNED (theme labels, could be anyone's): "Navigating a Dallas wedding with the family chaos! 🎉" · "Balancing humor and responsibility one step at a time." · "The art of staying present when chaos calls." · "Join me in this beautiful mess of life!"
✅ REQUIRED (only THIS story): lines built from her actual details — the specific kid, the exact quote someone said, the object in her hand, the moment it turned. A carousel slide should read like a frame of the story, not a chapter title about it. Each slide must create a reason to swipe to the next (an unresolved beat, a question, a turn).

FREE WRITE${title ? ` (Title: ${title})` : ''}:
${freeWrite}

Return a JSON object with ALL of these fields:

{
  "summary": "2-3 sentences on what this piece is about emotionally — using her specifics, not abstractions",
  "core_bullets": ["3-5 insights — each anchored to a concrete moment from the piece"],
  "clarifying_reflection": "The one question a great editor/therapist would ask her about this",
  "why_meaningful_to_mandi": "Why this matters to HER specifically",
  "why_meaningful_to_others": "The universal truth — stated through her specifics, not instead of them",
  "funny_angle": "Where the humor actually lives — the collision of big idea + the ordinary detail in her story",
  "final_summary": "The 1-sentence distilled truth — a revelation, not a moral",
  "standup_bit": "3-5 minute stand-up bit from this story — real beats, pauses in [brackets], callbacks to her actual details",
  "medium_article": {
    "title": "Headline a stranger clicks — specific, not thematic",
    "subtitle": "Supporting sentence",
    "body": "700-900 words — opens INSIDE the scene (no throat-clearing), short paragraphs, ends on the revelation"
  },
  "instagram_caption_1": "Under 150 words. Opens mid-scene with a specific detail from the story. No preamble, no 'So this happened.' Ends with a line that reframes, then CTA",
  "instagram_caption_2": "200-300 words, story format: the scene → the turn → the truth. Every paragraph contains a specific from her free write",
  "tiktok_hook": "First spoken line, under 5 seconds — a specific moment or quote from the story, not a topic ('My 4-year-old looked at me and said...' not 'Let's talk about presence')",
  "carousel_slides": ["5 slides that TELL the story in sequence — each a scene beat, her actual quote, or the turn; each pulls to the next; slide 5 lands the mic drop + CTA. ZERO theme labels."],
  "substack_subject": "Subject line with a specific from the story (curiosity via detail, not vagueness)",
  "threads_post": "Under 280 chars — the sharpest single observation from this story, in her voice",
  "reflection_questions": ["2 questions to take HER deeper into what this story revealed"],
  "account_tags": ["which of these accounts this fits: mandijoy, empoweredsupermom, philosophicalmom, homeschool4humans, aimomatwork, art4thefeminine"]
}`

  try {
    const response = await client.responses.create({
      model: 'gpt-4o',
      instructions: 'You are a master storyteller and ruthless editor. Specific beats general every time. If a line could belong to anyone, it belongs to no one — cut it. Return only valid JSON.',
      input: prompt,
    })

    const raw = response.output_text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const result = JSON.parse(raw)
    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Story processing failed' }, { status: 500 })
  }
}
