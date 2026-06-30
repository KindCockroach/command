import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  if (!appId) return NextResponse.json({ error: 'META_APP_ID not set' }, { status: 503 })

  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/meta/callback`

  const scopes = [
    'pages_manage_posts',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'pages_show_list',
    'business_management',
  ].join(',')

  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', scopes)
  url.searchParams.set('response_type', 'code')

  return NextResponse.redirect(url.toString())
}
