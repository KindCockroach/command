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

  // Lauren's REAL moments — the raw material. Every line is built from one of these
  // so she recognizes her exact life before the turn lands. (BTFH / @theknowingis.)
  const LAUREN = [
    `organic vs regular apples — she puts both back and grabs bananas`,
    `leaves 45 minutes early for a 12-minute drive, then sits in the parking lot`,
    `says yes when she means no, cancels last-minute, decides that's why she has no friends`,
    `the mom-friend she side-eyes but keeps scheduling (the only one free when she's free)`,
    `felt it day one — he went cold for two days when she disagreed — called herself "too sensitive," three years in`,
    `"is it him or is it me" — she studies his moods instead of her own body`,
    `the 4-year-old won't sleep in his own bed; she runs the mom-group's method over her own gut about HER kid`,
    `teacher says he's "a little behind"; her gut says he's just younger; she books the eval and cries in the car`,
    `orders whatever her friend orders to dodge the menu; buys both throw pillows or neither`,
  ].join('\n')

  const special = accountId === 'mandijoybeck'
    ? `WHO SEES HERSELF HERE — LAUREN: a competent mom in her 30s–40s who runs everyone's life but stopped trusting her own gut. The through-line: a gut signal arrives (which apples, bedtime, a friendship, her marriage) and she OVERRIDES it, then pays for it later. Point her back to her OWN knowing — never toward "stay," never toward "leave."
BUILD EACH LINE FROM ONE OF HER REAL MOMENTS, with enough SETUP that she recognizes her exact life before the turn lands:
${LAUREN}
MONEY SHAPE — Hook C: "You're not [what she beats herself up for: flaky / dramatic / too sensitive / indecisive], you're [the truer reframe]." Use it often.
NEVER use the words "intuition" or "inner child" in the line — lead with the outcome + the weird-specific behavior; the reveal lives in the video, not the hook.`
    : `This account: ${acct.tone || ''}. ${acct.underlying_message || ''}`

  const instructions = `Write in Mandi's voice. Each line GROUNDS the reader in a recognizable SCENE from her real life — enough context (the moment, the where/when/who) that she thinks "that's literally me" — THEN a wry, slightly absurd turn or a reframe. Second person. A statement, never a question.
A bare behavior with no scene MEANS NOTHING to her — she can't stand in it. Give the setup first. Her voice is SILLY-SERIOUS and strangely specific: a real mundane detail taken one step ("the cumin didn't ask for that"). Never write her plain and earnest, and never STATE the lesson outright ("check your horoscope before you check in with yourself" is dead — it explains itself). She should feel caught, laugh, then ache a little.

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
