import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = 'https://api.elevenlabs.io/v1'

export async function POST(req: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key || key === 'your-elevenlabs-api-key') {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set in .env.local' }, { status: 503 })
  }

  const { action, text, voice_id, stability, similarity_boost } = await req.json()
  const voiceId = voice_id ?? process.env.ELEVENLABS_VOICE_ID

  if (action === 'synthesize') {
    const res = await fetch(`${BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: stability ?? 0.5, similarity_boost: similarity_boost ?? 0.75 },
      }),
    })
    const audio = await res.arrayBuffer()
    return new NextResponse(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Disposition': 'attachment; filename="ai-mom-audio.mp3"' } })
  }

  if (action === 'list_voices') {
    const res = await fetch(`${BASE}/voices`, { headers: { 'xi-api-key': key } })
    return NextResponse.json(await res.json())
  }

  if (action === 'get_history') {
    const res = await fetch(`${BASE}/history`, { headers: { 'xi-api-key': key } })
    return NextResponse.json(await res.json())
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
