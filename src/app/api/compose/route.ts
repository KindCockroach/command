import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllBrandAccounts, getWatchContext, createNote } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Instant compose: Mandi's own media + her context → 3 complete post variations.
// Story/context is archived to Notes; the media already lives in the Media library.
export async function POST(req: NextRequest) {
  const { context, mediaUrl, mediaType } = await req.json()
  if (!context?.trim()) return NextResponse.json({ error: 'context required' }, { status: 400 })

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')
  const accountList = accounts.map(a =>
    `- id:"${a.id}" ${a.handle} — ${a.topic}. Tone: ${a.tone}. CTA style: ${a.notes?.includes('Comment') ? a.notes.slice(0, 120) : 'comment-keyword CTA'}`
  ).join('\n')

  const isImage = mediaType?.startsWith('image') && mediaUrl

  const input: Array<Record<string, unknown>> = [{
    role: 'user',
    content: isImage
      ? [
          { type: 'input_text', text: `MANDI'S CONTEXT ABOUT THIS MEDIA:\n${context}` },
          { type: 'input_image', image_url: mediaUrl },
        ]
      : `MANDI'S CONTEXT ABOUT THIS MEDIA (${mediaType ?? 'video'} — you can't see it, work from her description):\n${context}`,
  }]

  const res = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You compose Instagram-ready posts from Mandi Beck's own photos/videos plus her context.

ACCOUNT ROSTER (pick the ONE best fit):
${accountList}
${getWatchContext()}

CONTENT AUDIT RULES: lead with HER (the reader's) problem or moment, 3-second cold-stranger test, warm/direct/funny-when-natural, comment-keyword CTA matching the chosen account, no links in captions.

Produce THREE meaningfully different variations (different angles — e.g. relatable-moment, permission-slip, behind-the-scenes truth). Return ONLY valid JSON:
{
  "account_id": "best account id",
  "account_reason": "one sentence",
  "story_summary": "2-3 sentence summary of the story/moment for the archive",
  "variations": [
    { "angle": "short label", "onscreen_text": "text overlay for the video/photo", "caption": "full caption ending with the CTA", "hashtags": "15-25 hashtags space-separated" },
    { ... }, { ... }
  ]
}`,
    input: input as never,
  })

  try {
    const parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
    // Archive the story/context to Notes — future content fuel
    try {
      createNote({
        title: `📎 Media story: ${(parsed.story_summary ?? context).slice(0, 60)}`,
        body: `CONTEXT (Mandi's words):\n${context}\n\nSUMMARY: ${parsed.story_summary ?? ''}\n\nMEDIA: ${mediaUrl ?? 'n/a'}\n\nVARIATIONS COMPOSED:\n${(parsed.variations ?? []).map((v: { angle: string; onscreen_text: string; caption: string }, i: number) => `--- ${i + 1} (${v.angle}) ---\nON-SCREEN: ${v.onscreen_text}\n${v.caption}`).join('\n\n')}`,
        category: 'idea',
        tags: ['media-story', parsed.account_id ?? 'general'],
      })
    } catch { /* archive is best-effort */ }

    return NextResponse.json({ ...parsed, account: accounts.find(a => a.id === parsed.account_id) ?? null })
  } catch {
    return NextResponse.json({ error: 'Could not compose from this input', raw: res.output_text }, { status: 502 })
  }
}
