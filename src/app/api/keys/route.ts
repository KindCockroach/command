import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Returns which keys are configured — NEVER the actual values
export async function GET() {
  const e = process.env
  return NextResponse.json({
    openai:              { configured: !!e.OPENAI_API_KEY && !e.OPENAI_API_KEY.includes('your-key'), label: 'OpenAI (GPT-4o + Responses API)' },
    elevenlabs:          { configured: !!e.ELEVENLABS_API_KEY && !e.ELEVENLABS_API_KEY.includes('your-'), label: 'ElevenLabs (Mandi at Kitchen Table Clone)' },
    elevenlabs_voice:    { configured: !!e.ELEVENLABS_VOICE_ID && !e.ELEVENLABS_VOICE_ID.includes('your_'), label: 'ElevenLabs Voice ID' },
    heygen:              { configured: !!e.HEYGEN_API_KEY && !e.HEYGEN_API_KEY.includes('your-'), label: 'HeyGen (Talking Photo / Avatar Videos)' },
    heygen_photo:        { configured: !!e.HEYGEN_PHOTO_DEFAULT, label: 'HeyGen Default Talking Photo' },
    higgsfield_id:       { configured: !!e.HIGGSFIELD_API_KEY_ID, label: 'Higgsfield API Key ID' },
    higgsfield_secret:   { configured: !!e.HIGGSFIELD_API_KEY_SECRET, label: 'Higgsfield API Key Secret' },
    mem0:                { configured: !!e.MEM0_API_KEY, label: 'mem0 (Persistent AI Memory)' },
  })
}
