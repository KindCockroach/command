// The writer. All POST content is generated through here.
// One switch point: change the model in this file and every generator follows.
//
// Mixed GPT-4o setup (chosen 2026-07 for cost while pre-revenue):
//   • WRITER_MODEL (gpt-4o) — the real writing.
//   • CHEAP_MODEL (gpt-4o-mini) — tiny jobs (classification, distilling a voice
//     lesson): pass cheap:true. A fraction of the cost, plenty smart for the task.
// Needs OPENAI_API_KEY (Railway). The live-web Researcher below stays on Opus 4.8
// because it needs the server-side web_search tool 4o doesn't carry here.
import OpenAI from 'openai'

export const WRITER_MODEL = 'gpt-4o'
export const CHEAP_MODEL = 'gpt-4o-mini'
export const FABLE_MODEL = WRITER_MODEL // back-compat alias for older imports
export const COMMANDER_MODEL = 'claude-fable-5' // the Commander's reasoning brain — worth the premium

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

type Effort = 'low' | 'medium' | 'high'

type TextBlock = { type: string; text?: string }
type AnthropicResponse = {
  content?: TextBlock[]
  stop_reason?: string | null
  error?: { message?: string }
}

let _client: OpenAI | null = null
function openai(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

// Returns the plain text the writer produced.
// `effort` is accepted for call-site compatibility (older Fable calls) but 4o
// ignores it. `cheap:true` routes tiny jobs to gpt-4o-mini.
export async function fableText(opts: {
  instructions: string
  input: string
  maxTokens?: number
  effort?: Effort   // accepted for back-compat; ignored by 4o
  cheap?: boolean   // route classification/distillation to gpt-4o-mini
  imageUrl?: string
  imageUrls?: string[]
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set — add it in Railway → Variables so the writer can work.')
  }

  // When images are attached (a photo, or sampled video frames), 4o looks at them.
  const images = [opts.imageUrl, ...(opts.imageUrls ?? [])].filter(Boolean) as string[]
  const messages: Array<Record<string, unknown>> = [{ role: 'system', content: opts.instructions }]
  messages.push(
    images.length
      ? { role: 'user', content: [
          { type: 'text', text: opts.input },
          ...images.map(url => ({ type: 'image_url', image_url: { url } })),
        ] }
      : { role: 'user', content: opts.input },
  )

  const res = await openai().chat.completions.create({
    model: opts.cheap ? CHEAP_MODEL : WRITER_MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    messages: messages as never,
  })

  return (res.choices[0]?.message?.content ?? '').trim()
}

// ── The Commander — Mandi's conversational partner, on Claude Fable 5 ─────────
// A real back-and-forth thinker. Content generation stays on cheap 4o; THIS is the
// high-value reasoning surface, so it gets the most capable model.
export async function commanderChat(system: string, messages: { role: 'user' | 'assistant'; content: unknown }[], maxTokens = 1600): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it in Railway so the Commander can think.')
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    body: JSON.stringify({ model: COMMANDER_MODEL, max_tokens: maxTokens, system, messages }),
  })
  const data = (await res.json()) as AnthropicResponse
  if (!res.ok) throw new Error(`Commander API error (${res.status}): ${data?.error?.message ?? 'unknown error'}`)
  return (data.content ?? []).filter(b => b.type === 'text' && typeof b.text === 'string').map(b => b.text as string).join('').trim()
}

// ── The Researcher — live web search with a heavyweight thinker ───────────────
// Uses Claude Opus 4.8 + the server-side web_search tool (Fable doesn't carry
// the search tool; Opus 4.8 is the intelligent reader/curator this job needs).
// Handles pause_turn (server tool loop limit) by resuming until done.
export async function researchWithWeb(opts: {
  instructions: string
  input: string
  maxTokens?: number
  maxSearches?: number
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — add it in Railway → Variables so the researcher can work.')
  }

  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  }

  let messages: Array<Record<string, unknown>> = [{ role: 'user', content: opts.input }]
  let final: AnthropicResponse | null = null

  // Resume across pause_turn up to 5 times (server-side search loop limit)
  for (let i = 0; i < 5; i++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: opts.maxTokens ?? 8000,
        system: opts.instructions,
        thinking: { type: 'adaptive' },
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: opts.maxSearches ?? 8 }],
        messages,
      }),
    })
    const data = (await res.json()) as AnthropicResponse & { content?: Array<Record<string, unknown>> }
    if (!res.ok) {
      throw new Error(`Researcher API error (${res.status}): ${(data as AnthropicResponse)?.error?.message ?? 'unknown error'}`)
    }
    final = data as AnthropicResponse
    if (data.stop_reason !== 'pause_turn') break
    // Paused mid-search — echo the assistant turn back and let it resume
    messages = [...messages, { role: 'assistant', content: data.content }]
  }

  return ((final?.content ?? []) as TextBlock[])
    .filter(b => b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text as string)
    .join('')
    .trim()
}
