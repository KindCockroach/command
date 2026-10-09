import { NextRequest, NextResponse } from 'next/server'
import { getInbox, setInbox, logActivity } from '@/lib/db'
import type { InboxItem } from '@/lib/db'

export const dynamic = 'force-dynamic'

// INBOX BRIEF store. GET serves the latest triage to the morning Brief. POST stores a
// fresh triage — pushed by the daily Gmail scan (RISE stands between her and the pile,
// surfacing only what actually needs her). If CRON_SECRET is set, POST requires ?key=.
export async function GET() {
  return NextResponse.json({ inbox: getInbox() })
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && new URL(req.url).searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const items: InboxItem[] = Array.isArray(body.items)
    ? body.items.filter((i: unknown): i is InboxItem => !!i && typeof (i as InboxItem).text === 'string')
        .slice(0, 5)
        .map((i: InboxItem) => ({ icon: i.icon, text: i.text, view_url: i.view_url }))
    : []
  const brief = setInbox({
    items,
    checked_at: new Date().toISOString(),
    count_total: typeof body.count_total === 'number' ? body.count_total : undefined,
  })
  logActivity({ type: 'note', title: `Inbox triaged — ${items.length} need you`, detail: items.map(i => i.text).join(' · ').slice(0, 160) || 'nothing needed', icon: '📬', source: 'inbox' })
  return NextResponse.json({ ok: true, inbox: brief })
}
