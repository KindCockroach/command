import { NextRequest, NextResponse } from 'next/server'
import { sendGmail } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('google_access_token')?.value
  if (!accessToken) return NextResponse.json({ error: 'Not connected to Google. Visit /api/google/auth first.' }, { status: 401 })

  const { to, subject, body } = await req.json()
  if (!to || !subject || !body) return NextResponse.json({ error: 'to, subject, and body required' }, { status: 400 })

  try {
    await sendGmail(to, subject, body, accessToken)
    return NextResponse.json({ sent: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gmail error' }, { status: 500 })
  }
}
