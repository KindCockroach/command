import { NextRequest, NextResponse } from 'next/server'
import { getPlans, getCalendar, getPlanConfig, setPlanConfig, proposeMonthly, proposeWeekly, approvePlan, editPlan, generateCalendar, retireCadenceGoals, addDays, todayStr } from '@/lib/plan'
import { getBranches } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Cap's plans + the calendar. GET returns plans and the next two weeks. POST does one step:
// propose_monthly · propose_weekly · approve · edit · generate_calendar · retire_cadence · config
export async function GET(req: NextRequest) {
  const from = new URL(req.url).searchParams.get('from') || todayStr()
  const to = addDays(from, 13)
  return NextResponse.json({ branches: getBranches(), plans: getPlans(), calendar: getCalendar(from, to), window: [from, to], config: getPlanConfig() })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  try {
    switch (b.action) {
      case 'propose_monthly': return NextResponse.json({ plans: proposeMonthly(b.from || todayStr()) })
      case 'propose_weekly': return NextResponse.json(proposeWeekly())
      case 'approve': { const p = approvePlan(String(b.id)); return p ? NextResponse.json({ plan: p }) : NextResponse.json({ error: 'Plan not found.' }, { status: 404 }) }
      case 'edit': { const p = editPlan(String(b.id), b.patch || {}); return p ? NextResponse.json({ plan: p }) : NextResponse.json({ error: 'Plan not found.' }, { status: 404 }) }
      case 'generate_calendar': return NextResponse.json(generateCalendar(b.from || todayStr(), 14))
      case 'retire_cadence': return NextResponse.json(retireCadenceGoals({ dryRun: b.confirm !== true }))
      case 'config': return NextResponse.json({ config: setPlanConfig(b.patch || {}) })
      default: return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Plan step failed.' }, { status: 500 })
  }
}
