import { NextRequest, NextResponse } from 'next/server'
import { getPodcastEpisodes } from '@/lib/db'
import { researchWithWeb } from '@/lib/fable'
import { PODCAST_CONSTITUTION } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// COLLABORATE — the pre-writing room for one episode. Mandi brain-dumps (her thoughts,
// what she's working on, headlines she's seen, what she's curious about); the Commander
// builds on it, reminds her of stories from recent episodes so she can call back instead
// of repeat, and surfaces REAL current headlines with links to read. Back-and-forth until
// she hits "Write the Episode" (which runs generate_script with this conversation as source).
type Turn = { role: 'user' | 'commander'; text: string }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const eps = getPodcastEpisodes()
  const ep = eps.find(e => e.id === id)
  if (!ep) return NextResponse.json({ error: 'episode not found' }, { status: 404 })

  const brainDump = String(body.brainDump || '').trim()
  const history: Turn[] = Array.isArray(body.history) ? body.history : []
  const message = String(body.message || '').trim()

  // Her recent SCRIPTED episodes before this one — the "stories we told," so the
  // Commander can remind her and she can call back instead of repeating herself.
  const prior = eps
    .filter(e => e.script && e.id !== id && (ep.number ? (e.number ?? 0) < ep.number : e.date < ep.date))
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0))
    .slice(0, 2)
  const priorDigest = prior.length
    ? prior.map(e => `• Ep ${e.number ?? '?'} "${e.title}" — thread: ${e.thread || '—'}; pushback: ${e.pushback || '—'}\n  ${(e.script || '').replace(/\s+/g, ' ').slice(0, 1200)}…`).join('\n\n')
    : '(no earlier scripted episodes yet)'

  const system = `${PODCAST_CONSTITUTION}

You are COLLABORATING with Mandi to shape ONE episode of the AI Mom Podcast BEFORE the script is written. This is a back-and-forth to think it through together — NOT a script, not a lecture. Each turn:
1. Build on what she gave you — her brain dump, interests, anything she's seen. Reflect the strongest thread back, sharpened, in her voice (directive, bold, plain, a little delusional-funny).
2. REMIND her of stories and threads from her recent episodes (below) so she can call back to them instead of repeating herself. Name the episode.
3. Offer 3–5 REAL, current headlines/articles she could read to educate herself — actually open the pages via search, never invent one. Give outlet + date and one line on why each matters to her listener.
4. Ask one or two sharp questions that move the episode forward. Keep it short and warm.

THIS EPISODE: ${ep.number ? `Ep ${ep.number} — ` : ''}${ep.title}
Topic: ${ep.topic}${ep.thread ? `\nHuman thread: ${ep.thread}` : ''}${ep.pushback ? `\nPushback: ${ep.pushback}` : ''}

HER RECENT EPISODES (already told — remind her, don't repeat):
${priorDigest}

At the VERY END of your reply, append a fenced block of the real headlines you referenced, and nothing after it:
\`\`\`headlines
[ { "headline": "...", "outlet": "Outlet · Mon D", "url": "https://...", "why": "one line on why it matters to her listener" } ]
\`\`\`
Use ONLY real URLs you actually opened. If you referenced none this turn, use an empty array [].`

  const convo = [
    brainDump ? `MY BRAIN DUMP:\n${brainDump}` : '',
    ...history.map(t => `${t.role === 'user' ? 'MANDI' : 'COMMANDER'}: ${t.text}`),
    message ? `MANDI: ${message}` : '',
  ].filter(Boolean).join('\n\n')

  try {
    const raw = await researchWithWeb({ instructions: system, input: convo || 'Start us off from the episode topic.', maxTokens: 7000, maxSearches: 6 })
    let headlines: unknown[] = []
    const m = raw.match(/```headlines\s*([\s\S]*?)```/i)
    if (m) { try { const p = JSON.parse(m[1].trim()); if (Array.isArray(p)) headlines = p } catch { /* ignore malformed */ } }
    const reply = raw.replace(/```headlines[\s\S]*?```/gi, '').trim()
    return NextResponse.json({ reply: reply || 'Say a little more and I\'ll build on it.', headlines })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'collaborate failed' }, { status: 502 })
  }
}
