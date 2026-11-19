import { NextRequest, NextResponse } from 'next/server'
import { getPlans, getCalendar, moveCalendarItem, removeCalendarItem, getPlanConfig, setPlanConfig, proposeMonthly, proposeWeekly, approvePlan, editPlan, declinePlan, reopenPlan, askAboutPlan, generateCalendar, retireCadenceGoals, addDays, todayStr } from '@/lib/plan'
import { getBranches, readDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Cap's plans + the calendar. GET returns plans and the next two weeks. POST does one step:
// propose_monthly · propose_weekly · approve · edit · generate_calendar · retire_cadence · config
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams
  const from = q.get('from') || todayStr()
  // any window up to ~3 months (month view asks for 6 weeks); default is the two-week plan
  let to = q.get('to') || addDays(from, 13)
  if (to < from || to > addDays(from, 92)) to = addDays(from, 13)
  const accounts = (readDb().brand_accounts ?? []).map(a => ({ id: a.id, handle: a.handle, platform: a.platform, status: a.status, mirrors_account_id: a.mirrors_account_id ?? null }))
  return NextResponse.json({ branches: getBranches(), accounts, plans: getPlans(), calendar: getCalendar(from, to), window: [from, to], config: getPlanConfig() })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  try {
    switch (b.action) {
      case 'propose_monthly': return NextResponse.json({ plans: proposeMonthly(b.from || todayStr()) })
      case 'propose_weekly': return NextResponse.json(proposeWeekly())
      case 'approve': { const p = approvePlan(String(b.id), Array.isArray(b.channels) ? b.channels : null); return p ? NextResponse.json({ plan: p }) : NextResponse.json({ error: 'Plan not found.' }, { status: 404 }) }
      case 'decline': { const p = declinePlan(String(b.id), String(b.reason || ''), b.mirrors_account_id ? String(b.mirrors_account_id) : null); return 'error' in p ? NextResponse.json(p, { status: 400 }) : NextResponse.json({ plan: p }) }
      case 'reopen': { const p = reopenPlan(String(b.id)); return p ? NextResponse.json({ plan: p }) : NextResponse.json({ error: 'Only a declined plan can be reopened.' }, { status: 400 }) }
      case 'ask': { const p = await askAboutPlan(String(b.id), String(b.question || '')); return 'error' in p ? NextResponse.json(p, { status: 400 }) : NextResponse.json({ plan: p }) }
      case 'remove': return removeCalendarItem(String(b.id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'That item isn\u2019t on the calendar.' }, { status: 404 })
      case 'edit': { const p = editPlan(String(b.id), b.patch || {}); return p ? NextResponse.json({ plan: p }) : NextResponse.json({ error: 'Plan not found.' }, { status: 404 }) }
      case 'move': { const it = moveCalendarItem(String(b.id), String(b.date), b.time ? String(b.time) : null); return it ? NextResponse.json({ item: it }) : NextResponse.json({ error: 'Couldn\u2019t move that item.' }, { status: 400 }) }
      case 'generate_calendar': return NextResponse.json(generateCalendar(b.from || todayStr(), 14))
      case 'retire_cadence': return NextResponse.json(retireCadenceGoals({ dryRun: b.confirm !== true }))
      case 'config': return NextResponse.json({ config: setPlanConfig(b.patch || {}) })
      default: return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Plan step failed.' }, { status: 500 })
  }
}
