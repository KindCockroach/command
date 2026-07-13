import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllWatchAccounts, createWatchAccount, updateWatchAccount, deleteWatchAccount, createNote } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET() {
  return NextResponse.json(getAllWatchAccounts())
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  // action: 'analyze' — AI fills in formats/buzzwords/keywords for a watched account
  if (data.action === 'analyze') {
    const existing = data.id ? getAllWatchAccounts().find(w => w.id === Number(data.id)) : null
    const subject = existing ?? data
    // Keep the raw source material — pasted hooks/captions are reference gold
    if (data.pastedContent?.trim()) {
      try {
        createNote({
          title: `📡 Trends source: ${subject.handle ?? 'unknown'}`,
          body: data.pastedContent,
          category: 'idea',
          tags: ['trends-source', String(subject.handle ?? '').replace('@', '')],
        })
      } catch { /* best-effort */ }
    }
    const res = await client.responses.create({
      model: 'gpt-4o',
      instructions: `You are a social media competitive analyst. Given a creator account, produce the patterns worth mimicking (formatting, not content). Return ONLY valid JSON:
{
  "formats": ["3-6 content format patterns they win with, e.g. 'talking-head hook then b-roll with bold captions'"],
  "buzzwords": ["10-20 words/phrases this niche's winners repeat"],
  "keywords": ["10-20 SEO/discovery keywords for this niche"],
  "top_hooks": ["3-5 hook structures they use, written as reusable templates with [brackets] for variables"],
  "engagement_note": "1 sentence on what drives their engagement (comments bait, saves, shares...)",
  "notes": "2-3 sentences: what makes their content convert and what we should copy structurally"
}`,
      input: `Account: ${subject.handle} on ${subject.platform}\nNiche: ${subject.niche}\nWhy we're watching: ${subject.why_watching}\n${data.pastedContent ? `SAMPLE OF THEIR CONTENT (pasted by Mandi):\n${data.pastedContent}` : ''}`,
    })
    try {
      const parsed = { ...JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0]), last_analyzed: new Date().toISOString() }
      if (existing) {
        return NextResponse.json(updateWatchAccount(existing.id, parsed))
      }
      return NextResponse.json({ ...data, ...parsed })
    } catch {
      return NextResponse.json({ error: 'Could not analyze', raw: res.output_text }, { status: 502 })
    }
  }

  if (!data.handle) return NextResponse.json({ error: 'handle required' }, { status: 400 })
  return NextResponse.json(createWatchAccount(data), { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updated = updateWatchAccount(Number(id), updates)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteWatchAccount(Number(id))
  return NextResponse.json({ success: true })
}
