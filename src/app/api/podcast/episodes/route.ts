import { NextRequest, NextResponse } from 'next/server'
import { getPodcastEpisodes, createPodcastEpisode, updatePodcastEpisode, deletePodcastEpisode, getAllNotes } from '@/lib/db'
import { fableText } from '@/lib/fable'
import { PODCAST_CONSTITUTION } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// PODCAST EPISODES — the weekly show schedule. GET lists; POST creates (or, with
// {generate_script}, writes a teleprompter script for one); PATCH updates; DELETE removes.
export function GET() {
  return NextResponse.json({ episodes: getPodcastEpisodes() })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  // Write a teleprompter script for an episode from its topic (+ optional source text).
  if (body.generate_script && body.id) {
    const eps = getPodcastEpisodes()
    const ep = eps.find(e => e.id === body.id)
    if (!ep) return NextResponse.json({ error: 'episode not found' }, { status: 404 })
    const instructions = `${PODCAST_CONSTITUTION}

Write a TELEPROMPTER SCRIPT for Mandi to read on the AI Mom Podcast. Her voice: directive, bold, plain, a little delusional-funny — she fights fire with fire. Short spoken sentences she can read naturally on camera. Talk TO the listener.
Structure, with a one-line [SEGMENT] marker before each part:
[COLD OPEN] a hook that stops the scroll — the listener's problem, not Mandi's.
[THE NEWS] the week's development (if none is given, write [NEWS SLOT: drop this week's headline here] and keep going).
[THE MOVE] the specific thing she does this week — name the tool, program, or step.
[THE PUSHBACK] the episode's pushback action, concrete and doable.
[THE HUMAN THREAD] the episode's thread, woven in through a story or a moment, never a lecture.
[CLOSE] one clear invitation (the Sunday Reset, the email list, or the next episode).
Mark natural [pause] beats sparingly. Put [VERIFY] after any fact, name, price, or date that must be checked before recording. 1,600–2,200 words.`
    const banked = ep.note_id ? getAllNotes().find(n => n.id === ep.note_id) : undefined
    const source = body.source ? String(body.source) : banked?.body ?? ''
    const input = `${ep.number ? `EPISODE ${ep.number}\n` : ''}EPISODE TITLE: ${ep.title}\nTOPIC: ${ep.topic}${ep.guest ? `\nGUEST: ${ep.guest}` : ''}${ep.thread ? `\nHUMAN THREAD: ${ep.thread}` : ''}${ep.pushback ? `\nPUSHBACK: ${ep.pushback}` : ''}${source ? `\n\nBUILD FROM THIS ORIGINAL (her banked words — keep her stories, jokes, and lines; sharpen, tighten, raise the stakes):\n${source.slice(0, 12000)}` : ''}\n\nWrite the teleprompter script.`
    try {
      // 12k budget: adaptive thinking shares max_tokens with the output, so a tight
      // budget was starving the script and it came back very short. Give it room.
      const script = await fableText({ useClaude: true, maxTokens: 12000, instructions, input })
        .catch(() => fableText({ maxTokens: 12000, instructions, input }))
      if (!script.trim()) return NextResponse.json({ error: 'writer came back empty — try again' }, { status: 502 })
      const updated = updatePodcastEpisode(ep.id, { script: script.trim(), status: ep.status === 'planned' ? 'scripted' : ep.status })
      return NextResponse.json({ ok: true, episode: updated })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'generation failed' }, { status: 502 })
    }
  }

  // Revise an EXISTING teleprompter script from Mandi's raw feedback — keep the script
  // she has, change exactly what she asks. This is the Rewrite box in the View modal;
  // it operates on the FINAL script, never the raw banked input.
  if (body.revise_script && body.id) {
    const eps = getPodcastEpisodes()
    const ep = eps.find(e => e.id === body.id)
    if (!ep) return NextResponse.json({ error: 'episode not found' }, { status: 404 })
    if (!ep.script?.trim()) return NextResponse.json({ error: 'no script to revise yet — write one first' }, { status: 400 })
    const feedback = String(body.feedback || '').trim()
    if (!feedback) return NextResponse.json({ error: 'tell me what to change' }, { status: 400 })
    const instructions = `${PODCAST_CONSTITUTION}

Revise this existing TELEPROMPTER SCRIPT for Mandi's AI Mom Podcast using her feedback. Keep her voice — directive, bold, plain, a little delusional-funny, fights fire with fire. Keep the [SEGMENT] markers and the overall structure, and keep every line she did NOT ask you to change. Apply her feedback exactly; do not rewrite from scratch, do not blandify, do not drop her stories, jokes, or lines. Keep [pause] beats sparingly and put [VERIFY] after any NEW fact, name, price, or date. Return the FULL revised script, ready to read — nothing else.`
    const input = `EPISODE${ep.number ? ` ${ep.number}` : ''}: ${ep.title}\nTOPIC: ${ep.topic}\n\nCURRENT SCRIPT:\n${ep.script}\n\nHER FEEDBACK (do exactly this, nothing more):\n${feedback}\n\nReturn the full revised teleprompter script.`
    try {
      const script = await fableText({ useClaude: true, maxTokens: 12000, instructions, input })
        .catch(() => fableText({ maxTokens: 12000, instructions, input }))
      if (!script.trim()) return NextResponse.json({ error: 'writer came back empty — try again' }, { status: 502 })
      const updated = updatePodcastEpisode(ep.id, { script: script.trim() })
      return NextResponse.json({ ok: true, episode: updated })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'revision failed' }, { status: 502 })
    }
  }

  const ep = createPodcastEpisode(body)
  return NextResponse.json({ ok: true, episode: ep })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const ep = updatePodcastEpisode(String(body.id), body)
  if (!ep) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true, episode: ep })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json({ ok: deletePodcastEpisode(id) })
}
