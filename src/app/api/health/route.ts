import { NextRequest, NextResponse } from 'next/server'
import { runHealthCheck, lastHealth, healthForHer, resolveFinding } from '@/lib/health'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Phase 6 · Loop 9. GET           → the last saved reports (no new run)
//                   GET ?run=quick → run the quick check now   · ?run=full → the full weekly check
//                   GET ?for=her   → Commander's report to Her: quick check (+ full when it's due),
//                                    only what needs Mandi
// The weekly full check is fired by instrumentation.ts (Monday) via ?run=full.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  if (sp.get('for') === 'her') return NextResponse.json(await healthForHer())
  const run = sp.get('run')
  if (run === 'quick' || run === 'full') return NextResponse.json(await runHealthCheck({ full: run === 'full', today: sp.get('today') ?? undefined }))
  return NextResponse.json(lastHealth())
}

// POST {action:'resolve', key} → she acted on that finding; drop it from the saved reports
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.action !== 'resolve' || !b.key) return NextResponse.json({ error: 'Send { action:"resolve", key }' }, { status: 400 })
  return NextResponse.json({ resolved: resolveFinding(String(b.key)) })
}
