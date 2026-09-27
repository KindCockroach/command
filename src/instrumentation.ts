// Self-scheduled background jobs. Railway runs one long-lived `next start` process, so
// timers set on startup fire reliably with NO external cron and nothing for Mandi to
// set up. No-op in dev and on the edge runtime. A deploy/restart recomputes next runs.
//   • DAILY DRAFT   — ~11:30 UTC ≈ 6:30 AM Central: her recent notes → ready-to-approve posts.
//   • WEEKLY TRENDS — Monday ~13:00 UTC ≈ ~7–8 AM Central: live-web trend check-in → Notes + Activity.

let scheduled = false

const ping = async (path: string) => {
  try {
    const port = process.env.PORT || '3000'
    const key = process.env.CRON_SECRET ? `?key=${encodeURIComponent(process.env.CRON_SECRET)}` : ''
    await fetch(`http://127.0.0.1:${port}${path}${key}`)
  } catch { /* best-effort — it'll try again next cycle */ }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production') return
  if (scheduled) return
  scheduled = true

  const runDaily = () => {
    const now = new Date()
    const next = new Date(now)
    next.setUTCHours(11, 30, 0, 0)
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
    setTimeout(async () => { await ping('/api/cron/draft-from-notes'); runDaily() }, next.getTime() - now.getTime())
  }

  // Weekly: next Monday at 13:00 UTC. Cheap (one pass a week) — keeps spend down.
  const runWeekly = () => {
    const now = new Date()
    const next = new Date(now)
    next.setUTCHours(13, 0, 0, 0)
    // advance to the next Monday (getUTCDay: 0=Sun … 1=Mon)
    const daysUntilMon = ((1 - next.getUTCDay()) + 7) % 7
    next.setUTCDate(next.getUTCDate() + daysUntilMon)
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7)
    setTimeout(async () => { await ping('/api/cron/trend-checkin'); runWeekly() }, next.getTime() - now.getTime())
  }

  runDaily()
  runWeekly()
}
