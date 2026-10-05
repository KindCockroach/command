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

  // The voice, pinned by CONTRAST. GOOD = strangely-specific with a wry, slightly
  // absurd turn that reveals the self-abandonment (silly-serious). BAD = plain, earnest
  // one-liners that STATE the moral. Write like GOOD, never BAD.
  const GOOD = [
    `You've rehearsed 'we need to talk' in the shower so many times the conditioner bottle knows it by heart.`,
    `You've catalogued five meanings of his exhale. You've never once translated your own.`,
    `You alphabetized the spice rack at midnight. The cumin didn't ask for that.`,
  ].join('\n')
  const BAD = [
    `You practice your "I'm okay" voice in the driveway before you even unlock the door.`,
    `You check your horoscope before you check in with yourself.`,
  ].join('\n')

  const special = accountId === 'mandijoybeck'
    ? `WHO SHE IS: the woman unsure whether to stay in her relationship, intuition gone quiet from years of keeping the peace. She reads everyone else's signals fluently and her own not at all.
HARD RULE: every line quietly shows her abandoning her OWN knowing — never toward "stay," never toward "leave."`
    : `This account: ${acct.tone || ''}. ${acct.underlying_message || ''}`

  const instructions = `Write in Mandi's voice. The form is "You [one hyper-specific self-abandoning or peace-keeping behavior]" — usually with a second beat: a wry, slightly absurd TURN that reveals the self-abandonment without naming it. Second person. A statement, never a question.
Her voice is SILLY-SERIOUS and strangely specific. The humor is the point, not a decoration — a real mundane detail taken one absurd step ("the cumin didn't ask for that", "the conditioner bottle knows it by heart"). Do NOT write her plain and earnest, and NEVER state the moral/lesson outright ("check your horoscope before you check in with yourself" is dead — it explains itself). Let the weird specific turn carry it; she feels caught, then laughs, then aches a little.

WRITE LIKE THESE (strangely specific, a wry absurd turn, silly-serious):
${GOOD}

NOT LIKE THESE (too plain and earnest — they state the lesson instead of letting a specific turn reveal it):
${BAD}

TWO HARD BANS:
1. NEVER shame, scold, diagnose, or name-call the reader (no "you chickened out", no "you're the problem"). You're a peer who does it too, not her therapist.
2. The caption must be COHERENT ON ITS OWN — never reference a prop/image the reader can't see ("still has the plastic peeled off" is meaningless without the picture). Plain and self-contained.
${PROTECT}
${special}
${note197 ? `Her voice/story: ${(note197.body ?? '').slice(0, 300)}\n` : ''}${trend ? `Trending now (mirror the rhythm): ${trend}\n` : ''}${avoid.length ? `Don't repeat: ${avoid.join(' / ')}\n` : ''}
Write ${count} LINES for ${acct.handle}. Each = 4 short parts:
- "line": the on-screen statement, in the GOOD register above
- "caption": her same silly-serious, specific voice — 2-4 short lines that stay WITH the recognition, self-contained, no advice or fixing, no hashtags
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
