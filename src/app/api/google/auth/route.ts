import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/calendar',
].join(' ')

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not set' }, { status: 503 })

  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/google/callback`

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('hd', 'aimomeducation.com')

  return NextResponse.redirect(url.toString())
}
