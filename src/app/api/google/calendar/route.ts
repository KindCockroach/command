import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('google_access_token')?.value
  if (!accessToken) return NextResponse.json({ error: 'Not connected to Google. Visit /api/google/auth first.' }, { status: 401 })

  const { title, description, dateTime } = await req.json()
  if (!title || !dateTime) return NextResponse.json({ error: 'title and dateTime required' }, { status: 400 })

  try {
    const eventUrl = await createCalendarEvent(title, description ?? '', dateTime, accessToken)
    return NextResponse.json({ url: eventUrl })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Calendar error' }, { status: 500 })
  }
}
