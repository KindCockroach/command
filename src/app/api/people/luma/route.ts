import { NextRequest, NextResponse } from 'next/server'
import { backupDb } from '@/lib/db'
import { previewLuma, applyLuma, guessFromFilename, listResetEvents } from '@/lib/luma'

export const dynamic = 'force-dynamic'

// Phase 5: Luma CSV import into People (owner-only; the middleware gates /api).
// POST { csv, filename?, event_name?, event_date?, apply?: boolean }
//   apply false (default) = a preview only: new / merged / skipped, and why. Nothing is written.
//   apply true = backs up db.json first, then merges. Returns the same breakdown plus the backup path.
// GET = the Resets RISE knows about.
export async function GET() {
  return NextResponse.json({ events: listResetEvents() })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const csv = typeof b.csv === 'string' ? b.csv : ''
  if (!csv.trim()) return NextResponse.json({ error: 'Drop the Luma guest export (CSV).' }, { status: 400 })
  if (csv.length > 5_000_000) return NextResponse.json({ error: 'That file is too big for a guest list.' }, { status: 400 })
  const guess = guessFromFilename(typeof b.filename === 'string' ? b.filename : '')
  const ev = {
    name: (typeof b.event_name === 'string' && b.event_name.trim()) || guess.event_name,
    date: (typeof b.event_date === 'string' && b.event_date.trim()) || guess.event_date,
  }
  if (b.apply !== true) {
    const pv = previewLuma(csv, ev)
    return 'error' in pv ? NextResponse.json(pv, { status: 400 }) : NextResponse.json({ preview: pv, guess })
  }
  const backup = backupDb('before-luma-import')
  const r = applyLuma(csv, ev)
  return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json({ applied: r, backup })
}
