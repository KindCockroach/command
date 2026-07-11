import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { putObject, getPublicUrl, isR2Configured } from '@/lib/r2'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Drop an audio file → store it in the Media library AND transcribe it (Whisper).
// Returns { publicUrl, transcript }. Files over Whisper's 25MB limit are stored
// but not transcribed (clear message back).
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Send multipart/form-data with a "file" field' }, { status: 400 })
  }
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file field required' }, { status: 400 })

  // Store the audio permanently (best-effort)
  let publicUrl = ''
  if (isR2Configured()) {
    try {
      const ext = (file.name.split('.').pop() ?? 'mp3').toLowerCase()
      const key = `audio/${randomUUID()}.${ext}`
      const ok = await putObject(key, Buffer.from(await file.arrayBuffer()), file.type || 'audio/mpeg')
      if (ok) publicUrl = getPublicUrl(key)
    } catch { /* storage best-effort */ }
  }

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({
      publicUrl,
      transcript: null,
      error: `File is ${(file.size / 1048576).toFixed(0)}MB — Whisper's limit is 25MB. The audio is saved to your Media library; export a compressed MP3 (64kbps mono is plenty for speech) and drop it again to transcribe.`,
    })
  }

  try {
    const transcription = await client.audio.transcriptions.create({ model: 'whisper-1', file })
    return NextResponse.json({ publicUrl, transcript: transcription.text })
  } catch (e) {
    return NextResponse.json({ publicUrl, transcript: null, error: `Transcription failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
  }
}
