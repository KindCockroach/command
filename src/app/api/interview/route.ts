import { NextRequest, NextResponse, after } from 'next/server'
import { getInterviews, startInterview, answerInterview, openShape, closeInterview } from '@/lib/coraInterview'
import { runHandoff } from '@/lib/agentRun'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Cora's interview (Medium, lived experience: loss, depression, anxiety).
// GET → interviews (newest first)
// POST {action:'start'} → Cora reads the Well into her notebook (a few minutes), then asks
// POST {action:'answer', id, text} | {action:'skip', id} | {action:'off_limits', id}
// POST {action:'shape', id} → the charged points → Medium story shapes in Approve
// POST {action:'close', id}
export async function GET() {
  return NextResponse.json({ interviews: getInterviews() })
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.action === 'start') {
    const r = startInterview()
    if (r.handoff) { const hid = r.handoff.id; after(async () => { await runHandoff(hid) }) }
    return NextResponse.json(r)
  }
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const id = String(b.id)
  if (b.action === 'answer' || b.action === 'skip' || b.action === 'off_limits') {
    const r = await answerInterview(id, String(b.text ?? ''), { skip: b.action === 'skip', offLimits: b.action === 'off_limits' })
    return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
  }
  if (b.action === 'shape') {
    const r = openShape(id)
    if ('error' in r) return NextResponse.json(r, { status: 400 })
    const hid = r.handoff.id; after(async () => { await runHandoff(hid) })
    return NextResponse.json(r)
  }
  if (b.action === 'close') { const r = closeInterview(id); return r ? NextResponse.json({ interview: r }) : NextResponse.json({ error: 'No such interview.' }, { status: 400 }) }
  return NextResponse.json({ error: 'action must be start, answer, skip, off_limits, shape or close' }, { status: 400 })
}
