import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, getBrandAccount } from '@/lib/db'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// SHOOT PLAN — turn a post's script into something she can actually FILM without
// flipping back and forth. Two shapes:
//   • DIALOGUE (two voices, e.g. Inner Child / Higher Self): grouped BY ROLE so she
//     films every line of one character in a single setup, then switches once. Each
//     line gets an emotion cue + a camera position. Her words are sacred — never
//     rewritten, only grouped and annotated.
//   • SOLO (talking head): mapped onto the RETENTION TEMPLATE (hook → reason → steps
//     → interrupt → payoff → CTA), each beat with a time cue, emotion, and camera.
// Returns structured JSON the Content Day cards render sectionally.

type Line = { text: string; emotion: string; camera: string }
type ShootPlan = {
  mode: 'dialogue' | 'solo'
  title?: string
  sections?: { role: string; setup: string; lines: Line[] }[]
  beats?: { label: string; cue: string; text: string; emotion: string; camera: string }[]
}

// Cheap pre-check: does the script read as a two-voice dialogue (ROLE: line)?
function looksDialogue(script: string): boolean {
  const labeled = script.split('\n').filter(l => /^\s*[A-Z][A-Za-z ]{1,24}:\s*\S/.test(l)).length
  return labeled >= 3
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  let script: string = String(body.script ?? '').trim()
  let accountId: string | null = body.accountId ?? null

  if (!script && body.contentId) {
    const piece = getAllContent().find(c => c.id === Number(body.contentId))
    if (piece) { script = (piece.script ?? '').trim(); accountId = accountId ?? piece.account_id ?? null }
  }
  if (!script) return NextResponse.json({ error: 'script (or a contentId with a script) required' }, { status: 400 })

  const account = accountId ? getBrandAccount(accountId) : null
  const voice = account ? `ACCOUNT: ${account.handle} — ${account.topic}. Tone: ${account.tone}.` : ''
  const dialogue = looksDialogue(script)

  const RETENTION = `THE RETENTION TEMPLATE (use for a SOLO talking-head — map her script onto these beats):
- HOOK (0–1.5s): show the after/result or the ugly before with a face reacting. Movement + a text idea in frame 1. No "hey guys."
- REASON (1.5–4s): the spoken hook, with a DIFFERENT on-screen line (two hooks).
- STEPS (4–20s): the point in ~3 visible steps; a visual change every 2–3s.
- INTERRUPT (~12s): "but this is the part that matters" — reset attention.
- PAYOFF (20–30s): read the result out loud — something usable today.
- CTA (last 3s): one line — save, send, or a comment word. One ask.`

  const instructions = dialogue
    ? `You are RISE's shoot director. Mandi filmed content where she plays MULTIPLE voices (e.g. Inner Child / Higher Self). She does NOT want to change costume/position line-by-line. Your job: regroup her script BY ROLE so she films EVERY line of one character in one setup, then switches ONCE to the next.

SACRED: never rewrite, soften, or re-order her actual lines — they are her reparenting words. Keep them VERBATIM. You only (a) group them by speaker, (b) add a one-line SETUP for each role (wardrobe/position/framing so all its lines are shot together), and (c) add an EMOTION cue and a CAMERA position for each line.
- emotion: how to deliver it — short, human, actable ("soft, almost a whisper", "steady, like a promise you mean").
- camera: concrete framing/position — ("close-up, eyes right down the lens", "slightly low angle, chin lifted", "sit down INTO frame, handheld").
${voice}

Return ONLY valid JSON:
{ "mode": "dialogue", "title": "short filming title", "sections": [ { "role": "Inner Child", "setup": "how to sit/frame/dress for all these lines", "lines": [ { "text": "her EXACT line", "emotion": "...", "camera": "..." } ] } ] }
List the roles in the order she should film them.`
    : `You are RISE's shoot director. Turn Mandi's talking-head script into a filmable plan on the RETENTION TEMPLATE. Keep her words where they're strong; tighten only to fit the beat. Every beat gets a time cue, an emotion cue, and a camera position.
${RETENTION}
${voice}

Return ONLY valid JSON:
{ "mode": "solo", "title": "short filming title", "beats": [ { "label": "HOOK", "cue": "0–1.5s", "text": "the spoken line", "emotion": "short actable delivery note", "camera": "concrete framing/position" } ] }
Use labels HOOK, REASON, STEPS (you may have 2–3 STEPS beats), INTERRUPT, PAYOFF, CTA.`

  try {
    const raw = await fableText({ instructions, input: `HER SCRIPT:\n${script.slice(0, 8000)}`, maxTokens: 4000, json: true, useClaude: true })
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as ShootPlan
    if (!parsed.mode) parsed.mode = dialogue ? 'dialogue' : 'solo'
    // Guard shape
    if (parsed.mode === 'dialogue' && !Array.isArray(parsed.sections)) parsed.sections = []
    if (parsed.mode === 'solo' && !Array.isArray(parsed.beats)) parsed.beats = []
    return NextResponse.json({ plan: parsed })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not build the shoot plan' }, { status: 502 })
  }
}
