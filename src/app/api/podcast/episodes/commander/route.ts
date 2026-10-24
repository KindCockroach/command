import { NextRequest, NextResponse } from 'next/server'
import { getPodcastEpisodes, createPodcastEpisode, updatePodcastEpisode, deletePodcastEpisode, getAllNotes, type PodcastEpisode } from '@/lib/db'
import { fableText, researchWithWeb } from '@/lib/fable'
import { PODCAST_CONSTITUTION } from '@/lib/craft'
import { parseKit } from '@/lib/jsonkit'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// The Commander, on the Podcast Studio EPISODE TABLE — eyes on every planned episode
// and the banked scripts in Notes, hands to add and edit rows. Three ways in:
//  • mode 'recommend' — propose (and add) the next episode in the arc
//  • mode 'headlines' — pull this week's news (web search) matched to her interests
//    and the upcoming episodes it fits
//  • a plain message — answer, or add/edit episodes by conversation
// The server applies the Commander's actions and returns the fresh episode list.

const ARC = `THE CURRENT ARC — "Out-Human the Machine" (Eps 7–14, Oct 25 → Nov 22). Each episode's TITLE waits for that week's news; the theme, the move, the pushback, and the human thread are set so any headline has a place to land. The human threads rotate through Mandi's values: mindfulness, creativity, human potential, women's intuition. Pushbacks rotate through data centers, water, and children. Solo episodes record Sundays 10:00; guest episodes record Wednesdays 10:00.`

type Action =
  | { op: 'create'; fields: Partial<PodcastEpisode> }
  | { op: 'update'; id: string; fields: Partial<PodcastEpisode> }
  | { op: 'delete'; id: string }

const EDITABLE: (keyof PodcastEpisode)[] = ['number', 'date', 'day', 'time', 'title', 'topic', 'guest', 'thread', 'pushback', 'note_id', 'status', 'references']

function clean(fields: Record<string, unknown> | undefined): Partial<PodcastEpisode> {
  const out: Record<string, unknown> = {}
  for (const k of EDITABLE) if (fields && fields[k] !== undefined) out[k] = fields[k]
  return out as Partial<PodcastEpisode>
}

export async function POST(req: NextRequest) {
  const { message, history, mode } = await req.json().catch(() => ({}))
  const episodes = getPodcastEpisodes()
  const brief = episodes.map(e => ({ id: e.id, number: e.number, date: e.date, day: e.day, title: e.title, topic: e.topic, guest: e.guest, thread: e.thread, pushback: e.pushback, status: e.status, has_script: !!e.script, banked_note: e.note_id }))
  const banked = getAllNotes()
    .filter(n => (n.tags ?? []).some(t => ['story-bank', 'banked', 'transcript'].includes(t)))
    .slice(0, 30)
    .map(n => `#${n.id} ${n.title}`)
  const priorTurns = Array.isArray(history)
    ? history.slice(-8).map((h: { role: string; text: string }) => `${h.role === 'user' ? 'MANDI' : 'YOU'}: ${h.text}`).join('\n')
    : ''

  // HEADLINES — real, current news via web search. Read-only: nothing gets added
  // until she asks for it in the chat.
  if (mode === 'headlines') {
    try {
      const text = await researchWithWeb({
        maxSearches: 6,
        maxTokens: 3000,
        instructions: `You are the news desk for the AI Mom Podcast. ${PODCAST_CONSTITUTION}

Find 6–8 REAL news stories from the past 7 days that matter to Mandi's listener: AI and jobs, AI in schools and education, AI and creativity, data centers, water use, and children's safety with AI. Open the pages; never invent a headline. For each: the headline, the outlet and date, the link, one line on why it matters to a mom, and which upcoming episode number it fits best (from the list given). Plain text, numbered, no preamble.`,
        input: `UPCOMING EPISODES:\n${JSON.stringify(brief.filter(e => e.status !== 'published'))}\n\n${message ? `MANDI'S STEER: ${message}` : 'No steer — use her interests above.'}`,
      })
      return NextResponse.json({ reply: text.trim() || 'No headlines came back — try again.', applied: [], episodes })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'news search failed' }, { status: 502 })
    }
  }

  const ask = mode === 'recommend'
    ? `Recommend the NEXT episode after the highest-numbered one: its number, recording date (the next open Sunday or Wednesday slot), type, a working title, the topic, the move, the pushback, and the human thread — continuing the arc. ADD it with a "create" action, and say why in the reply.${message ? ` Her steer: ${message}` : ''}`
    : String(message || '').trim()
  if (!ask) return NextResponse.json({ error: 'message required' }, { status: 400 })

  const instructions = `You are RISE's Commander, sitting on the Podcast Studio episode table with Mandi. You can see every planned episode and her banked scripts, and you can ADD and EDIT episodes by talking.

${PODCAST_CONSTITUTION}

${ARC}

HOW YOU TALK: a trusted producer — warm, sharp, plain, concise. Do the thing she asked; say what you changed in a sentence or two. If she asks a question, ANSWER it and return no actions. If you can't tell what she wants, say exactly what you need — never guess, never fake a "Done."

YOUR HANDS — "actions" is a list; each is one of:
• {"op":"create","fields":{...}} — a new episode
• {"op":"update","id":"<episode id>","fields":{...only the changed fields}}
• {"op":"delete","id":"<episode id>"} — ONLY when she explicitly says delete or remove that episode
Fields: number (int), date (YYYY-MM-DD), day ("sun" solo | "wed" guest), time ("10:00"), title, topic, guest, thread, pushback, note_id (the banked Note number, int), status ("planned"|"scripted"|"recorded"|"published"), references ([{label,url}]).

Return ONLY valid JSON: {"reply": "...", "actions": [ ... ]}`

  const input = `EPISODES (what's on her screen):\n${JSON.stringify(brief, null, 1)}\n\nBANKED SCRIPTS & TRANSCRIPTS IN NOTES:\n${banked.join('\n') || '(none)'}\n\n${priorTurns ? `RECENT CONVERSATION:\n${priorTurns}\n\n` : ''}MANDI: ${ask}`

  try {
    const raw = await fableText({ instructions, input, maxTokens: 4000, json: true, useClaude: true })
    const out = await parseKit(raw)
    if (!out) return NextResponse.json({ error: 'That came back garbled — say it again and I\'ll get it.' }, { status: 502 })
    const actions = (Array.isArray(out.actions) ? out.actions : []) as Action[]
    const wantsDelete = /\b(delete|remove)\b/i.test(ask)
    const applied: string[] = []
    for (const a of actions) {
      if (a?.op === 'create') {
        const ep = createPodcastEpisode(clean(a.fields as Record<string, unknown>))
        applied.push(`added ${ep.number ? `Ep ${ep.number}` : ep.title}`)
      } else if (a?.op === 'update' && a.id) {
        const ep = updatePodcastEpisode(a.id, clean(a.fields as Record<string, unknown>))
        if (ep) applied.push(`updated ${ep.number ? `Ep ${ep.number}` : ep.title}`)
      } else if (a?.op === 'delete' && a.id && wantsDelete) {
        if (deletePodcastEpisode(a.id)) applied.push('removed an episode')
      }
    }
    const reply = typeof out.reply === 'string' && out.reply.trim() ? out.reply.trim() : applied.length ? 'Updated.' : 'I didn\'t catch a change there — what should I add or edit?'
    return NextResponse.json({ reply, applied, episodes: getPodcastEpisodes() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Commander failed' }, { status: 500 })
  }
}
