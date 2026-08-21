import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount } from '@/lib/db'

export const dynamic = 'force-dynamic'

const GHL_BASE = 'https://services.leadconnectorhq.com'

// ── PUBLISH KILL SWITCH ──────────────────────────────────────────────────────
// Was paused 2026-08-08 during account-restriction cleanup; RESUMED now that the
// Room30 triggers are gone and positioning is cleaned up. Auto-publish is LIVE by
// default — approvals push to GHL and schedule into the 5/day slots. To pause
// again (e.g. a new restriction scare), set GHL_AUTOPUBLISH_PAUSED=true in Railway.
const AUTO_PUBLISH_PAUSED = process.env.GHL_AUTOPUBLISH_PAUSED === 'true'

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

  if (AUTO_PUBLISH_PAUSED) {
    // Kill switch on: queue the approval, push nothing to any social account.
    const updated = updateContent(piece.id, { status: 'approved' })
    return NextResponse.json({ configured, paused: true, queued: true, content: updated, note: 'Publishing is paused (account cleanup). Approved and queued — it will schedule once publishing is resumed.' })
  }

  if (!configured) {
    // No key yet: mark approved so it's queued and ready the moment GHL is connected
    const updated = updateContent(piece.id, { status: 'approved' })
    return NextResponse.json({ configured: false, queued: true, content: updated })
  }

  try {
    // Resolve target accounts: explicit request > the account's SAVED GHL mapping
    // (reliable, set via "Connect to GHL") > fuzzy name-match fallback.
    const stationAcct0 = piece.account_id ? getBrandAccount(piece.account_id) : null
    let targetIds: string[] = accountIds ?? stationAcct0?.ghl_account_ids ?? []
    if (!targetIds.length) {
      const { accounts } = await fetchGhlAccounts(token!, locationId!)
      const stationAcct = stationAcct0
      const handle = stationAcct?.handle?.replace('@', '').toLowerCase()
      const platform = stationAcct?.platform?.toLowerCase()
      const matches = accounts.filter(a => {
        const name = `${a.name ?? ''} ${a.username ?? ''}`.toLowerCase()
        const plat = `${a.platform ?? a.type ?? ''}`.toLowerCase()
        if (handle && name.includes(handle)) return true
        if (platform && plat.includes(platform) && !handle) return true
        return false
      })
      // Only post to the GHL account(s) that match THIS piece's account — never
      // fall back to blasting every connected account.
      targetIds = matches.map(a => a.id ?? a._id ?? a.oauthId ?? '').filter(Boolean)
    }
    if (!targetIds.length) {
      const updated = updateContent(piece.id, { status: 'approved' })
      return NextResponse.json({ configured: true, queued: true, content: updated, note: 'Approved. No matching connected account in GHL Social Planner for this post — connect/name it in GHL, then re-approve to auto-schedule.' })
    }

    const { userId } = await fetchGhlUserId(token!, locationId!)
    // Body is now post-ready (caption + hashtags inline); only append the hashtags field if the body lacks them
    const summary = (piece.description ?? '').includes('#') ? (piece.description ?? '') : [piece.description, piece.hashtags].filter(Boolean).join('\n\n')
    // GHL categorizes each media item by its MIME type (it does `type.includes('image'|'video')`),
    // so a media object WITHOUT `type` makes their API throw "Cannot read properties of undefined
    // (reading 'includes')". Always send an explicit type derived from the URL extension.
    const mediaType = (url: string): string => (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ? 'video/mp4' : 'image/jpeg')
    // Send the WHOLE carousel, in order. media_urls holds every slide; media_url is
    // only the primary/first one. Using media_url alone posted just slide 1 to GHL
    // even when 6 images were attached — send them all, deduped, order preserved.
    const carousel = (piece.media_urls && piece.media_urls.length)
      ? piece.media_urls
      : (piece.media_url ? [piece.media_url] : [])
    const mediaItems = Array.from(new Set(carousel.filter(Boolean))).map(url => ({ url, type: mediaType(url) }))
    // Auto-schedule into the next open 5/day slot unless an explicit time was passed
    const effectiveSchedule = scheduleAt || (autoSchedule ? nextScheduleSlot(piece.account_id) : null)
    const res = await fetch(`${GHL_BASE}/social-media-posting/${locationId}/posts`, {
      method: 'POST',
      headers: ghlHeaders(token!),
      body: JSON.stringify({
        accountIds: targetIds,
        ...(userId ? { userId } : {}),
        summary,
        media: mediaItems,
        status: effectiveSchedule ? 'scheduled' : 'draft',
        scheduleDate: effectiveSchedule ?? undefined,
        type: 'post',
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      // GHL rejected it — but the approval still stands so it isn't lost.
      const updated = updateContent(piece.id, { status: 'approved' })
      return NextResponse.json({ configured: true, queued: true, content: updated, note: `Approved — but GHL didn't accept the post: ${data?.message ?? 'rejected'}. Fix it in GHL, then re-approve to schedule.`, detail: data })
    }
    // GHL wraps the created post id under different keys across API versions — probe the known shapes
    const ghlPostId = data?.post?.id ?? data?.post?._id ?? data?.post?.postId ?? data?.id ?? data?._id ?? data?.postId ?? data?.results?.id ?? data?.results?._id ?? data?.results?.post?.id ?? data?.results?.post?._id ?? data?.data?.id ?? data?.data?._id ?? data?.data?.post?.id ?? data?.data?.post?._id ?? null
    const updated = updateContent(piece.id, {
      status: 'scheduled',
      ghl_post_id: ghlPostId,
      scheduled_at: effectiveSchedule ?? null,
    })
    // If we couldn't capture an id, GHL's shape changed — surface its keys so we can
    // fix the probe, and flag that we can't verify it went live.
    const idNote = ghlPostId ? undefined : `Pushed to GHL, but couldn't read the post id (can't verify it's live). GHL returned keys: ${Object.keys(data || {}).join(', ')}${data?.post ? ` · post.{${Object.keys(data.post).join(',')}}` : ''}`
    return NextResponse.json({ configured: true, scheduled: true, scheduledAt: effectiveSchedule, ghl_post_id: ghlPostId, mediaCount: mediaItems.length, note: idNote, raw: ghlPostId ? undefined : data, content: updated })
  } catch (e) {
    // Network/GHL error — keep the approval so it isn't silently lost.
    const updated = updateContent(piece.id, { status: 'approved' })
    return NextResponse.json({ configured: true, queued: true, content: updated, note: `Approved — GHL push failed (${e instanceof Error ? e.message : 'unknown'}). Re-approve once GHL is sorted.` })
  }
}
