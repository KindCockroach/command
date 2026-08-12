import { NextRequest, NextResponse } from 'next/server'
import { putObject, getUploadUrl, getPublicUrl, isR2Configured, mediaKey } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Upload a file to R2.
// - multipart/form-data { file, folder? } → stored through the server. Simple and
//   reliable for small files (photos, clips). BIG files (videos, episodes) should
//   use the JSON presigned path below and PUT straight to R2 — routing a big file
//   through the server buffers it and OOMs the container.
// - JSON { filename, contentType, folder? } → returns a presigned direct-to-R2 URL.
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
    try {
      const bytes = Buffer.from(await file.arrayBuffer())
      const ok = await putObject(key, bytes, file.type || 'application/octet-stream')
      if (!ok) return NextResponse.json({ error: 'Upload to storage failed' }, { status: 500 })
      return NextResponse.json({ publicUrl: getPublicUrl(key), key })
    } catch (e) {
      return NextResponse.json({ error: `Upload failed: ${e instanceof Error ? e.message : 'storage error'}` }, { status: 502 })
    }
  }

  // JSON path: presigned direct-to-R2 URL (used for big files — browser PUTs straight to R2)
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
