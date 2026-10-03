import { NextRequest, NextResponse } from 'next/server'
import {
  getLines, createLine, updateLine, countActiveLines, getRecentLineTexts,
  getBrandAccount, getAllNotes, getAudienceContext, logActivity,
} from '@/lib/db'
import { craftFor, accountHashtags } from '@/lib/craft'
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
const PROTECT = `HARD GUARDRAIL — protect every real person:
- NEVER name or make identifiable a real person in Mandi's life (mom, partner, family, friends), and NEVER attribute a hurtful line or action to them.
- Transmute it into the internalized BELIEF ("I learned my feelings were too much") or speak to the READER ("if you were the dramatic one"), never "my mom/husband said."
- No private logistics, no villains, and NEVER "stay or leave."
- When in doubt, make it about the reader's own knowing, not Mandi's people.`

async function generateLines(accountId: string, count: number): Promise<number> {
  const acct = getBrandAccount(accountId)
  if (!acct) return 0

  // Voice + positioning: pinned Notes (esp. #197 — her voice/story), the account's
  // own config, its one reader, and the latest weekly trend signal.
  const notes = getAllNotes()
  const note197 = notes.find(n => n.id === 197)
  const pinned = notes.filter(n => n.pinned).slice(0, 6)
    .map(n => `• ${n.title}: ${(n.body ?? '').slice(0, 320)}`).join('\n')
  const reader = getAudienceContext(acct.audience_id)
  const trendNote = notes.find(n => /Weekly Trends|#/.test(n.title ?? '') && (n.tags ?? []).includes('trends'))
  const trendSignal = trendNote?.body ? trendNote.body.slice(0, 900) : ''
  const avoid = getRecentLineTexts(accountId, 40)

  // @theknowingis (mandijoybeck) gets its specific voice + its one reader + HARD RULE.
  const special = accountId === 'mandijoybeck'
    ? `\nTHIS ACCOUNT (@theknowingis): silly-serious, strangely specific, spiritual-atheist, owns "inner child," NEVER too self-serious — humor is core, not optional. It writes to ONE reader: the woman who doesn't know whether to stay in her relationship, whose intuition went quiet from years of keeping the peace.
HARD RULE: every line points her back to HER OWN intuition — never toward "stay," never toward "leave." You are not her advisor; you are the voice that reminds her she already knows.`
    : ''

  const instructions = `${craftFor(accountId)}

${PROTECT}

You are writing LINES for the calm Lines feed — fast, copy-ready reel words for ${acct.handle} (${acct.brand_name}). Each Line is FOUR short parts and nothing else:
1. "line" — ONE strangely-specific on-screen line (the text over the b-roll). Short, scroll-stopping, unmistakably her voice. A statement, never a question. Specific beats clever.
2. "caption" — the ready-to-post caption in her voice (real line breaks, spaced). Do NOT append hashtags yourself; they are added after.
3. "audio_tone" — 2-4 words for the trending-sound vibe to pair ("soft cozy lo-fi", "punchy trending beat", "slow emotional build").
4. "broll_scene" — a short, filmable scene idea ("you driving at dusk", "hands journaling by candlelight", "blanket over your head with headphones").
${special}

ACCOUNT VOICE: ${acct.tone || ''}. Underlying message: ${acct.underlying_message || ''}. ${(acct.beliefs ?? []).join(' ')}
ITS ONE READER:\n${reader || '(write to Bridget — the capable, funny, invisible woman sure she is meant for more)'}
${trendSignal ? `\nTRENDING LANGUAGE/FORMATS RIGHT NOW (mirror the rhythm, use her story):\n${trendSignal}` : ''}
${note197 ? `\nHER VOICE & STORY (Note #197):\n${(note197.body ?? '').slice(0, 1200)}` : ''}
${pinned ? `\nPINNED CONTEXT:\n${pinned}` : ''}
${avoid.length ? `\nDO NOT REPEAT or lightly reword any of these lines she already has:\n${avoid.map(a => `— ${a}`).join('\n')}` : ''}

Return ONLY a valid JSON object: { "lines": [ { "line": "...", "caption": "...", "audio_tone": "...", "broll_scene": "..." } ] } with exactly ${count} distinct entries. No preamble, no commentary.`

  type Item = { line?: string; caption?: string; audio_tone?: string; broll_scene?: string }
  // Big prompt + 4 entries + Sonnet 5 adaptive thinking: the budget must hold THINKING
  // AND the JSON, or text streams back empty (that's the 43s-then-empty failure).
  const input = `Write ${count} fresh Lines for ${acct.handle}. Make each one specific enough that only she could have written it.`
  const extract = (raw: string): Item[] => {
    // Accept either {"lines":[...]} or a bare [...] array.
    const obj = raw.match(/\{[\s\S]*\}/)?.[0]
    if (obj) { try { const p = JSON.parse(obj); if (Array.isArray(p?.lines)) return p.lines } catch { /* try array */ } }
    const arr = raw.match(/\[[\s\S]*\]/)?.[0]
    if (arr) { try { const p = JSON.parse(arr); if (Array.isArray(p)) return p } catch { /* give up */ } }
    return []
  }
  let items = extract(await fableText({ useClaude: true, json: true, maxTokens: 8000, instructions, input }))
  if (!items.length) items = extract(await fableText({ useClaude: true, json: true, maxTokens: 8000, instructions, input }))

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
