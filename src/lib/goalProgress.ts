import { getAllGoals, getAllContent, type Goal } from '@/lib/db'

// GOAL PROGRESS — the one place a goal's scoreboard is computed, so the Goals tab and
// every brain that reads goals (Commander chat, daily orders, River, Podcast) see the
// SAME numbers. Posts are the lever (what RISE can draft); signups are the score (what
// actually moved). Signups = the goal's manual count (signups_manual). The old GoHighLevel
// tag count was removed; signup_tag stays on stored goals but is no longer read.

export type GoalProgress = Goal & {
  postedThisWeek: number
  scheduled: number
  queued: number
  expectedByToday: number
  behind: boolean
  deadlineSoon: boolean
  signups: number | null            // null = this goal doesn't track signups
  signupsExpectedByToday: number | null
  signupsBehind: boolean
  signupsSince: string | null       // YYYY-MM-DD the count starts from
  signupError?: string
}

// Monday 00:00 of the week containing d.
function weekStartOf(d: Date): Date {
  const w = new Date(d); w.setHours(0, 0, 0, 0)
  w.setDate(w.getDate() - ((w.getDay() + 6) % 7))
  return w
}

export async function getGoalProgress(opts?: { activeOnly?: boolean }): Promise<GoalProgress[]> {
  const goals = getAllGoals().filter(g => !opts?.activeOnly || g.active)
  const content = getAllContent()
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // 0 = Monday
  const weekStart = weekStartOf(now)

  return Promise.all(goals.map(async g => {
    const pool = g.account_id ? content.filter(c => c.account_id === g.account_id) : content
    const postedThisWeek = pool.filter(c =>
      (c.status === 'published' || c.status === 'archived') &&
      c.published_at && new Date(c.published_at) >= weekStart
    ).length
    const scheduled = pool.filter(c => c.status === 'scheduled' || c.status === 'approved').length
    const queued = pool.filter(c => ['idea', 'in_progress', 'ready', 'held'].includes(c.status)).length
    // Expected by end of today, pro-rated across the week
    const expectedByToday = Math.floor((g.target_per_week * (day + 1)) / 7)
    const behind = g.active && postedThisWeek + scheduled < expectedByToday
    const deadlineSoon = g.deadline ? (new Date(g.deadline).getTime() - now.getTime()) < 7 * 86400000 : false

    // Signups: counted from the Monday of the week the goal was made, through its deadline.
    const tracksSignups = !!(g.signup_tag || g.signup_target) || g.signups_manual != null
    let signups: number | null = null
    let signupsExpectedByToday: number | null = null
    const since = weekStartOf(new Date(g.created_at))
    if (tracksSignups) {
      signups = Number(g.signups_manual) || 0
      if (g.signup_target) {
        // Pace from the count's start to the deadline (or the end of that week).
        const end = g.deadline ? new Date(`${g.deadline}T23:59:59`) : new Date(since.getTime() + 7 * 86400000)
        const frac = Math.min(1, Math.max(0, (now.getTime() - since.getTime()) / Math.max(1, end.getTime() - since.getTime())))
        signupsExpectedByToday = Math.floor(g.signup_target * frac)
      }
    }
    const signupsBehind = g.active && signups !== null && signupsExpectedByToday !== null && signups < signupsExpectedByToday

    return {
      ...g, postedThisWeek, scheduled, queued, expectedByToday, behind, deadlineSoon,
      signups, signupsExpectedByToday, signupsBehind,
      signupsSince: tracksSignups ? since.toLocaleDateString('en-CA') : null,
    }
  }))
}

// One goal as a line the brains can read: id (so the Commander can update it), the
// title, both scoreboards, and the notes — the notes carry the CTA/link/angle.
export function goalContextLine(g: GoalProgress): string {
  const parts = [
    `- [goal id ${g.id}] "${g.title}"${g.account_id ? ` [account: ${g.account_id}]` : ' [station-wide]'}`,
    `posts ${g.postedThisWeek + g.scheduled}/${g.target_per_week} this week (published+scheduled)${g.behind ? ' ⚠ BEHIND' : ''}`,
  ]
  if (g.signups !== null) {
    parts.push(`signups ${g.signups}${g.signup_target ? `/${g.signup_target}` : ''} since ${g.signupsSince} (manual count)${g.signupsBehind ? ' ⚠ BEHIND' : ''}${g.signupError ? ` [count unavailable: ${g.signupError}]` : ''}`)
  }
  if (g.deadline) parts.push(`deadline ${g.deadline}`)
  return parts.join(' · ') + (g.notes?.trim() ? `\n  notes: ${g.notes.trim().slice(0, 400)}` : '')
}

export async function goalContext(): Promise<string> {
  const goals = await getGoalProgress({ activeOnly: true })
  return goals.map(goalContextLine).join('\n')
}
