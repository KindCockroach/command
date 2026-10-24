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
      const script = await fableText({ useClaude: true, maxTokens: 6000, instructions, input })
        .catch(() => fableText({ maxTokens: 6000, instructions, input }))
      if (!script.trim()) return NextResponse.json({ error: 'writer came back empty — try again' }, { status: 502 })
      const updated = updatePodcastEpisode(ep.id, { script: script.trim(), status: ep.status === 'planned' ? 'scripted' : ep.status })
      return NextResponse.json({ ok: true, episode: updated })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'generation failed' }, { status: 502 })
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
