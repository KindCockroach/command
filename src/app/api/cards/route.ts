import { NextRequest, NextResponse, after } from 'next/server'
import { auditCards, openCardFix, fillCardBasics } from '@/lib/cardAudit'
import { runHandoff } from '@/lib/agentRun'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Card check. GET → every active card missing something (title, on-screen hook, job, caption, account)
// POST {action:'fix'} → back up db.json, then Ed fills every card he can (Cap's handoff, runs in the background)
// POST {action:'fix_one', id} → fill one card now
export async function GET() {
  return NextResponse.json(auditCards())
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.action === 'fix') {
    const r = openCardFix(b.limit ? Number(b.limit) : undefined)
    if ('error' in r) return NextResponse.json(r, { status: 400 })
    const id = r.handoff.id; after(async () => { await runHandoff(id) })
    return NextResponse.json({ ok: true, count: r.count, handoff: r.handoff })
  }
  if (b.action === 'fix_one' && b.id) return NextResponse.json(await fillCardBasics(Number(b.id)))
  return NextResponse.json({ error: 'Send { action:"fix" } or { action:"fix_one", id }' }, { status: 400 })
}
