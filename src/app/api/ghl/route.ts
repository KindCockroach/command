import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount } from '@/lib/db'

export const dynamic = 'force-dynamic'

const GHL_BASE = 'https://services.leadconnectorhq.com'

function ghlConfig() {
  const token = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  return { token, locationId, configured: !!token && !!locationId }
}

function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  }
}

type GhlSocialAccount = { id?: string; _id?: string; oauthId?: string; platform?: string; type?: string; name?: string; username?: string }

// Auto-schedule: 5 posting slots per day, per account, in America/Chicago (Central)
const SLOT_TIMES: Array<[number, number]> = [[7, 0], [10, 0], [12, 0], [16, 0], [19, 0]]

// Given a Chicago wall-clock time, return the correct UTC ISO (handles CST/CDT automatically)
function chicagoIso(y: number, moZero: number, d: number, hh: number, mm: number): string {
  const guess = Date.UTC(y, moZero, d, hh, mm)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess))
  const m: Record<string, string> = {}
  parts.forEach(p => { m[p.type] = p.value })
  const asChicago = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour === 24 ? 0 : +m.hour, +m.minute)
  return new Date(guess - (asChicago - guess)).toISOString()
}

// Next open 5/day slot for this account that isn't already taken and is in the future
function nextScheduleSlot(accountId: string | null | undefined): string {
  const taken = new Set(getAllContent().filter(c => c.account_id === accountId && c.scheduled_at).map(c => c.scheduled_at as string))
  const now = Date.now()
  for (let dOff = 0; dOff < 120; dOff++) {
    const day = new Date(now + dOff * 86400000)
    const cd: Record<string, string> = {}
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(day).forEach(p => { cd[p.type] = p.value })
    for (const [hh, mm] of SLOT_TIMES) {
      const iso = chicagoIso(+cd.year, +cd.month - 1, +cd.day, hh, mm)
      if (new Date(iso).getTime() <= now) continue
      if (taken.has(iso)) continue
      return iso
    }
  }
  return new Date(now + 3600000).toISOString()
}

// Connected Social Planner accounts — GHL has shuffled this path across versions, so try known variants
async function fetchGhlAccounts(token: string, locationId: string): Promise<{ accounts: GhlSocialAccount[]; raw: unknown; path: string }> {
  const paths = [
    `/social-media-posting/${locationId}/accounts`,
    `/social-media-posting/oauth/${locationId}/accounts`,
    `/social-media-posting/${locationId}/accounts/list`,
  ]
  for (const p of paths) {
    try {
      const res = await fetch(`${GHL_BASE}${p}`, { headers: ghlHeaders(token) })
      if (!res.ok) continue
      const data = await res.json()
      const list = data?.results?.accounts ?? data?.accounts ?? data?.results ?? (Array.isArray(data) ? data : [])
      return { accounts: Array.isArray(list) ? list : [], raw: data, path: p }
    } catch { /* try next */ }
  }
  return { accounts: [], raw: null, path: 'none' }
}

// First user in the location — GHL requires a userId on created posts.
// GHL_USER_ID env var wins if set; otherwise probe the users endpoints.
async function fetchGhlUserId(token: string, locationId: string): Promise<{ userId: string | null; debug: string }> {
  if (process.env.GHL_USER_ID) return { userId: process.env.GHL_USER_ID, debug: 'env' }
  const attempts = [`/users/?locationId=${locationId}`, `/users/search?locationId=${locationId}`]
  const debugParts: string[] = []
  for (const p of attempts) {
    try {
      const res = await fetch(`${GHL_BASE}${p}`, { headers: ghlHeaders(token) })
      const text = await res.text()
      debugParts.push(`${p} → ${res.status}: ${text.slice(0, 200)}`)
      if (!res.ok) continue
      const data = JSON.parse(text)
      const users = data?.users ?? data?.results ?? (Array.isArray(data) ? data : [])
      if (users[0]?.id) return { userId: users[0].id, debug: p }
    } catch (e) {
      debugParts.push(`${p} → threw ${e instanceof Error ? e.message : 'err'}`)
    }
  }
  return { userId: null, debug: debugParts.join(' || ') }
}

// GET: connection status + sync — checks GHL for posts that have gone live and archives them
// ?accounts=1 lists the social accounts connected in GHL's Social Planner
export async function GET(req: NextRequest) {
  const { token, locationId, configured } = ghlConfig()
  if (!configured) {
    return NextResponse.json({
      configured: false,
      message: 'GHL not connected yet. Add GHL_API_KEY (Private Integration token) and GHL_LOCATION_ID to environment variables.',
    })
  }

  const { searchParams } = new URL(req.url)
  if (searchParams.get('accounts')) {
    const { accounts, raw, path } = await fetchGhlAccounts(token!, locationId!)
    const { userId, debug } = await fetchGhlUserId(token!, locationId!)
    return NextResponse.json({ configured: true, path, userId, userDebug: userId ? undefined : debug, accounts, raw: accounts.length ? undefined : raw })
  }

  // Sync: find scheduled content and check if GHL published it
  const scheduled = getAllContent('scheduled').filter(c => c.ghl_post_id)
  const archived: number[] = []
  for (const piece of scheduled) {
    try {
      const res = await fetch(`${GHL_BASE}/social-media-posting/${locationId}/posts/${piece.ghl_post_id}`, {
        headers: ghlHeaders(token!),
      })
      if (!res.ok) continue
      const data = await res.json()
      const status = data?.post?.status ?? data?.status
      if (status === 'published' || status === 'posted') {
        updateContent(piece.id, { status: 'archived', published_at: new Date().toISOString() })
        archived.push(piece.id)
      }
    } catch { /* skip; try again next sync */ }
  }

  return NextResponse.json({ configured: true, synced: scheduled.length, archived })
}

// POST: push an approved content piece to the GHL social planner
export async function POST(req: NextRequest) {
  const { contentId, scheduleAt, accountIds, autoSchedule } = await req.json()
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const { token, locationId, configured } = ghlConfig()

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  if (!configured) {
    // No key yet: mark approved so it's queued and ready the moment GHL is connected
    const updated = updateContent(piece.id, { status: 'approved' })
    return NextResponse.json({ configured: false, queued: true, content: updated })
  }

  try {
    // Resolve target accounts: explicit > match station account handle/platform > all connected
    let targetIds: string[] = accountIds ?? []
    if (!targetIds.length) {
      const { accounts } = await fetchGhlAccounts(token!, locationId!)
      const stationAcct = piece.account_id ? getBrandAccount(piece.account_id) : null
      const handle = stationAcct?.handle?.replace('@', '').toLowerCase()
      const platform = stationAcct?.platform?.toLowerCase()
      const matches = accounts.filter(a => {
        const name = `${a.name ?? ''} ${a.username ?? ''}`.toLowerCase()
        const plat = `${a.platform ?? a.type ?? ''}`.toLowerCase()
        if (handle && name.includes(handle)) return true
        if (platform && plat.includes(platform) && !handle) return true
        return false
      })
      const pool = matches.length ? matches : accounts
      targetIds = pool.map(a => a.id ?? a._id ?? a.oauthId ?? '').filter(Boolean)
    }
    if (!targetIds.length) {
      const updated = updateContent(piece.id, { status: 'approved' })
      return NextResponse.json({ configured: true, queued: true, content: updated, note: 'No connected social accounts found in GHL Social Planner — post stays approved. Connect accounts in GHL and approve again.' })
    }

    const { userId } = await fetchGhlUserId(token!, locationId!)
    // Body is now post-ready (caption + hashtags inline); only append the hashtags field if the body lacks them
    const summary = (piece.description ?? '').includes('#') ? (piece.description ?? '') : [piece.description, piece.hashtags].filter(Boolean).join('\n\n')
    // Auto-schedule into the next open 5/day slot unless an explicit time was passed
    const effectiveSchedule = scheduleAt || (autoSchedule ? nextScheduleSlot(piece.account_id) : null)
    const res = await fetch(`${GHL_BASE}/social-media-posting/${locationId}/posts`, {
      method: 'POST',
      headers: ghlHeaders(token!),
      body: JSON.stringify({
        accountIds: targetIds,
        ...(userId ? { userId } : {}),
        summary,
        media: piece.media_url ? [{ url: piece.media_url }] : [],
        status: effectiveSchedule ? 'scheduled' : 'draft',
        scheduleDate: effectiveSchedule ?? undefined,
        type: 'post',
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data?.message ?? 'GHL rejected the post', detail: data }, { status: 502 })
    }
    const ghlPostId = data?.post?.id ?? data?.id ?? null
    const updated = updateContent(piece.id, {
      status: 'scheduled',
      ghl_post_id: ghlPostId,
      scheduled_at: effectiveSchedule ?? null,
    })
    return NextResponse.json({ configured: true, scheduled: true, scheduledAt: effectiveSchedule, ghl_post_id: ghlPostId, content: updated })
  } catch (e) {
    return NextResponse.json({ error: `GHL request failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
  }
}
