// Phase 8 · A4: Her's capacity estimate. No model call, just a minutes table.
// From the open work this week (unfilmed cards on Cap's calendar × filming minutes, approvals
// waiting, admin), Her says "this week needs about X hours filming, Y approvals, Z admin; where
// can you fit it?". Mandi's answer is stored as this week's capacity. If it's short, Her hands
// off to Cap, and Cap moves the overflow to next week (Mandi's call, Nov 25: Cap's weekly moves
// auto-apply and show as receipts; a bumped post is rescheduled, never dropped).
import { readDb, writeDb, backupDb, type ContentPiece } from './db'
import { needsFilming } from './shootList'
import { getPlanConfig, bumpCalendarItem } from './plan'
import { getApprovals } from './approvals'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'
import type { Handoff } from './db'
import { isProtectedFormat } from './protectedFormats'

// Filming minutes per card, by what it is. Simple and editable here; no AI.
export const FILM_MINUTES = {
  talking_head: 15, role_play: 25, multi_scene: 30,   // video shoot formats (Content Day)
  video: 20, podcast: 90, workshop: 60,
  image: 5, carousel: 5, post: 5, other: 15,
} as const
export const APPROVAL_MINUTES = 3        // a look and a yes, per item waiting in Approve
export const ADMIN_BASE_MINUTES = 30     // the week's small stuff
export const RESET_WEEK_MINUTES = 60     // a Reset Sunday this week: prep + hosting admin
export const ASK_MINUTES = 5             // per open thing an agent handed to Mandi

const DAY = 86400000
const todayCT = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)
/** Monday of the week `d` is in (weeks run Monday–Sunday). */
export function weekStart(d = todayCT()): string {
  const dow = new Date(d + 'T00:00:00Z').getUTCDay()   // 0 = Sunday
  return addDays(d, -((dow + 6) % 7))
}

export function filmMinutes(c: ContentPiece): number {
  if (c.type === 'video' && c.shoot_format) return FILM_MINUTES[c.shoot_format]
  return FILM_MINUTES[c.type as keyof typeof FILM_MINUTES] ?? FILM_MINUTES.other
}

type Item = { calendar_id: string; content_id: number; title: string; date: string; minutes: number; branch: string; slot: string; account_id: string | null }

export type CapacityEstimate = {
  week_start: string; week_end: string
  film: { minutes: number; cards: number; items: Item[] }
  approvals: { minutes: number; count: number }
  admin: { minutes: number; reset_week: boolean; asks: number }
  total_minutes: number
  hours: { film: number; approvals: number; admin: number; total: number }
  answer: { hours: number; saved_at: string; short_by_minutes: number; handoff_id?: string | null } | null
  question: string
}

const toHours = (m: number) => Math.round((m / 60) * 2) / 2   // to the half hour
// Say it in minutes under an hour, else in half hours.
const fmtM = (m: number) => m <= 0 ? 'no time' : m < 60 ? `about ${Math.max(5, Math.round(m / 5) * 5)} minutes` : (h => `about ${h % 1 ? h : h.toFixed(0)} hour${h === 1 ? '' : 's'}`)(toHours(m))

export function estimateWeek(today = todayCT()): CapacityEstimate {
  const db = readDb()
  const start = weekStart(today), end = addDays(start, 6)
  const content = new Map(db.content.map(c => [c.id, c]))
  const seen = new Set<number>()
  const items: Item[] = []
  for (const i of (db.calendar_items ?? []).filter(x => x.date >= today && x.date <= end).sort((a, b) => a.date.localeCompare(b.date))) {
    const c = content.get(i.content_id)
    if (!c || seen.has(c.id) || !needsFilming(c)) continue
    seen.add(c.id)
    items.push({ calendar_id: i.id, content_id: c.id, title: c.title, date: i.date, minutes: filmMinutes(c), branch: i.branch_id, slot: i.slot, account_id: i.account_id })
  }
  const filmMin = items.reduce((s, x) => s + x.minutes, 0)

  let approvals = 0
  try { approvals = getApprovals().total } catch { /* Approve unreadable: count none */ }
  const approvalsMin = approvals * APPROVAL_MINUTES

  const cfg = getPlanConfig()
  const resetWeek = !!cfg.reset_anchor && Array.from({ length: 7 }, (_, k) => addDays(start, k))
    .some(d => Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(cfg.reset_anchor + 'T00:00:00Z')) / DAY) % 14 === 0)
  const asks = (db.handoffs ?? []).filter(h => h.status === 'open' && h.to === 'mandi').length
  const adminMin = ADMIN_BASE_MINUTES + (resetWeek ? RESET_WEEK_MINUTES : 0) + asks * ASK_MINUTES

  const total = filmMin + approvalsMin + adminMin
  const hours = { film: toHours(filmMin), approvals: toHours(approvalsMin), admin: toHours(adminMin), total: toHours(total) }
  const saved = db.week_capacity?.week_start === start ? db.week_capacity : null
  const question = `This week needs ${fmtM(filmMin)} of filming (${items.length} card${items.length === 1 ? '' : 's'}), ${approvals} approval${approvals === 1 ? '' : 's'} (${fmtM(approvalsMin)}) and ${fmtM(adminMin)} of admin${resetWeek ? ', with a Reset this week' : ''}. That’s ${fmtM(total)} in all. Where can you fit it? How many hours can you really give it?`
  return {
    week_start: start, week_end: end,
    film: { minutes: filmMin, cards: items.length, items },
    approvals: { minutes: approvalsMin, count: approvals },
    admin: { minutes: adminMin, reset_week: resetWeek, asks },
    total_minutes: total, hours,
    answer: saved ? { hours: saved.hours, saved_at: saved.saved_at, short_by_minutes: Math.max(0, total - Math.round(saved.hours * 60)), handoff_id: saved.handoff_id ?? null } : null,
    question,
  }
}

/** Mandi answers: store this week's capacity. If short, hand off to Cap to move the overflow. */
export function saveCapacity(hours: number): { estimate: CapacityEstimate; handoff: Handoff | null } {
  const est = estimateWeek()
  const db = readDb()
  db.week_capacity = { week_start: est.week_start, hours, saved_at: new Date().toISOString(), needed_minutes: est.total_minutes, handoff_id: null }
  writeDb(db)
  const short = est.total_minutes - Math.round(hours * 60)
  let h: Handoff | null = null
  if (short > 0 && est.film.items.length) {
    h = openHandoff({ kind: 'capacity_trim', from: 'her', to: 'cap',
      what: `Mandi has ${hours} h this week; the week needs ${toHours(est.total_minutes)} h. Move about ${toHours(short)} h of filming to next week.`,
      note: JSON.stringify({ week_start: est.week_start, hours }) })
    const d = readDb()
    if (d.week_capacity) { d.week_capacity.handoff_id = h.id; writeDb(d) }
  }
  return { estimate: estimateWeek(), handoff: h }
}

// Cap's side (no model call): move the latest-dated unfilmed cards to the same weekday next week
// until filming fits. AI Mom/WFH goes first, Joyful Media last (Joyful first is the tie rule).
// Reset and podcast slots never move. Nothing is dropped; every move is in the receipt.
export async function runCapacityTrim(h: Handoff): Promise<void> {
  startAttempt(h.id)
  const db = readDb()
  const cap = db.week_capacity
  const est = estimateWeek()
  if (!cap || cap.week_start !== est.week_start) { completeHandoff(h.id, 'cap', 'Nothing to move: this was for a week that is over.'); return }
  let over = est.total_minutes - Math.round(cap.hours * 60)
  if (over <= 0) { completeHandoff(h.id, 'cap', 'Nothing to move: the week fits your hours now.'); return }
  const db0 = readDb()
  const fmtOf = (id: number) => (db0.content.find(c => c.id === id)?.notes ?? '').match(/Format: ([^.]+)\./)?.[1]
  const movable = est.film.items.filter(i => i.slot === 'post' && !isProtectedFormat(i.account_id, fmtOf(i.content_id)))
    .sort((a, b) => (a.branch === 'joyful_media' ? 1 : 0) - (b.branch === 'joyful_media' ? 1 : 0) || b.date.localeCompare(a.date))
  if (!movable.length) { failHandoff(h.id, 'Only Reset, podcast and protected-format slots are left this week, and those don’t move. Mandi decides what gives.'); return }
  backupDb('capacity-trim')
  const moved: string[] = []
  for (const i of movable) {
    if (over <= 0) break
    const to = addDays(i.date, 7)
    if (bumpCalendarItem(i.calendar_id, to)) { moved.push(`“${i.title}” ${i.date} → ${to}`); over -= i.minutes }
  }
  const left = over >= 15 ? ` Still ${fmtM(over)} over; what’s left is Reset/podcast work, approvals and admin, which I don’t move. Mandi decides what gives.` : ''
  completeHandoff(h.id, 'cap', `Moved ${moved.length} card${moved.length === 1 ? '' : 's'} to next week so filming fits your ${cap.hours} h: ${moved.join('; ')}.${left}`,
    moved.length ? [{ type: 'card', id: movable[0].content_id, label: 'calendar' }] : [])
}

// ── Phase 8 · A5: what the plan uses ─────────────────────────────────────────────
/** Filming minutes for one post of a plan format ("talking head", "carousel (quotes…)"). 0 = no filming. */
export function formatMinutes(format: string): number {
  const f = format.toLowerCase()
  if (/carousel|quote|still|image|article|newsletter|post\b|episode clip|audiogram/.test(f)) return 0
  if (/role[- ]?play|character|inner[- ]child|skit/.test(f)) return FILM_MINUTES.role_play
  if (/long[- ]form video|youtube/.test(f)) return FILM_MINUTES.multi_scene
  if (/meditation/.test(f)) return FILM_MINUTES.video          // recorded, not on camera, still her time
  if (/b[- ]?roll/.test(f)) return FILM_MINUTES.image           // a quick clip of footage
  if (/talking head|reel|short|video/.test(f)) return FILM_MINUTES.talking_head
  return 0
}

/** Minutes Mandi has for FILMING in the week starting `ws`, from the hours she saved for it
 *  (her hours minus this week's approvals and admin). null = she hasn't said, so the plan uses its old counts. */
export function filmBudget(ws: string): number | null {
  const cap = readDb().week_capacity
  if (!cap || cap.week_start !== ws) return null
  const est = estimateWeek(ws)
  return Math.max(0, Math.round(cap.hours * 60) - est.approvals.minutes - est.admin.minutes)
}

/** The latest hours she gave (any week), for sizing a new month's drafts. */
export function latestHours(): number | null { return readDb().week_capacity?.hours ?? null }
