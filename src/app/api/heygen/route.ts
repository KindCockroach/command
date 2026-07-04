import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = 'https://api.heygen.com'

async function heygenFetch(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  const key = process.env.HEYGEN_API_KEY
  if (!key || key === 'your-heygen-api-key') {
    return NextResponse.json({ error: 'HEYGEN_API_KEY not set in .env.local' }, { status: 503 })
  }

  const { action, script, avatar_id, voice_id, title } = await req.json()

  if (action === 'generate_video') {
    const avatarId = avatar_id ?? process.env.HEYGEN_AVATAR_PREGNANT_MANDY
    const data = await heygenFetch('/v2/video/generate', {
      video_inputs: [{
        character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
        voice: voice_id ? { type: 'text', input_text: script, voice_id } : { type: 'text', input_text: script },
        background: { type: 'color', value: '#1C1F3B' },
      }],
      dimension: { width: 1080, height: 1920 }, // 9:16 for Reels/TikTok
      caption: true,
      title: title || 'AI Mom Content',
    })
    return NextResponse.json(data)
  }

  if (action === 'check_status') {
    const { video_id } = await req.json()
    const res = await fetch(`${BASE}/v1/video_status.get?video_id=${video_id}`, {
      headers: { 'X-Api-Key': key },
    })
    return NextResponse.json(await res.json())
  }

  if (action === 'list_avatars') {
    const res = await fetch(`${BASE}/v2/avatars`, { headers: { 'X-Api-Key': key } })
    return NextResponse.json(await res.json())
  }

  if (action === 'list_voices') {
    const res = await fetch(`${BASE}/v2/voices`, { headers: { 'X-Api-Key': key } })
    return NextResponse.json(await res.json())
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
