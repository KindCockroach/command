// The Well: Mandi's own caption archive (697 posts, 2015–2026). Cap pulls her words from
// here FIRST when he writes, so captions sharpen her lines instead of inventing a voice.
//
// It lives as one file next to db.json (caption_well.json: [{ date, cap }]) so it never
// bloats the database. POST /api/well loads it once. If it isn't loaded, Cap falls back to
// her Notes and says so in his receipt, never pretending the Well was used.

import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'db.json')
const WELL_PATH = path.join(path.dirname(DB_PATH), 'caption_well.json')

export type WellLine = { date: string; cap: string }

let cache: { mtime: number; lines: WellLine[] } | null = null
export function readWell(): WellLine[] {
  try {
    if (!fs.existsSync(WELL_PATH)) return []
    const mtime = fs.statSync(WELL_PATH).mtimeMs
    if (cache && cache.mtime === mtime) return cache.lines
    const raw = JSON.parse(fs.readFileSync(WELL_PATH, 'utf-8')) as unknown
    const arr = Array.isArray(raw) ? raw : Array.isArray((raw as { captions?: unknown })?.captions) ? (raw as { captions: unknown[] }).captions : []
    const lines = arr.map(x => ({ date: String((x as WellLine).date ?? ''), cap: String((x as WellLine).cap ?? '').trim() })).filter(x => x.cap.length > 20)
    cache = { mtime, lines }
    return lines
  } catch { return [] }
}

export function saveWell(lines: WellLine[]): number {
  const clean = lines.map(x => ({ date: String(x.date ?? ''), cap: String(x.cap ?? '').trim() })).filter(x => x.cap.length > 20)
  fs.mkdirSync(path.dirname(WELL_PATH), { recursive: true })
  fs.writeFileSync(WELL_PATH, JSON.stringify(clean))
  cache = null
  return clean.length
}

const STOP = new Set('the a an and or but of to in on for with at by from is are was were be been it its this that these those you your yours i me my we our us she her he his they them their not no so as if then than just do does did have has had can will would could should what when where who why how all any more most some very really one into out up about over again there here also'.split(' '))
const words = (s: string) => (s.toLowerCase().match(/[a-z’']{3,}/g) ?? []).map(w => w.replace(/[’']/g, '')).filter(w => !STOP.has(w))

// The few captions of hers that share the most words with what this card is about.
// Plain word overlap, weighted toward rarer words: cheap, consistent, no AI call.
export function wellLinesFor(topic: string, n = 5): WellLine[] {
  const lines = readWell()
  if (!lines.length) return []
  const want = Array.from(new Set(words(topic)))
  if (!want.length) return []
  const df = new Map<string, number>()
  for (const w of want) df.set(w, 0)
  // BM25: rarer shared words count more, and a long caption doesn't win just by being long.
  const toks = lines.map(l => words(l.cap))
  const tf = toks.map(t => { const m = new Map<string, number>(); for (const w of t) m.set(w, (m.get(w) ?? 0) + 1); return m })
  for (const m of tf) for (const w of want) if (m.has(w)) df.set(w, (df.get(w) ?? 0) + 1)
  const avg = toks.reduce((s, t) => s + t.length, 0) / toks.length || 1
  const N = lines.length, k1 = 1.2, b = 0.75
  const scored = lines.map((l, i) => {
    let s = 0
    for (const w of want) {
      const f = tf[i].get(w); if (!f) continue
      const n = df.get(w) ?? 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * toks[i].length / avg))
    }
    return { l, s }
  }).filter(x => x.s > 0).sort((a, b2) => b2.s - a.s)
  return scored.slice(0, n).map(x => ({ date: x.l.date, cap: Array.from(x.l.cap.replace(/\s*(#\w+\s*)+$/g, '')).slice(0, 450).join('') }))
}

export function wellStatus() { return { loaded: readWell().length > 0, lines: readWell().length } }
