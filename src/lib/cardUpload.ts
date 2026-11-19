'use client'
// Uploading a file INTO a content card (Content Day, the calendar, the card editor).
// Uses uploadBig (the one upload path) and tells the card how it's going, so:
// - every open view of that card shows the same live progress bar;
// - a stopped or failed upload leaves the card "Upload incomplete" with Retry, never a fake success;
// - Retry picks up the parts R2 already has (same file, same card), even after a reload
//   (after a reload the browser needs the file picked again; RISE then resumes it);
// - only once storage confirms the finished file does the card get it, and Cap a note.

import { uploadBig, folderFor, UploadError, type UploadProgress } from './uploadBig'

export type ActiveUpload = {
  cardId: number
  file: File
  progress: UploadProgress | null
  state: 'uploading' | 'failed' | 'done'
  error?: string
  ctrl: AbortController
}

const active = new Map<number, ActiveUpload>()
const listeners = new Set<() => void>()
let version = 0
const emit = () => { version++; listeners.forEach(f => f()) }

export function subscribeUploads(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
export function uploadsVersion(): number { return version }
export function getActiveUpload(cardId: number): ActiveUpload | undefined { return active.get(cardId) }

// Warn before closing the tab mid-upload (the card would be left incomplete).
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', e => {
    if ([...active.values()].some(a => a.state === 'uploading')) { e.preventDefault(); e.returnValue = '' }
  })
}

const post = (body: Record<string, unknown>) => fetch('/api/content/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) as Record<string, unknown> }))
  .catch(() => ({ ok: false, d: { error: 'Connection hiccup' } as Record<string, unknown> }))

export async function uploadToCard(cardId: number, file: File, opts: { calendarItemId?: string | null; onDone?: (view: unknown) => void } = {}): Promise<boolean> {
  const running = active.get(cardId)
  if (running?.state === 'uploading') return false   // one at a time per card
  const ctrl = new AbortController()
  const a: ActiveUpload = { cardId, file, progress: { loaded: 0, total: file.size, pct: 0 }, state: 'uploading', ctrl }
  active.set(cardId, a); emit()

  // Tell the card first, so a closed tab leaves "incomplete", not nothing.
  const st = await post({ action: 'start', id: cardId, filename: file.name, size: file.size, content_type: file.type, last_modified: file.lastModified })
  if (!st.ok) { a.state = 'failed'; a.error = String(st.d.error || 'Could not reach the card'); emit(); return false }
  const prior = st.d.upload as { key?: string | null; upload_id?: string | null } | undefined
  const resume = prior?.key && prior.upload_id ? { key: prior.key, uploadId: prior.upload_id } : null

  let lastBeat = Date.now()
  const beat = (extra: Record<string, unknown> = {}, force = false) => {
    if (!force && Date.now() - lastBeat < 30000) return
    lastBeat = Date.now(); post({ action: 'progress', id: cardId, ...extra })
  }
  let mp: { key: string; uploadId: string } | null = resume
  let partsDone = 0, partsTotal = 0
  try {
    const { publicUrl } = await uploadBig(file, folderFor(file), {
      signal: ctrl.signal,
      resume,
      keepOnFail: true,
      onProgress: p => { a.progress = p; emit(); beat() },
      onMultipart: info => { mp = { key: info.key, uploadId: info.uploadId }; partsTotal = info.parts; beat({ key: info.key, upload_id: info.uploadId, parts_total: info.parts }, true) },
      onPart: (done, total) => { partsDone = done; partsTotal = total; beat({ parts_done: done, parts_total: total }) },
    })
    const at = await post({ action: 'attach', id: cardId, url: publicUrl, calendar_item_id: opts.calendarItemId ?? null })
    if (!at.ok) throw new UploadError(String(at.d.error || 'The file uploaded but could not be attached'))
    a.state = 'done'; a.progress = { loaded: file.size, total: file.size, pct: 100 }; emit()
    opts.onDone?.(at.d.view)
    setTimeout(() => { if (active.get(cardId) === a) { active.delete(cardId); emit() } }, 4000)
    return true
  } catch (e) {
    const ue = e instanceof UploadError ? e : null
    const keep = ue?.resumable ?? mp
    a.state = 'failed'
    a.error = ue?.aborted ? 'You stopped the upload.' : (e instanceof Error ? e.message : 'Upload failed')
    emit()
    if (keep && partsTotal) await post({ action: 'progress', id: cardId, parts_done: partsDone, parts_total: partsTotal })
    await post({ action: 'fail', id: cardId, error: a.error, ...(keep ? { key: keep.key, upload_id: keep.uploadId } : {}) })
    return false
  }
}

export function stopUpload(cardId: number) { active.get(cardId)?.ctrl.abort() }
export function retryUpload(cardId: number, opts: { calendarItemId?: string | null; onDone?: (view: unknown) => void } = {}) {
  const a = active.get(cardId); if (a?.file) return uploadToCard(cardId, a.file, opts)
  return Promise.resolve(false)
}
export function forgetUpload(cardId: number) { active.delete(cardId); emit() }
