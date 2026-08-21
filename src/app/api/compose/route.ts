import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, getWatchContext, createNote, audienceLine, getLoreContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'
import { capHashtags } from '@/lib/hashtags'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Instant compose: Mandi's own media + her context → 3 complete post variations.
// - images: the model sees the image itself
// - videos: the browser sends sampled frames so the model sees the actual footage
// - previous + feedback: refinement loop ("expand the on-screen text to 5-10 punchy lines")
// Story/context is archived to Notes; the media already lives in the Media library.
export async function POST(req: NextRequest) {
  const { context, mediaUrl, mediaType, frames, previous, feedback, forceAccountId } = await req.json()
  if (!context?.trim() && !feedback?.trim()) return NextResponse.json({ error: 'context required' }, { status: 400 })

  // forceAccountId: "Add Post" from an account card locks compose to THAT account
  // (any status), skipping auto-detection. Otherwise pick from active/restricted.
  const allAccounts = getAllBrandAccounts()
  const accounts = forceAccountId
    ? allAccounts.filter(a => a.id === forceAccountId)
    : allAccounts.filter(a => a.status === 'active' || a.status === 'restricted')
  const accountList = accounts.map(a =>
    `- id:"${a.id}" ${a.handle} — ${a.topic}. Tone: ${a.tone}. CTA style: ${a.notes?.includes('Comment') ? a.notes.slice(0, 120) : 'comment-keyword CTA'}${audienceLine(a.audience_id) ? ` 👤 ${audienceLine(a.audience_id)}` : ''}`
  ).join('\n')

  const isImage = mediaType?.startsWith('image') && mediaUrl
  const videoFrames: string[] = Array.isArray(frames) ? frames.slice(0, 12) : []

  const composeInput = [
    `MANDI'S CONTEXT ABOUT THIS MEDIA:\n${context}`,
    videoFrames.length ? `\nThe ${videoFrames.length} images attached are FRAMES SAMPLED FROM HER VIDEO, evenly spaced IN ORDER from start to finish (~1 per 3 seconds). Read them as an evolving story — track how scenes change frame to frame, who appears, what happens, the arc — and time your on-screen beats to that progression. Blend the visual story with her words; her summary tells you what matters most.` : '',
    previous ? `\nPREVIOUS VARIATIONS YOU WROTE:\n${JSON.stringify(previous)}` : '',
    feedback ? `\nMANDI'S FEEDBACK — THIS OVERRIDES EVERYTHING, FOLLOW IT EXACTLY:\n${feedback}` : '',
  ].filter(Boolean).join('\n')

  const composeImages = [...(isImage ? [mediaUrl] : []), ...videoFrames]

  // Craft layer: when the account is known (Add Post → forceAccountId), apply that
  // account's full craft — its voice lessons + the Podcast Constitution for
  // @aimompodcast. Otherwise still fold in her learned voice lessons via craftFor(null).
  const craft = craftFor(forceAccountId ?? null)

  const output = await fableText({
    maxTokens: 6000,
    effort: 'medium',
    useClaude: true, // Opus writes it (unless media frames are attached → 4o vision)
    imageUrls: composeImages,
    input: composeInput,
    instructions: `You compose Instagram-ready posts from Mandi Beck's own photos/videos plus her context.

${forceAccountId
  ? `COMPOSE FOR THIS ACCOUNT ONLY — Mandi chose it from the account card. Set account_id:"${forceAccountId}" and do NOT pick any other account:`
  : 'ACCOUNT ROSTER (pick the ONE best fit):'}
${accountList}
${getWatchContext()}

${getLoreContext(String(context ?? ''))}

${craft}

The CRAFT LAWS above are binding — obey them over any instinct. Especially: STEP 0 (find the golden thread first, put it in the headline), law 2a (the on-screen hook and the caption's first line are STATEMENTS, NEVER questions — assume the audience's answer and say it), law 0 (GROWTH PHASE = NO CTA of any kind — no "comment", no keyword, no "link in bio"), and spacing (captions use real line breaks: hook line, blank line, short paragraphs). No links in captions.

ON-SCREEN TEXT RULES — get this right first, it's the #1 thing Mandi flags:
- If the media is a VIDEO of a PERSON SPEAKING TO CAMERA (talking-head / vlog / avatar — you can see her talking in the frames), on-screen text MUST be EMPTY (""). The spoken words ARE the hook; NEVER stamp text beats over a video of someone talking — that is the exact "garbage" failure. The written hook goes in the caption's first line instead.
- ONLY non-talking video (silent b-roll, montage, footage with no one addressing camera) gets on-screen beats: a SEQUENCE of 5-10 short punchy STATEMENT lines timed to the footage (one per beat, newline-separated).
- For a PHOTO: 1-2 bold overlay lines.
- The hook is ALWAYS a STATEMENT, never a question (law 2a). If a draft opens with "Ever…/Do you…/What if…/How are you…", rewrite it — and the caption must NOT end on a question posed to the reader either ("How are you adapting today?", "Where has your detour taken you?" are violations).
- PLATFORM: if the chosen account posts to YouTube, write for a viewer CHOOSING what to watch — the caption's first line is a click-worthy TITLE (specific benefit or open loop, payoff front-loaded), then a description that hooks before the fold; never a recycled IG one-liner (the craft YOUTUBE law is binding).
- If Mandi gives explicit commands about length, count, tone, or format (in her context or feedback), those commands WIN over these defaults. Follow them literally.

Produce THREE meaningfully different variations (different angles — e.g. relatable-moment, permission-slip, behind-the-scenes truth). Return ONLY valid JSON:
{
  "account_id": "best account id",
  "account_reason": "one sentence",
  "story_summary": "2-3 sentence summary of the story/moment for the archive",
  "media_read": "1-2 sentences: what you actually see in the media (or 'no visual provided')",
  "variations": [
    { "angle": "short label", "onscreen_text": "overlay line(s) — a STATEMENT hook, never a question; newline-separated beats for video", "caption": "full spaced caption (real line breaks; headline first line carries the golden thread; NO CTA during growth phase)", "hashtags": "EXACTLY 3-5 hashtags (never more than 5), space-separated, single #word each, most relevant first" },
    { ... }, { ... }
  ]
}`,
  })

  try {
    const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)![0])
    // Enforce the ≤5 hashtag rule regardless of what the model returned.
    if (Array.isArray(parsed.variations)) {
      for (const v of parsed.variations) v.hashtags = capHashtags(String(v.hashtags ?? ''))
    }
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

    const finalAccountId = forceAccountId || parsed.account_id
    return NextResponse.json({ ...parsed, account_id: finalAccountId, account: accounts.find(a => a.id === finalAccountId) ?? null })
  } catch {
    return NextResponse.json({ error: 'Could not compose from this input', raw: output }, { status: 502 })
  }
}
