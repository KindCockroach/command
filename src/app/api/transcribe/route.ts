import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { putObject, getPublicUrl, isR2Configured, mediaKey } from '@/lib/r2'
import { spawn } from 'child_process'
import { mkdtemp, writeFile, rm, stat, readdir, readFile } from 'fs/promises'
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

// Compress an oversized file to speech-quality mono MP3, SAVE that compressed copy
// to Media (so there's always a downloadable smaller version), then transcribe
// (chunking if a very long episode is still over the cap).
async function compressAndTranscribe(bytes: Buffer, origName: string): Promise<{ transcript: string; compressedUrl: string }> {
  if (!(await hasFfmpeg())) throw new Error('ffmpeg-unavailable')
  const dir = await mkdtemp(path.join(tmpdir(), 'rise-audio-'))
  try {
    const inExt = (origName.split('.').pop() ?? 'wav').toLowerCase()
    const inPath = path.join(dir, `in.${inExt}`)
    await writeFile(inPath, bytes)

    // 128kbps mono MP3 — voice-grade quality good enough to reuse in HeyGen /
    // published video (not just transcription). ~57MB/hour vs a ~140MB/45min WAV.
    const compPath = path.join(dir, 'compressed.mp3')
    await run('ffmpeg', ['-y', '-i', inPath, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '128k', compPath])

    // Keep the compressed copy in Media — this is the "where do I get the compressed version" answer.
    let compressedUrl = ''
    if (isR2Configured()) {
      try {
        const base = origName.replace(/\.[^.]+$/, '') || 'episode'
        const key = mediaKey('audio', `${base}-compressed`, 'mp3')
        if (await putObject(key, await readFile(compPath), 'audio/mpeg')) compressedUrl = getPublicUrl(key)
      } catch { /* best-effort */ }
    }

    const compSize = (await stat(compPath)).size
    let transcript: string
    if (compSize <= LIMIT) {
      transcript = await transcribeFile(compPath)
    } else {
      // For transcription only: split into ~20-min chunks (~18MB at 128kbps, safely
      // under Whisper's 25MB), stitch the transcripts. The saved compressed.mp3 stays whole.
      await run('ffmpeg', ['-y', '-i', compPath, '-f', 'segment', '-segment_time', '1200', '-c', 'copy', path.join(dir, 'chunk_%03d.mp3')])
      const chunks = (await readdir(dir)).filter(f => f.startsWith('chunk_')).sort()
      const parts: string[] = []
      for (const c of chunks) parts.push(await transcribeFile(path.join(dir, c)))
      transcript = parts.join('\n\n')
    }
    return { transcript, compressedUrl }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

// Drop an audio file → store it in Media AND transcribe it (Whisper).
// Oversized files are auto-compressed (and the compressed MP3 is kept in Media).
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''

  // URL mode — transcribe an audio file already in Media (R2). JSON { audioUrl }.
  if (contentType.includes('application/json')) {
    const { audioUrl } = await req.json().catch(() => ({}))
    if (!audioUrl) return NextResponse.json({ error: 'audioUrl required' }, { status: 400 })
    try {
      const resp = await fetch(audioUrl)
      if (!resp.ok) return NextResponse.json({ error: `Could not fetch audio (${resp.status})` }, { status: 502 })
      const bytes = Buffer.from(await resp.arrayBuffer())
      const name = audioUrl.split('/').pop() || 'audio'
      if (bytes.length <= LIMIT) {
        const transcription = await transcribeFileFromBytes(bytes, name)
        return NextResponse.json({ transcript: transcription })
      }
      // Oversized → compress, keep the compressed copy, transcribe
      try {
        const { transcript, compressedUrl } = await compressAndTranscribe(bytes, name)
        return NextResponse.json({ transcript, compressedUrl, compressed: true })
      } catch (e) {
        const msg = e instanceof Error && e.message === 'ffmpeg-unavailable'
          ? `That file is ${(bytes.length / 1048576).toFixed(0)}MB — over Whisper's 25MB limit and compression isn't available on the server. Grab the transcript from Riverside instead.`
          : `Transcription failed: ${e instanceof Error ? e.message : 'unknown'}`
        return NextResponse.json({ error: msg }, { status: 413 })
      }
    } catch (e) {
      return NextResponse.json({ error: `Transcription failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
    }
  }

  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Send multipart/form-data with a "file" field, or JSON { audioUrl }' }, { status: 400 })
  }
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file field required' }, { status: 400 })

  const bytes = Buffer.from(await file.arrayBuffer())

  // Save the raw original only when we need to (small files, or a compression
  // fallback). Your master lives in Riverside, so we don't archive big WAVs here.
  let publicUrl = ''
  const saveOriginal = async () => {
    if (!isR2Configured() || publicUrl) return
    try {
      const ext = (file.name.split('.').pop() ?? 'mp3').toLowerCase()
      const key = mediaKey('audio', file.name, ext)
      if (await putObject(key, bytes, file.type || 'audio/mpeg')) publicUrl = getPublicUrl(key)
    } catch { /* storage best-effort */ }
  }

  // Small enough → keep it (it IS the copy, and it's small) and transcribe
  if (bytes.length <= LIMIT) {
    await saveOriginal()
    try {
      const transcription = await client.audio.transcriptions.create({ model: 'whisper-1', file })
      return NextResponse.json({ publicUrl, transcript: transcription.text })
    } catch (e) {
      return NextResponse.json({ publicUrl, transcript: null, error: `Transcription failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
    }
  }

  // Oversized → keep ONLY the compressed MP3 in Media (not the giant original)
  try {
    const { transcript, compressedUrl } = await compressAndTranscribe(bytes, file.name)
    return NextResponse.json({ compressedUrl, transcript, compressed: true })
  } catch (e) {
    // Compression failed → fall back to keeping the raw original so nothing is lost
    await saveOriginal()
    if (e instanceof Error && e.message === 'ffmpeg-unavailable') {
      return NextResponse.json({
        publicUrl,
        transcript: null,
        error: `File is ${(bytes.length / 1048576).toFixed(0)}MB — over Whisper's 25MB limit and compression isn't available on the server. Saved to Media; export a compressed MP3 (64kbps mono) and drop it again.`,
      })
    }
    return NextResponse.json({ publicUrl, transcript: null, error: `Transcription failed while compressing: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
  }
}

// Transcribe raw bytes that are already under the limit (used by the URL path).
async function transcribeFileFromBytes(bytes: Buffer, name: string): Promise<string> {
  const ext = name.split('.').pop()?.toLowerCase() || 'mp3'
  const mime = ext === 'm4a' ? 'audio/mp4' : ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg'
  const file = new File([bytes], name, { type: mime })
  const t = await client.audio.transcriptions.create({ model: 'whisper-1', file })
  return t.text
}
