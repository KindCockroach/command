// Phase 8 · A0: the monthly AI spending cap (Mandi, 2026-11-25: "RISE must not exceed $50/month
// 2026-11-26: Mandi raised the cap to $100/month going forward. 2026-11-27: raised to $110.
// in AI costs"). Counts what RISE logs in usage.json (Anthropic, OpenAI, ElevenLabs). Railway
// hosting and Resend email are separate bills and are NOT counted here.
//
// How it paces (calendar month, Central time):
//   • 80% of the month → a health finding + one line in Her's Brief.
//   • Over today's even share (cap ÷ days in month) → background jobs slow to essentials.
//   • 100% → background jobs pause until the 1st; anything Mandi starts herself asks first
//     ("This will cost about $0.30 and puts RISE over $50. Go?").
//   • One job estimated over the per-job ceiling: background skips it, Mandi is asked first.
// Sending already-approved email costs no AI, so it never passes through here and is never
// blocked. Nothing is silently dropped: every paused job is written to spend_cap.paused.

import { readDb, writeDb } from './db'
import { readUsageRows, costFor } from './usage'

export type SpendCapSettings = { monthly_cap_usd: number; per_job_cap_usd: number }
export type PausedJob = { ts: string; route: string; kind: string; why: string }
export type SpendCapState = Partial<SpendCapSettings> & { paused?: PausedJob[] }

export const DEFAULT_SPEND_CAP: SpendCapSettings = { monthly_cap_usd: 110, per_job_cap_usd: 1 }
// Every budget message starts with this, so the station's fetch wrapper can spot it and ask.
export const BUDGET_TAG = '💸 RISE budget:'
export const BUDGET_OK_HEADER = 'x-rise-budget-ok'

// Weekly jobs that keep running when a day's share is used up (the month cap still stops them).
const ESSENTIAL_BACKGROUND = ['/api/cron/trend-checkin', '/api/health']

const ctFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' })
/** YYYY-MM-DD in Central time. */
export const ctDate = (d: Date | string | number = Date.now()) => ctFmt.format(new Date(d))

const money = (n: number) => `$${n < 1 ? n.toFixed(2) : n.toFixed(2).replace(/\.00$/, '')}`

export function getSpendSettings(): SpendCapSettings {
  try {
    const s = readDb().spend_cap
    const cap = Number(s?.monthly_cap_usd)
    const job = Number(s?.per_job_cap_usd)
    return {
      monthly_cap_usd: cap > 0 ? cap : DEFAULT_SPEND_CAP.monthly_cap_usd,
      per_job_cap_usd: job > 0 ? job : DEFAULT_SPEND_CAP.per_job_cap_usd,
    }
  } catch { return DEFAULT_SPEND_CAP }
}

export function setSpendSettings(p: Partial<SpendCapSettings>): SpendCapSettings {
  const db = readDb()
  const cur = getSpendSettings()
  const next: SpendCapSettings = {
    monthly_cap_usd: Number(p.monthly_cap_usd) > 0 ? Math.round(Number(p.monthly_cap_usd) * 100) / 100 : cur.monthly_cap_usd,
    per_job_cap_usd: Number(p.per_job_cap_usd) > 0 ? Math.round(Number(p.per_job_cap_usd) * 100) / 100 : cur.per_job_cap_usd,
  }
  db.spend_cap = { ...(db.spend_cap ?? {}), ...next }
  writeDb(db)
  return next
}

export type SpendStatus = {
  month: string
  cap: number
  per_job_cap: number
  spent: number
  spent_today: number
  day_share: number
  days_in_month: number
  day_of_month: number
  projection: number
  pct: number
  warn80: boolean
  over_day: boolean
  over_month: boolean
  top5: { label: string; calls: number; costUsd: number }[]
  paused: PausedJob[]
}

export function spendStatus(now: number = Date.now()): SpendStatus {
  const { monthly_cap_usd: cap, per_job_cap_usd } = getSpendSettings()
  const today = ctDate(now)
  const month = today.slice(0, 7)
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const dayOfMonth = Number(today.slice(8, 10))
  let spent = 0
  let spentToday = 0
  const by = new Map<string, { label: string; calls: number; costUsd: number }>()
  for (const r of readUsageRows()) {
    const d = ctDate(r.ts)
    if (d.slice(0, 7) !== month) continue
    spent += r.costUsd
    if (d === today) spentToday += r.costUsd
    const label = r.route && r.route !== 'unknown' && r.route !== '(before route tracking)' ? `${r.route} · ${r.kind}` : r.kind
    const row = by.get(label) ?? { label, calls: 0, costUsd: 0 }
    row.calls++
    row.costUsd += r.costUsd
    by.set(label, row)
  }
  const dayShare = cap / daysInMonth
  let paused: PausedJob[] = []
  try { paused = (readDb().spend_cap?.paused ?? []).filter(p => ctDate(p.ts).slice(0, 7) === month) } catch { /* db unreadable */ }
  return {
    month,
    cap,
    per_job_cap: per_job_cap_usd,
    spent,
    spent_today: spentToday,
    day_share: dayShare,
    days_in_month: daysInMonth,
    day_of_month: dayOfMonth,
    projection: dayOfMonth ? (spent / dayOfMonth) * daysInMonth : spent,
    pct: cap ? spent / cap : 0,
    warn80: spent >= cap * 0.8,
    over_day: spentToday >= dayShare,
    over_month: spent >= cap,
    top5: [...by.values()].sort((a, b) => b.costUsd - a.costUsd).slice(0, 5),
    paused: paused.slice(-20),
  }
}

/** The one line Her's Brief shows once the month passes 80%. Null below that. */
export function spendBriefLine(): string | null {
  const s = spendStatus()
  if (!s.warn80) return null
  return s.over_month
    ? `RISE has spent ${money(s.spent)} of ${money(s.cap)} this month. Background jobs are paused until the 1st; anything you start asks first.`
    : `RISE has spent ${money(s.spent)} of ${money(s.cap)} this month.`
}

export class BudgetError extends Error {
  constructor(public code: 'paused' | 'needs_ok', message: string, public estimateUsd: number) {
    super(`${BUDGET_TAG} ${message}`)
    this.name = 'BudgetError'
  }
}

function recordPaused(job: PausedJob) {
  try {
    const db = readDb()
    db.spend_cap ??= {}
    const list = db.spend_cap.paused ?? []
    list.push(job)
    db.spend_cap.paused = list.slice(-200)
    writeDb(db)
  } catch { /* never break the caller over the log */ }
}

async function requestInfo(): Promise<{ route: string; ok: boolean }> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return { route: h.get('x-rise-route') || 'unknown', ok: h.get(BUDGET_OK_HEADER) === '1' }
  } catch {
    return { route: 'background', ok: false } // timers and scripts: outside any request
  }
}

export const isBackgroundRoute = (route: string) => route === 'background' || route.startsWith('/api/cron/')

/** A rough cost guess before a call: input ≈ chars/4, output ≈ up to 1,500 tokens. */
export function estimateCost(model: string, inputChars: number, maxOutTokens: number): number {
  return costFor(model, Math.ceil(inputChars / 4), Math.min(Math.max(maxOutTokens, 0), 1500))
}

/**
 * Call right before any AI request. Returns quietly when the call may go ahead; throws a
 * BudgetError when it must wait (background) or needs Mandi's OK (something she started).
 */
export async function budgetGate(o: { model: string; inputChars: number; maxOutTokens: number; kind: string }): Promise<void> {
  const { route, ok } = await requestInfo()
  if (ok) return // Mandi already said Go for this one
  const est = estimateCost(o.model, o.inputChars, o.maxOutTokens)
  let s: SpendStatus
  try { s = spendStatus() } catch { return } // can't read the log: never block on our own bug
  const cap = money(s.cap)

  if (isBackgroundRoute(route)) {
    let why = ''
    if (s.over_month) why = `RISE has spent ${money(s.spent)} of ${cap} this month, so background jobs are paused until the 1st.`
    else if (est > s.per_job_cap) why = `This background job would cost about ${money(est)}, over the ${money(s.per_job_cap)} per-job ceiling, so it was skipped.`
    else if (s.over_day && !ESSENTIAL_BACKGROUND.some(p => route.startsWith(p))) why = `Today's share (${money(s.day_share)}) is used up, so this background job waits for tomorrow.`
    if (why) {
      recordPaused({ ts: new Date().toISOString(), route, kind: o.kind, why })
      throw new BudgetError('paused', why, est)
    }
    return
  }

  if (s.spent + est >= s.cap) {
    throw new BudgetError('needs_ok', `This will cost about ${money(Math.max(est, 0.01))} and puts RISE over ${cap} this month (spent so far: ${money(s.spent)}). Go?`, est)
  }
  if (est > s.per_job_cap) {
    throw new BudgetError('needs_ok', `This one job will cost about ${money(est)}, over the ${money(s.per_job_cap)} per-job ceiling. Go?`, est)
  }
}
