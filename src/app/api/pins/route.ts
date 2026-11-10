import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, getBrandAccount } from '@/lib/db'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'

// MAKE PINTEREST PINS — turn a content card (or free text) into ready-to-post pins.
// Pinterest is SEARCH: titles + descriptions are keyword-rich and benefit-led, each
// with a board to file it under and a destination link back to her site. POST
// { contentId } or { text, title? } → { pins: [{title, description, board, link}] }.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  let title = typeof b.title === 'string' ? b.title : ''
  let source = typeof b.text === 'string' ? b.text : ''
  if (b.contentId != null) {
    const post = getAllContent().find(c => c.id === Number(b.contentId))
    if (!post) return NextResponse.json({ error: 'Content not found.' }, { status: 404 })
    title = post.title || title
    source = [post.onscreen_text, post.script, post.description, post.hashtags].filter(Boolean).join('\n\n').slice(0, 2500)
  }
  if (!source.trim() && !title.trim()) return NextResponse.json({ error: 'Nothing to make pins from.' }, { status: 400 })

  const pin = getBrandAccount('pinterest')
  const defaults = ['https://www.aiworksforher.com', 'https://bethereforher.com', 'https://aimomeducation.com']
  const linkHint = Array.from(new Set([...(pin?.url?.trim() ? [pin.url.trim()] : []), ...defaults])).join(', ')

  const instructions = `You turn Mandi's content into ready-to-post PINTEREST PINS that drive evergreen search traffic.
VOICE: warm, bold, plain English — for tired moms. Her world: intuition, self-trust, reparenting, mindful + playful, AI that actually helps.
PINTEREST IS SEARCH, NOT A FEED: write the title and description the way a mom would actually SEARCH and what makes her save+click. Keyword-rich and benefit-led, never vague inspiration. No hashtags walls (1–2 natural keywords max). Never promise financial results, never name a real person.`
  const input = `CONTENT:
${title ? `Title: ${title}\n` : ''}${source}

Make 3 distinct pins from this. Return ONLY JSON:
{"pins":[{"title":"≤100 chars, keyword-rich, benefit-driven","description":"≤500 chars, keyword-rich and natural, ends with a soft CTA","board":"a short Pinterest board name to file it under","link":"the single best destination URL, chosen from: ${linkHint}"}]}
No preamble.`

  const raw = await fableText({ instructions, input, json: true, maxTokens: 1600 })
  let pins: { title: string; description: string; board?: string; link?: string }[] = []
  try {
    const j = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    if (Array.isArray(j.pins)) {
      pins = j.pins.map((p: Record<string, unknown>) => ({
        title: String(p.title || '').trim().slice(0, 100),
        description: String(p.description || '').trim().slice(0, 500),
        board: String(p.board || '').trim().slice(0, 60) || undefined,
        link: String(p.link || '').trim() || undefined,
      })).filter((p: { title: string }) => p.title).slice(0, 4)
    }
  } catch { /* fall through */ }
  if (!pins.length) return NextResponse.json({ error: 'Pins came back empty — try again.' }, { status: 502 })
  return NextResponse.json({ pins })
}
