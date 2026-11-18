// Cap's plans and the calendar (Phase 2). Monthly plan per branch → weekly cadence per
// account → daily calendar items. Proposals are RULE-BASED drafts (no AI calls, no cost);
// Mandi approves or edits each level before the next one exists. A calendar item holds no
// copy or status of its own: it points at ONE existing ContentPiece.

import {
  readDb, writeDb, createContent, backupDb, getBranches, branchOfAccount, branchOfProduct, seedBranches,
  PHASE2_PRODUCT_PATCHES, DEFAULT_PLAN_CONFIG, BRANCH_IDS,
  type BranchId, type Plan, type CalendarItem, type PlanConfig, type MonthlyPlanBody, type WeeklyPlanBody, type ContentPiece,
} from './db'

// ── dates (plain YYYY-MM-DD math in UTC so it never drifts with the server's timezone) ──
const DAY = 86400000
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`)
export const addDays = (d: string, n: number) => new Date(toMs(d) + n * DAY).toISOString().slice(0, 10)
export const todayStr = () => new Date().toISOString().slice(0, 10)   // callers may pass a CT date instead
const every14 = (anchor: string, from: string, to: string): string[] => {
  const out: string[] = []
  const first = Math.ceil((toMs(from) - toMs(anchor)) / (14 * DAY))
  for (let k = first; ; k++) { const d = addDays(anchor, k * 14); if (d > to) break; if (d >= from) out.push(d) }
  return out
}

export function getPlanConfig(): PlanConfig { return { ...DEFAULT_PLAN_CONFIG, ...(readDb().plan_config ?? {}) } }
export function setPlanConfig(patch: Partial<PlanConfig>): PlanConfig {
  const db = readDb(); db.plan_config = { ...getPlanConfig(), ...patch }; writeDb(db); return db.plan_config
}

// ── the one-time Phase 2 data migration (dry run by default) ─────────────────────
export function migratePhase2(opts: { dryRun: boolean }) {
  const db = readDb()
  const now = new Date().toISOString()
  const report = { branches_added: 0, products_patched: [] as string[], accounts_placed: [] as string[], accounts_unplaced: [] as string[], goals_tagged: 0, backup: '' as string, dry_run: opts.dryRun }
  if (!db.branches) { db.branches = seedBranches(now); report.branches_added = db.branches.length }
  for (const prod of db.products ?? []) {
    const patch = PHASE2_PRODUCT_PATCHES[prod.id]
    if (patch) {
      const differs = Object.entries(patch).some(([k, v]) => JSON.stringify((prod as Record<string, unknown>)[k]) !== JSON.stringify(v))
      if (differs) { Object.assign(prod, patch, { updated_at: now }); report.products_patched.push(prod.id) }
    }
    else if (!prod.branch_id) prod.branch_id = branchOfProduct(prod)
  }
  for (const a of db.brand_accounts ?? []) {
    if (a.branch_id) continue
    const b = branchOfAccount(a)
    if (b) { a.branch_id = b; report.accounts_placed.push(`${a.handle || a.id} → ${b}`) }
    else if (a.status === 'active') report.accounts_unplaced.push(a.handle || a.id)
  }
  const byId = new Map((db.brand_accounts ?? []).map(a => [a.id, a]))
  for (const g of db.goals ?? []) {
    if (g.branch_id !== undefined || !g.account_id) continue
    const b = branchOfAccount(byId.get(g.account_id)); if (b) { g.branch_id = b; report.goals_tagged++ }
  }
  const changed = report.branches_added || report.products_patched.length || report.accounts_placed.length || report.goals_tagged
  if (!opts.dryRun && changed) { report.backup = backupDb('pre-phase2'); writeDb(db) }
  return report
}

// ── monthly plan (per branch) ────────────────────────────────────────────────────
const fmtDate = (d: string) => new Date(toMs(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function monthlyBody(branch: BranchId, from: string, to: string, cfg: PlanConfig): MonthlyPlanBody {
  const resets = every14(cfg.reset_anchor, from, to)
  const eps = every14(cfg.podcast_anchor, from, to)
  if (branch === 'joyful_media') return {
    goals: [
      `Run ${resets.length} Resets (every other Sunday, 8 PM CT) and fill the seats. Seat and invite targets: Mandi to set (was about 10–15 invites a week; the Oct 22 plan said 50).`,
      'Show up for returning attendees: $25 coupon in the thank-you email, then the $44/month pass only after two attendances.',
    ],
    initiatives: ['Six-touch post-Reset sequence on the Joyful Media list (built in Phase 5; nothing sends until you approve).', 'One new format a week alongside proven ones.'],
    campaigns: [
      { product_id: 'reset', note: 'Every other Sunday. Register on Luma. $33 / $25 returning / $44 pass.' },
      { product_id: 'intuition', note: 'Optional post-Reset offer, $9, "Listen To Your Intuition". Four voice recordings still owed, so not a launch.' },
    ],
    dates: resets.map(d => ({ date: d, label: 'The Reset, 8 PM CT' })),
    priorities: ['Joyful Media wins every tie for your time and the create list.', 'Each account gets its own footage, on-screen text and captions.'],
    paused: ['The Wellspring (deferred to later in 2027)'],
  }
  return {
    goals: ['Keep the AI Mom podcast on its every-other-week rhythm. Listener and sponsor goals: Mandi to set (about 40 listeners an episode as of Oct 22).'],
    initiatives: ['Guest booking continues through /book.'],
    campaigns: [{ product_id: 'podcast', note: 'Podcast-only. No Reset invites, no Joyful Media offers, no WFH services CTA.' }, { product_id: 'guest_track', note: 'Keep guests warm, signup to cross-promotion.' }],
    dates: eps.map(d => ({ date: d, label: 'AI Mom episode' })),
    priorities: ['Joyful Media wins ties; WFH fills what is left.'],
    paused: ['AI services (Cheat Code, Local Support)', 'All WFH marketing, until you say go'],
  }
}

export function proposeMonthly(from = todayStr(), branches: BranchId[] = BRANCH_IDS): Plan[] {
  const db = readDb()
  const cfg = getPlanConfig()
  const to = addDays(from, 27)
  const now = new Date().toISOString()
  db.plans ??= []; db.next_plan_id ??= 1
  const made: Plan[] = []
  for (const b of branches) {
    // a fresh proposal replaces an older UNAPPROVED one for the same branch; approved plans are never touched
    for (const old of db.plans) if (old.level === 'monthly' && old.branch_id === b && old.status === 'proposed') { old.status = 'superseded'; old.updated_at = now }
    const body = monthlyBody(b, from, to, cfg)
    const plan: Plan = {
      id: `plan_${db.next_plan_id++}`, level: 'monthly', branch_id: b, period_start: from, period_end: to, status: 'proposed',
      summary: b === 'joyful_media' ? `Joyful Media, ${fmtDate(from)} to ${fmtDate(to)}: the Reset comes first.` : `WFH, ${fmtDate(from)} to ${fmtDate(to)}: the podcast only. Services and marketing stay paused.`,
      monthly: body, proposed_by: 'cap', approved_at: null, created_at: now, updated_at: now,
    }
    db.plans.push(plan); made.push(plan)
  }
  writeDb(db)
  return made
}

// ── weekly cadence (per account; needs an approved monthly for its branch) ───────
function weeklyBody(a: { id: string; handle: string }, branch: BranchId): WeeklyPlanBody {
  const k = `${a.id} ${a.handle}`.toLowerCase().replace(/[^a-z0-9 ]/g, '')
  let channels: { format: string; per_week: number }[]
  if (k.includes('medium')) channels = [{ format: 'long-form article', per_week: 1 }]
  else if (k.includes('substack')) channels = [{ format: 'newsletter', per_week: 1 }]
  else if (k.includes('youtube') || k.includes('joyfulmedia')) channels = [{ format: 'long-form video', per_week: 1 }, { format: 'Short', per_week: 2 }]
  else if (k.includes('tiktok')) channels = [{ format: 'reel', per_week: 5 }]
  else if (k.includes('aimom888')) channels = [{ format: 'episode clip', per_week: 2 }]
  else if (k.includes('aimompodcast')) channels = [{ format: 'episode clip / quote card', per_week: 3 }]
  else if (k.includes('mandijoybeck')) channels = [{ format: 'talking head', per_week: 3 }, { format: 'b-roll reel with on-screen line', per_week: 4 }, { format: 'carousel (quotes / gratitudes)', per_week: 3 }]
  else channels = [{ format: 'post', per_week: 3 }]
  const total = channels.reduce((n, c) => n + c.per_week, 0)
  const wfh = branch === 'wfh'
  return {
    account_id: a.id, handle: a.handle || a.id, channels, posts_per_week: total,
    per_day: total >= 7 ? '1–2 a day' : total >= 3 ? 'every 2–3 days' : 'about once a week',
    batch: 'Batch about 20 posts at a time; post 1–2 a day. Counts are starting points.',
    campaign_balance: wfh ? 'Podcast only. No Reset invites, no Joyful Media offers, no WFH services.' : 'Roughly 1 in 3 posts points to the next Reset; the rest is value and story. Never the podcast.',
    arc: 'This account gets its own footage, on-screen text and captions. No identical Reels across accounts. One new format a week.',
  }
}

export function proposeWeekly(): { plans: Plan[]; skipped: string[] } {
  const db = readDb()
  const now = new Date().toISOString()
  db.plans ??= []; db.next_plan_id ??= 1
  const made: Plan[] = [], skipped: string[] = []
  for (const a of db.brand_accounts ?? []) {
    if (a.status !== 'active') continue
    const b = branchOfAccount(a)
    if (!b) { skipped.push(`${a.handle || a.id}: not placed in a branch yet`); continue }
    const parent = db.plans.filter(p => p.level === 'monthly' && p.branch_id === b && p.status === 'approved').sort((x, y) => y.period_start.localeCompare(x.period_start))[0]
    if (!parent) { skipped.push(`${a.handle || a.id}: the ${b === 'wfh' ? 'WFH' : 'Joyful Media'} monthly plan isn't approved yet`); continue }
    for (const old of db.plans) if (old.level === 'weekly' && old.weekly?.account_id === a.id && old.status === 'proposed') { old.status = 'superseded'; old.updated_at = now }
    const body = weeklyBody({ id: a.id, handle: a.handle }, b)
    const plan: Plan = {
      id: `plan_${db.next_plan_id++}`, level: 'weekly', branch_id: b, period_start: parent.period_start, period_end: parent.period_end, status: 'proposed',
      summary: `${body.handle}: ${body.posts_per_week} post${body.posts_per_week === 1 ? '' : 's'} a week (${body.per_day}).`, weekly: body, proposed_by: 'cap',
      approved_at: null, parent_plan_id: parent.id, created_at: now, updated_at: now,
    }
    db.plans.push(plan); made.push(plan)
  }
  writeDb(db)
  return { plans: made, skipped }
}

export function getPlans(): Plan[] { return (readDb().plans ?? []).filter(p => p.status !== 'superseded') }

export function approvePlan(id: string): Plan | null {
  const db = readDb()
  const p = (db.plans ?? []).find(x => x.id === id); if (!p || p.status === 'superseded') return null
  p.status = 'approved'; p.approved_at = new Date().toISOString(); p.updated_at = p.approved_at
  writeDb(db); return p
}

// Mandi's edits: posts per format on a weekly plan, or text lines on a monthly one. An edit to an
// approved plan sends it back to "proposed" so it is approved again on purpose.
export function editPlan(id: string, patch: { channels?: { format: string; per_week: number }[]; summary?: string; goals?: string[]; priorities?: string[] }): Plan | null {
  const db = readDb()
  const p = (db.plans ?? []).find(x => x.id === id); if (!p || p.status === 'superseded') return null
  if (patch.summary) p.summary = patch.summary
  if (p.weekly && patch.channels) {
    p.weekly.channels = patch.channels.map(c => ({ format: String(c.format), per_week: Math.max(0, Math.round(Number(c.per_week) || 0)) }))
    p.weekly.posts_per_week = p.weekly.channels.reduce((n, c) => n + c.per_week, 0)
  }
  if (p.monthly) { if (patch.goals) p.monthly.goals = patch.goals; if (patch.priorities) p.monthly.priorities = patch.priorities }
  p.status = 'proposed'; p.approved_at = null; p.updated_at = new Date().toISOString()
  writeDb(db); return p
}

// ── the daily calendar ───────────────────────────────────────────────────────────
type Need = { date: string; branch: BranchId; account_id: string | null; slot: CalendarItem['slot']; plan_id: string; label: string; format?: string }

export type CalendarView = CalendarItem & { title: string; status: string; has_script: boolean; has_media: boolean; handle: string }

export function getCalendar(from: string, to: string): CalendarView[] {
  const db = readDb()
  const content = new Map(db.content.map(c => [c.id, c]))
  const acct = new Map((db.brand_accounts ?? []).map(a => [a.id, a]))
  return (db.calendar_items ?? []).filter(i => i.date >= from && i.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).map(i => {
    const c = content.get(i.content_id)
    return { ...i, title: c?.title ?? '(content record missing)', status: c?.status ?? 'missing', has_script: !!c?.script, has_media: !!(c?.media_url || c?.media_urls?.length), handle: i.account_id ? (acct.get(i.account_id)?.handle || i.account_id) : '' }
  })
}

export function generateCalendar(from = todayStr(), days = 14): { created: number; reused: number; moved: number; dropped: string[]; window: [string, string] } {
  const to = addDays(from, days - 1)
  const cfg = getPlanConfig()
  const db0 = readDb()
  const plans = (db0.plans ?? []).filter(p => p.status === 'approved')
  const existing = db0.calendar_items ?? []
  const needs: Need[] = []

  // Reset + podcast slots come from the approved monthly plans' dates
  for (const p of plans.filter(x => x.level === 'monthly' && x.monthly)) {
    for (const d of p.monthly!.dates) {
      if (d.date < from || d.date > to) continue
      const slot: Need['slot'] = p.branch_id === 'joyful_media' ? 'reset' : 'podcast'
      needs.push({ date: d.date, branch: p.branch_id, account_id: null, slot, plan_id: p.id, label: slot === 'reset' ? `The Reset, ${fmtDate(d.date)} 8 PM CT` : `AI Mom episode, ${fmtDate(d.date)}` })
    }
  }
  // Weekly cadence: spread each account's posts evenly across the week
  for (const p of plans.filter(x => x.level === 'weekly' && x.weekly)) {
    const w = p.weekly!
    const formats = w.channels.flatMap(c => Array.from({ length: c.per_week }, () => c.format))
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const wi = Math.round((toMs(d) - toMs(from)) / DAY) % 7   // day index within the week
      formats.forEach((f, i) => { if (Math.floor((i * 7) / Math.max(1, formats.length)) === wi) needs.push({ date: d, branch: p.branch_id, account_id: w.account_id, slot: 'post', plan_id: p.id, label: `${w.handle}: ${f}`, format: f }) })
    }
  }
  // Tie rule: Joyful Media first, then fixed events, within each day's capacity. Overflow slides to the next free day.
  const rank = (n: Need) => (n.branch === 'joyful_media' ? 0 : 2) + (n.slot === 'post' ? 1 : 0)
  needs.sort((a, b) => a.date.localeCompare(b.date) || rank(a) - rank(b))
  const load: Record<string, number> = {}
  const placed: Need[] = [], dropped: string[] = []
  let moved = 0
  for (const n of needs) {
    let d = n.date
    while (d <= to && (load[d] ?? 0) >= cfg.day_capacity && n.slot === 'post') d = addDays(d, 1)
    if (d > to) { dropped.push(`${n.label} (${n.date}): no room in this window`); continue }
    if (d !== n.date) moved++
    load[d] = (load[d] ?? 0) + 1
    placed.push({ ...n, date: d })
  }

  // Attach each need to ONE content record: an existing one if it fits, else a new idea card.
  const usedContent = new Set(existing.map(i => i.content_id))
  const sameKey = (n: Need) => (i: CalendarItem) => i.plan_id === n.plan_id && i.date === n.date && i.account_id === n.account_id && i.slot === n.slot
  const out: CalendarItem[] = []
  let created = 0, reused = 0
  const seenKeys: Need[] = []
  for (const n of placed) {
    // an item already on the calendar for the same plan/day/account/slot is not made twice (counts handle several posts a day)
    const already = existing.filter(sameKey(n)).length + out.filter(sameKey(n)).length
    const wanted = placed.filter(x => x.plan_id === n.plan_id && x.date === n.date && x.account_id === n.account_id && x.slot === n.slot).length
    const idx = seenKeys.filter(x => x.plan_id === n.plan_id && x.date === n.date && x.account_id === n.account_id && x.slot === n.slot).length
    seenKeys.push(n)
    if (already > idx || already >= wanted) continue
    let card: ContentPiece | undefined
    if (n.slot === 'post') {
      const fresh = readDb().content.find(c => c.account_id === n.account_id && (c.status === 'idea' || c.status === 'in_progress') && !usedContent.has(c.id) && !c.scheduled_at)
      if (fresh) { card = fresh; reused++ }
    }
    if (!card) {
      card = createContent({
        title: n.label, status: n.slot === 'post' ? 'idea' : 'in_progress',
        type: n.slot === 'reset' ? 'workshop' : n.slot === 'podcast' ? 'podcast' : 'post',
        account_id: n.account_id, river_source: 'cap-plan',
        notes: `Planned by Cap for ${n.date} (${n.plan_id}). ${n.format ? `Format: ${n.format}. ` : ''}Script and captions get written on this same record.`,
      })
      created++
    }
    usedContent.add(card.id)
    out.push({ id: '', date: n.date, branch_id: n.branch, account_id: n.account_id, content_id: card.id, plan_id: n.plan_id, slot: n.slot, created_at: '' })
  }
  const db = readDb()
  db.calendar_items ??= []; db.next_calendar_id ??= 1
  const now = new Date().toISOString()
  for (const o of out) db.calendar_items.push({ ...o, id: `cal_${db.next_calendar_id++}`, created_at: now })
  writeDb(db)
  return { created, reused, moved, dropped, window: [from, to] }
}

// ── retire the Nov 11 quotas into the first approved weekly plan ─────────────────
export function retireCadenceGoals(opts: { dryRun: boolean }) {
  const db = readDb()
  const weekly = (db.plans ?? []).filter(p => p.level === 'weekly' && p.status === 'approved' && p.weekly)
  const old = (db.goals ?? []).filter(g => g.active && g.notes.startsWith('[cadence]'))
  const report = { weekly_plans: weekly.length, goals_retired: old.map(g => g.title), goals_created: [] as string[], backup: '', dry_run: opts.dryRun }
  if (!weekly.length) return { ...report, error: 'No approved weekly plan yet. Approve Cap’s weekly cadence first.' }
  const now = new Date().toISOString()
  let maxId = db.goals.reduce((m, g) => Math.max(m, g.id), 0)
  for (const p of weekly) {
    if (db.goals.some(g => g.plan_id === p.id)) continue
    report.goals_created.push(p.summary)
    if (opts.dryRun) continue
    db.goals.push({ id: ++maxId, title: `${p.weekly!.handle}: ${p.weekly!.posts_per_week}/week (Cap plan)`, account_id: p.weekly!.account_id, target_per_week: p.weekly!.posts_per_week, deadline: p.period_end, notes: `[plan ${p.id}] ${p.summary} ${p.weekly!.batch}`, active: true, signup_tag: null, signup_target: null, signups_manual: null, branch_id: p.branch_id, plan_id: p.id, created_at: now, updated_at: now })
  }
  if (!opts.dryRun && (old.length || report.goals_created.length)) {
    report.backup = backupDb('pre-retire-cadence')
    for (const g of old) { g.active = false; g.notes += ' [retired 2026-11-18: replaced by Cap’s weekly plan; kept, not deleted]'; g.updated_at = now }
    db.next_goal_id = maxId + 1
    writeDb(db)
  }
  return report
}

export { getBranches }
