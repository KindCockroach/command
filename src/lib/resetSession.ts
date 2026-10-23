import fs from 'fs'
import path from 'path'

// The Be There For Her live Reset — the one session the bethereforher.com/reset page
// sells. Kept in its own small JSON file next to db.json (same Railway volume), so
// the date can change weekly from /bethereforher/reset/edit without a redeploy.
//
// Times are entered and shown in Central (Austin). `date` + `time` are the wall-clock
// values; everything else is derived.

export const RESET_TZ = 'America/Chicago'

export type ResetSession = {
  date: string            // YYYY-MM-DD, Central
  time: string            // HH:MM 24h, Central
  price: number           // dollars
  label: string           // e.g. "The Inaugural Reset"
  checkout_url: string
  repeat_weekly: boolean  // once a session ends, roll the page forward 7 days on its own
  updated_at: string
}

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'db.json')
const FILE = path.join(path.dirname(DB_PATH), 'reset-session.json')

const DEFAULT_CHECKOUT =
  process.env.NEXT_PUBLIC_BTHF_RESET_CHECKOUT ||
  process.env.NEXT_PUBLIC_RESET_CHECKOUT_URL ||
  'https://link.fastpaydirect.com/payment-link/6a67ba88a655fa0b802a6707'

const DEFAULTS: ResetSession = {
  date: '2026-11-08',
  time: '20:00',
  price: 33,
  label: 'The Inaugural Reset',
  checkout_url: DEFAULT_CHECKOUT,
  repeat_weekly: true,
  updated_at: new Date(0).toISOString(),
}

export function getResetSession(): ResetSession {
  try {
    if (fs.existsSync(FILE)) {
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf-8')) }
    }
  } catch {
    // unreadable file → fall back to defaults rather than breaking the page
  }
  return { ...DEFAULTS }
}

export function saveResetSession(updates: Partial<ResetSession>): ResetSession {
  const next: ResetSession = { ...getResetSession(), ...updates, updated_at: new Date().toISOString() }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date)) throw new Error('date must be YYYY-MM-DD')
  if (!/^\d{2}:\d{2}$/.test(next.time)) throw new Error('time must be HH:MM')
  next.price = Number(next.price)
  if (!Number.isFinite(next.price) || next.price < 0) throw new Error('price must be a number')
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2))
  return next
}

// --- time helpers (Central wall clock ⇄ real instant) ---

// Offset in minutes of RESET_TZ from UTC at a given instant (e.g. -360 for CST).
function tzOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESET_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at)
  const g = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'))
  return Math.round((asUtc - at.getTime()) / 60000)
}

// The real instant for a Central wall-clock date + time (handles CST/CDT).
export function centralToInstant(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const off = tzOffsetMinutes(new Date(guess))
  return new Date(guess - off * 60000)
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

export type UpcomingReset = ResetSession & {
  starts_at: string       // ISO instant
  is_rolled: boolean      // true when the page has rolled past the stored session on its own
  display_label: string
}

// The session the page should show right now. If the stored one is over (an hour
// after start) and repeat_weekly is on, show the next week's — same weekday, same time.
export function upcomingReset(now = new Date()): UpcomingReset {
  const s = getResetSession()
  let date = s.date
  let rolled = false
  if (s.repeat_weekly) {
    let guard = 0
    while (centralToInstant(date, s.time).getTime() + 60 * 60000 < now.getTime() && guard++ < 520) {
      date = addDays(date, 7)
      rolled = true
    }
  }
  return {
    ...s,
    date,
    starts_at: centralToInstant(date, s.time).toISOString(),
    is_rolled: rolled,
    // "Inaugural" only belongs to the first one.
    display_label: rolled ? s.label.replace(/\binaugural\s*/i, '').trim() || 'The Reset' : s.label,
  }
}
