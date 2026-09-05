// Self-scheduled daily draft. Railway runs one long-lived `next start` process, so a
// timer set on startup fires reliably every day with NO external cron and nothing for
// Mandi to set up. It pings the draft-from-notes endpoint (loopback), which turns her
// recent notes into ready-to-approve posts. No-op in dev and on the edge runtime.
//
// ~11:30 UTC ≈ 6:30 AM Central (drifts by an hour across CST/CDT — fine for a daily
// draft). A deploy/restart just recomputes the next run on boot.

let scheduled = false

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
    const ms = next.getTime() - now.getTime()
    setTimeout(async () => {
      try {
        const port = process.env.PORT || '3000'
        const key = process.env.CRON_SECRET ? `?key=${encodeURIComponent(process.env.CRON_SECRET)}` : ''
        await fetch(`http://127.0.0.1:${port}/api/cron/draft-from-notes${key}`)
      } catch { /* best-effort — try again tomorrow */ }
      runDaily()
    }, ms)
  }

  runDaily()
}
