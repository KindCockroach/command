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

// First user in the location — GHL requires a userId on created posts
async function fetchGhlUserId(token: string, locationId: string): Promise<string | null> {
  try {
    const res = await fetch(`${GHL_BASE}/users/?locationId=${locationId}`, { headers: ghlHeaders(token) })
    if (!res.ok) return null
    const data = await res.json()
    const users = data?.users ?? data?.results ?? []
    return users[0]?.id ?? null
  } catch { return null }
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
    const userId = await fetchGhlUserId(token!, locationId!)
    return NextResponse.json({ configured: true, path, userId, accounts, raw: accounts.length ? undefined : raw })
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
  const { contentId, scheduleAt, accountIds } = await req.json()
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

    const userId = await fetchGhlUserId(token!, locationId!)
    const summary = [piece.description, piece.hashtags].filter(Boolean).join('\n\n')
    const res = await fetch(`${GHL_BASE}/social-media-posting/${locationId}/posts`, {
      method: 'POST',
      headers: ghlHeaders(token!),
      body: JSON.stringify({
        accountIds: targetIds,
        ...(userId ? { userId } : {}),
        summary,
        media: piece.media_url ? [{ url: piece.media_url }] : [],
        status: scheduleAt ? 'scheduled' : 'draft',
        scheduleDate: scheduleAt ?? undefined,
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
      scheduled_at: scheduleAt ?? null,
    })
    return NextResponse.json({ configured: true, scheduled: true, ghl_post_id: ghlPostId, content: updated })
  } catch (e) {
    return NextResponse.json({ error: `GHL request failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
  }
}
