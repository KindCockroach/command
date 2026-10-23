import { NextRequest, NextResponse } from 'next/server'
import { getResetSession, saveResetSession, upcomingReset } from '@/lib/resetSession'

// Backend for the bethereforher.com/reset date. Private: not listed in the
// middleware's public paths, so it sits behind STATION_KEY like the rest of the station.
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ stored: getResetSession(), showing: upcomingReset() })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const allowed = ['date', 'time', 'price', 'label', 'checkout_url', 'repeat_weekly'] as const
  const updates: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) updates[k] = body[k]
  try {
    const stored = saveResetSession(updates)
    return NextResponse.json({ stored, showing: upcomingReset() })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
