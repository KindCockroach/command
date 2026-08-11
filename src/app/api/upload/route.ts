import { NextRequest, NextResponse } from 'next/server'
import { putObject, putObjectStream, getUploadUrl, getPublicUrl, isR2Configured, mediaKey } from '@/lib/r2'
import { Readable } from 'stream'
import sharp from 'sharp'

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
        const jpg = await sharp(buf).jpeg({ quality: 88 }).toBuffer()
        const key = mediaKey(folder, file.name.replace(/\.(heic|heif)$/i, ''), 'jpg')
        const ok = await putObject(key, jpg, 'image/jpeg')
        if (!ok) return NextResponse.json({ error: 'Upload to storage failed' }, { status: 500 })
        return NextResponse.json({ publicUrl: getPublicUrl(key), key, converted: 'heic→jpg' })
      }
      // STREAM everything else (big podcast episodes) straight to R2 — buffering the
      // whole file in memory OOMs the container and returns a 500.
      const key = mediaKey(folder, file.name, ext)
      const nodeStream = Readable.fromWeb(file.stream() as unknown as import('stream/web').ReadableStream)
      const ok = await putObjectStream(key, nodeStream, file.size, file.type || 'application/octet-stream')
      if (!ok) return NextResponse.json({ error: 'Upload to storage failed' }, { status: 500 })
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
