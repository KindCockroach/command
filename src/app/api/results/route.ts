import { NextRequest, NextResponse } from 'next/server'
import { importResults, scoreResults, type ImportRow } from '@/lib/results'

export const dynamic = 'force-dynamic'

// Winner Loop results. GET ?account_id= → every imported reel, scored against
// its own account's typical reel (make_more / rehook / neutral / retire / reupload).
export async function GET(req: NextRequest) {
  const accountId = new URL(req.url).searchParams.get('account_id')
  return NextResponse.json(scoreResults(accountId))
}

// POST { account_id, platform?, rows: [{ media_id, views, reach, likes, comments,
// saves, shares, follows, pct_from_followers, fb_views, views_7d, onscreen_text,
// visual, posted_at }] } — upserts by media_id. Numbers may be "1.9K" or "--".
// Any tool can post here: the /winners page's CSV import, a Claude session that
// read Instagram's insights, or (later) the Meta insights pull.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const accountId = String(body?.account_id ?? '').trim()
  const rows = Array.isArray(body?.rows) ? (body.rows as ImportRow[]) : null
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })
  if (!rows) return NextResponse.json({ error: 'rows[] required' }, { status: 400 })
  const counts = importResults(accountId, rows, String(body?.platform || 'instagram'))
  return NextResponse.json({ ...counts, results: scoreResults(accountId) })
}
