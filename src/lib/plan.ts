// Cap's plans and the calendar (Phase 2). Monthly plan per branch → weekly cadence per
// account → daily calendar items. Proposals are RULE-BASED drafts (no AI calls, no cost).
// Calendar authority (Phase 8 A5, Mandi's call Nov 25): Mandi approves the MONTHLY direction per
// branch. Cap's weekly plans, placement and moves then go live on their own and show as receipts
// in Activity; she can still edit or decline any of them. A bumped post is rescheduled, never dropped.
// Weekly counts are sized to her hours (A4 capacity) and the footage on hand; the old counts are
// the fallback. Protected formats (lib/protectedFormats.ts) always keep their slots. A calendar item holds no
// copy or status of its own: it points at ONE existing ContentPiece.

import {
  readDb, writeDb, createContent, backupDb, getBranches, branchOfAccount, branchOfProduct, seedBranches,
  PHASE2_PRODUCT_PATCHES, DEFAULT_PLAN_CONFIG, BRANCH_IDS,
  type BranchId, type Plan, type PlanNote, type CalendarItem, type PlanConfig, type MonthlyPlanBody, type WeeklyPlanBody, type ContentPiece,
  logActivity,
} from './db'
import { protectedFor, isProtectedFormat } from './protectedFormats'
import { formatMinutes, filmBudget, filmMinutes, latestHours, ADMIN_BASE_MINUTES } from './capacity'
import { hasVideo, needsFilming } from './shootList'
import { effectiveUpload } from './cardMedia'
import { quoteFormatFor } from './quotes'

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
const cadenceWords = (n: number) => n >= 7 ? '1–2 a day' : n >= 3 ? 'every 2–3 days' : n === 2 ? 'twice a week' : n === 1 ? 'once a week' : 'paused this week'

// The old fixed counts. Still the fallback when Mandi hasn't given her hours.
function baseChannels(a: { id: string; handle: string }): { format: string; per_week: number }[] {
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
  return channels
}

// Unscheduled footage already on hand for an account: cards with a video, not published, not on the calendar.
function footageOnHand(accountId: string): number {
  const db = readDb()
  const placed = new Set((db.calendar_items ?? []).map(i => i.content_id))
  return db.content.filter(c => c.account_id === accountId && !['published', 'archived'].includes(c.status) && hasVideo(c) && !placed.has(c.id)).length
}

/** Scale filmed (non-protected) counts by `factor`; protected formats are added and never scaled.
 *  Footage on hand covers filmed slots first, so it doesn't cost filming time. */
export function sizeChannels(accountId: string, base: { format: string; per_week: number }[], factor: number | null): { format: string; per_week: number }[] {
  const out = base.filter(c => !isProtectedFormat(accountId, c.format)).map(c => {
    if (factor === null || formatMinutes(c.format) === 0) return { ...c }
    return { format: c.format, per_week: Math.max(1, Math.round(c.per_week * factor)) }
  })
  for (const p of protectedFor(accountId)) out.push({ format: p.format, per_week: p.per_week })
  return out
}

function weeklyBody(a: { id: string; handle: string }, branch: BranchId, factor: number | null = null, basis = ''): WeeklyPlanBody {
  const channels = sizeChannels(a.id, baseChannels(a), factor)
  const total = channels.reduce((n, c) => n + c.per_week, 0)
  const wfh = branch === 'wfh'
  return {
    account_id: a.id, handle: a.handle || a.id, channels, posts_per_week: total,
    basis: basis || 'Old starting counts (no hours given yet).',
    per_day: cadenceWords(total),
    batch: 'Batch about 20 posts at a time; post 1–2 a day. Counts are starting points.',
    campaign_balance: wfh ? 'Podcast only. No Reset invites, no Joyful Media offers, no WFH services.' : 'Roughly 1 in 3 posts points to the next Reset; the rest is value and story. Never the podcast.',
    arc: 'This account gets its own footage, on-screen text and captions. No identical Reels across accounts. One new format a week.',
  }
}

// How much to scale filmed counts across ALL accounts this round, from her hours (A4) and footage on hand.
// Protected slots are paid for first. null = no hours given, so the old counts stand.
function capacityFactor(accounts: { id: string; handle: string }[]): { factor: number | null; basis: string } {
  const hours = latestHours()
  if (hours === null) return { factor: null, basis: '' }
  let protectedMin = 0, flexMin = 0
  for (const a of accounts) {
    for (const p of protectedFor(a.id)) protectedMin += formatMinutes(p.format) * p.per_week
    let onHand = footageOnHand(a.id)
    for (const c of baseChannels(a)) {
      if (isProtectedFormat(a.id, c.format)) continue
      const m = formatMinutes(c.format); if (!m) continue
      const use = Math.min(onHand, c.per_week); onHand -= use
      flexMin += (c.per_week - use) * m
    }
  }
  const budget = Math.max(0, Math.round(hours * 60) - ADMIN_BASE_MINUTES - protectedMin)
  const factor = flexMin ? Math.max(0.25, Math.min(1, budget / flexMin)) : 1   // never more than the old counts
  const r = Math.round(factor * 100) / 100
  return { factor: r, basis: `Sized to your ${hours} h a week: about ${Math.round(budget / 60 * 2) / 2} h left for filming after admin and the protected formats, so filmed posts run at ${Math.round(r * 100)}% of the old counts. Footage you already have counts first.` }
}

export function proposeWeekly(): { plans: Plan[]; skipped: string[] } {
  const db = readDb()
  const now = new Date().toISOString()
  db.plans ??= []; db.next_plan_id ??= 1
  const made: Plan[] = [], skipped: string[] = []
  const { factor, basis } = capacityFactor((db.brand_accounts ?? []).filter(a => a.status === 'active' && !a.mirrors_account_id).map(a => ({ id: a.id, handle: a.handle })))
  for (const a of db.brand_accounts ?? []) {
    if (a.status !== 'active') continue
    const b = branchOfAccount(a)
    if (!b) { skipped.push(`${a.handle || a.id}: not placed in a branch yet`); continue }
    const parent = db.plans.filter(p => p.level === 'monthly' && p.branch_id === b && p.status === 'approved').sort((x, y) => y.period_start.localeCompare(x.period_start))[0]
    if (!parent) { skipped.push(`${a.handle || a.id}: the ${b === 'wfh' ? 'WFH' : 'Joyful Media'} monthly plan isn't approved yet`); continue }
    if (db.plans.some(x => x.level === 'weekly' && x.weekly?.account_id === a.id && x.status === 'approved' && x.parent_plan_id === parent.id)) continue // already approved for this month
    if (a.mirrors_account_id) {
      const src = (db.brand_accounts ?? []).find(x => x.id === a.mirrors_account_id)
      skipped.push(`${a.handle || a.id}: mirrors ${src?.handle || a.mirrors_account_id}, so it posts automatically and needs no plan of its own`)
      for (const old of db.plans) if (old.level === 'weekly' && old.weekly?.account_id === a.id && (old.status === 'proposed' || old.status === 'declined')) { old.status = 'superseded'; old.updated_at = now }
      continue
    }
    // Her notes on the drafts she hadn't approved (questions, declines) ride onto the new draft.
    const carried: PlanNote[] = []
    for (const old of db.plans) if (old.level === 'weekly' && old.weekly?.account_id === a.id && (old.status === 'proposed' || old.status === 'declined')) {
      carried.push(...(old.feedback ?? [])); old.status = 'superseded'; old.updated_at = now
    }
    const declinedBefore = carried.some(n => n.kind === 'decline')
    const body = weeklyBody({ id: a.id, handle: a.handle }, b, factor, basis)
    // Cap 4: his proposed experiment from the latest winners rides onto this draft. Her approval of the plan is the yes.
    const planId = `plan_${db.next_plan_id}`
    const exps = (db.winner_reviews ?? []).filter(w => w.account_id === a.id && (w.status === 'proposed' || (w.status === 'in_plan' && db.plans!.some(x => x.id === w.plan_id && x.status !== 'approved'))))
    if (exps.length) {
      body.experiments = exps.map(w => ({ review_id: w.id, text: `${w.experiment.what}${w.experiment.measure ? ` Measure: ${w.experiment.measure}` : ''}` }))
      for (const w of exps) { w.status = 'in_plan'; w.plan_id = planId }
    }
    const plan: Plan = {
      // A5 calendar authority: the monthly direction is approved, so Cap's weekly plan goes live on its own.
      // Except after Mandi said no to this account's plan: then the redraft waits for her again.
      id: planId, level: 'weekly', branch_id: b, period_start: parent.period_start, period_end: parent.period_end, status: declinedBefore ? 'proposed' : 'approved',
      summary: `${body.handle}: ${body.posts_per_week} post${body.posts_per_week === 1 ? '' : 's'} a week (${body.per_day}).`, weekly: body, proposed_by: 'cap',
      approved_at: declinedBefore ? null : now, parent_plan_id: parent.id, created_at: now, updated_at: now,
      ...(carried.length ? { feedback: carried } : {}),
    }
    db.next_plan_id++
    db.plans.push(plan); made.push(plan)
  }
  writeDb(db)
  // The receipt: what went live, and why it's that size. She can edit or decline any of them in Plan.
  for (const p of made.filter(x => x.status === 'approved')) logActivity({ type: 'plan', title: `Cap set ${p.weekly!.handle}'s week: ${p.weekly!.posts_per_week} posts`, detail: `${p.weekly!.channels.map(c => `${c.per_week} ${c.format}`).join(', ')}. ${p.weekly!.basis ?? ''}${p.weekly!.experiments?.length ? ` Experiment: ${p.weekly!.experiments[0].text}` : ''} Live now; edit or decline it in Plan.`, icon: '🗓️', source: 'cap', account_id: p.weekly!.account_id })
  return { plans: made, skipped }
}

export function getPlans(): Plan[] { return (readDb().plans ?? []).filter(p => p.status !== 'superseded') }

// Apply new per-week counts to a weekly plan and keep its one-line summary truthful.
function applyChannels(p: Plan, channels: { format: string; per_week: number }[]) {
  if (!p.weekly) return
  p.weekly.channels = channels.map(c => ({ format: String(c.format), per_week: Math.max(0, Math.round(Number(c.per_week) || 0)) }))
  const total = p.weekly.channels.reduce((n, c) => n + c.per_week, 0)
  p.weekly.posts_per_week = total
  p.weekly.per_day = cadenceWords(total)
  p.summary = `${p.weekly.handle}: ${total} post${total === 1 ? '' : 's'} a week (${p.weekly.per_day}).`
}

// Approve, optionally with her last-second count changes in the same step (so an edit and
// an Approve click can never race each other).
export function approvePlan(id: string, channels?: { format: string; per_week: number }[] | null): Plan | null {
  const db = readDb()
  const p = (db.plans ?? []).find(x => x.id === id); if (!p || p.status === 'superseded') return null
  if (channels && Array.isArray(channels)) applyChannels(p, channels)
  p.status = 'approved'; p.approved_at = new Date().toISOString(); p.updated_at = p.approved_at
  writeDb(db); return p
}

// Mandi's "no": a decline needs her reason (kept on the plan and carried onto Cap's next draft).
// Optionally she marks the account as a mirror of another (e.g. a FB page that auto-posts from IG),
// so Cap stops drafting a separate plan for it.
export function declinePlan(id: string, reason: string, mirrorsAccountId?: string | null): Plan | { error: string } {
  const text = String(reason || '').trim()
  if (!text) return { error: 'Tell Cap why, in a sentence, so the next draft is better.' }
  const db = readDb()
  const p = (db.plans ?? []).find(x => x.id === id); if (!p || p.status === 'superseded') return { error: 'Plan not found.' }
  const now = new Date().toISOString()
  p.status = 'declined'; p.approved_at = null; p.updated_at = now
  ;(p.feedback ??= []).push({ kind: 'decline', text, at: now })
  if (mirrorsAccountId && p.weekly) {
    const acct = (db.brand_accounts ?? []).find(a => a.id === p.weekly!.account_id)
    const src = (db.brand_accounts ?? []).find(a => a.id === mirrorsAccountId)
    if (acct && src && src.id !== acct.id) acct.mirrors_account_id = src.id
  }
  writeDb(db); return p
}

// Changed her mind: a declined plan goes back to waiting (her reason stays in the history).
export function reopenPlan(id: string): Plan | null {
  const db = readDb()
  const p = (db.plans ?? []).find(x => x.id === id); if (!p || p.status !== 'declined') return null
  const now = new Date().toISOString()
  p.status = 'proposed'; p.updated_at = now
  ;(p.feedback ??= []).push({ kind: 'reopen', text: 'Reopened', at: now })
  writeDb(db); return p
}

// Her question about a plan. Cap answers from the plan itself, its monthly parent and the
// account's card. The question is saved first, so it is never lost if the answer fails.
export async function askAboutPlan(id: string, question: string): Promise<Plan | { error: string }> {
  const q = String(question || '').trim()
  if (!q) return { error: 'Type your question first.' }
  let db = readDb()
  let p = (db.plans ?? []).find(x => x.id === id); if (!p || p.status === 'superseded') return { error: 'Plan not found.' }
  const at = new Date().toISOString()
  ;(p.feedback ??= []).push({ kind: 'question', text: q, at, answer: null })
  writeDb(db)
  const parent = p.parent_plan_id ? (db.plans ?? []).find(x => x.id === p!.parent_plan_id) : null
  const acct = p.weekly ? (db.brand_accounts ?? []).find(a => a.id === p!.weekly!.account_id) : null
  const ctx = {
    plan: { level: p.level, branch: p.branch_id, period: [p.period_start, p.period_end], status: p.status, summary: p.summary, monthly: p.monthly, weekly: p.weekly },
    monthly_parent: parent ? { summary: parent.summary, goals: parent.monthly?.goals, dates: parent.monthly?.dates, priorities: parent.monthly?.priorities } : null,
    account: acct ? { handle: acct.handle, platform: acct.platform, status: acct.status, mission: acct.mission, topic: acct.topic, content_format: acct.content_format, mirrors_account_id: acct.mirrors_account_id ?? null } : null,
    earlier_notes: (p.feedback ?? []).slice(0, -1),
  }
  const system = 'You are Cap, the planner in Mandi\'s RISE station. Mandi is asking about one of your draft plans. Answer her plainly and briefly (2 to 5 sentences): why you drafted it this way, and what you would change if she wants. Use only the facts given. If the answer depends on something you do not know, say so and say what she could tell you. Never promise results. Rules you plan by: Joyful Media and WFH never cross-promote; Joyful wins ties; podcast accounts carry podcast-only CTAs; every account gets its own footage.'
  let answer: string | null = null
  try {
    const { callGPT } = await import('./ai')
    answer = (await callGPT('cap', `Plan context (JSON):\n${JSON.stringify(ctx)}\n\nMandi asks: ${q}`, system)).trim() || null
  } catch { answer = null }
  db = readDb()
  p = (db.plans ?? []).find(x => x.id === id)!
  const note = (p.feedback ?? []).find(n => n.kind === 'question' && n.at === at)
  if (note) { note.answer = answer ?? 'Cap couldn\u2019t answer just now. Your question is saved; ask again in a minute.'; note.answered_at = answer ? new Date().toISOString() : null }
  writeDb(db); return p
}

// Mandi's edits: posts per format on a weekly plan, or text lines on a monthly one. An edit to an
// approved plan sends it back to "proposed" so it is approved again on purpose.
export function editPlan(id: string, patch: { channels?: { format: string; per_week: number }[]; summary?: string; goals?: string[]; priorities?: string[] }): Plan | null {
  const db = readDb()
  const p = (db.plans ?? []).find(x => x.id === id); if (!p || p.status === 'superseded') return null
  if (patch.summary) p.summary = patch.summary
  if (p.weekly && patch.channels) applyChannels(p, patch.channels)
  if (p.monthly) { if (patch.goals) p.monthly.goals = patch.goals; if (patch.priorities) p.monthly.priorities = patch.priorities }
  p.status = 'proposed'; p.approved_at = null; p.updated_at = new Date().toISOString()
  writeDb(db); return p
}

// ── the daily calendar ───────────────────────────────────────────────────────────
type Need = { date: string; branch: BranchId; account_id: string | null; slot: CalendarItem['slot']; plan_id: string; label: string; format?: string }

export type CalendarView = CalendarItem & { title: string; status: string; has_script: boolean; has_media: boolean; handle: string; upload_state: 'uploading' | 'incomplete' | null; waiting_on_cap: boolean }

export function getCalendar(from: string, to: string): CalendarView[] {
  const db = readDb()
  const content = new Map(db.content.map(c => [c.id, c]))
  const acct = new Map((db.brand_accounts ?? []).map(a => [a.id, a]))
  const waiting = new Set((db.handoffs ?? []).filter(h => h.status === 'open' && h.to === 'cap').map(h => h.content_id))
  return (db.calendar_items ?? []).filter(i => i.date >= from && i.date <= to).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || a.id.localeCompare(b.id)).map(i => {
    const c = content.get(i.content_id)
    return { ...i, title: c?.title ?? '(content record missing)', status: c?.status ?? 'missing', has_script: !!c?.script, has_media: !!(c?.media_url || c?.media_urls?.length), handle: i.account_id ? (acct.get(i.account_id)?.handle || i.account_id) : '', upload_state: effectiveUpload(c?.upload)?.state ?? null, waiting_on_cap: waiting.has(i.content_id) }
  })
}

// Take an item off the calendar. Only the calendar entry goes; the content card stays in Content Day.
export function removeCalendarItem(id: string): boolean {
  const db = readDb()
  const before = (db.calendar_items ?? []).length
  db.calendar_items = (db.calendar_items ?? []).filter(i => i.id !== id)
  if (db.calendar_items.length === before) return false
  writeDb(db); return true
}

// Mandi drags an item to another day (and optionally an hour). Only the calendar item moves;
// the content record it points at is untouched, so Content Day still shows the same card.
export function moveCalendarItem(id: string, date: string, time: string | null = null): CalendarItem | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  const db = readDb()
  const it = (db.calendar_items ?? []).find(i => i.id === id); if (!it) return null
  it.date = date; it.time = time
  writeDb(db); return it
}

/** Cap moves a post (capacity trim). It keeps counting for the week it came from, so a refill never re-adds it. */
export function bumpCalendarItem(id: string, date: string): CalendarItem | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const db = readDb()
  const it = (db.calendar_items ?? []).find(i => i.id === id); if (!it) return null
  it.bumped_from ??= it.date
  it.date = date; it.time = null
  writeDb(db); return it
}

export function generateCalendar(from = todayStr(), days = 14): { created: number; reused: number; moved: number; dropped: string[]; held: string[]; window: [string, string] } {
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
  // Already-there check is per WEEK (Mon–Sun), not per exact day: when a busy day pushes a post
  // to the next day, or Mandi drags it, a re-fill still recognizes it and never adds it twice.
  const weekOf = (d: string) => { const ms = toMs(d); const dow = (new Date(ms).getUTCDay() + 6) % 7; return addDays(d, -dow) }
  const keyOf = (x: { plan_id: string; account_id: string | null; slot: string; date: string }) => `${x.plan_id}|${x.account_id ?? ''}|${x.slot}|${weekOf(x.date)}`
  const have: Record<string, number> = {}
  // A5: a post Cap bumped still counts for the week it came from, so the refill never re-adds it there.
  const countAs = (i: CalendarItem) => ({ ...i, date: i.bumped_from ?? i.date })
  for (const i of existing) { const c = countAs(i); if (c.date >= from && c.date <= to) have[keyOf(c)] = (have[keyOf(c)] ?? 0) + 1 }
  // A5: in a week Mandi gave her hours for, new FILMED slots only go on while filming still fits.
  // Protected formats always go on. What doesn't fit is held (nothing is made, so nothing is lost).
  const contentById = new Map(db0.content.map(c => [c.id, c]))
  const filmLeft: Record<string, number | null> = {}
  const budgetFor = (ws: string) => {
    if (!(ws in filmLeft)) {
      const b = filmBudget(ws)
      filmLeft[ws] = b === null ? null : b - existing.filter(i => weekOf(i.date) === ws).reduce((m, i) => { const c = contentById.get(i.content_id); return m + (c && needsFilming(c) ? filmMinutes(c) : 0) }, 0)
    }
    return filmLeft[ws]
  }
  const held: string[] = []
  const wantedBy: Record<string, number> = {}
  for (const n of placed) wantedBy[keyOf(n)] = (wantedBy[keyOf(n)] ?? 0) + 1
  const out: CalendarItem[] = []
  let created = 0, reused = 0
  for (const n of placed) {
    const k = keyOf(n)
    if ((have[k] ?? 0) >= wantedBy[k]) continue
    const fm = n.slot === 'post' && n.format && !isProtectedFormat(n.account_id, n.format) ? formatMinutes(n.format) : 0
    if (fm) {
      const ws = weekOf(n.date), left = budgetFor(ws)
      if (left !== null && left < fm) { held.push(`${n.label} (${n.date}): filming doesn't fit your hours that week`); continue }
      if (left !== null) filmLeft[ws] = left - fm
    }
    have[k] = (have[k] ?? 0) + 1
    let card: ContentPiece | undefined
    const qf = n.slot === 'post' ? quoteFormatFor(n.format) : null
    if (n.slot === 'post') {
      const open = readDb().content.filter(c => c.account_id === n.account_id && (c.status === 'idea' || c.status === 'in_progress') && !usedContent.has(c.id) && !c.scheduled_at)
      // A7: a quote slot takes a ready quote card first (her ideas from Notes she approved); other slots leave those for quote slots.
      const fresh = qf ? (open.find(c => c.quote?.text && c.quote_format === qf) ?? open.find(c => c.quote?.text && c.quote_format !== 'film') ?? open.find(c => !c.quote)) : (open.find(c => !c.quote || c.quote_format === 'film') ?? open[0])
      if (fresh) { card = fresh; reused++ }
    }
    if (!card) {
      card = createContent({
        title: n.label, status: n.slot === 'post' ? 'idea' : 'in_progress',
        type: n.slot === 'reset' ? 'workshop' : n.slot === 'podcast' ? 'podcast' : 'post',
        account_id: n.account_id, river_source: 'cap-plan',
        notes: `Planned by Cap for ${n.date} (${n.plan_id}). ${n.format ? `Format: ${n.format}. ` : ''}Script and captions get written on this same record.`,
        ...(qf ? { quote_format: qf, type: qf === 'carousel' ? 'carousel' as const : qf === 'still' ? 'image' as const : 'video' as const } : {}),
      })
      created++
    }
    usedContent.add(card.id)
    out.push({ id: '', date: n.date, branch_id: n.branch, account_id: n.account_id, content_id: card.id, plan_id: n.plan_id, slot: n.slot, time: n.slot === 'reset' ? '20:00' : null, created_at: '' })
  }
  const db = readDb()
  db.calendar_items ??= []; db.next_calendar_id ??= 1
  const now = new Date().toISOString()
  for (const o of out) db.calendar_items.push({ ...o, id: `cal_${db.next_calendar_id++}`, created_at: now })
  writeDb(db)
  // New slots get a real title, a hook, Cap's job pick and what to film (Ed, one at a time, in the background).
  const fresh = out.map(o => o.content_id)
  // A7: a quote slot gets its quote first (Ed: her words from Notes or the Well, else written in her voice, labeled).
  if (fresh.length) void Promise.all([import('./cardAudit'), import('./quotes')]).then(async ([m, q]) => {
    for (const id of fresh) {
      const c = readDb().content.find(x => x.id === id)
      if (c?.quote_format && c.quote_format !== 'film' && !c.quote?.text) await q.fillQuoteCard(id, c.quote_format).catch(() => null)
      await m.fillCardBasics(id).catch(() => null)
      // The whole post up front: captions (with the one call to action) and, for a video, its song.
      await (await import('./cap')).prewriteCard(id).catch(() => null)
    }
  }).catch(() => null)
  if (held.length) logActivity({ type: 'plan', title: `Cap held ${held.length} filmed slot${held.length === 1 ? '' : 's'} to fit your hours`, detail: held.join('; '), icon: '🗓️', source: 'cap' })
  return { created, reused, moved, dropped, held, window: [from, to] }
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
