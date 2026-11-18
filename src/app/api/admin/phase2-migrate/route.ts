import { NextRequest, NextResponse } from 'next/server'
import { migratePhase2 } from '@/lib/plan'

export const dynamic = 'force-dynamic'

// ONE-TIME Phase 2 migration: adds the two branches, tags accounts/products/goals with a branch,
// and applies the new Reset/Wellspring/services facts. Idempotent. Dry run unless ?confirm=phase2
// is passed; a real run backs up db.json first (same pattern as remap-account-ids).
export async function POST(req: NextRequest) {
  const confirm = new URL(req.url).searchParams.get('confirm') === 'phase2'
  try {
    return NextResponse.json(migratePhase2({ dryRun: !confirm }))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'migration failed' }, { status: 500 })
  }
}
