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
import { logUsage } from './usage'

export const WRITER_MODEL = 'gpt-4o'
export const CHEAP_MODEL = 'gpt-4o-mini'
export const FABLE_MODEL = WRITER_MODEL // back-compat alias for older imports
// THE QUALITY WRITER — every door that writes real copy (captions, hooks, kits,
// 3-pack, story) routes here via useClaude. Sonnet 5 is the cost-effective quality
// pick: ~60% cheaper than Opus ($3/$15 vs $5/$25 per-M — intro $2/$10 through
// 2026-08-31) and far above gpt-4o's "generic voice" ceiling that produced the
// question hooks and paraphrase. Change THIS one line to move every writer at once
// (→ 'claude-opus-4-8' for max quality, 'claude-fable-5' for top-tier).
export const WRITER_CLAUDE = 'claude-sonnet-5'
// Opus 4.8 stays on the Commander — the partner Mandi talks to, low volume, high
// value. Content generation no longer rides this (it's on WRITER_CLAUDE now).
export const COMMANDER_MODEL = 'claude-opus-4-8'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

type Effort = 'low' | 'medium' | 'high'

type TextBlock = { type: string; text?: string }
type AnthropicResponse = {
  content?: TextBlock[]
  stop_reason?: string | null
  error?: { message?: string }
  usage?: { input_tokens?: number; output_tokens?: number }
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
  useClaude?: boolean // route real caption-writing to Opus 4.8 (better voice; can't hold vision here)
  json?: boolean    // force valid JSON output (gpt-4o json mode) — for big structured deliverables
  imageUrl?: string
  imageUrls?: string[]
}): Promise<string> {
  // When images are attached (a photo, or sampled video frames), 4o looks at them.
  const images = [opts.imageUrl, ...(opts.imageUrls ?? [])].filter(Boolean) as string[]

  // Quality caption-writing (no image to see) → Opus 4.8. gpt-4o swings between
  // flat-paraphrase and purple prose; Opus holds "elevated AND plain".
  if (opts.useClaude && !opts.cheap && images.length === 0 && process.env.ANTHROPIC_API_KEY) {
    return fableHooks(opts.instructions, opts.input, opts.maxTokens ?? 4000, 'content')
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set — add it in Railway → Variables so the writer can work.')
  }
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
    ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
  })

  logUsage({
    provider: 'openai',
    model: opts.cheap ? CHEAP_MODEL : WRITER_MODEL,
    kind: 'content',
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: res.usage?.completion_tokens ?? 0,
  })

  return (res.choices[0]?.message?.content ?? '').trim()
}

// ── The Commander — Mandi's conversational partner, on Claude Fable 5 ─────────
// A real back-and-forth thinker. Content generation stays on cheap 4o; THIS is the
// high-value reasoning surface, so it gets the most capable model.
export async function commanderChat(system: string, messages: { role: 'user' | 'assistant'; content: unknown }[], maxTokens = 16000): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it in Railway so the Commander can think.')
  // STREAM the reply. A long turn (a multi-slide carousel + its ```actions``` block)
  // plus adaptive thinking used to blow past the old 4000 cap and truncate — cutting
  // the buttons off ("tap to queue" with nothing to tap, replies ending mid-word).
  // Streaming keeps the connection alive and lets big replies finish inside the timeout.
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    body: JSON.stringify({ model: COMMANDER_MODEL, max_tokens: maxTokens, thinking: { type: 'adaptive' }, system, messages, stream: true }),
  })
  if (!res.ok || !res.body) {
    let msg = 'unknown error'
    try { msg = ((await res.json()) as AnthropicResponse)?.error?.message ?? msg } catch { /* non-JSON */ }
    // Claude's OWN safety filter occasionally blocks legit output (e.g. a music /
    // culture post mentioning a rapper's lyric) with a 400. Don't dead-end her —
    // retry the SAME turn on gpt-4o, which doesn't carry that filter, so her content
    // still comes through (actions block and all). Slightly less sharp voice, only
    // on the rare blocked turn.
    if (res.status === 400 && /content.?filter|blocked|filtering/i.test(msg)) {
      const convo = messages
        .map(m => `${m.role === 'assistant' ? 'RISE' : 'Mandi'}: ${typeof m.content === 'string' ? m.content : '[image or attachment]'}`)
        .join('\n\n')
      return await fableText({ instructions: system, input: convo, maxTokens: Math.min(maxTokens, 16000) })
    }
    throw new Error(`Commander API error (${res.status}): ${msg}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = '', text = '', inTok = 0, outTok = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const s = line.trim()
      if (!s.startsWith('data:')) continue
      const payload = s.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const evt = JSON.parse(payload)
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') text += evt.delta.text
        else if (evt.type === 'message_start') inTok = evt.message?.usage?.input_tokens ?? 0
        else if (evt.type === 'message_delta' && evt.usage?.output_tokens != null) outTok = evt.usage.output_tokens
        else if (evt.type === 'error') throw new Error(evt.error?.message ?? 'stream error')
      } catch (e) { if (e instanceof Error && e.message !== 'Unexpected end of JSON input') { /* skip partial */ } }
    }
  }
  logUsage({ provider: 'anthropic', model: COMMANDER_MODEL, kind: 'commander', inputTokens: inTok, outputTokens: outTok })
  return text.trim()
}

// ── The Hook Writer — Claude Fable 5 on the two hardest lines ─────────────────
// Hybrid content: Fable writes the scarce, high-value lines (the scroll-stopping
// on-screen hook + the caption's first sentence); cheap 4o writes the body,
// anchored to them. Fable's judgment is exactly where 4o's "generic voice"
// problem lives, so buying it only for these two lines is the cost/quality sweet spot.
export async function fableHooks(system: string, input: string, maxTokens = 3000, kind = 'hooks', _effort: Effort = 'high'): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — needed for the writer.')
  // STREAM the response. A big non-streamed reply (high max_tokens + thinking)
  // hits the request timeout — this is exactly the case the Claude API warns about.
  // Streaming keeps the connection alive with data and lets long kits finish.
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    body: JSON.stringify({ model: WRITER_CLAUDE, max_tokens: maxTokens, thinking: { type: 'adaptive' }, system, messages: [{ role: 'user', content: input }], stream: true }),
  })
  if (!res.ok || !res.body) {
    let msg = 'unknown error'
    try { msg = ((await res.json()) as AnthropicResponse)?.error?.message ?? msg } catch { /* non-JSON */ }
    throw new Error(`Fable API error (${res.status}): ${msg}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let text = ''
  let inTok = 0
  let outTok = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const s = line.trim()
      if (!s.startsWith('data:')) continue
      const payload = s.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const evt = JSON.parse(payload)
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') text += evt.delta.text
        else if (evt.type === 'message_start') inTok = evt.message?.usage?.input_tokens ?? 0
        else if (evt.type === 'message_delta' && evt.usage?.output_tokens != null) outTok = evt.usage.output_tokens
        else if (evt.type === 'error') throw new Error(evt.error?.message ?? 'stream error')
      } catch (e) { if (e instanceof Error && e.message !== 'Unexpected end of JSON input') { /* skip partial */ } }
    }
  }
  logUsage({ provider: 'anthropic', model: WRITER_CLAUDE, kind, inputTokens: inTok, outputTokens: outTok })
  return text.trim()
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
  let inTok = 0
  let outTok = 0

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
    inTok += final.usage?.input_tokens ?? 0
    outTok += final.usage?.output_tokens ?? 0
    if (data.stop_reason !== 'pause_turn') break
    // Paused mid-search — echo the assistant turn back and let it resume
    messages = [...messages, { role: 'assistant', content: data.content }]
  }

  logUsage({ provider: 'anthropic', model: 'claude-opus-4-8', kind: 'research', inputTokens: inTok, outputTokens: outTok })

  return ((final?.content ?? []) as TextBlock[])
    .filter(b => b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text as string)
    .join('')
    .trim()
}
