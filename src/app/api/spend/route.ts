import { NextRequest, NextResponse } from 'next/server'
import { spendStatus, spendBriefLine, setSpendSettings } from '@/lib/spendCap'

export const dynamic = 'force-dynamic'

// Phase 8 · A0: the monthly AI cap. GET = this month so far, projection, top 5 costs, paused jobs,
// and the Brief line (null under 80%). POST {monthly_cap_usd?, per_job_cap_usd?} = edit the cap.
// Internal route, gated by middleware like the rest of the station.
export async function GET() {
  return NextResponse.json({ status: spendStatus(), brief_line: spendBriefLine() })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const settings = setSpendSettings({ monthly_cap_usd: body?.monthly_cap_usd, per_job_cap_usd: body?.per_job_cap_usd })
  return NextResponse.json({ settings, status: spendStatus() })
}
