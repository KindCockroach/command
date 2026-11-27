import { NextRequest, NextResponse, after } from 'next/server'
import { estimateWeek, saveCapacity } from '@/lib/capacity'
import { runHandoff } from '@/lib/agentRun'

export const dynamic = 'force-dynamic'

// Phase 8 · A4: Her's capacity estimate for the Brief. No model call.
// GET → this week's estimate (+ her saved answer). POST { hours } → store it; if short, Cap moves the overflow.
export async function GET() {
  return NextResponse.json(estimateWeek())
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const hours = Number(body?.hours)
  if (!Number.isFinite(hours) || hours < 0 || hours > 100) return NextResponse.json({ error: 'Tell me a number of hours (0–100).' }, { status: 400 })
  const { estimate, handoff } = saveCapacity(Math.round(hours * 2) / 2)
  if (handoff) { const id = handoff.id; after(async () => { await runHandoff(id) }) }
  return NextResponse.json({ ...estimate, handed_to_cap: !!handoff })
}
