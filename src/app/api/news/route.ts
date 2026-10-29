import { NextRequest, NextResponse } from 'next/server'
import { getSavedHeadlines, addSavedHeadline, updateSavedHeadline, deleteSavedHeadline } from '@/lib/db'
import { researchWithWeb } from '@/lib/fable'
import { callGPT } from '@/lib/ai'
import { PODCAST_CONSTITUTION } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// NEWS — headlines for the AI Mom Podcast, pulled on Daily Command. POST {pull:true}
// web-researches real current stories and returns them structured (so each can be
// flagged). POST {save:{...}} adds one to her "read later" list. GET returns the list.
type Headline = { headline: string; outlet?: string; url: string; why?: string }

export async function GET() {
  return NextResponse.json({ saved: getSavedHeadlines() })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  // Save one headline to the read-later list.
  if (body.save && typeof body.save === 'object') {
    const s = body.save as Headline
    if (!s.url || !s.headline) return NextResponse.json({ error: 'headline + url required' }, { status: 400 })
    const saved = addSavedHeadline({ headline: String(s.headline), url: String(s.url), outlet: s.outlet ? String(s.outlet) : undefined, why: s.why ? String(s.why) : undefined })
    return NextResponse.json({ ok: true, saved })
  }

  // Pull fresh headlines.
  if (body.pull) {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'No AI key set — add ANTHROPIC_API_KEY or OPENAI_API_KEY in Railway.' }, { status: 400 })
    }
    const steer = String(body.steer ?? '').trim()
    const instructions = `You are the news desk for the AI Mom Podcast. ${PODCAST_CONSTITUTION}
Find 6–8 REAL news stories from the past 7 days that matter to Mandi's listener: AI and jobs, AI in schools/education, AI and creativity, data centers, water use, and children's safety with AI. Open the pages — never invent a headline or a link.`
    const input = `Return ONLY JSON: {"headlines":[{"headline":"...","outlet":"Outlet · Mon D","url":"https://...","why":"one line on why it matters to a mom"}]}
Only REAL urls you actually opened. 6–8 items. No preamble.${steer ? `\nMANDI'S STEER: ${steer}` : ''}`

    const parse = (raw: string): Headline[] => {
      try {
        const p = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
        return Array.isArray(p.headlines) ? p.headlines.filter((h: Headline) => h && h.headline && h.url) : []
      } catch { return [] }
    }
    let headlines: Headline[] = []
    let lastErr: unknown = null
    if (process.env.ANTHROPIC_API_KEY) {
      try { headlines = parse(await researchWithWeb({ instructions, input, maxTokens: 4000, maxSearches: 6 })) } catch (e) { lastErr = e }
    }
    if (!headlines.length && process.env.OPENAI_API_KEY) {
      try { headlines = parse(await callGPT('research', input, instructions)) } catch (e) { lastErr = e }
    }
    if (!headlines.length) {
      const msg = lastErr instanceof Error ? lastErr.message : 'no headlines came back'
      return NextResponse.json({ error: `Couldn't pull headlines — ${msg}. If you're out of API credits, top up and try again.` }, { status: 502 })
    }
    return NextResponse.json({ ok: true, headlines })
  }

  return NextResponse.json({ error: 'pass {pull:true} or {save:{...}}' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const h = updateSavedHeadline(Number(body.id), { read: !!body.read })
  if (!h) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true, saved: h })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json({ ok: deleteSavedHeadline(Number(id)) })
}
