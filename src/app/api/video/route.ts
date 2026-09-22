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

type Shot = { type: string; shot: string }
type Draft = { title: string; hooks: string[]; caption: string; hashtags: string[]; script: string; footage: Shot[]; keywords: string[] }

async function writeDraft(transcript: string, opts: { feedback?: string; titleFirst?: boolean; accountId?: string }): Promise<Draft> {
  const instructions = `You are COMPILING a complete, ready-to-edit social post FROM a short VIDEO Mandi filmed — her real footage, her own voice. Work ONLY from what she actually SAYS in the transcript. Do not invent a topic she didn't talk about. Her job was to film; YOUR job is to compile everything else so she can edit + approve.

${craftFor(opts.accountId)}

Produce, in her voice — the WHOLE package:
- "title": ONE strong title — a claim addressed to the viewer, true to what she said.
- "hooks": 3-5 DISTINCT on-screen hook options — each a bold STATEMENT (never a question), the overlay line that stops the scroll. Different angles on the same golden thread.
- "caption": ONE ready-to-post caption, spaced with real line breaks, in her voice; must NOT just restate a hook. ${opts.titleFirst ? 'The caption\'s FIRST sentence MUST BE the title, verbatim.' : ''}
- "hashtags": 3-5 REAL, relevant hashtags actually used in this niche (no spam/banned/invented); camelCase multi-word.
- "keywords": 5-8 SEO keywords/phrases for this topic (plain phrases, for discovery — NOT hashtags).
- "script": a tightened SPOKEN version of her point in her voice — the words to say (or re-record / voiceover), ~20-40 seconds, short punchy sentences, opens on a hook, one idea, lands clean. Pull from what she said; sharpen it. No stage directions.
- "footage": 3-5 B-ROLL / edit suggestions to intercut with her talking-head to hold attention — each { "type": "b-roll" | "talking-head" | "text-moment", "shot": "specific, filmable/find-able moment or on-screen-text beat" }. Real, capturable moments (not AI-generated).
${opts.feedback ? `\nAPPLY THIS FEEDBACK from Mandi (she's iterating): "${opts.feedback}"` : ''}

Return ONLY valid JSON: { "title": "...", "hooks": ["..."], "caption": "...", "hashtags": ["..."], "keywords": ["..."], "script": "...", "footage": [ { "type": "...", "shot": "..." } ] }`

  const input = `HER SPOKEN WORDS (video transcript):\n${transcript.slice(0, 12000)}`
  const once = async (): Promise<Draft> => {
    // maxTokens 8000 — the craft rules make the prompt long and adaptive thinking
    // eats budget; 3000 left no room for the JSON output (it came back empty).
    const raw = await fableText({ useClaude: true, json: true, maxTokens: 8000, instructions, input })
    let p: Partial<Draft> = {}
    try { p = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* fall through */ }
    return {
      title: typeof p.title === 'string' ? p.title : '',
      hooks: Array.isArray(p.hooks) ? p.hooks.filter(Boolean).slice(0, 5) : [],
      caption: typeof p.caption === 'string' ? p.caption : '',
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.filter(Boolean).slice(0, 6) : [],
      keywords: Array.isArray(p.keywords) ? p.keywords.filter(Boolean).slice(0, 8) : [],
      script: typeof p.script === 'string' ? p.script : '',
      footage: Array.isArray(p.footage) ? p.footage.filter((s): s is Shot => !!s && typeof s.shot === 'string').slice(0, 5) : [],
    }
  }
  let d = await once()
  // Never return blank — one retry if the writer produced nothing usable.
  if (!d.title && !d.hooks.length && !d.caption) d = await once()
  return d
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`

  // ── SAVE — rename the video file to the title, then create the ready card ─────
  if (body.save) {
    const { videoUrl, title, onscreen, caption, hashtags, accountId, script, keywords, footage } = body
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
      script: typeof script === 'string' ? script : '',
      frame_plan: Array.isArray(footage) && footage.length ? '🎥 FOOTAGE / B-ROLL:\n' + footage.map((f: Shot) => `• [${f.type || 'b-roll'}] ${f.shot}`).join('\n') : undefined,
      notes: Array.isArray(keywords) && keywords.length ? `Keywords: ${keywords.join(', ')}` : '',
      post_job: typeof body.post_job === 'string' ? body.post_job : undefined,
      river_source: 'video-drop',
      tags: ['video-drop'],
    })
    return NextResponse.json({ piece, mediaUrl })
  }

  // ── RE-DRAFT — regenerate from an existing transcript (cheap, no transcribe) ──
  if (body.transcript && !body.videoUrl) {
    const draft = await writeDraft(String(body.transcript), { feedback: body.feedback, titleFirst: body.titleFirst, accountId: body.accountId })
    if (!draft.title && !draft.hooks.length && !draft.caption) return NextResponse.json({ error: 'The writer came back empty — tap Regenerate to try again.' }, { status: 502 })
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
  if (!draft.title && !draft.hooks.length && !draft.caption) return NextResponse.json({ transcript, error: 'Transcribed fine, but the writer came back empty — try again.' }, { status: 502 })
  return NextResponse.json({ transcript, ...draft })
}
