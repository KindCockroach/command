// Token + cost tracking for every AI call in the station.
// Anthropic calls log from fable.ts / sortingHat.ts. Every OpenAI call goes
// through trackedOpenAI() below, which logs from the client's own fetch, so no
// route can call OpenAI without being counted. Each row carries the ROUTE that
// spent it (middleware stamps x-rise-route on every request). Read by
// /api/usage → /admin.
//
// Stored in its own JSON file (usage.json) next to db.json — kept separate so
// the frequently-written content DB isn't bloated by usage rows. On Railway it
// lands on the same volume as the DB (DB_PATH's dir), so it survives restarts.
import fs from 'fs'
import { cleanJsonBody } from './jsonkit'
import OpenAI from 'openai'
import path from 'path'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'db.json')
const USAGE_PATH = process.env.USAGE_PATH ?? path.join(path.dirname(DB_PATH), 'usage.json')

const MAX_ROWS = 5000 // keep the tail; plenty for cost dashboards

export type Provider = 'openai' | 'anthropic'

export type UsageEntry = {
  ts: string            // ISO timestamp
  provider: Provider
  model: string
  kind: string          // which surface spent it: content | commander | research
  inputTokens: number
  outputTokens: number
  costUsd: number
  route?: string        // the page or API path that spent it (Phase 6)
  priced?: boolean      // false = model had no price in PRICING, so cost shows 0
}

// Price per 1M tokens (input, output). Edit here if a model's price changes.
const PRICING: Record<string, { in: number; out: number }> = {
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'claude-fable-5': { in: 10, out: 50 },
  'claude-opus-4-8': { in: 5, out: 25 },
  'claude-sonnet-5': { in: 2, out: 10 },
}

// Per-minute audio pricing (transcription). Whisper bills by duration, not tokens.
const AUDIO_PER_MIN: Record<string, number> = { 'whisper-1': 0.006 }

// OpenAI answers with dated ids ("gpt-4o-2024-08-06"); price them as their base model.
export function baseModel(model: string): string {
  return (model || '').replace(/-\d{4}-\d{2}-\d{2}$/, '')
}

export function isPriced(model: string): boolean {
  const m = baseModel(model)
  return !!PRICING[m] || !!AUDIO_PER_MIN[m]
}

export function costFor(model: string, inTok: number, outTok: number): number {
  const p = PRICING[baseModel(model)]
  if (!p) return 0
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out
}

// Which route is spending? Middleware puts the path on every request as
// x-rise-route; outside a request (scripts, timers) it's 'background'.
async function currentRoute(): Promise<string> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return h.get('x-rise-route') || 'unknown'
  } catch {
    return 'background'
  }
}

function append(row: UsageEntry) {
  const list = read()
  list.push(row)
  if (list.length > MAX_ROWS) list.splice(0, list.length - MAX_ROWS)
  write(list)
}

function read(): UsageEntry[] {
  try {
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8')) as UsageEntry[]
  } catch {
    return []
  }
}

function write(list: UsageEntry[]) {
  fs.mkdirSync(path.dirname(USAGE_PATH), { recursive: true })
  fs.writeFileSync(USAGE_PATH, JSON.stringify(list))
}

// Fire-and-forget: logging must never break a generation. Any failure is swallowed.
export function logUsage(e: {
  provider: Provider
  model: string
  kind: string
  inputTokens: number
  outputTokens: number
  route?: string
  costUsd?: number // set for non-token pricing (audio minutes)
}) {
  const ts = new Date().toISOString()
  ;(async () => {
    const route = e.route ?? (await currentRoute())
    append({
      ts,
      provider: e.provider,
      model: baseModel(e.model),
      kind: e.kind,
      inputTokens: e.inputTokens || 0,
      outputTokens: e.outputTokens || 0,
      costUsd: e.costUsd ?? costFor(e.model, e.inputTokens || 0, e.outputTokens || 0),
      route,
      priced: isPriced(e.model),
    })
  })().catch(() => { /* never throw from logging */ })
}

// Flat-cost usage for calls that aren't token-priced (e.g. image generation).
// Shows up on /admin exactly like token calls, just with 0 tokens + a flat cost.
export function logCost(model: string, kind: string, costUsd: number, provider: Provider = 'openai') {
  const ts = new Date().toISOString()
  ;(async () => {
    const route = await currentRoute()
    append({ ts, provider, model, kind, inputTokens: 0, outputTokens: 0, costUsd: costUsd || 0, route, priced: true })
  })().catch(() => { /* never throw from logging */ })
}

// ── trackedOpenAI: an OpenAI client that logs every call it makes ─────────────
// Wraps the SDK's fetch. After each JSON response it reads `usage` and `model`
// and logs them with `kind`. Images are skipped (their routes log a flat cost).
// Audio transcription is priced by duration when OpenAI reports it.
export function trackedOpenAI(kind: string): OpenAI {
  const tracked: typeof fetch = async (input, init) => {
    // Half-emoji in a prompt would make OpenAI reject the whole request; take them out.
    if (init && typeof init.body === 'string') init = { ...init, body: cleanJsonBody(init.body) }
    const res = await fetch(input as RequestInfo, init)
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      if (res.ok && !/\/images\//.test(url) && (res.headers.get('content-type') || '').includes('json')) {
        res.clone().json().then((j: Record<string, unknown>) => {
          const u = (j?.usage ?? {}) as Record<string, number | string>
          let model = String(j?.model || '')
          if (!model && /\/audio\//.test(url)) {
            const form = init?.body as unknown as { get?: (k: string) => unknown } | undefined
            model = String(form?.get?.('model') || 'whisper-1')
          }
          if (!model) return
          if (u.type === 'duration' || (/\/audio\//.test(url) && !u.input_tokens)) {
            const secs = Number(u.seconds || 0)
            const perMin = AUDIO_PER_MIN[baseModel(model)] ?? 0
            logUsage({ provider: 'openai', model, kind, inputTokens: 0, outputTokens: 0, costUsd: (secs / 60) * perMin })
            return
          }
          logUsage({
            provider: 'openai', model, kind,
            inputTokens: Number(u.input_tokens ?? u.prompt_tokens ?? 0),
            outputTokens: Number(u.output_tokens ?? u.completion_tokens ?? 0),
          })
        }).catch(() => {})
      }
    } catch { /* never break the call */ }
    return res
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, fetch: tracked })
}

export type ModelRow = { model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }
export type KindRow = { kind: string; calls: number; costUsd: number }
export type RouteRow = { route: string; calls: number; costUsd: number; models: string[] }
export type DayRow = { day: string; calls: number; costUsd: number }

export type UsageSummary = {
  totals: { calls: number; inputTokens: number; outputTokens: number; costUsd: number }
  todayCostUsd: number
  last7CostUsd: number
  last30CostUsd: number
  byModel: ModelRow[]
  byKind: KindRow[]
  byRoute: RouteRow[]
  byDay: DayRow[]        // last 30 days, newest first
  unpriced: string[]     // models seen with no price (their cost shows as $0)
  untrackedRows: number  // rows from before route tracking began
  recent: UsageEntry[]
  pricing: Record<string, { in: number; out: number }>
}

export function getUsageSummary(): UsageSummary {
  const list = read()
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)
  const day = 24 * 60 * 60 * 1000

  const totals = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
  const models = new Map<string, ModelRow>()
  const kinds = new Map<string, KindRow>()
  const routes = new Map<string, RouteRow & { _m: Set<string> }>()
  const days = new Map<string, DayRow>()
  const unpriced = new Set<string>()
  let untrackedRows = 0
  let todayCostUsd = 0
  let last7CostUsd = 0
  let last30CostUsd = 0

  for (const e of list) {
    totals.calls++
    totals.inputTokens += e.inputTokens
    totals.outputTokens += e.outputTokens
    totals.costUsd += e.costUsd

    const age = now - new Date(e.ts).getTime()
    if (e.ts.slice(0, 10) === today) todayCostUsd += e.costUsd
    if (age <= 7 * day) last7CostUsd += e.costUsd
    if (age <= 30 * day) last30CostUsd += e.costUsd

    const m = models.get(e.model) ?? { model: e.model, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
    m.calls++
    m.inputTokens += e.inputTokens
    m.outputTokens += e.outputTokens
    m.costUsd += e.costUsd
    models.set(e.model, m)

    const k = kinds.get(e.kind) ?? { kind: e.kind, calls: 0, costUsd: 0 }
    k.calls++
    k.costUsd += e.costUsd
    kinds.set(e.kind, k)

    const rk = e.route || '(before route tracking)'
    if (!e.route) untrackedRows++
    const r = routes.get(rk) ?? { route: rk, calls: 0, costUsd: 0, models: [], _m: new Set<string>() }
    r.calls++
    r.costUsd += e.costUsd
    r._m.add(e.model)
    routes.set(rk, r)

    if (age <= 30 * day) {
      const dk = e.ts.slice(0, 10)
      const d = days.get(dk) ?? { day: dk, calls: 0, costUsd: 0 }
      d.calls++
      d.costUsd += e.costUsd
      days.set(dk, d)
    }

    if (e.priced === false || (e.priced === undefined && !isPriced(e.model) && !e.costUsd)) unpriced.add(e.model)
  }

  return {
    totals,
    todayCostUsd,
    last7CostUsd,
    last30CostUsd,
    byModel: [...models.values()].sort((a, b) => b.costUsd - a.costUsd),
    byKind: [...kinds.values()].sort((a, b) => b.costUsd - a.costUsd),
    byRoute: [...routes.values()].map(({ _m, ...r }) => ({ ...r, models: [..._m] })).sort((a, b) => b.costUsd - a.costUsd),
    byDay: [...days.values()].sort((a, b) => (a.day < b.day ? 1 : -1)),
    unpriced: [...unpriced].filter(m => !/elevenlabs/.test(m)),
    untrackedRows,
    recent: list.slice(-25).reverse(),
    pricing: PRICING,
  }
}
