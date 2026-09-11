import { NextRequest, NextResponse } from 'next/server'
import { CRAFT_RULES } from '@/lib/craft'
import { fableText } from '@/lib/fable'
import { parseKit } from '@/lib/jsonkit'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// The Commander, ON the Podcast tab — with EYES on the whole episode kit and HANDS
// to edit any part of it by conversation. Mandi types plain English ("redo the
// takeaway and name the employers", "move that personal bit to the deeper current",
// "make headline 2 punchier", "regenerate everything but lead with the jobs"), and
// this returns a warm reply PLUS a machine patch the Podcast tab merges into the kit.
//
// Two hands:
//  • updates      — a partial kit: ONLY the fields it changed (surgical edits)
//  • regenerate_all + steer — when she wants the WHOLE kit rebuilt from the
//                    transcript with a steer; the tab re-runs Generate Everything.
export async function POST(req: NextRequest) {
  const { kit, message, history, transcript, episodeNumber, guestName } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (!kit) return NextResponse.json({ error: 'no kit to edit — generate the episode first' }, { status: 400 })

  const clip = String(transcript || '').slice(0, 120000)
  const priorTurns = Array.isArray(history)
    ? history.slice(-8).map((h: { role: string; text: string }) => `${h.role === 'user' ? 'MANDI' : 'YOU'}: ${h.text}`).join('\n')
    : ''

  const instructions = `You are RISE's Commander, sitting INSIDE the Podcast tab with Mandi. The full episode kit is in front of you (below), and you can EDIT ANY PART OF IT by talking. She'll ask for changes in plain English; you make them and hand them back.

HOW YOU TALK: like a trusted partner who loves her and tells the truth — warm, sharp, plain, concise. No sermons, no throw-pillow lines. Do the thing she asked; say what you changed in a sentence or two. Don't ask permission to make an edit she clearly asked for — just make it.

THE IDENTITY MODEL (obey it on every edit):
• core_takeaway = the TANGIBLE, retellable thing the listener GETS, with the ACTUAL specifics NAMED (the employers, the program, the numbers — by name, so she can write them down). Never the philosophy/opinion.
• heart_argument = the ARGUMENT the episode makes, as a claim about the LISTENER or the world. NOT about Mandi. ⛔ If it names Mandi, her money, her family/partner, her ADHD, her accounts, or her feelings, that belongs in producer_feedback.deeper_current — never in the heart.
• producer_feedback.deeper_current = PRIVATE reflection about Mandi, never published.
• Titles/headlines LEAD WITH THE LISTENER'S PAIN + THE CONCRETE PAYOFF (e.g. "3 Employers That Will Hire Your Grad"); an opinion is not a title.

FIRST, READ WHAT SHE WANTS — answer or edit:
• If she asks a QUESTION, asks your READ/opinion, or is just talking ("what's the heart of this episode?", "which headline is strongest?", "what do you think?") — ANSWER her in "reply", conversationally and specifically, using what you can see in the kit and transcript. Return NO updates. NEVER just say "Done" to a question — that's a failure. A question is answered, not executed.
• Only EDIT when she actually asks for a change ("change the title to…", "redo the takeaway", "punch up headline 2", "move that to the deeper current").
• If you're genuinely unsure whether she wants an edit, ASK in "reply" — don't guess and don't fire a phantom edit.

YOUR HANDS — return ONE of these in the JSON:
1. ANSWER: no change wanted — put your real answer in "reply", omit "updates".
2. EDIT: put ONLY the fields you changed into "updates", using the EXACT kit field names and shapes shown below, and say what you changed in "reply" (never blank, never just "Done"). For a whole array field (headlines, pull_quotes, reels_scripts, questions, chapters, keywords, youtube_tags, pinterest_pins, resources) return the COMPLETE new array. For a nested object you touched (producer_feedback, ad_reads, medium_article), return that WHOLE object with unchanged sub-fields preserved. Leave every field you didn't change OUT of "updates".
3. FULL REBUILD: if she wants the entire kit regenerated from the transcript, set "regenerate_all": true and put her intent (one crisp line) in "steer" — do NOT also send "updates".

Every line you write or rewrite obeys the craft laws.
${CRAFT_RULES}

Return ONLY valid JSON (no fences, no prose outside it):
{
  "reply": "your warm, concise reply to Mandi — what you did or what you need from her",
  "updates": { /* ONLY changed kit fields, exact names/shapes; omit if regenerate_all */ },
  "regenerate_all": false,
  "steer": ""
}`

  const input = `CURRENT EPISODE KIT (this is what's on her screen — edit against it):
${JSON.stringify(kit, null, 1).slice(0, 90000)}

${clip ? `EPISODE TRANSCRIPT (source of truth for any specifics you name):\n${clip}\n` : ''}${priorTurns ? `\nRECENT CONVERSATION:\n${priorTurns}\n` : ''}
EPISODE: ${episodeNumber ? `#${episodeNumber}` : 'TBD'}${guestName ? ` · guest ${guestName}` : ''}

MANDI JUST SAID:
${message}`

  try {
    const raw = await fableText({ instructions, input, maxTokens: 8000, effort: 'high', json: true, useClaude: true })
    const out = await parseKit(raw)
    if (!out) return NextResponse.json({ error: 'That came back garbled — say it again and I\'ll get it.' }, { status: 502 })
    const updates = out.updates && typeof out.updates === 'object' && Object.keys(out.updates).length ? out.updates : null
    const reply = typeof out.reply === 'string' && out.reply.trim()
      ? out.reply.trim()
      : (updates ? 'Updated.' : 'I didn\'t catch a change there — did you want me to edit something, or were you asking?')
    return NextResponse.json({
      reply,
      updates,
      regenerate_all: out.regenerate_all === true,
      steer: typeof out.steer === 'string' ? out.steer : '',
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Commander failed' }, { status: 500 })
  }
}
