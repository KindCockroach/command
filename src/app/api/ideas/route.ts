import { NextRequest, NextResponse } from 'next/server'
import { readDb, type SkillOwner } from '@/lib/db'
import { addIdeas, decideIdea, ideasForHer, IDEA_LANES } from '@/lib/ideas'

export const dynamic = 'force-dynamic'

// Phase 6 · Loop 14. GET → what Her presents (when the day has room) · GET ?all=1 → every idea
// POST {from, ideas:[{text, why}], source} → an agent's report carries its ideas (max 2)
// PATCH {id, answer:'yes'|'no', reason?} → Mandi's answer: yes routes via Commander, no → Notes
export async function GET(req: NextRequest) {
  if (new URL(req.url).searchParams.get('all')) return NextResponse.json({ ideas: (readDb().agent_ideas ?? []).slice().reverse() })
  return NextResponse.json(ideasForHer())
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const from = String(b.from ?? '') as SkillOwner
  if (!(from in IDEA_LANES) || from === 'tool') return NextResponse.json({ error: 'from must be an agent' }, { status: 400 })
  return NextResponse.json({ added: addIdeas(from, Array.isArray(b.ideas) ? b.ideas : [], String(b.source ?? 'report')) })
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.id || (b.answer !== 'yes' && b.answer !== 'no')) return NextResponse.json({ error: 'id and answer (yes|no) required' }, { status: 400 })
  const r = decideIdea(String(b.id), b.answer, typeof b.reason === 'string' ? b.reason : undefined)
  if ('error' in r) return NextResponse.json(r, { status: 400 })
  return NextResponse.json({ idea: r })
}
