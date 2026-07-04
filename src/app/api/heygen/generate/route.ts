import { NextRequest, NextResponse } from 'next/server'
import { getAllAvatars } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { script, avatarId } = await req.json() as { script: string; avatarId: string }

  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'HEYGEN_API_KEY not set' }, { status: 500 })

  // Read from the DB — that's where the in-station avatar editor saves photo/voice IDs
  const avatar = getAllAvatars().find(a => a.id === avatarId)
  if (!avatar) return NextResponse.json({ error: 'Unknown avatar' }, { status: 400 })

  // Use avatar-specific photo ID, fall back to default
  const photoId = avatar.heygen_photo_id || process.env.HEYGEN_PHOTO_DEFAULT
  if (!photoId) return NextResponse.json({ error: `No HeyGen photo ID configured for ${avatar.name}` }, { status: 400 })

  // HeyGen v2 wants type 'text' + a HeyGen voice_id (linked ElevenLabs voices get one).
  // Prefer the avatar's heygen_voice_id; fall back to any stored voice id.
  const voiceId = avatar.heygen_voice_id || avatar.elevenlabs_voice_id || process.env.HEYGEN_VOICE_DEFAULT

  const body = {
    video_inputs: [{
      character: {
        type: 'talking_photo',
        talking_photo_id: photoId,
      },
      voice: { type: 'text', input_text: script, ...(voiceId ? { voice_id: voiceId } : {}) },
      background: { type: 'color', value: '#FBFAF7' },
    }],
    dimension: { width: 1080, height: 1920 },
    caption: true,
    title: `${avatar.name} — ${new Date().toISOString().slice(0, 10)}`,
  }

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  const videoId = data?.data?.video_id

  if (!videoId) {
    return NextResponse.json({ error: 'HeyGen did not return a video ID', raw: data }, { status: 500 })
  }

  return NextResponse.json({ videoId, avatarId, avatarName: avatar.name })
}
