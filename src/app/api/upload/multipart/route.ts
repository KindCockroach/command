import { NextRequest, NextResponse } from 'next/server'
import { createMultipart, uploadPart, completeMultipart, abortMultipart, getPublicUrl, isR2Configured, mediaKey, type PartTag } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Chunked (multipart) upload — the reliable path for files bigger than the server's
// body limit (a 137MB meditation, a 4GB video). Flow, all same-origin (no CORS):
//   1. POST JSON { action:'create', filename, contentType, folder } → { key, uploadId, publicUrl }
//   2. POST each part as a RAW body with headers x-mp-key / x-mp-upload-id / x-mp-part=<n>
//      → { partNumber, etag }.  Parts are ~50MB so the server never buffers more
//         than one part, and each request stays under the proxy body limit.
//   3. POST JSON { action:'complete', key, uploadId, parts:[{PartNumber,ETag}] } → { publicUrl }
//   ( POST JSON { action:'abort', key, uploadId } to clean up a failed upload. )
export async function POST(req: NextRequest) {
  if (!isR2Configured()) return NextResponse.json({ error: 'R2 not configured yet' }, { status: 503 })

  const contentType = req.headers.get('content-type') ?? ''

  // ── Part upload: raw bytes, addressed by headers ──────────────────────────────
  const partKey = req.headers.get('x-mp-key')
  const partUploadId = req.headers.get('x-mp-upload-id')
  const partNumberRaw = req.headers.get('x-mp-part')
  if (partKey && partUploadId && partNumberRaw) {
    const partNumber = Number(partNumberRaw)
    if (!Number.isInteger(partNumber) || partNumber < 1) {
      return NextResponse.json({ error: 'x-mp-part must be a positive integer' }, { status: 400 })
    }
    try {
      const bytes = Buffer.from(await req.arrayBuffer())
      if (!bytes.length) return NextResponse.json({ error: 'empty part' }, { status: 400 })
      const etag = await uploadPart(partKey, partUploadId, partNumber, bytes)
      if (!etag) return NextResponse.json({ error: 'R2 rejected the part' }, { status: 502 })
      return NextResponse.json({ partNumber, etag })
    } catch (e) {
      return NextResponse.json({ error: `part ${partNumber} failed: ${e instanceof Error ? e.message : 'upload error'}` }, { status: 500 })
    }
  }

  // ── Control actions (create / complete / abort) as JSON ──────────────────────
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'Send JSON {action} or a raw part with x-mp-* headers' }, { status: 400 })
  }
  const body = await req.json().catch(() => ({}))
  const action = body.action as string

  if (action === 'create') {
    const { filename, contentType: ct, folder = 'uploads' } = body
    if (!filename || !ct) return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 })
    const ext = String(filename).split('.').pop() ?? 'bin'
    const key = mediaKey(folder, filename, ext)
    try {
      const uploadId = await createMultipart(key, ct)
      if (!uploadId) return NextResponse.json({ error: 'Could not start the upload (R2 create failed)' }, { status: 502 })
      return NextResponse.json({ key, uploadId, publicUrl: getPublicUrl(key) })
    } catch (e) {
      return NextResponse.json({ error: `create failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
    }
  }

  if (action === 'complete') {
    const { key, uploadId, parts } = body as { key: string; uploadId: string; parts: PartTag[] }
    if (!key || !uploadId || !Array.isArray(parts) || !parts.length) {
      return NextResponse.json({ error: 'key, uploadId and parts[] required' }, { status: 400 })
    }
    try {
      const ok = await completeMultipart(key, uploadId, parts)
      if (!ok) return NextResponse.json({ error: 'R2 could not assemble the parts' }, { status: 502 })
      return NextResponse.json({ publicUrl: getPublicUrl(key), key })
    } catch (e) {
      // Best-effort cleanup so a failed stitch doesn't leave a dangling upload.
      await abortMultipart(key, uploadId)
      return NextResponse.json({ error: `complete failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
    }
  }

  if (action === 'abort') {
    const { key, uploadId } = body as { key: string; uploadId: string }
    if (key && uploadId) await abortMultipart(key, uploadId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: `unknown action "${action}"` }, { status: 400 })
}
