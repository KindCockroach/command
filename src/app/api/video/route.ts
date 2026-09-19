import { NextRequest, NextResponse } from 'next/server'
import { createContent } from '@/lib/db'
import { fableText } from '@/lib/fable'
import { craftFor } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// DROP A FINISHED VIDEO → CLEAN POST DRAFT. We don't watch the video — the message
// is in the audio. Transcribe it, then write exactly what she asked to review:
//   • 3-5 HOOKS (on-screen options), 1 TITLE, 1 CAPTION, 3-5 real hashtags.
// Regenerate cheaply (no re-transcribe) with feedback, or with the title as the
// caption's first line. Save creates the ready card with the video attached.
//
// Modes:
//   { videoUrl }                                  → transcribe + draft
//   { transcript, feedback?, titleFirst? }        → re-draft only (no transcribe)
//   { save:true, videoUrl, title, onscreen, caption, hashtags, accountId? } → create card

type Draft = { title: string; hooks: string[]; caption: string; hashtags: string[] }

async function writeDraft(transcript: string, opts: { feedback?: string; titleFirst?: boolean; accountId?: string }): Promise<Draft> {
  const instructions = `You are writing a social post FROM a short VIDEO Mandi filmed — her real footage, her own voice. Work ONLY from what she actually SAYS in the transcript. Do not invent a topic she didn't talk about.

${craftFor(opts.accountId)}

Produce, in her voice:
- "title": ONE strong title — a claim addressed to the viewer, true to what she said.
- "hooks": 3-5 DISTINCT on-screen hook options — each a bold STATEMENT (never a question), the overlay line that stops the scroll. Different angles on the same golden thread from her words.
- "caption": ONE ready-to-post caption, spaced with real line breaks, in her voice; it must NOT just restate a hook. ${opts.titleFirst ? 'The caption\'s FIRST sentence MUST BE the title, verbatim.' : ''}
- "hashtags": 3-5 REAL, relevant hashtags actually used in this niche (no spam, no banned tags, no invented ones); camelCase any multi-word tag.
${opts.feedback ? `\nAPPLY THIS FEEDBACK from Mandi (she's iterating): "${opts.feedback}"` : ''}

Return ONLY valid JSON: { "title": "...", "hooks": ["...","..."], "caption": "...", "hashtags": ["...","..."] }`

  const raw = await fableText({ useClaude: true, json: true, maxTokens: 2000, instructions, input: `HER SPOKEN WORDS (video transcript):\n${transcript.slice(0, 12000)}` })
  let p: Partial<Draft> = {}
  try { p = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* fall through */ }
  return {
    title: typeof p.title === 'string' ? p.title : '',
    hooks: Array.isArray(p.hooks) ? p.hooks.filter(Boolean).slice(0, 5) : [],
    caption: typeof p.caption === 'string' ? p.caption : '',
    hashtags: Array.isArray(p.hashtags) ? p.hashtags.filter(Boolean).slice(0, 6) : [],
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`

  // ── SAVE — rename the video file to the title, then create the ready card ─────
  if (body.save) {
    const { videoUrl, title, onscreen, caption, hashtags, accountId } = body
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
    // Rename the R2 object to the suggested title so it's findable in Media.
    let mediaUrl = videoUrl
    if (title?.trim()) {
      try {
        const key = new URL(videoUrl).pathname.replace(/^\//, '')
        const rn = await fetch(`${base}/api/media/rename`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, newName: title.trim() }) })
        const rd = await rn.json().catch(() => ({}))
        if (rd.url) mediaUrl = rd.url
      } catch { /* keep original url if rename fails */ }
    }
    const piece = createContent({
      title: title || 'Video post',
      onscreen_text: onscreen || '',
      description: caption || '',
      hashtags: Array.isArray(hashtags) ? hashtags.join(' ') : (hashtags || ''),
      type: 'video',
      status: accountId ? 'ready' : 'idea',
      account_id: accountId || null,
      media_url: mediaUrl,
      media_urls: [mediaUrl],
      river_source: 'video-drop',
      tags: ['video-drop'],
    })
    return NextResponse.json({ piece, mediaUrl })
  }

  // ── RE-DRAFT — regenerate from an existing transcript (cheap, no transcribe) ──
  if (body.transcript && !body.videoUrl) {
    const draft = await writeDraft(String(body.transcript), { feedback: body.feedback, titleFirst: body.titleFirst, accountId: body.accountId })
    return NextResponse.json({ transcript: body.transcript, ...draft })
  }

  // ── DRAFT — transcribe the video, then write the draft ───────────────────────
  const { videoUrl } = body
  if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
  let transcript = ''
  try {
    const tRes = await fetch(`${base}/api/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioUrl: videoUrl }) })
    transcript = ((await tRes.json().catch(() => ({}))).transcript ?? '').trim()
  } catch { /* handled */ }
  if (!transcript) return NextResponse.json({ error: "Couldn't hear spoken words in that video — is there audio? (Silent clips can't be auto-written yet.)" }, { status: 502 })

  const draft = await writeDraft(transcript, { feedback: body.feedback, titleFirst: body.titleFirst, accountId: body.accountId })
  return NextResponse.json({ transcript, ...draft })
}
