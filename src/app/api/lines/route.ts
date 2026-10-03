import { NextRequest, NextResponse } from 'next/server'
import {
  getLines, createLine, updateLine, countActiveLines, getRecentLineTexts,
  getBrandAccount, getAllNotes, getAudienceContext, logActivity,
} from '@/lib/db'
import { accountHashtags } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// THE LINES FEED — a calm, text-first surface that hands Mandi copy-ready reel words
// and gets out of the way. She films trials in CapCut/Edits; RISE just supplies the
// words (+ an audio vibe and a b-roll idea). We keep ~TARGET active Lines per account,
// rolling: when she uses or 👎s one, we top the account back up. No posting here.

const TARGET = 7          // keep ~6-8 active per account
const LOW = 5             // replenish when active dips below this
const BATCH = 4           // how many to generate per replenish

// HARD GUARDRAIL — protects every real person in Mandi's life. Injected into every
// generation so no Line ever names or blames a real person, or tells her reader to
// stay or leave. (From Mandi's explicit instruction.)
const PROTECT = `GUARDRAIL: never name or blame a real person (mom, partner, family). Make it the belief she absorbed ("I learned my feelings were too much") or speak to the reader — never "my mom/husband said." No "stay or leave." When unsure, point to her own knowing.`

async function generateLines(accountId: string, count: number): Promise<number> {
  const acct = getBrandAccount(accountId)
  if (!acct) return 0

  // Voice + positioning: pinned Notes (esp. #197 — her voice/story), the account's
  // own config, its one reader, and the latest weekly trend signal.
  const notes = getAllNotes()
  const note197 = notes.find(n => n.id === 197)
  const reader = (getAudienceContext(acct.audience_id) || '').slice(0, 280)
  const trendNote = notes.find(n => /Weekly Trends|#/.test(n.title ?? '') && (n.tags ?? []).includes('trends'))
  const trend = trendNote?.body ? trendNote.body.slice(0, 260) : ''
  const avoid = getRecentLineTexts(accountId, 12)

  // @theknowingis gets its specific voice + reader + the one hard rule, in one line.
  const special = accountId === 'mandijoybeck'
    ? `This account (@theknowingis): silly-serious, strangely specific, spiritual-atheist, owns "inner child," humor is core. Reader: the woman unsure whether to stay in her relationship, intuition gone quiet from keeping the peace. HARD RULE: every line points her back to HER OWN intuition — never toward stay or leave.`
    : `This account: ${acct.tone || ''}. ${acct.underlying_message || ''}`

  // LEAN brief — no full craft dump, no pinned stack. Short + directive = far less
  // thinking per run. Core voice rules distilled to one line.
  const instructions = `Write in Mandi's voice: ONE scroll-stopping statement (never a question), show don't tell, speak straight to the woman reading, strangely specific beats clever, earned humor never a lecture.
${PROTECT}
${special}
Reader: ${reader || 'the capable, funny, invisible woman quietly sure she is meant for more'}${note197 ? `\nHer voice/story: ${(note197.body ?? '').slice(0, 450)}` : ''}${trend ? `\nTrending now (mirror the rhythm, use her story): ${trend}` : ''}${avoid.length ? `\nDon't repeat: ${avoid.join(' / ')}` : ''}

Write ${count} LINES for ${acct.handle}. Each = 4 short parts:
- "line": the on-screen statement
- "caption": her voice, spaced; do NOT add hashtags
- "audio_tone": 2-4 words (e.g. "soft cozy lo-fi")
- "broll_scene": a filmable scene (e.g. "hands journaling by candlelight")
Return ONLY JSON: {"lines":[{"line","caption","audio_tone","broll_scene"}]} — ${count} entries, no preamble.`

  type Item = { line?: string; caption?: string; audio_tone?: string; broll_scene?: string }
  const input = `Write ${count} fresh Lines for ${acct.handle}. Make each one specific enough that only she could have written it.`
  const extract = (raw: string): Item[] => {
    const obj = raw.match(/\{[\s\S]*\}/)?.[0]
    if (obj) { try { const p = JSON.parse(obj); if (Array.isArray(p?.lines)) return p.lines } catch { /* try array */ } }
    const arr = raw.match(/\[[\s\S]*\]/)?.[0]
    if (arr) { try { const p = JSON.parse(arr); if (Array.isArray(p)) return p } catch { /* give up */ } }
    return []
  }
  // Lean prompt → modest thinking; 3000 holds thinking + the JSON comfortably.
  let items = extract(await fableText({ useClaude: true, json: true, maxTokens: 3000, instructions, input }))
  if (!items.length) items = extract(await fableText({ useClaude: true, json: true, maxTokens: 3000, instructions, input }))

  // Append the account's AGREED hashtag set to every caption, verbatim (never invented).
  const tags = accountHashtags(accountId)
  const tagLine = tags.join(' ')
  const haveSet = new Set(avoid.map(a => a.trim().toLowerCase()))
  let made = 0
  for (const it of items) {
    const line = (it.line ?? '').trim()
    if (!line || haveSet.has(line.toLowerCase())) continue      // no repeats
    haveSet.add(line.toLowerCase())
    const capBody = (it.caption ?? '').trim()
    const caption = tagLine ? `${capBody}\n\n${tagLine}` : capBody
    createLine({
      account_id: accountId,
      line,
      caption,
      audio_tone: (it.audio_tone ?? '').trim(),
      broll_scene: (it.broll_scene ?? '').trim(),
    })
    made++
  }
  return made
}

// Top an account back up to TARGET if it has dipped below LOW (best-effort, awaited).
async function replenish(accountId: string): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) return 0
  const active = countActiveLines(accountId)
  if (active >= LOW) return 0
  try {
    const made = await generateLines(accountId, Math.max(BATCH, TARGET - active))
    if (made) logActivity({ type: 'note', title: `Refilled Lines for ${accountId}`, detail: `+${made} fresh lines`, icon: '✍️', source: 'lines' })
    return made
  } catch { return 0 }
}

// GET /api/lines?account=mandijoybeck  → active lines (newest first), auto-replenished.
// GET /api/lines                        → all active lines across accounts.
export async function GET(req: NextRequest) {
  const account = new URL(req.url).searchParams.get('account') || undefined
  if (account) await replenish(account)
  return NextResponse.json({ lines: getLines({ accountId: account }) })
}

// POST actions:
//   { account, more:true }  → generate a fresh batch for that account ("More like this")
//   { id, used:true }       → mark used, then top that account back up
//   { id, dismiss:true }    → 👎 dismiss, then top that account back up
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (body.id != null && (body.used || body.dismiss)) {
    const row = updateLine(Number(body.id), body.used ? { used: true } : { dismissed: true })
    if (!row) return NextResponse.json({ error: 'line not found' }, { status: 404 })
    const refilled = await replenish(row.account_id)
    return NextResponse.json({ ok: true, refilled, lines: getLines({ accountId: row.account_id }) })
  }

  if (body.more && body.account) {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'No writer key set — add ANTHROPIC_API_KEY in Railway.' }, { status: 400 })
    }
    try {
      const made = await generateLines(String(body.account), BATCH)
      if (!made) return NextResponse.json({ error: 'The writer came back empty — try again.' }, { status: 502 })
      return NextResponse.json({ ok: true, made, lines: getLines({ accountId: String(body.account) }) })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'generation failed' }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'nothing to do' }, { status: 400 })
}
