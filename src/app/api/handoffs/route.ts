import { NextRequest, NextResponse } from 'next/server'
import { listHandoffs, getHandoff, closeByHand } from '@/lib/handoffs'
import { runHandoff } from '@/lib/agentRun'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Handoff receipts between agents (Phase 4). Every one: from, to, what, the card or record,
// status (open → done, or failed with the reason) and a receipt of what was produced.
// GET ?to=&from=&status=open|waiting|stuck|done|failed&content_id=&thread_id=&kind=&limit=
// POST { action:'retry', id }                     run it again (failed or stuck ones)
//      { action:'done', id, receipt, by? }        close a waiting one by hand, saying what happened
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams
  const num = (k: string) => (q.get(k) ? Number(q.get(k)) : undefined)
  return NextResponse.json({ handoffs: listHandoffs({
    to: q.get('to') ?? undefined, from: q.get('from') ?? undefined, status: q.get('status') ?? undefined, kind: q.get('kind') ?? undefined,
    content_id: num('content_id'), thread_id: q.get('thread_id') ?? undefined, limit: num('limit'),
  }) })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const id = String(b.id ?? '')
  if (!id || !getHandoff(id)) return NextResponse.json({ error: 'No such handoff.' }, { status: 404 })
  if (b.action === 'retry') {
    const r = await runHandoff(id)
    const h = listHandoffs().find(x => x.id === id)
    return r.ok ? NextResponse.json({ handoff: h }) : NextResponse.json({ error: r.error, handoff: h }, { status: 422 })
  }
  if (b.action === 'done') {
    const receipt = String(b.receipt ?? '').trim()
    if (!receipt) return NextResponse.json({ error: 'Say what happened (a receipt) to close it.' }, { status: 400 })
    return NextResponse.json({ handoff: closeByHand(id, String(b.by || 'mandi'), receipt) })
  }
  return NextResponse.json({ error: 'Send { action:"retry"|"done", id }' }, { status: 400 })
}
