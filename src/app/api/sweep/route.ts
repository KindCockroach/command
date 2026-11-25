import { NextRequest, NextResponse, after } from 'next/server'
import { getReuse, markReuse, openSweep, reuseCounts, mapGoals } from '@/lib/sweep'
import { runHandoff } from '@/lib/agentRun'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Phase 6b · Loop 15. GET → Cap's proposals + counts per goal · POST → run Cap's sweep now
// PATCH {id, action:'sent'|'dismiss'|'reply', text?} → Mandi sent it herself / not now / a reply came in
export async function GET() {
  return NextResponse.json({ proposals: getReuse(), counts: reuseCounts(), goals: mapGoals() })
}
export async function POST() {
  const h = openSweep()
  after(async () => { await runHandoff(h.id) })
  return NextResponse.json({ handoff: h })
}
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.id || !['sent', 'dismiss', 'reply'].includes(b.action)) return NextResponse.json({ error: 'id and action (sent|dismiss|reply) required' }, { status: 400 })
  const r = markReuse(String(b.id), b.action, typeof b.text === 'string' ? b.text : undefined)
  return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json({ proposal: r })
}
