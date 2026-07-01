import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { country, website, email, angle, familyDetails } = await req.json()
  if (!country) return NextResponse.json({ error: 'country required' }, { status: 400 })

  const prompt = `You are writing on behalf of Mandi Beck — content creator, AI educator, mom of 4 kids (twins Max & Jasmine, Wayne, and baby Preston), homeschooler, and founder of Room30.ai and AI Mom Podcast.

She is pitching ${country}'s Tourism Board for a press/creator partnership trip for her family.

Her angles and platforms:
- @homeschool4humans — documents family world travel as living education (Beatles meets Shakespeare with a side of science)
- @aimomatwork / AI Mom Podcast — shows how AI tools make family travel planning effortless
- @empoweredsupermom — documents the real, raw, hilarious experience of traveling with 4 kids under 5
- @mandij0y — personal joy, wonder, and human connection while traveling
- Combined audience: growing multi-platform creator across Instagram, TikTok, YouTube, Beehiiv newsletter
- Content style: cinematic family moments, honest mom perspective, educational threads, stand-up comedy bits

Angle for this pitch: ${angle || 'family travel with educational homeschool angle'}
${familyDetails ? `Additional details to include: ${familyDetails}` : ''}
Tourism board website: ${website}

Write a PROFESSIONAL, WARM, COMPELLING pitch email with:
1. Subject line (under 60 chars, specific to ${country})
2. Opening paragraph — lead with why ${country} specifically (not generic "I love to travel")
3. Who Mandi is + audience size paragraph (use realistic growing creator language, not inflated)
4. The deliverables — what they'd get (be specific: # of reels, posts, newsletter features, podcast mentions)
5. Why this family angle serves their tourism goals
6. The ask — what she needs (flights, accommodation, experiences, press pass)
7. Call to action — next step
8. Professional sign-off with contact info placeholder

Tone: Warm professional. Confident but not arrogant. This is a mom who creates REAL content, not staged. That's the pitch.

Return JSON with these fields:
{
  "subject_line": "...",
  "email_body": "full email text with line breaks",
  "key_talking_points": ["...", "...", "..."],
  "suggested_deliverables": ["...", "...", "..."],
  "best_seasons_to_visit": "...",
  "family_friendly_angle": "..."
}`

  try {
    const response = await client.responses.create({
      model: 'gpt-4o',
      instructions: 'You are a professional PR and influencer pitch writer. Return only valid JSON.',
      input: prompt,
    })

    const raw = response.output_text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const result = JSON.parse(raw)
    return NextResponse.json({ ...result, country, email, website })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Pitch generation failed' }, { status: 500 })
  }
}
