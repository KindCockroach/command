// Token + cost tracking for every AI call in the station.
// Logged from the two choke points in fable.ts (fableText → OpenAI,
// commanderChat / researchWithWeb → Anthropic). Read by /api/usage → /admin.
//
// Stored in its own JSON file (usage.json) next to db.json — kept separate so
// the frequently-written content DB isn't bloated by usage rows. On Railway it
// lands on the same volume as the DB (DB_PATH's dir), so it survives restarts.
import fs from 'fs'
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
}

// Price per 1M tokens (input, output). Edit here if a model's price changes.
const PRICING: Record<string, { in: number; out: number }> = {
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'claude-fable-5': { in: 10, out: 50 },
  'claude-opus-4-8': { in: 5, out: 25 },
}

export function costFor(model: string, inTok: number, outTok: number): number {
  const p = PRICING[model]
  if (!p) return 0
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out
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
}) {
  try {
    const list = read()
    list.push({
      ts: new Date().toISOString(),
      provider: e.provider,
      model: e.model,
      kind: e.kind,
      inputTokens: e.inputTokens || 0,
      outputTokens: e.outputTokens || 0,
      costUsd: costFor(e.model, e.inputTokens || 0, e.outputTokens || 0),
    })
    if (list.length > MAX_ROWS) list.splice(0, list.length - MAX_ROWS)
    write(list)
  } catch {
    /* never throw from logging */
  }
}

export type ModelRow = { model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }
export type KindRow = { kind: string; calls: number; costUsd: number }

export type UsageSummary = {
  totals: { calls: number; inputTokens: number; outputTokens: number; costUsd: number }
  todayCostUsd: number
  last7CostUsd: number
  last30CostUsd: number
  byModel: ModelRow[]
  byKind: KindRow[]
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
  }

  return {
    totals,
    todayCostUsd,
    last7CostUsd,
    last30CostUsd,
    byModel: [...models.values()].sort((a, b) => b.costUsd - a.costUsd),
    byKind: [...kinds.values()].sort((a, b) => b.costUsd - a.costUsd),
    recent: list.slice(-25).reverse(),
    pricing: PRICING,
  }
}
