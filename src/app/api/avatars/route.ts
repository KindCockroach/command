import { NextRequest, NextResponse } from 'next/server'
import { getAllAvatars, upsertAvatar, deleteAvatar } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getAllAvatars())
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  // Wire an avatar (default: AI Mom Mandi) from the station's env credentials —
  // server-side, so the raw HeyGen photo + ElevenLabs voice IDs never leave here.
  if (data.action === 'wire_defaults') {
    const id = data.id || 'mandi'
    const patch: { id: string; heygen_photo_id?: string; elevenlabs_voice_id?: string } = { id }
    if (process.env.HEYGEN_PHOTO_DEFAULT) patch.heygen_photo_id = process.env.HEYGEN_PHOTO_DEFAULT
    if (process.env.ELEVENLABS_VOICE_ID) patch.elevenlabs_voice_id = process.env.ELEVENLABS_VOICE_ID
    const av = upsertAvatar(patch)
    return NextResponse.json({ wired: true, id, heygen_photo_set: !!av.heygen_photo_id, elevenlabs_voice_set: !!av.elevenlabs_voice_id })
  }
  if (!data.id || !data.name) return NextResponse.json({ error: 'id and name required' }, { status: 400 })
  return NextResponse.json(upsertAvatar(data))
}

export async function PATCH(req: NextRequest) {
  const data = await req.json()
  if (!data.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json(upsertAvatar(data))
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const ok = deleteAvatar(id)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 })
}
