import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { freeWrite, title, accountId } = await req.json()
  if (!freeWrite) return NextResponse.json({ error: 'freeWrite required' }, { status: 400 })

  const prompt = `You are Mandi Beck's Content Director at RISE Station. Process this free write and produce ALL content outputs in one pass.

MANDI'S VOICE: Direct, warm, zero fluff. Funny when it's real. She's a mom of 4, homeschooler, AI educator, stand-up comedy dabbler, inner child healing advocate. She does NOT perform emotions — she lives them and reports back. Her writing lands because it's honest before it's polished.

FREE WRITE${title ? ` (Title: ${title})` : ''}:
${freeWrite}

Return a JSON object with ALL of these fields:

{
  "summary": "2-3 sentence ChatGPT-style summary of what this piece is about emotionally and thematically",
  "core_bullets": ["3-5 key insight bullet points from this piece"],
  "clarifying_reflection": "A thoughtful reflection that deepens the insight — like a therapist/coach asking the right question",
  "why_meaningful_to_mandi": "Why this matters to HER specifically",
  "why_meaningful_to_others": "Why her audience will care — what universal truth this touches",
  "funny_angle": "Where the humor lives in this story — what's the irony or absurdity she can lean into",
  "final_summary": "The 1-sentence distilled truth of this whole piece",
  "standup_bit": "A 3-5 minute stand-up comedy bit version of this story — full bit with beats, pauses noted in [brackets], callbacks",
  "medium_article": {
    "title": "Clickable Medium headline",
    "subtitle": "Supporting sentence",
    "body": "Full 700-900 word Medium article — subheadings, short paragraphs, conversational but smart"
  },
  "instagram_caption_1": "Short punchy caption (under 150 words) with hook, story beat, CTA",
  "instagram_caption_2": "Longer story-format caption (200-300 words) — open with the scene, end with the truth",
  "tiktok_hook": "First spoken line for a TikTok (under 5 seconds, stops scroll)",
  "carousel_slides": ["Slide 1 text", "Slide 2 text", "Slide 3 text", "Slide 4 text", "Slide 5 text — CTA"],
  "substack_subject": "Email subject line for a newsletter about this",
  "threads_post": "Short hot take under 280 chars",
  "reflection_questions": ["Question 1 to go deeper", "Question 2 for journaling"],
  "account_tags": ["which of these accounts this fits: mandijoy, empoweredsupermom, philosophicalmom, homeschool4humans, aimomatwork, art4thefeminine"]
}`

  try {
    const response = await client.responses.create({
      model: 'gpt-4o',
      instructions: 'You are a content processing expert. Return only valid JSON.',
      input: prompt,
    })

    const raw = response.output_text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const result = JSON.parse(raw)
    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Story processing failed' }, { status: 500 })
  }
}
