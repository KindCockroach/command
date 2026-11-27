import { NextRequest, NextResponse } from 'next/server'
import { POST as scout } from '../../trends/audio/route'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Phase 8 · A8: the trending-audio scout on the Monday timer (instrumentation.ts), so Cap has
// fresh sounds WITH a source and a date to call "trending". One web search a week.
// Trigger: /api/cron/trend-audio?key=YOUR_CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && new URL(req.url).searchParams.get('key') !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return scout(new NextRequest(req.url, { method: 'POST' }))
}
