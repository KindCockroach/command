import { NextRequest, NextResponse } from 'next/server'
import { putObject, getUploadUrl, getPublicUrl, isR2Configured, mediaKey } from '@/lib/r2'

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
    const key = mediaKey(folder, file.name, ext)
    const bytes = Buffer.from(await file.arrayBuffer())
    const ok = await putObject(key, bytes, file.type || 'application/octet-stream')
    if (!ok) return NextResponse.json({ error: 'Upload to storage failed' }, { status: 500 })
    return NextResponse.json({ publicUrl: getPublicUrl(key), key })
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
