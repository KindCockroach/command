import { NextRequest, NextResponse } from 'next/server'
import { remapAccountIds } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ONE-TIME untangle: make account ids match handles.
//   mandijoy      (@mandijoybeck)  → mandijoybeck
//   mandijoybeck  (@theknowingis)  → theknowingis
// Backs up the db first and rewrites every account_id reference. Guarded by a
// confirm token so it can't run by accident. Run once, then it's a no-op.
const MAP: Record<string, string> = { mandijoy: 'mandijoybeck', mandijoybeck: 'theknowingis' }

export async function POST(req: NextRequest) {
  const confirm = new URL(req.url).searchParams.get('confirm')
  if (confirm !== 'remap-mandijoy') {
    return NextResponse.json({ error: 'pass ?confirm=remap-mandijoy to run this one-time migration' }, { status: 400 })
  }
  try {
    const { backup, counts } = remapAccountIds(MAP)
    return NextResponse.json({ ok: true, map: MAP, backup, counts })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'remap failed' }, { status: 500 })
  }
}
