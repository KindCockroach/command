import fs from 'fs'
import path from 'path'
import { getAllContent } from './db'

// THE WINNER LOOP — retroactive results. Mandi posts natively (trending audio is
// easier in-app), so RISE learns AFTER the fact: a weekly export of each
// account's reels (or, later, the Meta insights pull) is imported here, scored
// against that account's own typical post, and matched back to the RISE idea
// card it came from. Kept in its own file so it never touches db.json's shape.

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'db.json')
const RESULTS_PATH = path.join(path.dirname(DB_PATH), 'post_results.json')

export type PostResult = {
  id: number
  account_id: string
  platform: string                 // 'instagram' (default)
  media_id: string                 // IG reel id — the upsert key with platform
  posted_at: string | null
  onscreen_text: string
  visual: string                   // what's on screen (clip, set, outfit)
  views: number                    // total views
  views_7d: number | null          // grid badge, if the export had it
  reach: number | null
  likes: number
  comments: number
  saves: number
  shares: number
  follows: number
  pct_from_followers: number | null // 0 = shown only to non-followers (Trial Reel)
  fb_views: number | null
  content_id: number | null        // matched RISE card, if any
  imported_at: string
  updated_at: string
}

export type Verdict = 'make_more' | 'rehook' | 'neutral' | 'retire' | 'reupload'

export type ScoredResult = PostResult & {
  verdict: Verdict
  reasons: string[]
  engagement_rate: number          // (likes+comments+saves+shares) ÷ views
  keep_per_1k: number              // (saves+shares) per 1K views — the "worth keeping" signal
  views_vs_median: number          // 2 = twice this account's typical reel
}

type Store = { results: PostResult[]; next_id: number }

function readStore(): Store {
  try {
    if (!fs.existsSync(RESULTS_PATH)) return { results: [], next_id: 1 }
    return JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8')) as Store
  } catch {
    return { results: [], next_id: 1 }
  }
}

function writeStore(s: Store) {
  const dir = path.dirname(RESULTS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(s, null, 2))
}

const num = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').trim().replace(/,/g, '')
  if (!s || s === '--') return 0
  if (s.endsWith('%')) return (parseFloat(s) || 0) / 100
  const m = s.match(/^([\d.]+)\s*([kKmM])?$/)
  if (!m) return Number(s) || 0
  const n = parseFloat(m[1])
  return m[2] ? Math.round(n * (/[kK]/.test(m[2]) ? 1_000 : 1_000_000)) : n
}
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '--' ? null : num(v))

// Word-overlap match of a reel's on-screen text to a RISE card (on-screen text or
// title). Needs ≥60% of the reel's meaningful words to land on the card.
const words = (s: string) => new Set(String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 3))
function matchContent(accountId: string, text: string): number | null {
  const want = words(text)
  if (want.size < 3) return null
  let best: { id: number; score: number } | null = null
  for (const c of getAllContent()) {
    if (c.account_id && c.account_id !== accountId) continue
    const have = words(`${c.onscreen_text ?? ''} ${c.title ?? ''}`)
    let hit = 0
    want.forEach(w => { if (have.has(w)) hit++ })
    const score = hit / want.size
    if (score >= 0.6 && (!best || score > best.score)) best = { id: c.id, score }
  }
  return best?.id ?? null
}

export type ImportRow = Partial<Record<keyof PostResult, unknown>> & { media_id: unknown }

// Upsert rows for one account (keyed by platform + media_id). Returns counts.
export function importResults(accountId: string, rows: ImportRow[], platform = 'instagram') {
  const store = readStore()
  const now = new Date().toISOString()
  let added = 0, updated = 0, skipped = 0
  for (const r of rows) {
    const mediaId = String(r.media_id ?? '').trim()
    if (!mediaId) { skipped++; continue }
    const onscreen = String(r.onscreen_text ?? '').trim()
    const fields = {
      account_id: accountId,
      platform,
      media_id: mediaId,
      posted_at: r.posted_at ? String(r.posted_at) : null,
      onscreen_text: onscreen,
      visual: String(r.visual ?? '').trim(),
      views: num(r.views),
      views_7d: numOrNull(r.views_7d),
      reach: numOrNull(r.reach),
      likes: num(r.likes),
      comments: num(r.comments),
      saves: num(r.saves),
      shares: num(r.shares),
      follows: num(r.follows),
      pct_from_followers: numOrNull(r.pct_from_followers),
      fb_views: numOrNull(r.fb_views),
    }
    const idx = store.results.findIndex(x => x.platform === platform && x.media_id === mediaId)
    if (idx >= 0) {
      const prev = store.results[idx]
      store.results[idx] = { ...prev, ...fields, content_id: prev.content_id ?? matchContent(accountId, onscreen), updated_at: now }
      updated++
    } else {
      store.results.push({ id: store.next_id++, ...fields, content_id: matchContent(accountId, onscreen), imported_at: now, updated_at: now })
      added++
    }
  }
  writeStore(store)
  return { added, updated, skipped }
}

const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Score each reel against ITS OWN account's typical reel. Rules (tunable):
// • make_more — views ≥ 2× the account median (and ≥ 300), or it earned follows
// • rehook    — strong keep signal (≥ 3 saves+shares per 1K views) but ordinary
//               reach: the idea landed, the hook didn't — re-test the line
// • reupload  — same on-screen text as an earlier reel; exact re-posts get buried
// • retire    — under 0.75× median views AND under median engagement
export function scoreResults(accountId?: string | null): ScoredResult[] {
  const all = readStore().results.filter(r => !accountId || r.account_id === accountId)
  const byAccount = new Map<string, PostResult[]>()
  for (const r of all) byAccount.set(r.account_id, [...(byAccount.get(r.account_id) ?? []), r])

  const out: ScoredResult[] = []
  byAccount.forEach(rows => {
    const eng = (r: PostResult) => (r.views ? (r.likes + r.comments + r.saves + r.shares) / r.views : 0)
    const medViews = median(rows.map(r => r.views))
    const medEng = median(rows.map(eng))
    const firstByText = new Map<string, PostResult>()
    for (const r of [...rows].sort((a, b) => a.id - b.id)) {
      const key = r.onscreen_text.toLowerCase().replace(/\s+/g, ' ').trim()
      if (key.length > 10 && !firstByText.has(key)) firstByText.set(key, r)
    }
    for (const r of rows) {
      const e = eng(r)
      const keep = r.views ? ((r.saves + r.shares) / r.views) * 1000 : 0
      const ratio = medViews ? r.views / medViews : 0
      const reasons: string[] = []
      let verdict: Verdict = 'neutral'
      const key = r.onscreen_text.toLowerCase().replace(/\s+/g, ' ').trim()
      const first = key.length > 10 ? firstByText.get(key) : undefined
      if (first && first.id !== r.id) {
        verdict = 'reupload'
        reasons.push('Same on-screen text as an earlier reel. Exact re-posts get buried; re-angle instead.')
      } else if ((ratio >= 2 && r.views >= 300) || r.follows > 0) {
        verdict = 'make_more'
        if (ratio >= 2) reasons.push(`${ratio.toFixed(1)}× this account's typical views`)
        if (r.follows > 0) reasons.push(`Earned ${r.follows} follow${r.follows === 1 ? '' : 's'}`)
      } else if (keep >= 3 && r.views >= 150) {
        verdict = 'rehook'
        reasons.push(`${keep.toFixed(1)} saves+shares per 1K views, but ordinary reach. The idea landed; test a new hook.`)
      } else if (ratio < 0.75 && e < medEng) {
        verdict = 'retire'
        reasons.push('Below typical on both views and engagement')
      }
      if (r.pct_from_followers === 0) reasons.push('Shown only to non-followers (Trial Reel)')
      out.push({ ...r, verdict, reasons, engagement_rate: e, keep_per_1k: keep, views_vs_median: ratio })
    }
  })
  const rank: Record<Verdict, number> = { make_more: 0, rehook: 1, neutral: 2, retire: 3, reupload: 4 }
  return out.sort((a, b) => rank[a.verdict] - rank[b.verdict] || b.views - a.views)
}
