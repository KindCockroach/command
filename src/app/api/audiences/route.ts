import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllAudiences, upsertAudience, deleteAudience } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET() {
  return NextResponse.json(getAllAudiences())
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  // Hybrid interview → deep-dive research: Mandi's answers + live web search
  // produce a full draft persona (her words stay primary; research sharpens language).
  if (data.action === 'research') {
    const { answers } = data
    if (!answers) return NextResponse.json({ error: 'answers required' }, { status: 400 })

    const params = {
      model: 'gpt-4o',
      instructions: `You are building a full buyer persona from Mandi's interview answers, then DEEP-DIVING with live web research to sharpen it.

STEP 1 — her answers are ground truth. Never contradict them.
STEP 2 — research this audience online (forums, Reddit, TikTok/IG comment culture, communities): find the SPECIFIC words and phrases these women actually use about these pains, the side-effects of the pain they describe (what it costs them — sleep, marriage, confidence, money), and phrases currently trending with them. Prefer real community language over marketing-speak.

Return ONLY valid JSON:
{
  "name": "First-name persona nickname, e.g. 'Overwhelmed Dana'",
  "emoji": "one emoji",
  "snapshot": "one line who she is",
  "life_stage": "age range, kids, work situation",
  "tuesday_reality": "her actual 9pm Tuesday as a concrete scene (2-3 sentences)",
  "pains": ["4-6, phrased how SHE'D say them out loud"],
  "pain_side_effects": ["4-6 costs of the pain — specific, researched"],
  "desires": ["3-5 things she secretly wants"],
  "exact_language": ["8-15 words/phrases SHE uses — pulled from research + her answers"],
  "trending_phrases": ["5-10 phrases currently circulating with this audience"],
  "objections": ["3-5 reasons she hesitates"],
  "buying_triggers": ["3-5 things that actually move her"],
  "watering_holes": ["where she scrolls/hangs out"],
  "tried_already": ["3-5 solutions that failed her"],
  "notes": "1-2 research insights worth remembering, with any sources"
}`,
      input: `MANDI'S INTERVIEW ANSWERS:\n${answers}`,
      tools: [{ type: 'web_search_preview' }],
    }
    try {
      const res = await client.responses.create(params as never) as { output_text?: string }
      const parsed = JSON.parse((res.output_text ?? '').match(/\{[\s\S]*\}/)![0])
      return NextResponse.json({ draft: parsed })
    } catch {
      // Fallback without web search if the tool isn't available on this account
      try {
        const res2 = await client.responses.create({ model: 'gpt-4o', instructions: (params.instructions as string).replace('live web research', 'your knowledge of these communities'), input: params.input as string }) as { output_text?: string }
        const parsed = JSON.parse((res2.output_text ?? '').match(/\{[\s\S]*\}/)![0])
        return NextResponse.json({ draft: parsed, researched: false })
      } catch {
        return NextResponse.json({ error: 'Could not draft the persona' }, { status: 502 })
      }
    }
  }

  if (!data.id || !data.name) return NextResponse.json({ error: 'id and name required' }, { status: 400 })
  return NextResponse.json(upsertAudience(data), { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const data = await req.json()
  if (!data.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json(upsertAudience(data))
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteAudience(id)
  return NextResponse.json({ success: true })
}
