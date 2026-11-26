import { NextRequest, NextResponse, after } from 'next/server'
import { noteIdeasView, estimateBackfill, openNotesMine, proposePicks, approvePicks, declinePicks } from '@/lib/noteIdeas'
import { runHandoff } from '@/lib/agentRun'
import { BUDGET_TAG, BUDGET_OK_HEADER } from '@/lib/spendCap'
import { readDb } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Phase 8 A7 · Cap's Notes sweep: quotes, lines and skits from her Notes.
// GET → counts, progress, the cost of reading what's unread
// POST {action:'backfill'} → read every unread note (asks "Go?" with the cost first)
// POST {action:'pick'} → Cap picks again · {action:'approve'} → picks become cards · {action:'decline', reason}
export async function GET() {
  return NextResponse.json(noteIdeasView())
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.action === 'backfill') {
    const bf = readDb().note_ideas?.backfill
    // A read that has said "running" for 30+ minutes died (a deploy or restart): it may start again.
    if (bf?.status === 'running' && Date.now() - Date.parse(bf.started_at) < 30 * 60 * 1000) return NextResponse.json({ error: 'Cap is already reading your notes.' }, { status: 409 })
    const est = estimateBackfill()
    if (!est.notes) return NextResponse.json({ error: 'Every note has been read already. New ones get checked each morning.' }, { status: 400 })
    if (req.headers.get(BUDGET_OK_HEADER) !== '1') {
      return NextResponse.json({ error: `${BUDGET_TAG} Cap will read ${est.notes} notes (${est.batches} batches) for quotes, lines and skits. About $${Math.max(est.usd, 0.01).toFixed(2)}. Go?`, estimate: est }, { status: 402 })
    }
    const h = openNotesMine('backfill')
    after(async () => { await runHandoff(h.id) })
    return NextResponse.json({ handoff: h, estimate: est })
  }
  if (b.action === 'pick') {
    try { const picks = await proposePicks(); return NextResponse.json({ picked: picks.length }) }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Cap couldn’t pick' }, { status: 502 }) }
  }
  if (b.action === 'approve') {
    const r = await approvePicks()
    return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
  }
  if (b.action === 'decline') {
    const r = declinePicks(typeof b.reason === 'string' ? b.reason : '')
    return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
  }
  return NextResponse.json({ error: 'action must be backfill, pick, approve or decline' }, { status: 400 })
}
