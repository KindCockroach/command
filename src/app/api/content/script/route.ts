import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getAudienceContext, getAllNotes } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const LENGTHS: Record<number, string> = {
  10: 'ONE or TWO short sentences, ~25 words MAX. This is a 10-second script — brutally tight. Do NOT exceed it.',
  20: 'about 45–55 words — 3–4 short sentences: a hook, one idea, a landing.',
  30: 'about 70–85 words — room to breathe and build, but no rambling.',
}
// Hard token ceiling per duration so the model physically can't ramble long.
const MAXTOK: Record<number, number> = { 10: 80, 20: 150, 30: 230 }

// Turn a post into a natural SPOKEN script (for an avatar / talking to camera),
// written to be said out loud — not a caption read aloud. Saves to the script field.
export async function POST(req: NextRequest) {
  const { contentId, seconds } = await req.json()
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })
  const dur = [10, 20, 30].includes(Number(seconds)) ? Number(seconds) : 20

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const voice = account
    ? `Account voice — ${account.handle} (${account.brand_name}). Tone: ${account.tone}. Mission: ${account.mission}. ${account.notes ? `NON-NEGOTIABLE RULES: ${account.notes}` : ''} ${getAudienceContext(account.audience_id)}`
    : 'Voice: Mandi Beck — warm, direct AI Mom educator.'

  // Manifesto/anchor notes are poetic and captivating in her real voice — ideal
  // raw material for a spoken script. Offer them as VOICE REFERENCE.
  const manifestoNotes = getAllNotes()
    .filter(n => (n.tags ?? []).some(t => ['manifesto', 'anchor', 'longform', 'story'].includes(t)))
    .slice(0, 3)
    .map(n => `— ${n.title}:\n${(n.body ?? '').slice(0, 600)}`)
    .join('\n\n')
  const voiceRef = manifestoNotes
    ? `\n\nVOICE REFERENCE — her manifesto/anchor writing (poetic, captivating, her true cadence). You MAY pull a line, image, or rhythm from here when it fits; never quote a full paragraph, and never force it:\n${manifestoNotes}`
    : ''

  const source = [piece.title, piece.onscreen_text, piece.description].filter(Boolean).join('\n\n')

  try {
    const script = (await fableText({
      instructions: `${craftFor(piece.account_id)}\n\nWrite a natural SPOKEN script for a creator/avatar to say straight to camera — first person, conversational, exactly how a real person actually talks. NOT a caption read aloud, NOT written prose.

HARD RULE: the script must NOT restate or paraphrase the on-screen text or the caption. Those already exist on screen; the spoken words ADD a different layer — a deeper cut, a story, the thing between the lines. If your draft echoes the on-screen text or caption, rewrite it to say something new.

LENGTH: ${dur} seconds — ${LENGTHS[dur]}. Open with a spoken hook, deliver ONE idea, end on a line that lands. No hashtags, no emojis, no "link in bio," no stage directions — only the words she says out loud (the avatar reads this literally).

${voice}${voiceRef}`,
      input: `POST (the on-screen text + caption already showing — do NOT repeat these):\n${source}\n\nWrite the ${dur}-second spoken layer that adds something new. Keep it to ${LENGTHS[dur]}`,
      maxTokens: MAXTOK[dur],
      effort: 'low',
    })).trim()
    if (!script) return NextResponse.json({ error: 'no script generated' }, { status: 502 })
    const updated = updateContent(piece.id, { script })
    return NextResponse.json({ script, content: updated })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'generation failed' }, { status: 502 })
  }
}
