import { NextRequest, NextResponse } from 'next/server'
import { getRecentActivity, logActivity } from '@/lib/db'

export const dynamic = 'force-dynamic'

// The station's activity feed (the spine). GET recent events; POST to log one.
// Logging is best-effort and must never break the caller — failures return ok:false.
export async function GET(req: NextRequest) {
  const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get('limit')) || 60))
  return NextResponse.json({ events: getRecentActivity(limit) })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.type || !b.title) return NextResponse.json({ ok: false, error: 'type and title required' }, { status: 400 })
  const ev = logActivity({
    type: String(b.type),
    title: String(b.title),
    detail: b.detail ? String(b.detail) : undefined,
    icon: b.icon ? String(b.icon) : undefined,
    source: b.source ? String(b.source) : undefined,
    account_id: b.account_id ?? null,
    content_id: typeof b.content_id === 'number' ? b.content_id : null,
    media_url: b.media_url ? String(b.media_url) : null,
  })
  return NextResponse.json({ ok: !!ev, event: ev })
}
