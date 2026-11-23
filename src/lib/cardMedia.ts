// Phase 3: media lands on ONE content card, and Cap hears about it.
//
// Every upload from Content Day, the calendar or the card editor attaches to the card
// that is already there (by id). Nothing here ever creates a card. A calendar item
// points at its card by content_id, so the calendar and Content Day show the same media.
//
// Per platform, a card keeps its own caption and status: Draft → Scheduled → Posted.
// Accounts that mirror this card's account (a Facebook page fed by Instagram) are
// listed as "reposts automatically", never as another caption to write.

import { readDb, writeDb, logActivity, type ContentPiece, type Handoff, type HandoffMissing, type PlatformPost, type PlatformPostStatus, type UploadRecord, type BrandAccount } from './db'
import { abortMultipart, headObject, keyFromPublicUrl, listOpenMultipart } from './r2'

// An "uploading" record that hasn't heard from its browser in this long is incomplete.
export const STALL_MS = 3 * 60 * 1000
// Unfinished multipart uploads older than this are aborted in R2.
export const ORPHAN_MS = 24 * 60 * 60 * 1000

const nowIso = () => new Date().toISOString()
const isVideo = (u: string) => /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(u)

export function effectiveUpload(u: UploadRecord | null | undefined): (UploadRecord & { stalled?: boolean }) | null {
  if (!u) return null
  if (u.state === 'uploading' && Date.now() - Date.parse(u.updated_at) > STALL_MS) {
    return { ...u, state: 'incomplete', stalled: true, error: u.error || 'The upload stopped (the tab closed or the connection dropped).' }
  }
  return u
}

// Platform names, tidied so 'IG', 'instagram' and 'Instagram Reels' are one row.
export function normPlatform(p: string): string {
  const s = (p || '').trim().toLowerCase()
  if (!s) return ''
  if (/insta|^ig\b|reel/.test(s)) return 'Instagram'
  if (/tik ?tok/.test(s)) return 'TikTok'
  if (/youtube|^yt\b|shorts/.test(s)) return 'YouTube'
  if (/facebook|^fb\b/.test(s)) return 'Facebook'
  if (/linkedin/.test(s)) return 'LinkedIn'
  if (/pinterest/.test(s)) return 'Pinterest'
  if (/threads/.test(s)) return 'Threads'
  if (/medium/.test(s)) return 'Medium'
  if (/substack/.test(s)) return 'Substack'
  if (/podcast|spotify|apple/.test(s)) return 'Podcast'
  if (/email|newsletter/.test(s)) return 'Email'
  return p.trim().replace(/\b\w/g, c => c.toUpperCase())
}

// Where this card goes: its account's platform plus any platforms on the card.
export function cardPlatforms(c: ContentPiece, acct?: BrandAccount | null): string[] {
  const out: string[] = []
  const push = (p: string) => { const n = normPlatform(p); if (n && !out.includes(n)) out.push(n) }
  if (acct?.platform) push(acct.platform)
  for (const p of c.platforms ?? []) push(p)
  for (const pp of c.platform_posts ?? []) push(pp.platform)
  return out
}

export function mirrorsOf(db: ReturnType<typeof readDb>, accountId: string | null | undefined) {
  if (!accountId) return []
  return (db.brand_accounts ?? []).filter(a => a.mirrors_account_id === accountId).map(a => ({ id: a.id, handle: a.handle, platform: normPlatform(a.platform), brand_name: a.brand_name }))
}

// The platforms this card posts to itself: a platform a mirrored account reposts
// automatically is never one more caption to write or one more "Posted" to wait for.
export function ownPlatforms(db: ReturnType<typeof readDb>, c: ContentPiece, acct?: BrandAccount | null): string[] {
  const own = acct ? normPlatform(acct.platform) : ''
  const mirrored = new Set(mirrorsOf(db, c.account_id).map(m => m.platform).filter(p => p !== own))
  return cardPlatforms(c, acct).filter(p => !mirrored.has(p))
}

export function missingFor(c: ContentPiece): HandoffMissing[] {
  const m: HandoffMissing[] = []
  if (!(c.script ?? '').trim()) m.push('script')
  const hasCaption = (c.platform_posts ?? []).some(p => p.caption.trim()) || !!(c.description ?? '').trim()
  if (!hasCaption) m.push('caption')
  const media = [c.media_url, ...(c.media_urls ?? [])].filter(Boolean) as string[]
  if (media.some(isVideo) && !c.thumbnail_url) m.push('cover')
  return m
}

function findCard(db: ReturnType<typeof readDb>, id: number): ContentPiece | undefined {
  return db.content.find(c => c.id === id)
}

// Everything a card's media + platform panel needs, in one read.
export function cardMediaView(id: number) {
  const db = readDb()
  const c = findCard(db, id); if (!c) return null
  const acct = (db.brand_accounts ?? []).find(a => a.id === c.account_id) ?? null
  const handoff = (db.handoffs ?? []).filter(h => h.content_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  const cal = (db.calendar_items ?? []).filter(i => i.content_id === id).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  const media = Array.from(new Set([...(c.media_urls ?? []), c.media_url].filter(Boolean) as string[]))
  return {
    id: c.id, title: c.title, status: c.status, account_id: c.account_id ?? null,
    handle: acct?.handle ?? '', account_platform: acct ? normPlatform(acct.platform) : '',
    media, cover: c.thumbnail_url || '', script: !!(c.script ?? '').trim(), description: c.description ?? '',
    upload: effectiveUpload(c.upload),
    footage_at: c.footage_at ?? null,
    platforms: ownPlatforms(db, c, acct),
    platform_posts: c.platform_posts ?? [],
    mirrors: mirrorsOf(db, c.account_id),
    handoff: handoff ? { ...handoff, missing: handoff.status === 'open' ? missingFor(c) : (handoff.missing ?? []) } : null,
    cover_note: c.cover_note ?? null,
    cap_needs: c.cap_needs ?? [],
    calendar: cal ? { id: cal.id, date: cal.date, time: cal.time ?? null } : null,
  }
}

// ── upload state ──
export function startUpload(id: number, f: { filename: string; size: number; content_type: string; last_modified?: number | null }) {
  const db = readDb(); const c = findCard(db, id); if (!c) return null
  const prev = c.upload
  const same = prev && prev.filename === f.filename && prev.size === f.size
  c.upload = {
    state: 'uploading', filename: f.filename, size: f.size, content_type: f.content_type || 'application/octet-stream',
    last_modified: f.last_modified ?? null,
    key: same ? prev!.key ?? null : null, upload_id: same ? prev!.upload_id ?? null : null,
    parts_done: same ? prev!.parts_done ?? 0 : 0, parts_total: same ? prev!.parts_total ?? 0 : 0,
    error: null, started_at: same ? prev!.started_at : nowIso(), updated_at: nowIso(),
  }
  writeDb(db); return c.upload
}

export function progressUpload(id: number, p: { key?: string | null; upload_id?: string | null; parts_done?: number; parts_total?: number }) {
  const db = readDb(); const c = findCard(db, id); if (!c?.upload) return null
  Object.assign(c.upload, {
    state: 'uploading' as const,
    ...(p.key ? { key: p.key } : {}), ...(p.upload_id ? { upload_id: p.upload_id } : {}),
    ...(typeof p.parts_done === 'number' ? { parts_done: p.parts_done } : {}),
    ...(typeof p.parts_total === 'number' ? { parts_total: p.parts_total } : {}),
    updated_at: nowIso(),
  })
  writeDb(db); return c.upload
}

export function failUpload(id: number, error: string, resumable?: { key: string; uploadId: string } | null) {
  const db = readDb(); const c = findCard(db, id); if (!c?.upload) return null
  c.upload.state = 'incomplete'
  c.upload.error = (error || 'Upload failed').slice(0, 300)
  if (resumable) { c.upload.key = resumable.key; c.upload.upload_id = resumable.uploadId }
  c.upload.updated_at = nowIso()
  writeDb(db); return c.upload
}

export async function discardUpload(id: number) {
  const db = readDb(); const c = findCard(db, id); if (!c) return false
  const u = c.upload
  c.upload = null; writeDb(db)
  if (u?.key && u.upload_id) await abortMultipart(u.key, u.upload_id)
  return true
}

// ── attach: the file is in R2 and confirmed → put it on the card, tell Cap ──
export async function attachMedia(id: number, url: string, opts: { calendar_item_id?: string | null; note?: string } = {}) {
  if (!/^https?:\/\/|^\/api\/media\//.test(url)) return { error: 'That isn’t a media link RISE stored.' }
  // Never mark it attached until storage confirms the finished file is there.
  const key = keyFromPublicUrl(url)
  if (key) {
    const size = await headObject(key)
    if (size === null) return { error: 'Storage doesn’t have that file (the upload didn’t finish). Try the upload again.' }
  }
  const db = readDb(); const c = findCard(db, id); if (!c) return { error: 'That card isn’t in RISE any more.' }
  const now = nowIso()
  const list = Array.from(new Set([...(c.media_urls ?? (c.media_url ? [c.media_url] : [])), url]))
  c.media_urls = list
  if (!c.media_url) c.media_url = list[0]
  c.footage_at = now
  if (c.status === 'idea') c.status = 'in_progress'
  c.upload = null
  c.updated_at = now

  // The Cap note. One open note per card: more footage updates it, never duplicates it.
  db.handoffs ??= []
  const cal = opts.calendar_item_id ?? (db.calendar_items ?? []).find(i => i.content_id === id)?.id ?? null
  let h = db.handoffs.find(x => x.content_id === id && x.kind === 'footage_in' && x.status === 'open')
  const missing = missingFor(c)
  if (h) {
    h.media_urls = Array.from(new Set([...h.media_urls, url])); h.missing = missing; h.updated_at = now
    if (opts.note) h.note = opts.note
    if (cal && !h.calendar_item_id) h.calendar_item_id = cal
    h.status = 'open'
  } else {
    const n = db.handoffs.length + 1
    h = { id: `ho_${Date.now().toString(36)}_${n}`, kind: 'footage_in', from: 'mandi', to: 'cap', what: `Footage landed on “${c.title.slice(0, 80)}”: brief the writers`, content_id: id, attempts: 0, account_id: c.account_id ?? null, calendar_item_id: cal, media_urls: [url], missing, status: 'open', note: opts.note, created_at: now, updated_at: now }
    db.handoffs.push(h)
  }
  writeDb(db)
  const acct = (db.brand_accounts ?? []).find(a => a.id === c.account_id)
  logActivity({
    type: 'handoff', icon: '🎬', source: 'cap', account_id: c.account_id ?? null, content_id: id, media_url: url,
    title: `Footage in → Cap: ${c.title}`.slice(0, 140),
    detail: `${acct?.handle ?? 'No account'} · still needs ${missing.length ? missing.join(', ') : 'nothing (ready for captions)'}`,
  })
  return { ok: true, handoff: h, view: cardMediaView(id) }
}

export function removeMedia(id: number, url: string) {
  const db = readDb(); const c = findCard(db, id); if (!c) return null
  c.media_urls = (c.media_urls ?? []).filter(u => u !== url)
  if (c.media_url === url) c.media_url = c.media_urls[0] ?? ''
  c.updated_at = nowIso()
  writeDb(db); return cardMediaView(id)
}

// ── handoffs (Phase 4 builds receipts on these) ──
export function getHandoffs(f: { to?: string; status?: string; content_id?: number } = {}): Handoff[] {
  const db = readDb()
  const content = new Map(db.content.map(c => [c.id, c]))
  return (db.handoffs ?? [])
    .filter(h => (!f.to || h.to === f.to) && (!f.status || h.status === f.status) && (!f.content_id || h.content_id === f.content_id))
    .map(h => { const c = h.content_id ? content.get(h.content_id) : undefined; return h.status === 'open' && c ? { ...h, missing: missingFor(c) } : h })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function closeHandoff(id: string, by = 'cap'): Handoff | null {
  const db = readDb(); const h = (db.handoffs ?? []).find(x => x.id === id); if (!h) return null
  h.status = 'done'; h.done_at = nowIso(); h.done_by = by; h.updated_at = h.done_at
  writeDb(db); return h
}

// ── per-platform caption + status ──
const STATUSES: PlatformPostStatus[] = ['draft', 'scheduled', 'posted']
export function setPlatformPost(id: number, platform: string, patch: Partial<Pick<PlatformPost, 'caption' | 'status' | 'scheduled_at' | 'posted_url' | 'ed'>>, by: 'cap' | 'ed' | 'pod' | 'mandi' = 'mandi') {
  const name = normPlatform(platform)
  if (!name) return { error: 'Which platform?' }
  if (patch.status && !STATUSES.includes(patch.status)) return { error: 'Status is Draft, Scheduled or Posted.' }
  if (patch.scheduled_at && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(patch.scheduled_at)) return { error: 'Pick a date and time.' }
  if (patch.posted_url && !/^https?:\/\//.test(patch.posted_url)) return { error: 'The post link should start with https://' }
  const db = readDb(); const c = findCard(db, id); if (!c) return { error: 'That card isn’t in RISE any more.' }
  const acct = (db.brand_accounts ?? []).find(a => a.id === c.account_id)
  c.platform_posts ??= []
  let pp = c.platform_posts.find(p => p.platform === name)
  const now = nowIso()
  if (!pp) { pp = { platform: name, caption: '', status: 'draft', updated_at: now }; c.platform_posts.push(pp) }
  if (typeof patch.caption === 'string' && patch.caption !== pp.caption) {
    pp.caption = patch.caption.slice(0, 5000)
    pp.written_by = by
    // Her own words stand as written: Ed's verdict was about the draft she replaced.
    if (by === 'mandi') pp.ed = null
  }
  if ('ed' in patch) pp.ed = patch.ed ?? null
  if (patch.status) {
    pp.status = patch.status
    if (patch.status === 'posted' && !pp.posted_at) pp.posted_at = now
    if (patch.status !== 'posted') pp.posted_at = null
  }
  if ('scheduled_at' in patch) pp.scheduled_at = patch.scheduled_at || null
  if ('posted_url' in patch) pp.posted_url = patch.posted_url || null
  pp.updated_at = now
  if (!(c.platforms ?? []).map(normPlatform).includes(name)) c.platforms = [...(c.platforms ?? []), name]

  // The card's own status follows its platforms (only once every one has moved on).
  const all = ownPlatforms(db, c, acct).map(p => c.platform_posts!.find(x => x.platform === p)?.status ?? 'draft')
  if (all.length && all.every(s => s === 'posted')) {
    c.status = 'published'; c.published_at ??= now
    // Posted everywhere → nothing left for Cap on this card.
    for (const h of db.handoffs ?? []) if (h.content_id === id && h.status === 'open') { h.status = 'done'; h.done_at = now; h.done_by = 'posted'; h.receipt ??= 'Posted on every platform, so nothing is left to hand over.'; h.updated_at = now }
  }
  else if (all.length && all.every(s => s !== 'draft')) {
    c.status = 'scheduled'
    const times = c.platform_posts.map(p => p.scheduled_at).filter(Boolean).sort() as string[]
    c.scheduled_at = times[0] ?? c.scheduled_at ?? null
  } else if (c.status === 'scheduled' || c.status === 'published') {
    c.status = hasAny(c) ? 'ready' : 'in_progress'
  }
  c.updated_at = now
  writeDb(db)
  if (patch.status && patch.status !== 'draft') {
    logActivity({ type: patch.status === 'posted' ? 'posted' : 'scheduled', icon: patch.status === 'posted' ? '✅' : '🗓', source: 'mandi', account_id: c.account_id ?? null, content_id: id,
      title: `${patch.status === 'posted' ? 'Posted' : 'Scheduled'} on ${name}: ${c.title}`.slice(0, 140), detail: pp.posted_url || pp.scheduled_at || undefined })
  }
  return { ok: true, view: cardMediaView(id) }
}
const hasAny = (c: ContentPiece) => !!(c.media_url || c.media_urls?.length)

// ── orphan sweep: abort unfinished uploads nobody will come back for ──
let lastSweep = 0
export async function sweepOrphanUploads(force = false): Promise<{ aborted: number; kept: number; skipped?: boolean }> {
  if (!force && Date.now() - lastSweep < 60 * 60 * 1000) return { aborted: 0, kept: 0, skipped: true }
  lastSweep = Date.now()
  const open = await listOpenMultipart()
  const old = open.filter(u => u.initiated && Date.now() - Date.parse(u.initiated) > ORPHAN_MS)
  for (const u of old) await abortMultipart(u.key, u.uploadId)
  if (old.length) {
    // Cards pointing at a swept upload can't resume it any more; they stay "incomplete".
    const gone = new Set(old.map(u => u.uploadId))
    const db = readDb(); let changed = false
    for (const c of db.content) if (c.upload?.upload_id && gone.has(c.upload.upload_id)) {
      c.upload = { ...c.upload, state: 'incomplete', key: null, upload_id: null, parts_done: 0, error: 'The unfinished upload was cleaned up after 24 hours. Drop the file again.', updated_at: nowIso() }
      changed = true
    }
    if (changed) writeDb(db)
  }
  return { aborted: old.length, kept: open.length - old.length }
}
