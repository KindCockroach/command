import { NextRequest, NextResponse } from 'next/server'
import { fableText } from '@/lib/fable'
import { getAllContent } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// SUGGESTED FOOTAGE — real, capturable moments (NOT AI-generated visuals) that
// pair with a post's story. Faceless ≠ AI. The model reads the hook/script/
// caption and proposes b-roll to shoot, clips likely already in her camera roll,
// a talking-head option, and a compilation idea. POST { contentId }.
export async function POST(req: NextRequest) {
  const { contentId } = await req.json().catch(() => ({}))
  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const material = [
    piece.onscreen_text ? `HOOK/ON-SCREEN: ${piece.onscreen_text}` : '',
    piece.title ? `TITLE: ${piece.title}` : '',
    piece.script ? `SCRIPT: ${piece.script}` : '',
    piece.description ? `CAPTION/BODY: ${piece.description}` : '',
  ].filter(Boolean).join('\n\n')
  if (!material.trim()) return NextResponse.json({ error: 'This post has no words yet to match footage to.' }, { status: 400 })

  const out = await fableText({
    cheap: true,
    maxTokens: 1600,
    instructions: `You are Mandi's b-roll director. Faceless does NOT mean AI-generated — it means REAL life shot beautifully. Given a post, suggest actual footage/photos she could capture or likely ALREADY HAS, that pair with the story's feeling and transformation. Concrete, shootable, ordinary-life moments — not stock, not AI renders.

Give a short VISUAL CONCEPT (the feeling the footage should carry), then 6-9 SHOTS. For each shot pick a TYPE:
- "capture" — grab this real b-roll now (quick, at home/nearby). e.g. steam rising off morning coffee, a splash from the pool, a slow pan of the backyard, hands closing a laptop.
- "camera_roll" — she probably already has this (a trip, a birth, her kid, her mother's hands) — name the kind of clip to go find.
- "talking_head" — her, to camera, for the beat where her face/voice carries it.
- "compilation" — a montage of several real clips stitched to a line.

For each shot: the TYPE, a one-line SHOT description (specific and sensory), and WHY it fits this exact story/line. Where useful, note which line it should sit under.

Return ONLY valid JSON:
{ "concept": "one line — the visual feeling", "shots": [ { "type": "capture|camera_roll|talking_head|compilation", "shot": "specific sensory shot", "why": "why it pairs with this story/line" } ] }`,
    input: material,
  })

  let parsed: { concept?: string; shots?: unknown[] }
  try { parsed = JSON.parse(out.match(/\{[\s\S]*\}/)![0]) } catch {
    return NextResponse.json({ error: 'Could not suggest footage', raw: out }, { status: 502 })
  }
  return NextResponse.json({ concept: parsed.concept ?? '', shots: Array.isArray(parsed.shots) ? parsed.shots : [] })
}
