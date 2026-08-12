import { NextRequest, NextResponse } from 'next/server'
import { putObject, getUploadUrl, getPublicUrl, isR2Configured, mediaKey } from '@/lib/r2'
import { Readable } from 'stream'
import sharp from 'sharp'
import { spawn } from 'child_process'
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args); let err = ''
    p.stderr.on('data', d => { err += String(d) })
    p.on('error', reject)
    p.on('close', c => (c === 0 ? resolve() : reject(new Error(err.slice(-200)))))
  })
}

// HEIC → JPEG. sharp's prebuilt lacks the HEIC decoder, so try sharp then ffmpeg.
async function heicToJpeg(buf: Buffer): Promise<Buffer | null> {
  try { return await sharp(buf).jpeg({ quality: 88 }).toBuffer() } catch { /* try ffmpeg */ }
  const dir = await mkdtemp(path.join(tmpdir(), 'heic-'))
  try {
    const inP = path.join(dir, 'in.heic'), outP = path.join(dir, 'out.jpg')
    await writeFile(inP, buf)
    await run('ffmpeg', ['-y', '-i', inP, outP])
    return await readFile(outP)
  } catch { return null } finally { await rm(dir, { recursive: true, force: true }).catch(() => {}) }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Upload a file THROUGH the server (same-origin, no browser→R2 CORS).
// Accepts multipart/form-data with a `file` field (and optional `folder`).
// Falls back to returning a presigned URL for JSON callers (legacy).
export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 not configured yet' }, { status: 503 })
  }

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    const folder = (form.get('folder') as string) || 'uploads'
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file field required' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase()
    try {
      // iPhone HEIC/HEIF isn't viewable by browsers OR by Claude's vision API
      // (400: "file format is invalid or unsupported"). Convert to JPEG on the way in.
      if (ext === 'heic' || ext === 'heif' || (file.type || '').includes('heic') || (file.type || '').includes('heif')) {
        const buf = Buffer.from(await file.arrayBuffer())
        const jpg = await heicToJpeg(buf)
        if (!jpg) {
          return NextResponse.json({ error: 'iPhone HEIC photos can\'t be read by the AI. On your iPhone: Settings → Camera → Formats → "Most Compatible" (saves photos as JPEG). Or share/export this one as JPEG, then re-drop it.' }, { status: 415 })
        }
        const key = mediaKey(folder, file.name.replace(/\.(heic|heif)$/i, ''), 'jpg')
        const ok = await putObject(key, jpg, 'image/jpeg')
        if (!ok) return NextResponse.json({ error: 'Upload to storage failed' }, { status: 500 })
        return NextResponse.json({ publicUrl: getPublicUrl(key), key, converted: 'heic→jpg' })
      }
      // Everything else (big podcast episodes, .MOV clips): PIPE the file through
      // the server to R2 via a presigned PUT. The S3 SDK re-buffers the whole body
      // to sign it (OOM → 500 on big files); a presigned PUT carries its own auth,
      // so we can stream the body straight through with near-zero memory.
      const key = mediaKey(folder, file.name, ext)
      const ct = file.type || 'application/octet-stream'
      const putUrl = await getUploadUrl(key, ct)
      if (!putUrl) return NextResponse.json({ error: 'Could not prepare storage upload' }, { status: 503 })
      const put = await fetch(putUrl, {
        method: 'PUT',
        headers: { 'Content-Type': ct, 'Content-Length': String(file.size) },
        body: Readable.fromWeb(file.stream() as unknown as import('stream/web').ReadableStream) as unknown as BodyInit,
        // @ts-expect-error Node fetch needs duplex for a streaming request body
        duplex: 'half',
      })
      if (!put.ok) return NextResponse.json({ error: `Upload to storage failed (${put.status})` }, { status: 502 })
      return NextResponse.json({ publicUrl: getPublicUrl(key), key })
    } catch (e) {
      return NextResponse.json({ error: `Upload failed: ${e instanceof Error ? e.message : 'storage error'}` }, { status: 502 })
    }
  }

  // Legacy JSON path: presigned direct-to-R2 URL (kept for any old callers)
  const { filename, contentType: ct, folder = 'uploads' } = await req.json()
  if (!filename || !ct) {
    return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 })
  }
  const ext = filename.split('.').pop() ?? 'bin'
  const key = mediaKey(folder, filename, ext)
  const uploadUrl = await getUploadUrl(key, ct)
  if (!uploadUrl) return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  return NextResponse.json({ uploadUrl, publicUrl: getPublicUrl(key), key })
}
