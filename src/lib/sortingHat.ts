// The Sorting Hat — RISE's first real autonomous agent.
//
// A worker does one call in → one answer out. An AGENT runs a loop: it's given a
// goal + tools, and IT decides which tools to call, in what order, until done.
// This one takes a raw brain-dump and decides what to DO with it — search for
// duplicates, pick the account, draft a post-card, or park an idea that needs
// something only Mandi knows. It NEVER publishes: everything it makes is a draft
// for review (propose-only). Client tools = plain functions below; the loop feeds
// their results back to the model until it stops (end_turn) or hits MAX_STEPS.
import {
  getAllContent,
  getAllBrandAccounts,
  getBrandAccount,
  createContent,
  type ContentPiece,
} from './db'
import { logUsage } from './usage'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const AGENT_MODEL = 'claude-opus-4-8' // strong judgment + tool use, half the price of Fable
const MAX_STEPS = 8 // hard runaway/cost guard — the agent can never loop forever

type Block = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }
type AnthropicMsg = {
  content?: Block[]
  stop_reason?: string | null
  usage?: { input_tokens?: number; output_tokens?: number }
  error?: { message?: string }
}

export type TraceStep =
  | { type: 'thinking'; text: string }
  | { type: 'action'; tool: string; input: unknown; result: string }
  | { type: 'done'; summary: string }

export type CreatedItem = { id: number; status: string; account_id: string | null; title: string }

export type SortingHatResult = {
  summary: string
  trace: TraceStep[]
  created: CreatedItem[]
}

// ── The tool surface: typed actions the agent is allowed to take ──────────────
const TOOLS = [
  {
    name: 'search_past_posts',
    description:
      'Search existing content (all statuses) for posts similar to an idea, so you never make Mandi repeat herself. Returns up to 8 matches with id, status, account, and a snippet. Always search before drafting.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'keywords or theme to search for' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_account_voice',
    description:
      "Get an account's voice/brand details (tone, core message, transformation, sample hooks) before drafting for it. Call this so the draft actually sounds like that account.",
    input_schema: {
      type: 'object',
      properties: { account_id: { type: 'string' } },
      required: ['account_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_post_card',
    description:
      'Draft a PROPOSED post-card for Mandi to review. Propose-only: saved as an in_progress draft, never published. On-screen hook and caption first line must be DIFFERENT doors. No calls-to-action.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        title: { type: 'string', description: 'short internal label' },
        onscreen_text: { type: 'string', description: 'the on-screen hook (or numbered slide lines for a carousel)' },
        caption: { type: 'string', description: 'the caption body; its first line must differ from the on-screen hook' },
        hashtags: { type: 'string' },
        type: { type: 'string', enum: ['post', 'video', 'carousel', 'image', 'other'] },
      },
      required: ['account_id', 'title', 'onscreen_text', 'caption'],
      additionalProperties: false,
    },
  },
  {
    name: 'park_idea',
    description:
      "Park an idea that needs something only Mandi knows (a detail, an ending, a number) before it can be written honestly. Saved as 'held' with the one question it's waiting on. Use this instead of inventing details.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        idea: { type: 'string', description: "the original idea in Mandi's words" },
        question: { type: 'string', description: 'the single thing only Mandi can answer' },
        account_id: { type: 'string', description: 'best-guess account id, or leave empty' },
      },
      required: ['title', 'idea', 'question'],
      additionalProperties: false,
    },
  },
]

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

// Execute one client tool. Returns a plain-text result handed back to the model.
function runTool(name: string, input: Record<string, unknown>, created: CreatedItem[]): string {
  switch (name) {
    case 'search_past_posts': {
      const q = str(input.query).toLowerCase().trim()
      if (!q) return 'Empty query.'
      const hits = getAllContent()
        .filter(c =>
          `${c.title} ${c.description} ${c.onscreen_text ?? ''} ${c.source_context ?? ''}`.toLowerCase().includes(q),
        )
        .slice(0, 8)
      if (!hits.length) return 'No similar past posts found — this idea looks new.'
      return hits
        .map(c => `#${c.id} [${c.status}${c.account_id ? ', ' + c.account_id : ''}] ${c.title} — ${(c.description || c.onscreen_text || '').slice(0, 120)}`)
        .join('\n')
    }
    case 'get_account_voice': {
      const a = getBrandAccount(str(input.account_id))
      if (!a) return `No account with id "${str(input.account_id)}". Use one of the ids from the list.`
      return JSON.stringify({
        id: a.id,
        handle: a.handle,
        brand: a.brand_name,
        topic: a.topic,
        tone: a.tone,
        message: a.underlying_message,
        transformation: a.transformation,
        sample_hooks: (a.hooks ?? []).slice(0, 4),
      })
    }
    case 'create_post_card': {
      const p = createContent({
        title: str(input.title, 'Untitled'),
        onscreen_text: str(input.onscreen_text),
        description: str(input.caption),
        hashtags: str(input.hashtags),
        type: (str(input.type, 'post') as ContentPiece['type']),
        account_id: input.account_id ? str(input.account_id) : null,
        status: 'in_progress',
        river_source: 'sorting-hat',
      })
      created.push({ id: p.id, status: p.status, account_id: p.account_id ?? null, title: p.title })
      return `Draft created: post-card #${p.id} for ${p.account_id || 'unassigned'} (in_progress — awaiting Mandi's review).`
    }
    case 'park_idea': {
      const p = createContent({
        title: str(input.title, 'Parked idea'),
        description: '',
        source_context: str(input.idea),
        open_questions: [str(input.question)],
        account_id: input.account_id ? str(input.account_id) : null,
        status: 'held',
        river_source: 'sorting-hat',
      })
      created.push({ id: p.id, status: p.status, account_id: p.account_id ?? null, title: p.title })
      return `Parked: #${p.id} — waiting on: "${str(input.question)}".`
    }
    default:
      return `Unknown tool "${name}".`
  }
}

export async function runSortingHat(rawInput: string): Promise<SortingHatResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it in Railway so the Sorting Hat can think.')

  const accounts = getAllBrandAccounts()
    .map(a => `- ${a.id} — ${a.handle || '(no handle)'} — ${a.brand_name || ''} (${a.topic || ''})`)
    .join('\n')

  const system = `You are the Sorting Hat inside Mandi's content command center.
Mandi hands you a raw brain-dump — a thought, a story, a moment from her day. Decide what to DO with it using your tools, then stop.

Your process for each idea:
1. search_past_posts FIRST so you never make her repeat herself. If it's a near-duplicate, say so and don't re-draft.
2. Pick the right account from this list, then get_account_voice before drafting:
${accounts}
3. If the idea is ready, create_post_card in that account's voice.
4. If it needs something only Mandi knows (a detail, an ending, a number), DON'T invent it — park_idea with the one question it's waiting on.

Hard rules:
- PROPOSE ONLY. Everything you make is a draft for Mandi to review. You never publish.
- NO calls-to-action in the copy — her accounts are in a trust-building growth phase.
- TWO DIFFERENT HOOKS: the on-screen hook and the caption's first line must open different doors; never the same sentence twice.
- Voice: warm, direct, plain English, real. Show, don't tell.
- One brain-dump may become more than one post only if it truly holds more than one story — don't pad.
- When finished, stop and write a 1–2 sentence summary of what you did and why.`

  const trace: TraceStep[] = []
  const created: CreatedItem[] = []
  const messages: Array<Record<string, unknown>> = [{ role: 'user', content: rawInput }]
  let summary = ''

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
      body: JSON.stringify({ model: AGENT_MODEL, max_tokens: 4000, system, tools: TOOLS, messages }),
    })
    const data = (await res.json()) as AnthropicMsg
    if (!res.ok) throw new Error(`Sorting Hat API error (${res.status}): ${data?.error?.message ?? 'unknown error'}`)
    logUsage({
      provider: 'anthropic',
      model: AGENT_MODEL,
      kind: 'sorting-hat',
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    })

    const blocks = data.content ?? []
    for (const b of blocks) if (b.type === 'text' && b.text?.trim()) trace.push({ type: 'thinking', text: b.text.trim() })

    const toolUses = blocks.filter(b => b.type === 'tool_use')
    if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
      summary = blocks.filter(b => b.type === 'text').map(b => b.text ?? '').join('\n').trim()
      break
    }

    // Echo the assistant turn back (full content), then return every tool result in one user turn.
    messages.push({ role: 'assistant', content: blocks })
    const results = toolUses.map(tu => {
      const out = runTool(tu.name ?? '', tu.input ?? {}, created)
      trace.push({ type: 'action', tool: tu.name ?? '', input: tu.input, result: out })
      return { type: 'tool_result', tool_use_id: tu.id, content: out }
    })
    messages.push({ role: 'user', content: results })
  }

  if (!summary) summary = `Reached the ${MAX_STEPS}-step limit. Created ${created.length} item(s) — review them in the queue.`
  trace.push({ type: 'done', summary })
  return { summary, trace, created }
}
