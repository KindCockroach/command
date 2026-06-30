import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?meta_error=${error}`)
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?meta_error=no_code`)

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/meta/callback`

  // Exchange code for short-lived token
  const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`)
  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?meta_error=token_failed`)
  }

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`)
  const longData = await longRes.json()
  const finalToken = longData.access_token ?? tokenData.access_token

  const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?meta_connected=true`)
  res.cookies.set('meta_access_token', finalToken, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 60, path: '/' })
  return res
}
