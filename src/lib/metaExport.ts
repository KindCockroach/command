// Native Meta Business Suite exports → Winner Loop rows. Client-safe (no fs).
//
// Mandi drops the CSVs exactly as Meta gives them. Two shapes are known
// (checked against her Aug 19 – Nov 16, 2026 exports):
//  • Instagram content export — one row per post ("Date" = "Lifetime"), many
//    accounts in one file: Post ID, Account username, Description, Publish time,
//    Views, Reach, Likes, Shares, Follows, Comments, Saves.
//  • Facebook video export — one row per video PER DAY: Video asset ID, Page name,
//    Title, Publish time, Date, "3-second video views", Reactions, Comments, Shares.
//    Rows are summed per video.
// Anything else falls back to the older pasted-spreadsheet format (Reel ID, Total
// views, …). Output is grouped by the account named in the file, so one drop can
// fill several RISE accounts.

export type ExportRow = Record<string, string>
export type ExportGroup = {
  source: string          // account username / page name from the file ('' if the file names none)
  platform: 'instagram' | 'facebook'
  rows: ExportRow[]       // ImportRow-shaped: media_id, views, reach, likes, … as strings
}
export type ParsedExport = { kind: 'instagram' | 'facebook' | 'table' | 'unknown'; groups: ExportGroup[]; skipped: number }

// RFC-4180-ish CSV/TSV parse: quoted fields may hold commas, quotes and NEWLINES
// (Instagram captions do), which a line-by-line split breaks.
export function parseDelimited(text: string): string[][] {
  const t = text.replace(/^﻿/, '')
  const firstLine = t.slice(0, t.indexOf('\n') >= 0 ? t.indexOf('\n') : t.length)
  const delim = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : (firstLine.split('\t').length > firstLine.split(',').length ? '\t' : ',')
  const rows: string[][] = []
  let row: string[] = [], f = '', q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false }
      else f += c
    } else if (c === '"' && f === '') q = true
    else if (c === delim) { row.push(f.trim()); f = '' }
    else if (c === '\n') { row.push(f.trim()); rows.push(row); row = []; f = '' }
    else if (c !== '\r') f += c
  }
  if (f !== '' || row.length) { row.push(f.trim()); rows.push(row) }
  return rows.filter(r => r.some(cell => cell !== ''))
}

const col = (header: string[], name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase())
const n = (s: string | undefined) => { const v = Number(String(s ?? '').replace(/,/g, '').trim()); return Number.isFinite(v) ? v : 0 }

// Old pasted-spreadsheet format. Order matters: more specific patterns first.
const TABLE_MAP: [RegExp, string][] = [
  [/per\s*1k|engagement rate|interactions|accounts engaged|^rank$/i, ''],
  [/reel id|media id|^id$/i, 'media_id'],
  [/7-day|7 day/i, 'views_7d'],
  [/total views|^views$|^plays$/i, 'views'],
  [/from followers/i, 'pct_from_followers'],
  [/reach|viewers/i, 'reach'],
  [/facebook/i, 'fb_views'],
  [/^likes/i, 'likes'],
  [/^comments/i, 'comments'],
  [/^saves/i, 'saves'],
  [/^shares/i, 'shares'],
  [/^follows/i, 'follows'],
  [/visual/i, 'visual'],
  [/on-?screen|caption|text/i, 'onscreen_text'],
  [/date|posted/i, 'posted_at'],
]

export function parseMetaExport(text: string): ParsedExport {
  const all = parseDelimited(text)
  const hi = all.findIndex(r => r.length > 3 && r.some(c => /post id|video asset id|(reel|media) id/i.test(c) || /^views$/i.test(c)))
  if (hi < 0) return { kind: 'unknown', groups: [], skipped: 0 }
  const header = all[hi]
  const body = all.slice(hi + 1)

  // ── Instagram native content export ──
  if (col(header, 'Post ID') >= 0 && col(header, 'Account username') >= 0) {
    const c = (name: string) => col(header, name)
    const by = new Map<string, ExportRow[]>()
    let skipped = 0
    for (const r of body) {
      const id = r[c('Post ID')]
      if (!id) { skipped++; continue }
      const user = (r[c('Account username')] || '').replace(/^@/, '')
      const row: ExportRow = {
        media_id: id,
        posted_at: r[c('Publish time')] ?? '',
        onscreen_text: (r[c('Description')] ?? '').slice(0, 500),
        visual: '',   // the export doesn't say what was on screen; Post type ("IG reel") would make every same-caption post look like a re-upload
        views: r[c('Views')] ?? '', reach: r[c('Reach')] ?? '', likes: r[c('Likes')] ?? '',
        shares: r[c('Shares')] ?? '', follows: r[c('Follows')] ?? '', comments: r[c('Comments')] ?? '', saves: r[c('Saves')] ?? '',
      }
      by.set(user, [...(by.get(user) ?? []), row])
    }
    return { kind: 'instagram', groups: [...by].map(([source, rows]) => ({ source, platform: 'instagram', rows })), skipped }
  }

  // ── Facebook video export (per-day rows, summed per video) ──
  if (col(header, 'Video asset ID') >= 0) {
    const c = (name: string) => col(header, name)
    const vid = new Map<string, { page: string; title: string; posted: string; views: number; likes: number; comments: number; shares: number }>()
    let skipped = 0
    for (const r of body) {
      const id = r[c('Video asset ID')]
      if (!id) { skipped++; continue }
      const v = vid.get(id) ?? { page: r[c('Page name')] ?? '', title: r[c('Title')] ?? '', posted: r[c('Publish time')] ?? '', views: 0, likes: 0, comments: 0, shares: 0 }
      v.views += n(r[c('3-second video views')]); v.likes += n(r[c('Reactions')])
      v.comments += n(r[c('Comments')]); v.shares += n(r[c('Shares')])
      vid.set(id, v)
    }
    const by = new Map<string, ExportRow[]>()
    vid.forEach((v, id) => {
      const row: ExportRow = { media_id: id, posted_at: v.posted, onscreen_text: v.title.slice(0, 500), visual: '', views: String(v.views), likes: String(v.likes), comments: String(v.comments), shares: String(v.shares) }
      by.set(v.page, [...(by.get(v.page) ?? []), row])
    })
    return { kind: 'facebook', groups: [...by].map(([source, rows]) => ({ source, platform: 'facebook', rows })), skipped }
  }

  // ── Older pasted spreadsheet ──
  const fields = header.map(h => TABLE_MAP.find(([re]) => re.test(h))?.[1] ?? '')
  const rows = body.map(cells => {
    const row: ExportRow = {}
    fields.forEach((f, i) => { if (f && cells[i] !== undefined && !(f in row)) row[f] = cells[i] })
    return row
  })
  const kept = rows.filter(r => r.media_id)
  return { kind: 'table', groups: kept.length ? [{ source: '', platform: 'instagram', rows: kept }] : [], skipped: rows.length - kept.length }
}

// Best-guess RISE account for an account named in the export: exact handle, then id.
export function guessAccount(source: string, accounts: { id: string; handle?: string }[]): string {
  const s = source.toLowerCase().replace(/^@/, '').trim()
  if (!s) return ''
  const hit = accounts.find(a => (a.handle ?? '').toLowerCase().replace(/^@/, '') === s) ?? accounts.find(a => a.id.toLowerCase() === s)
  return hit?.id ?? ''
}
