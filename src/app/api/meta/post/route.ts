import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('meta_access_token')?.value
  if (!accessToken) return NextResponse.json({ error: 'Not connected to Meta. Visit /api/meta/auth first.' }, { status: 401 })

  const { caption, imageUrl, instagramAccountId, pageId } = await req.json()

  try {
    // Instagram post
    if (instagramAccountId) {
      let mediaId: string

      if (imageUrl) {
        const containerRes = await fetch(`https://graph.facebook.com/v19.0/${instagramAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
        })
        const container = await containerRes.json()
        mediaId = container.id
      } else {
        // Text/reel — needs video_url for reels
        return NextResponse.json({ error: 'imageUrl required for Instagram posts' }, { status: 400 })
      }

      const publishRes = await fetch(`https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: mediaId, access_token: accessToken }),
      })
      const published = await publishRes.json()
      return NextResponse.json({ platform: 'instagram', postId: published.id })
    }

    // Facebook Page post
    if (pageId) {
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: caption, link: imageUrl, access_token: accessToken }),
      })
      const data = await res.json()
      return NextResponse.json({ platform: 'facebook', postId: data.id })
    }

    return NextResponse.json({ error: 'instagramAccountId or pageId required' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Meta post error' }, { status: 500 })
  }
}
