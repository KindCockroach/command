import { NextRequest, NextResponse } from 'next/server'
import { getPodcastEpisodes, createPodcastEpisode, updatePodcastEpisode, deletePodcastEpisode, getAllNotes, createNote, type PodcastEpisode } from '@/lib/db'
import { fableText, researchWithWeb, commanderChat } from '@/lib/fable'
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
  | { op: 'note'; title?: string; body?: string; tags?: string[] }

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

  const instructions = `You are POD — Mandi's dedicated podcast co-writer, sitting on the Podcast Studio episode table with her. You are NOT the Commander (that's her home-screen agent who runs the whole station). Your ONE job is co-writing great episodes of the AI Mom Podcast: shaping the arc, prepping episodes, reacting to what she pastes, and keeping the slate in order. You can see every planned episode and her banked scripts, and you can ADD and EDIT episodes by talking. Podcasts are her top of funnel — treat every episode like it matters.

${PODCAST_CONSTITUTION}

${ARC}

HOW YOU TALK: a trusted producer — warm, sharp, plain, concise. ALWAYS write a real "reply": do the thing she asked, prep the episode she named, react to what she pasted, answer her question. NEVER return an empty reply. If you genuinely can't tell what she wants, ask one specific question — never a vague "what should I add or edit." Most of her messages are conversation, not edits; it's completely fine to return a great reply with NO actions.

YOUR HANDS — "actions" is a list (often empty); each is one of:
• {"op":"create","fields":{...}} — a new episode
• {"op":"update","id":"<episode id>","fields":{...only the changed fields}}
• {"op":"delete","id":"<episode id>"} — ONLY when she explicitly says delete or remove that episode
• {"op":"note","title":"...","body":"...","tags":["ep-08"]} — BANK something to her Notes. Use this when she says "update your notes," "save this," "bank this transcript," or pastes a transcript/research she wants kept. Put the FULL text she pasted in "body" verbatim — do not summarize or truncate it.
Episode fields: number (int), date (YYYY-MM-DD), day ("sun" solo | "wed" guest), time ("10:00"), title, topic, guest, thread, pushback, note_id (the banked Note number, int), status ("planned"|"scripted"|"recorded"|"published"), references ([{label,url}]).

Return ONLY valid JSON: {"reply": "...", "actions": [ ... ]}`

  const input = `EPISODES (what's on her screen):\n${JSON.stringify(brief, null, 1)}\n\nBANKED SCRIPTS & TRANSCRIPTS IN NOTES:\n${banked.join('\n') || '(none)'}\n\n${priorTurns ? `RECENT CONVERSATION:\n${priorTurns}\n\n` : ''}MANDI: ${ask}`

  try {
    // Pod thinks on Claude Opus (COMMANDER_MODEL) for best voice + judgment; if the
    // Anthropic account can't answer (e.g. out of credit), fall back to the 4o writer.
    const raw = await commanderChat(instructions, [{ role: 'user', content: input }], 4000)
      .catch(() => fableText({ instructions, input, maxTokens: 4000, json: true }))
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
      } else if (a?.op === 'note') {
        // Bank to Notes. If the model's body looks truncated vs. what she pasted,
        // store her raw message instead so a long transcript is never lost.
        let body = String(a.body ?? '')
        if (String(ask).length > 400 && body.length < String(ask).length * 0.6) body = String(ask)
        const title = String(a.title ?? '').trim() || 'Banked from Podcast Studio'
        const tags = Array.from(new Set(['banked', 'transcript', ...((a.tags ?? []).map(t => String(t)))]))
        const n = createNote({ title, body, category: 'idea', tags })
        applied.push(`banked "${title}" to Notes (#${n.id})`)
      }
    }

    let reply = typeof out.reply === 'string' && out.reply.trim() ? out.reply.trim() : ''
    // Never dead-end. If the structured pass gave no reply AND changed nothing, answer
    // her for real as a producer (plain text) — this is the fix for the canned
    // "I didn't catch a change there" that fired on real messages.
    if (!reply && !applied.length) {
      const prod = `${PODCAST_CONSTITUTION}\n\nYou are Pod, Mandi's podcast co-writer, talking with her at the episode table. Answer her message directly and usefully — prep the episode she named, react to what she pasted, give her the next concrete move. Warm, sharp, concise, in her world. Plain text only, no JSON.`
      reply = (await commanderChat(prod, [{ role: 'user', content: input }], 1400)
        .catch(() => fableText({ instructions: prod, input, maxTokens: 1400 })).catch(() => '')).trim()
    }
    if (!reply) reply = applied.length ? `Done — ${applied.join(' · ')}.` : 'Say that one more time and I\'ll get it.'
    return NextResponse.json({ reply, applied, episodes: getPodcastEpisodes() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Commander failed' }, { status: 500 })
  }
}
