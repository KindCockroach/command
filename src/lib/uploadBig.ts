// THE one uploader for every file that enters RISE, any size. Every drop zone and
// file picker in the station calls this; there is no other upload code path.
//
// - Files up to 80MB go through the server relay (/api/upload, raw bytes).
// - Bigger files are sliced into ~48MB parts and streamed into R2 through
//   /api/upload/multipart (create → parts → complete). All same-origin, so the
//   bucket needs NO CORS rule, and the server never holds more than one part.
//
// Why not a presigned direct-to-R2 PUT? The bucket has no CORS rule (checked
// 2026-11-19: the R2 preflight answers 403 with no Allow-Origin) and the R2 token
// is object-scoped, so it can't add one. The chunked path doesn't need it.
//
// Trust rules (Phase 3):
// - Real progress: bytes are sent with XHR so the bar moves smoothly inside a part.
// - A failed part (or relay) retries by itself with backoff before giving up.
// - A multipart upload can RESUME: pass `resume` with its key + uploadId and the
//   parts R2 already holds are skipped.
// - Nothing is "done" until R2 confirms the object is complete.
// - A failed upload is aborted in R2 unless the caller keeps it for resuming
//   (keepOnFail). Kept ones are swept by the server after 24h.

export type UploadProgress = {
  loaded: number; total: number; pct: number
  part?: number; parts?: number          // multipart only
  retrying?: string | null               // e.g. "Part 3 hiccuped, trying again (2 of 4)…"
}
export type MultipartInfo = { key: string; uploadId: string; parts: number }
export type UploadOptions = {
  onProgress?: (p: UploadProgress) => void
  signal?: AbortSignal
  resume?: { key: string; uploadId: string } | null
  onMultipart?: (info: MultipartInfo) => void       // the resumable handle, as soon as it exists
  onPart?: (done: number, total: number) => void    // after each part R2 accepted
  keepOnFail?: boolean                              // don't abort a failed multipart (so it can resume)
}

export class UploadError extends Error {
  resumable: { key: string; uploadId: string } | null
  aborted: boolean
  constructor(msg: string, resumable: { key: string; uploadId: string } | null = null, aborted = false) {
    super(msg); this.name = 'UploadError'; this.resumable = resumable; this.aborted = aborted
  }
}

// Files at or under this go through the simple relay; bigger ones are chunked.
// Kept safely under the proxy body limit (next.config proxyClientMaxBodySize = 100mb).
export const RELAY_MAX = 80 * 1024 * 1024   // 80MB
export const PART_SIZE = 48 * 1024 * 1024   // 48MB parts
const RETRY_DELAYS = [1000, 3000, 8000]     // 4 tries per request in all

type PartTag = { PartNumber: number; ETag: string }

class HttpError extends Error { status: number; constructor(status: number, msg: string) { super(msg); this.status = status } }

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms)
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')) }, { once: true })
})
const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'
// Retry network errors, timeouts, rate limits and server errors; a 4xx is a real "no".
const retryable = (e: unknown) => !(e instanceof HttpError) || e.status >= 500 || e.status === 408 || e.status === 429

// One request with upload progress. Resolves with the parsed JSON body.
function xhrSend(url: string, body: Blob, headers: Record<string, string>, onBytes?: (sent: number) => void, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = e => { if (e.lengthComputable) onBytes?.(e.loaded) }
    xhr.onload = () => {
      let d: Record<string, unknown> = {}
      try { d = JSON.parse(xhr.responseText || '{}') } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(d)
      else reject(new HttpError(xhr.status, String(d.error || `HTTP ${xhr.status}`)))
    }
    xhr.onerror = () => reject(new Error('Network error (connection dropped)'))
    xhr.ontimeout = () => reject(new Error('The connection timed out'))
    const onAbort = () => { xhr.abort(); reject(new DOMException('Aborted', 'AbortError')) }
    signal?.addEventListener('abort', onAbort, { once: true })
    xhr.send(body)
  })
}

async function postJson(body: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const r = await fetch('/api/upload/multipart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new HttpError(r.status, String(d.error || `HTTP ${r.status}`))
  return d
}

// Run fn with retries; tell the progress bar while it's retrying.
async function withRetry<T>(label: string, fn: () => Promise<T>, signal?: AbortSignal, onRetry?: (msg: string | null) => void): Promise<T> {
  let last: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const out = await fn()
      if (attempt > 0) onRetry?.(null)
      return out
    } catch (e) {
      if (isAbort(e) || signal?.aborted) throw e
      last = e
      if (!retryable(e) || attempt === RETRY_DELAYS.length) break
      onRetry?.(`${label} hiccuped (${e instanceof Error ? e.message : 'error'}). Trying again, ${attempt + 2} of ${RETRY_DELAYS.length + 1}…`)
      await sleep(RETRY_DELAYS[attempt], signal)
    }
  }
  throw last instanceof Error ? last : new Error(`${label} failed`)
}

async function relayUpload(file: File, folder: string, ct: string, o: UploadOptions): Promise<string> {
  let retrying: string | null = null
  const report = (loaded: number) => { if (loaded > 0) retrying = null; reportNow(loaded) }
  const reportNow = (loaded: number) => o.onProgress?.({ loaded, total: file.size, pct: Math.min(99, Math.round((loaded / Math.max(1, file.size)) * 100)), retrying })
  const d = await withRetry('The upload', () => xhrSend('/api/upload', file, { 'Content-Type': ct, 'x-filename': file.name, 'x-folder': folder }, report, o.signal),
    o.signal, m => { retrying = m; report(0) })
  if (!d.publicUrl) throw new Error('The server did not return a link for the file')
  return String(d.publicUrl)
}

async function multipartUpload(file: File, folder: string, ct: string, o: UploadOptions): Promise<string> {
  const total = file.size
  const count = Math.max(1, Math.ceil(total / PART_SIZE))
  const sizeOf = (n: number) => Math.min(PART_SIZE, total - (n - 1) * PART_SIZE)

  // 1. start, or pick up an earlier attempt
  let key = '', uploadId = ''
  const have = new Map<number, string>()   // part number → ETag already in R2
  if (o.resume?.key && o.resume.uploadId) {
    try {
      const d = await postJson({ action: 'list_parts', key: o.resume.key, uploadId: o.resume.uploadId }, o.signal)
      for (const p of (d.parts as { PartNumber: number; ETag: string; Size: number }[]) ?? []) {
        if (p.PartNumber >= 1 && p.PartNumber <= count && p.Size === sizeOf(p.PartNumber)) have.set(p.PartNumber, p.ETag)
      }
      key = o.resume.key; uploadId = o.resume.uploadId
    } catch (e) {
      if (isAbort(e)) throw new UploadError('Upload stopped', null, true)
      // The old upload is gone (swept or finished) → start fresh.
    }
  }
  if (!uploadId) {
    const d = await withRetry('Starting the upload', () => postJson({ action: 'create', filename: file.name, contentType: ct, folder }, o.signal), o.signal)
    if (!d.uploadId) throw new UploadError(String(d.error || 'Could not start the upload'))
    key = String(d.key); uploadId = String(d.uploadId)
  }
  o.onMultipart?.({ key, uploadId, parts: count })
  const handle = { key, uploadId }

  let done = 0
  for (const n of have.keys()) done += sizeOf(n)
  let retrying: string | null = null
  let part = have.size
  const report = (inFlight: number) => { if (inFlight > 0) retrying = null; reportNow(inFlight) }
  const reportNow = (inFlight: number) => o.onProgress?.({ loaded: done + inFlight, total, pct: Math.min(99, Math.round(((done + inFlight) / total) * 100)), part: Math.min(count, part + 1), parts: count, retrying })
  report(0)

  try {
    const parts: PartTag[] = [...have.entries()].map(([PartNumber, ETag]) => ({ PartNumber, ETag }))
    for (let n = 1; n <= count; n++) {
      if (have.has(n)) continue
      const start = (n - 1) * PART_SIZE
      const blob = file.slice(start, start + sizeOf(n))
      const d = await withRetry(`Part ${n} of ${count}`, () => xhrSend('/api/upload/multipart', blob,
        { 'Content-Type': 'application/octet-stream', 'x-mp-key': key, 'x-mp-upload-id': uploadId, 'x-mp-part': String(n) }, report, o.signal),
        o.signal, m => { retrying = m; report(0) })
      if (!d.etag) throw new Error(`Part ${n} of ${count} came back without a receipt`)
      parts.push({ PartNumber: n, ETag: String(d.etag) })
      done += blob.size; part = parts.length
      report(0)
      o.onPart?.(parts.length, count)
    }
    // 2. stitch. Only now does R2 hold the finished file.
    const comp = await withRetry('Finishing the upload', () => postJson({ action: 'complete', key, uploadId, parts }, o.signal), o.signal, m => { retrying = m; report(0) })
    if (!comp.publicUrl) throw new Error(String(comp.error || 'Could not finish the upload'))
    return String(comp.publicUrl)
  } catch (e) {
    const aborted = isAbort(e) || !!o.signal?.aborted
    if (!o.keepOnFail) {
      // Clean up the dangling multipart upload; don't block on it.
      fetch('/api/upload/multipart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abort', key, uploadId }) }).catch(() => {})
    }
    throw new UploadError(aborted ? 'Upload stopped' : (e instanceof Error ? e.message : 'Upload failed'), o.keepOnFail ? handle : null, aborted)
  }
}

// Upload any file and get back its public URL (only after storage confirms it).
// The third argument can be a progress callback (older callers) or full options.
export async function uploadBig(file: File, folder: string, opts?: UploadOptions | ((p: UploadProgress) => void)): Promise<{ publicUrl: string }> {
  const o: UploadOptions = typeof opts === 'function' ? { onProgress: opts } : (opts ?? {})
  const ct = file.type || 'application/octet-stream'
  if (!file.size) throw new UploadError('That file is empty (0 bytes)')

  if (file.size <= RELAY_MAX && !o.resume) {
    try {
      const url = await relayUpload(file, folder, ct, o)
      o.onProgress?.({ loaded: file.size, total: file.size, pct: 100 })
      return { publicUrl: url }
    } catch (e) {
      if (isAbort(e) || o.signal?.aborted) throw new UploadError('Upload stopped', null, true)
      // Relay kept failing on a smallish file → fall through to chunked, which is robust.
    }
  }

  const publicUrl = await multipartUpload(file, folder, ct, o)
  o.onProgress?.({ loaded: file.size, total: file.size, pct: 100 })
  return { publicUrl }
}

// Convenience: pick the media folder from a file's MIME type.
export function folderFor(file: File): string {
  return file.type.startsWith('video') ? 'videos'
    : file.type.startsWith('audio') ? 'audio'
    : file.type.startsWith('image') ? 'images' : 'files'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
