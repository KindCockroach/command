import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllBrandAccounts, getWatchContext, createNote, audienceLine, getLoreContext } from '@/lib/db'
import { CRAFT_RULES } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Instant compose: Mandi's own media + her context → 3 complete post variations.
// - images: the model sees the image itself
// - videos: the browser sends sampled frames so the model sees the actual footage
// - previous + feedback: refinement loop ("expand the on-screen text to 5-10 punchy lines")
// Story/context is archived to Notes; the media already lives in the Media library.
export async function POST(req: NextRequest) {
  const { context, mediaUrl, mediaType, frames, previous, feedback } = await req.json()
  if (!context?.trim() && !feedback?.trim()) return NextResponse.json({ error: 'context required' }, { status: 400 })

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')
  const accountList = accounts.map(a =>
    `- id:"${a.id}" ${a.handle} — ${a.topic}. Tone: ${a.tone}. CTA style: ${a.notes?.includes('Comment') ? a.notes.slice(0, 120) : 'comment-keyword CTA'}${audienceLine(a.audience_id) ? ` 👤 ${audienceLine(a.audience_id)}` : ''}`
  ).join('\n')

  const isImage = mediaType?.startsWith('image') && mediaUrl
  const videoFrames: string[] = Array.isArray(frames) ? frames.slice(0, 12) : []

  const contentParts: Array<Record<string, unknown>> = [{
    type: 'input_text',
    text: [
      `MANDI'S CONTEXT ABOUT THIS MEDIA:\n${context}`,
      videoFrames.length ? `\nThe ${videoFrames.length} images attached are FRAMES SAMPLED FROM HER VIDEO, evenly spaced IN ORDER from start to finish (~1 per 3 seconds). Read them as an evolving story — track how scenes change frame to frame, who appears, what happens, the arc — and time your on-screen beats to that progression. Blend the visual story with her words; her summary tells you what matters most.` : '',
      previous ? `\nPREVIOUS VARIATIONS YOU WROTE:\n${JSON.stringify(previous)}` : '',
      feedback ? `\nMANDI'S FEEDBACK — THIS OVERRIDES EVERYTHING, FOLLOW IT EXACTLY:\n${feedback}` : '',
    ].filter(Boolean).join('\n'),
  }]
  if (isImage) contentParts.push({ type: 'input_image', image_url: mediaUrl })
  for (const f of videoFrames) contentParts.push({ type: 'input_image', image_url: f })

  const res = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You compose Instagram-ready posts from Mandi Beck's own photos/videos plus her context.

ACCOUNT ROSTER (pick the ONE best fit):
${accountList}
${getWatchContext()}

${getLoreContext(String(context ?? ''))}

${CRAFT_RULES}

CONTENT AUDIT RULES: lead with HER (the reader's) problem or moment, 3-second cold-stranger test, comment-keyword CTA matching the chosen account, no links in captions.

ON-SCREEN TEXT RULES:
- For VIDEO: on-screen text is a SEQUENCE of 5-10 short punchy lines that tell the story across ~30 seconds (one line per beat, separated by newlines) — not a single caption line. Time it to the footage you can see in the frames.
- For PHOTO: 1-2 bold overlay lines.
- If Mandi gives explicit commands about length, count, tone, or format (in her context or feedback), those commands WIN over these defaults. Follow them literally.

Produce THREE meaningfully different variations (different angles — e.g. relatable-moment, permission-slip, behind-the-scenes truth). Return ONLY valid JSON:
{
  "account_id": "best account id",
  "account_reason": "one sentence",
  "story_summary": "2-3 sentence summary of the story/moment for the archive",
  "media_read": "1-2 sentences: what you actually see in the media (or 'no visual provided')",
  "variations": [
    { "angle": "short label", "onscreen_text": "overlay line(s) — newline-separated beats for video", "caption": "full caption ending with the CTA", "hashtags": "15-25 hashtags space-separated" },
    { ... }, { ... }
  ]
}`,
    input: [{ role: 'user', content: contentParts }] as never,
  })

  try {
    const parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
    // Archive the story/context to Notes — future content fuel (skip re-archiving on refinements)
    if (!previous) {
      try {
        createNote({
          title: `📎 Media story: ${(parsed.story_summary ?? context).slice(0, 60)}`,
          body: `CONTEXT (Mandi's words):\n${context}\n\nSUMMARY: ${parsed.story_summary ?? ''}\nWHAT THE AI SAW: ${parsed.media_read ?? ''}\n\nMEDIA: ${mediaUrl ?? 'n/a'}\n\nVARIATIONS COMPOSED:\n${(parsed.variations ?? []).map((v: { angle: string; onscreen_text: string; caption: string }, i: number) => `--- ${i + 1} (${v.angle}) ---\nON-SCREEN:\n${v.onscreen_text}\n\n${v.caption}`).join('\n\n')}`,
          category: 'idea',
          tags: ['media-story', parsed.account_id ?? 'general'],
        })
      } catch { /* archive is best-effort */ }
    }

    return NextResponse.json({ ...parsed, account: accounts.find(a => a.id === parsed.account_id) ?? null })
  } catch {
    return NextResponse.json({ error: 'Could not compose from this input', raw: res.output_text }, { status: 502 })
  }
}
