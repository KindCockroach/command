// One uploader for every dropped file, any size. Small files go straight through
// the server relay; big files (over the server's body limit) are sliced into parts
// and streamed into R2 via the multipart route — no bucket CORS, no OOM. This is
// what makes "drop any size audio/video and it just works" true.
//
// Why not the presigned direct-to-R2 PUT? The R2 token is object-scoped, so bucket
// CORS can't be set programmatically, and the browser blocks the cross-origin PUT
// ("Failed to fetch"). The chunked path is same-origin to our own server, so it
// always works. If CORS ever gets set on the bucket, we can re-add the fast PUT.

export type UploadProgress = { loaded: number; total: number; pct: number }

// Files at or under this go through the simple relay; bigger ones are chunked.
// Kept safely under the proxy body limit (next.config proxyClientMaxBodySize).
const RELAY_MAX = 80 * 1024 * 1024   // 80MB
const PART_SIZE = 48 * 1024 * 1024   // 48MB parts — comfortably under the 100MB proxy cap

type PartTag = { PartNumber: number; ETag: string }

async function relayUpload(file: File, folder: string, ct: string): Promise<string | null> {
  const up = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': ct, 'x-filename': file.name, 'x-folder': folder },
    body: file,
  })
  const d = await up.json().catch(() => ({}))
  return up.ok && d.publicUrl ? (d.publicUrl as string) : null
}

async function multipartUpload(file: File, folder: string, ct: string, onProgress?: (p: UploadProgress) => void): Promise<string> {
  // 1. start
  const cr = await fetch('/api/upload/multipart', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', filename: file.name, contentType: ct, folder }),
  })
  const crd = await cr.json().catch(() => ({}))
  if (!cr.ok || !crd.uploadId) throw new Error(crd.error || 'Could not start the upload')
  const { key, uploadId } = crd as { key: string; uploadId: string }

  const parts: PartTag[] = []
  const total = file.size
  let uploaded = 0
  try {
    const count = Math.ceil(total / PART_SIZE)
    for (let i = 0; i < count; i++) {
      const start = i * PART_SIZE
      const blob = file.slice(start, Math.min(start + PART_SIZE, total))
      const pr = await fetch('/api/upload/multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'x-mp-key': key, 'x-mp-upload-id': uploadId, 'x-mp-part': String(i + 1) },
        body: blob,
      })
      const prd = await pr.json().catch(() => ({}))
      if (!pr.ok || !prd.etag) throw new Error(prd.error || `part ${i + 1} of ${count} failed`)
      parts.push({ PartNumber: i + 1, ETag: prd.etag })
      uploaded += blob.size
      onProgress?.({ loaded: uploaded, total, pct: Math.round((uploaded / total) * 100) })
    }
    // 2. stitch
    const comp = await fetch('/api/upload/multipart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', key, uploadId, parts }),
    })
    const compd = await comp.json().catch(() => ({}))
    if (!comp.ok || !compd.publicUrl) throw new Error(compd.error || 'Could not finish the upload')
    return compd.publicUrl as string
  } catch (e) {
    // Clean up the dangling multipart upload; don't block on it.
    fetch('/api/upload/multipart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'abort', key, uploadId }),
    }).catch(() => {})
    throw e
  }
}

// Upload any file and get back its public URL. Reports progress for big files.
export async function uploadBig(file: File, folder: string, onProgress?: (p: UploadProgress) => void): Promise<{ publicUrl: string }> {
  const ct = file.type || 'application/octet-stream'

  if (file.size <= RELAY_MAX) {
    const url = await relayUpload(file, folder, ct)
    if (url) { onProgress?.({ loaded: file.size, total: file.size, pct: 100 }); return { publicUrl: url } }
    // relay hiccup on a smallish file → fall through to chunked, which is robust
  }

  const publicUrl = await multipartUpload(file, folder, ct, onProgress)
  return { publicUrl }
}

// Convenience: pick the media folder from a file's MIME type.
export function folderFor(file: File): string {
  return file.type.startsWith('video') ? 'videos'
    : file.type.startsWith('audio') ? 'audio'
    : file.type.startsWith('image') ? 'images' : 'files'
}
