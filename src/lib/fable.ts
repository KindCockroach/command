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

// ── The Commander AGENT — the same partner, with real hands ───────────────────
// commanderChat above is text-only (the daily briefing and Podcast tab use it).
// commanderAgent is the tool loop: the model asks for tools, we run them, EVERY
// result goes back to the model, and we loop until it stops asking. The reply can
// therefore only describe what a tool result actually confirmed, and the receipts
// are the ground truth the UI shows next to it.
export type AgentBlock = { type: string; text?: string; id?: string; name?: string; input?: unknown; [k: string]: unknown }
export type AgentMessage = { role: 'user' | 'assistant'; content: unknown }
export type AgentToolResult = { ok: true; summary: string; data?: unknown; openShred?: string } | { ok: false; error: string }
export type AgentReceipt = { tool: string; ok: boolean; summary: string; openShred?: string }
export type AgentModelTurn = { content: AgentBlock[]; stop_reason: string | null; inputTokens?: number; outputTokens?: number }
export type AgentModelCall = (req: { system: string; messages: AgentMessage[]; tools: unknown[]; maxTokens: number }) => Promise<AgentModelTurn>

export const COMMANDER_MAX_STEPS = 8

// One streamed model call, rebuilt into whole content blocks (text, thinking,
// tool_use) exactly as the API sent them so they can be passed back unchanged.
// Stream errors THROW — nothing is swallowed.
const callCommanderModel: AgentModelCall = async ({ system, messages, tools, maxTokens }) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it in Railway so the Commander can think.')
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    body: JSON.stringify({ model: COMMANDER_MODEL, max_tokens: maxTokens, thinking: { type: 'adaptive' }, system, tools, messages, stream: true }),
  })
  if (!res.ok || !res.body) {
    let msg = 'unknown error'
    try { msg = ((await res.json()) as AnthropicResponse)?.error?.message ?? msg } catch { /* non-JSON error body */ }
    throw new Error(`Commander API error (${res.status}): ${msg}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const blocks: AgentBlock[] = []
  const partialJson: Record<number, string> = {}
  let buf = '', stop: string | null = null, inTok = 0, outTok = 0, sawStop = false
  const handle = (payload: string) => {
    let evt: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    try { evt = JSON.parse(payload) } catch { throw new Error('Commander stream sent a line that was not valid JSON — the reply is incomplete.') }
    if (evt.type === 'error') throw new Error(`Commander stream error: ${evt.error?.message ?? 'unknown'}`)
    if (evt.type === 'message_start') inTok = evt.message?.usage?.input_tokens ?? 0
    else if (evt.type === 'content_block_start') { blocks[evt.index] = { ...evt.content_block }; if (evt.content_block?.type === 'tool_use') partialJson[evt.index] = '' }
    else if (evt.type === 'content_block_delta') {
      const b = blocks[evt.index]; const d = evt.delta
      if (!b || !d) return
      if (d.type === 'text_delta') b.text = (b.text ?? '') + d.text
      else if (d.type === 'thinking_delta') b.thinking = String(b.thinking ?? '') + d.thinking
      else if (d.type === 'signature_delta') b.signature = String(b.signature ?? '') + d.signature
      else if (d.type === 'input_json_delta') partialJson[evt.index] = (partialJson[evt.index] ?? '') + d.partial_json
    } else if (evt.type === 'message_delta') {
      if (evt.delta?.stop_reason) stop = evt.delta.stop_reason
      if (evt.usage?.output_tokens != null) outTok = evt.usage.output_tokens
    } else if (evt.type === 'message_stop') sawStop = true
  }
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
      if (payload && payload !== '[DONE]') handle(payload)
    }
  }
  logUsage({ provider: 'anthropic', model: COMMANDER_MODEL, kind: 'commander', inputTokens: inTok, outputTokens: outTok })
  if (!sawStop) throw new Error('Commander stream ended early — the connection dropped before the reply finished.')
  // Tool inputs arrive as JSON fragments; parse each whole. A broken one is kept
  // as an empty input and flagged so the loop reports it as a failed call.
  for (const [idx, raw] of Object.entries(partialJson)) {
    const b = blocks[Number(idx)]
    if (!b) continue
    try { b.input = raw.trim() ? JSON.parse(raw) : {} } catch { b.input = {}; b._badInput = true }
  }
  return { content: blocks.filter(Boolean), stop_reason: stop, inputTokens: inTok, outputTokens: outTok }
}

const blockText = (blocks: AgentBlock[]) => blocks.filter(b => b.type === 'text' && typeof b.text === 'string').map(b => b.text as string).join('').trim()

export async function commanderAgent(opts: {
  system: string
  messages: AgentMessage[]
  tools: unknown[]
  runTool: (name: string, input: unknown) => Promise<AgentToolResult>
  maxTokens?: number
  maxSteps?: number
  callModel?: AgentModelCall   // swappable so the loop can be tested without a key
}): Promise<{ reply: string; receipts: AgentReceipt[] }> {
  const call = opts.callModel ?? callCommanderModel
  const maxSteps = opts.maxSteps ?? COMMANDER_MAX_STEPS
  const messages: AgentMessage[] = [...opts.messages]
  const receipts: AgentReceipt[] = []
  const said: string[] = []   // text she should see, across every step
  const finish = (note?: string) => ({ reply: [...said, ...(note ? [note] : [])].filter(Boolean).join('\n\n').trim(), receipts })

  for (let step = 0; step < maxSteps; step++) {
    let turn: AgentModelTurn
    try {
      turn = await call({ system: opts.system, messages, tools: opts.tools, maxTokens: opts.maxTokens ?? 16000 })
    } catch (e) {
      // Nothing has run yet → a plain failure. Tools already ran → keep their
      // receipts and say exactly where it broke.
      if (!receipts.length && !said.length) throw e
      return finish(`⚠ I hit an error partway through and stopped: ${e instanceof Error ? e.message : String(e)}. What actually ran is listed below — anything not listed did not happen.`)
    }
    const text = blockText(turn.content)
    if (text) said.push(text)
    const toolUses = turn.content.filter(b => b.type === 'tool_use')

    if (turn.stop_reason === 'max_tokens') {
      return finish(`⚠ My reply was cut off (it hit the length limit)${toolUses.length ? ', so the actions I was about to take did NOT run' : ''}. Ask me to continue, or to do it in smaller pieces.`)
    }
    if (turn.stop_reason === 'refusal') {
      return finish('⚠ The model declined to answer this one (its safety filter stopped the reply). Nothing further was done.')
    }
    if (turn.stop_reason !== 'tool_use' || !toolUses.length) {
      return finish(said.length ? undefined : '⚠ The model returned an empty reply. Nothing was done — try asking again.')
    }

    // Pass the assistant turn back UNCHANGED (thinking blocks included), then
    // every tool result in ONE user message.
    messages.push({ role: 'assistant', content: turn.content.map(b => { const { _badInput, ...rest } = b; void _badInput; return rest }) })
    // One at a time, in the order asked — the database is a single JSON file.
    const results: Record<string, unknown>[] = []
    for (const tu of toolUses) {
      const name = tu.name ?? ''
      let r: AgentToolResult
      if (tu._badInput) r = { ok: false, error: `the inputs for ${name} arrived as invalid JSON, so it did not run.` }
      else {
        try { r = await opts.runTool(name, tu.input ?? {}) }
        catch (e) { r = { ok: false, error: `${name} threw an error: ${e instanceof Error ? e.message : String(e)}` } }
      }
      receipts.push(r.ok ? { tool: name, ok: true, summary: r.summary, ...(r.openShred ? { openShred: r.openShred } : {}) } : { tool: name, ok: false, summary: r.error })
      results.push({
        type: 'tool_result', tool_use_id: tu.id,
        content: JSON.stringify(r.ok ? { ok: true, summary: r.summary, data: r.data ?? null } : { ok: false, error: r.error }),
        ...(r.ok ? {} : { is_error: true }),
      })
    }
    messages.push({ role: 'user', content: results })
  }
  return finish(`⚠ I stopped after ${maxSteps} rounds of tool use without finishing. What actually ran is listed below — anything not listed did not happen. Tell me what to pick up next.`)
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
