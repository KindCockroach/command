import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?google_error=${error}`)
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?google_error=no_code`)

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/google/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })

  const tokens = await tokenRes.json()
  if (!tokenRes.ok) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?google_error=token_failed`)

  // Store tokens — redirect with them in a cookie
  const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?google_connected=true`)
  res.cookies.set('google_access_token', tokens.access_token, { httpOnly: true, secure: true, maxAge: 3600, path: '/' })
  if (tokens.refresh_token) {
    res.cookies.set('google_refresh_token', tokens.refresh_token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 365, path: '/' })
  }
  return res
}
