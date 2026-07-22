import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { putObject, getPublicUrl, isR2Configured } from '@/lib/r2'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { mkdtemp, writeFile, rm, stat, readdir } from 'fs/promises'
import { createReadStream } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const LIMIT = 25 * 1024 * 1024 // Whisper's per-file cap

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args)
    let err = ''
    p.stderr.on('data', d => { err += String(d) })
    p.on('error', reject)
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.slice(-300)}`))))
  })
}

async function hasFfmpeg(): Promise<boolean> {
  try { await run('ffmpeg', ['-version']); return true } catch { return false }
}

async function transcribeFile(filePath: string): Promise<string> {
  const t = await client.audio.transcriptions.create({ model: 'whisper-1', file: createReadStream(filePath) })
  return t.text
}

// Drop an audio file → store it in Media AND transcribe it (Whisper).
// Oversized files are auto-compressed to speech-quality mono (and split into
// chunks if still too big), so the raw Riverside export just works.
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Send multipart/form-data with a "file" field' }, { status: 400 })
  }
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file field required' }, { status: 400 })

  const bytes = Buffer.from(await file.arrayBuffer())

  // Store the original permanently (best-effort)
  let publicUrl = ''
  if (isR2Configured()) {
    try {
      const ext = (file.name.split('.').pop() ?? 'mp3').toLowerCase()
      const key = `audio/${randomUUID()}.${ext}`
      if (await putObject(key, bytes, file.type || 'audio/mpeg')) publicUrl = getPublicUrl(key)
    } catch { /* storage best-effort */ }
  }

  // Small enough → send straight to Whisper (no processing needed)
  if (bytes.length <= LIMIT) {
    try {
      const transcription = await client.audio.transcriptions.create({ model: 'whisper-1', file })
      return NextResponse.json({ publicUrl, transcript: transcription.text })
    } catch (e) {
      return NextResponse.json({ publicUrl, transcript: null, error: `Transcription failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
    }
  }

  // Oversized → compress (and chunk if needed) with ffmpeg
  if (!(await hasFfmpeg())) {
    return NextResponse.json({
      publicUrl,
      transcript: null,
      error: `File is ${(bytes.length / 1048576).toFixed(0)}MB — over Whisper's 25MB limit and audio compression isn't available on the server yet. Saved to Media; export a compressed MP3 (64kbps mono) and drop it again.`,
    })
  }

  let dir = ''
  try {
    dir = await mkdtemp(path.join(tmpdir(), 'rise-audio-'))
    const inPath = path.join(dir, `in.${(file.name.split('.').pop() ?? 'wav').toLowerCase()}`)
    await writeFile(inPath, bytes)

    // 48kbps mono MP3: ~21MB per hour of audio — inaudible loss for speech.
    const compPath = path.join(dir, 'compressed.mp3')
    await run('ffmpeg', ['-y', '-i', inPath, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', compPath])
    const compSize = (await stat(compPath)).size

    let transcript: string
    if (compSize <= LIMIT) {
      transcript = await transcribeFile(compPath)
    } else {
      // Very long episode: split into ~50-min chunks (well under 25MB at 48kbps), stitch transcripts
      await run('ffmpeg', ['-y', '-i', compPath, '-f', 'segment', '-segment_time', '3000', '-c', 'copy', path.join(dir, 'chunk_%03d.mp3')])
      const chunks = (await readdir(dir)).filter(f => f.startsWith('chunk_')).sort()
      const parts: string[] = []
      for (const c of chunks) parts.push(await transcribeFile(path.join(dir, c)))
      transcript = parts.join('\n\n')
    }
    return NextResponse.json({ publicUrl, transcript, compressed: true })
  } catch (e) {
    return NextResponse.json({ publicUrl, transcript: null, error: `Transcription failed while compressing: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
