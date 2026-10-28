import { getAllGoals, getAllContent, type Goal } from '@/lib/db'

// GOAL PROGRESS — the one place a goal's scoreboard is computed, so the Goals tab and
// every brain that reads goals (Commander chat, daily orders, River, Podcast) see the
// SAME numbers. Posts are the lever (what RISE can draft); signups are the score (what
// actually moved). Signups = GHL contacts carrying the goal's tag + a manual count for
// seats that live outside GHL (the Reset sells on Luma).

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

const GHL_BASE = 'https://services.leadconnectorhq.com'

type GhlContact = { tags?: string[]; dateAdded?: string }

// Monday 00:00 of the week containing d.
function weekStartOf(d: Date): Date {
  const w = new Date(d); w.setHours(0, 0, 0, 0)
  w.setDate(w.getDate() - ((w.getDay() + 6) % 7))
  return w
}

// Tag counts are cached briefly — the Goals tab, Commander and River can all ask
// within the same minute and GHL rate-limits.
const tagCache = new Map<string, { at: number; result: { count: number } | { error: string } }>()

async function ghlTagCount(tag: string, sinceMs: number): Promise<{ count: number } | { error: string }> {
  const key = `${tag.toLowerCase()}|${sinceMs}`
  const hit = tagCache.get(key)
  if (hit && Date.now() - hit.at < 10 * 60000) return hit.result

  const token = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!token || !locationId) return { error: 'GHL not connected' }
  const headers = { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' }
  const want = tag.toLowerCase()
  const matches = (c: GhlContact) =>
    (c.tags ?? []).some(t => t.toLowerCase() === want) &&
    !!c.dateAdded && new Date(c.dateAdded).getTime() >= sinceMs

  let result: { count: number } | { error: string }
  try {
    // Preferred: the search endpoint filtered by tag, newest first.
    let count = 0
    let ok = true
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`${GHL_BASE}/contacts/search`, {
        method: 'POST', headers,
        body: JSON.stringify({
          locationId, page, pageLimit: 100,
          filters: [{ field: 'tags', operator: 'contains', value: tag }],
          sort: [{ field: 'dateAdded', direction: 'desc' }],
        }),
      })
      if (!res.ok) { ok = false; break }
      const data = await res.json() as { contacts?: GhlContact[] }
      const list = data.contacts ?? []
      count += list.filter(matches).length
      const oldest = list[list.length - 1]?.dateAdded
      if (list.length < 100 || (oldest && new Date(oldest).getTime() < sinceMs)) break
    }
    if (ok) {
      result = { count }
    } else {
      // Fallback: page through recent contacts and match the tag ourselves.
      count = 0
      let url = `${GHL_BASE}/contacts/?locationId=${locationId}&limit=100`
      for (let i = 0; i < 10 && url; i++) {
        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'GHL token needs contacts.readonly' : `GHL error ${res.status}`)
        const data = await res.json() as { contacts?: GhlContact[]; meta?: { startAfter?: number; startAfterId?: string } }
        const list = data.contacts ?? []
        count += list.filter(matches).length
        const oldest = list.reduce((m, c) => Math.min(m, c.dateAdded ? new Date(c.dateAdded).getTime() : m), Infinity)
        if (list.length < 100 || oldest < sinceMs || !data.meta?.startAfterId) break
        url = `${GHL_BASE}/contacts/?locationId=${locationId}&limit=100&startAfter=${data.meta.startAfter}&startAfterId=${data.meta.startAfterId}`
      }
      result = { count }
    }
  } catch (e) {
    result = { error: e instanceof Error ? e.message : 'GHL fetch failed' }
  }
  tagCache.set(key, { at: Date.now(), result })
  return result
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
    let signupError: string | undefined
    const since = weekStartOf(new Date(g.created_at))
    if (tracksSignups) {
      signups = Number(g.signups_manual) || 0
      if (g.signup_tag) {
        const r = await ghlTagCount(g.signup_tag, since.getTime())
        if ('count' in r) signups += r.count
        else signupError = r.error
      }
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
      ...(signupError ? { signupError } : {}),
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
    parts.push(`signups ${g.signups}${g.signup_target ? `/${g.signup_target}` : ''} since ${g.signupsSince}${g.signup_tag ? ` (GHL tag ${g.signup_tag}${g.signups_manual ? ` + ${g.signups_manual} manual` : ''})` : ' (manual count)'}${g.signupsBehind ? ' ⚠ BEHIND' : ''}${g.signupError ? ` [count unavailable: ${g.signupError}]` : ''}`)
  }
  if (g.deadline) parts.push(`deadline ${g.deadline}`)
  return parts.join(' · ') + (g.notes?.trim() ? `\n  notes: ${g.notes.trim().slice(0, 400)}` : '')
}

export async function goalContext(): Promise<string> {
  const goals = await getGoalProgress({ activeOnly: true })
  return goals.map(goalContextLine).join('\n')
}
