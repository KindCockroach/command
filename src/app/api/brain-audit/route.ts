import { NextRequest, NextResponse } from 'next/server'
import { applyBrainAudit, declineBrainAudit, brainAuditPending, brainAuditSummary, brainAuditDetail } from '@/lib/brainAudit'

export const dynamic = 'force-dynamic'

// Phase 8 · A2: the Brain audit. GET = the proposal. POST {action:'approve'} = back up, merge, retag,
// retire (never deletes). POST {action:'decline', reason} = park it with her reason.
export async function GET() {
  return NextResponse.json({ pending: brainAuditPending(), summary: brainAuditSummary(), detail: brainAuditDetail() })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body?.action === 'approve') {
    const r = applyBrainAudit()
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 409 })
  }
  if (body?.action === 'decline') { declineBrainAudit(typeof body.reason === 'string' ? body.reason : ''); return NextResponse.json({ ok: true }) }
  return NextResponse.json({ error: 'action must be approve or decline' }, { status: 400 })
}
