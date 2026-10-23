import { NextRequest, NextResponse } from 'next/server'
import { getPodcastEpisodes, createPodcastEpisode, updatePodcastEpisode, deletePodcastEpisode } from '@/lib/db'
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

Write a TELEPROMPTER SCRIPT for Mandi to read on the AI Mom Podcast. Her voice: warm, sharp, plain, a translator with a flashlight — never hype, never doom. Short spoken sentences she can read naturally on camera. Open with a scene or a hook that stops the scroll, deliver the ONE idea clearly with a story or example, land on a clear takeaway, and end with a simple invitation. Mark natural [pause] beats sparingly. No stage directions beyond that. 450-650 words.`
    const input = `EPISODE TITLE: ${ep.title}\nTOPIC: ${ep.topic}${ep.guest ? `\nGUEST: ${ep.guest}` : ''}${body.source ? `\n\nIMPROVE ON THIS ORIGINAL (keep what worked, sharpen the hook, tighten, raise the stakes):\n${String(body.source).slice(0, 6000)}` : ''}\n\nWrite the teleprompter script.`
    try {
      const script = await fableText({ useClaude: true, maxTokens: 3000, instructions, input })
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
