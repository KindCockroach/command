import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createContent, getBrandAccount, getWatchContext, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type ContentOrder = {
  type: string
  qty: number
}

const TYPE_PROMPTS: Record<string, (project: string, desc: string, notes: string, qty: number) => string> = {
  instagram_post: (p, d, n, q) => `
Generate ${q} Instagram posts for project "${p}".
Description: ${d}. Notes: ${n}.

CONTENT AUDIT RULES — every post must pass all of these:
1. HER FRAME: Lead with her specific Tuesday-night problem, not Mandi's journey. Never narrate Mandi's transformation and expect the reader to project. Put the reader in the frame.
2. 3-SECOND TEST: A cold stranger must immediately know this is for her. No abstract feelings, no poetry, no vague inspiration.
3. HOOK MECHANICS — WINNING: Direct question about HER life ("What's one thing you wish you never had to think about again?"), concrete stats, bold specific analogies. LOSING: vague openers ("done beats perfect!"), mood without meaning ("disgust. regrets."), fortune-cookie abstractions.
4. ONE CTA: Every post ends with "Comment WISH and I'll DM you [specific thing] — no link-hunting, no funnel." Never "link in bio" as primary CTA.
5. VOICE: "Grab the damn cup" energy — funny, warm, human, direct. Aimed at her, not at Mandi.
6. STRUCTURE: Open with her pain → show you've lived it (briefly) → deliver the tool/insight → Comment WISH CTA.

Each post must have:
- "body": full caption with line breaks, emoji, and CTA ending in "Comment WISH"
- "hashtags": string of NO MORE THAN 5 hashtags (space-separated — the 5 most relevant, niche over broad)
- "alt_text": 1-sentence image description for accessibility
- "angle": hook angle used (question / stat / reframe / permission slip / objection buster)

Vary angles across the batch. Return JSON array. Each item: { title, body, hashtags, alt_text, angle, platform: "instagram" }`,

  instagram_reel: (p, d, n, q) => `
Generate ${q} Instagram Reel scripts for project "${p}".
Description: ${d}. Notes: ${n}.

CONTENT AUDIT RULES — every reel must pass all of these:
1. Hook (first 3 seconds) must be about HER life, not Mandi's. Specific, concrete, second-person.
2. Script leads with her pain, positions Mandi as proof it's solvable, delivers the tool fast.
3. End with: "Comment WISH and I'll DM you [specific deliverable]."
4. Voice: warm, direct, funny when natural. Never corporate. Never vague inspiration.

Each reel must have:
- "hook": opening line spoken on camera (first 3 seconds — specific, stops scroll, about HER)
- "script": full spoken script (15–30 seconds, punchy, conversational, ends with Comment WISH CTA)
- "caption": post caption with Comment WISH CTA
- "hashtags": 15–20 hashtags
- "b_roll": list of 3–5 suggested visual cuts/text overlays

Return JSON array. Each item: { title, hook, script, caption, hashtags, b_roll, angle, platform: "instagram_reel" }`,

  youtube: (p, d, n, q) => `
Generate ${q} YouTube video packages for project "${p}".
Description: ${d}. Notes: ${n}.
Each package must have:
- "headline": SEO-optimized video title (under 70 chars, includes keyword)
- "description": full YouTube description (150–300 words, includes timestamps placeholder, links, CTA, keywords)
- "tags": comma-separated YouTube tags (20–30 tags)
- "thumbnail_concept": visual description of thumbnail (text overlay + background + expression)
- "hook": opening 30 seconds spoken script

Return JSON array. Each item: { title, headline, description, tags, thumbnail_concept, hook, platform: "youtube" }`,

  medium_article: (p, d, n, q) => `
Generate ${q} Medium articles for project "${p}".
Description: ${d}. Notes: ${n}.
Each article must have:
- "title": clickable headline (curiosity + keyword)
- "subtitle": supporting sentence under title
- "body": full 600–900 word article (use subheadings, short paragraphs, conversational but smart tone)
- "tags": 5 Medium tags

Voice: Mandi Beck. Authoritative AI Mom educator. Teaches moms to use AI without overwhelm.
Return JSON array. Each item: { title, subtitle, body, tags, platform: "medium" }`,

  substack: (p, d, n, q) => `
Generate ${q} Substack newsletter issues for project "${p}".
Description: ${d}. Notes: ${n}.
Each issue must have:
- "subject_line": email subject (under 50 chars, high open rate)
- "preview_text": preview snippet shown in inbox (under 90 chars)
- "body": full newsletter body (400–700 words, personal tone, 1 main idea, practical tip, CTA at end)
- "ps": a P.S. line (personal, often the best CTA)

Voice: Mandi Beck writing to her mom community. Warm, honest, actionable.
Return JSON array. Each item: { title, subject_line, preview_text, body, ps, platform: "substack" }`,

  tiktok: (p, d, n, q) => `
Generate ${q} TikTok video scripts for project "${p}".
Description: ${d}. Notes: ${n}.

CONTENT AUDIT RULES:
1. Hook must be about HER specific problem, not a mood or Mandi's feelings. Concrete + second-person wins.
2. Script: open with her pain → Mandi as proof → tool → CTA. Never "I was lost but now I'm found" self-narration.
3. CTA: "Comment WISH and I'll DM you [specific thing]."

Each script must have:
- "hook": first spoken line (under 3 seconds — specific, about HER, stops scroll)
- "script": full 30–60 second spoken script (casual, fast-paced, punchy, ends with Comment WISH CTA)
- "caption": TikTok caption with Comment WISH CTA (1-2 sentences max)
- "hashtags": 5–8 hashtags
- "trending_sound_vibe": description of the audio energy that fits (e.g. "chaotic girl boss", "emotional reveal", "hype build")

Voice: Mandi Beck. Mom energy. Relatable chaos with a confident solution.
Return JSON array. Each item: { title, hook, script, caption, hashtags, trending_sound_vibe, angle, platform: "tiktok" }`,

  email: (p, d, n, q) => `
Generate ${q} marketing emails for project "${p}".
Description: ${d}. Notes: ${n}.

CONTENT AUDIT RULES:
1. Subject line must speak to HER specific pain or curiosity — not a clever Mandi moment.
2. Open with her problem, not "I wanted to share something with you."
3. Body: her pain → Mandi's lived proof → tool → one clear CTA.
4. Voice: like a text from a smart friend who has your back. Never corporate. Never vague.

Each email must have:
- "subject_line": email subject line (her pain or curiosity, under 50 chars)
- "preview_text": preview text — extends the hook, under 90 chars
- "body": full email body (200–400 words, one clear CTA, personal tone, no corporate speak)
- "cta_button_text": text for the main CTA button (5 words or less)

Return JSON array. Each item: { title, subject_line, preview_text, body, cta_button_text, platform: "email" }`,

  pinterest: (p, d, n, q) => `
Generate ${q} Pinterest pin packages for project "${p}".
Description: ${d}. Notes: ${n}.
Each pin must have:
- "pin_title": SEO title for the pin (under 100 chars, keyword-rich)
- "description": pin description (150–300 chars, includes keywords + CTA)
- "board_suggestion": which board this fits best
- "image_concept": visual description of the pin image (text overlay, colors, layout)
- "keywords": 10 keyword phrases for SEO

Return JSON array. Each item: { title, pin_title, description, board_suggestion, image_concept, keywords, platform: "pinterest" }`,

  facebook_post: (p, d, n, q) => `
Generate ${q} Facebook posts for project "${p}".
Description: ${d}. Notes: ${n}.
Each post must have:
- "body": full post (can be longer than Instagram — storytelling format works well, end with question or CTA)
- "angle": hook type used

Voice: Mandi Beck. Community-first, conversational, invites engagement.
Return JSON array. Each item: { title, body, angle, platform: "facebook" }`,

  threads: (p, d, n, q) => `
Generate ${q} Threads posts for project "${p}".
Description: ${d}. Notes: ${n}.

CONTENT AUDIT RULES:
1. Every post must pass the "cold mom" test — would a stranger feel "this is for me"?
2. No abstract feelings. No self-narration. Her Tuesday, her problem, her relief.
3. Hot takes and real talk are great — but aim them at HER situation, not Mandi's.

Each post must have:
- "body": short punchy post (under 500 chars, no hashtags, conversational, second-person or bold hot take)
- "angle": hook type (hot take / question / permission slip / reframe / real talk)

Voice: Mandi Beck. Unfiltered thoughts, warm directness, real mom perspective aimed at the reader.
Return JSON array. Each item: { title, body, angle, platform: "threads" }`,
}

// Every generated item, regardless of type, must include a visual prompt
const VISUAL_RULE = `
ADDITIONALLY every item must include:
- "image_prompt": a detailed, ready-to-paste AI image or video generation prompt for this post's visual (subject, setting, mood, style, aspect ratio). Make it specific to the post's hook.
- "onscreen_text": the exact text overlay (or opening on-screen line for video) shown on the visual — short, bold, scroll-stopping.`

// House rule: never more than 5 hashtags on anything, no matter what the model returns
function capHashtags(raw: string): string {
  const tags = String(raw || '').split(/\s+/).filter(t => t.startsWith('#'))
  const rest = String(raw || '').split(/\s+/).filter(t => t && !t.startsWith('#'))
  const source = tags.length ? tags : rest.map(t => `#${t.replace(/[^A-Za-z0-9]/g, '')}`).filter(t => t.length > 1)
  return source.slice(0, 5).join(' ')
}

function buildDescription(item: Record<string, string>): string {
  const parts = []
  if (item.body) parts.push(item.body)
  if (item.caption) parts.push(`\n\nCaption: ${item.caption}`)
  if (item.hook) parts.push(`\n\nHook: ${item.hook}`)
  if (item.script) parts.push(`\n\nScript: ${item.script}`)
  if (item.headline) parts.push(`\n\nHeadline: ${item.headline}`)
  if (item.description) parts.push(`\n\nDescription: ${item.description}`)
  if (item.subject_line) parts.push(`\n\nSubject: ${item.subject_line}`)
  if (item.preview_text) parts.push(`\n\nPreview: ${item.preview_text}`)
  return parts.join('') || item.title || 'Generated content'
}

function buildNotes(item: Record<string, string>, type: string): string {
  const extras: string[] = [`Type: ${type}`]
  if (item.hashtags) extras.push(`Hashtags: ${item.hashtags}`)
  if (item.tags) extras.push(`Tags: ${item.tags}`)
  if (item.angle) extras.push(`Angle: ${item.angle}`)
  if (item.alt_text) extras.push(`Alt text: ${item.alt_text}`)
  if (item.b_roll) extras.push(`B-roll: ${Array.isArray(item.b_roll) ? item.b_roll.join(', ') : item.b_roll}`)
  if (item.thumbnail_concept) extras.push(`Thumbnail: ${item.thumbnail_concept}`)
  if (item.cta_button_text) extras.push(`CTA button: ${item.cta_button_text}`)
  if (item.board_suggestion) extras.push(`Pinterest board: ${item.board_suggestion}`)
  if (item.ps) extras.push(`P.S.: ${item.ps}`)
  if (item.trending_sound_vibe) extras.push(`Sound vibe: ${item.trending_sound_vibe}`)
  return extras.join(' | ')
}

export async function POST(req: NextRequest) {
  const { projectName, projectDescription, projectNotes, orders, count, accountId, projectId, holdInProject, carousel, mediaUrl } = await req.json()
  if (!projectName) return NextResponse.json({ error: 'projectName required' }, { status: 400 })

  // Load account brand DNA if specified
  const account = accountId ? getBrandAccount(accountId) : null
  const accountContext = account ? `
ACCOUNT VOICE & BRAND DNA:
Handle: ${account.handle} (${account.brand_name})
Topic: ${account.topic}
Mission: ${account.mission}
Bio: ${account.bio}
Underlying message: ${account.underlying_message}
Problem: ${account.problem_message}
Solution: ${account.solution_message}
Transformation arc: ${account.transformation}
Tone: ${account.tone}
Beliefs: ${account.beliefs.join('; ')}
${account.hooks.length ? `Pre-written hooks to riff on: ${account.hooks.join(' | ')}` : ''}
${account.offer ? `Offer: ${account.offer} (${account.offer_price})` : ''}
${account.notes ? `NON-NEGOTIABLE ACCOUNT RULES (override everything else): ${account.notes}` : ''}
${getAudienceContext(account.audience_id)}
Write ALL content in this account's voice, not generic Mandi Beck voice.
` : `VOICE: Mandi Beck — AI Mom educator. Direct, warm, no fluff. Speaks to exhausted moms done doing it all alone.`

  // Legacy: if no orders array, fall back to simple caption generation
  const contentOrders: ContentOrder[] = orders ?? [{ type: 'instagram_post', qty: count ?? 20 }]

  const allCreated = []

  for (const order of contentOrders) {
    const promptFn = TYPE_PROMPTS[order.type]
    if (!promptFn) continue

    // Carousel is only meaningful for Instagram posts; force the numbered-slide format
    const wantCarousel = carousel && order.type === 'instagram_post'
    const carouselRule = wantCarousel ? `
CAROUSEL FORMAT (required for this batch): make "onscreen_text" a set of 5–8 numbered slide lines, each on its own line ("Slide 1: ...", "Slide 2: ..."), each slide pulling to the next, the last slide a mic drop + Comment WISH CTA. These lines are the skeleton Mandi builds in Canva.` : ''

    const basePrompt = promptFn(projectName, projectDescription || '', projectNotes || '', order.qty)
    const prompt = `${accountContext}\n${getWatchContext()}\n\n${craftFor(accountId)}\n\n${basePrompt}\n${VISUAL_RULE}${carouselRule}\n\nHARD RULE: never output more than 5 hashtags on any item.`

    try {
      const response = await client.responses.create({
        model: 'gpt-4o',
        instructions: 'You are a master storyteller writing scroll-stopping content that makes people FEEL something and see themselves differently. Show, never tell. Earn one emotional shift per piece. Return only valid JSON arrays, no markdown, no explanation.',
        input: prompt,
      })

      const raw = response.output_text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      const items: Array<Record<string, string>> = JSON.parse(raw)

      const accountTag = account ? account.handle.replace('@', '') : 'generic'
      const created = items.map(item =>
        createContent({
          title: item.title || `${order.type} — ${projectName}`,
          description: buildDescription(item),
          status: holdInProject ? 'held' : 'ready',
          type: (wantCarousel ? 'carousel' : order.type) as import('@/lib/db').ContentType,
          platforms: [item.platform || order.type],
          tags: ['generated', projectName.toLowerCase().replace(/\s+/g, '-'), order.type, accountTag],
          notes: buildNotes(item, order.type) + (account ? ` | Account: ${account.handle}` : ''),
          project_id: holdInProject && projectId ? projectId : null,
          account_id: account ? account.id : null,
          image_prompt: item.image_prompt || item.thumbnail_concept || item.image_concept || '',
          onscreen_text: item.onscreen_text || item.hook || '',
          hashtags: capHashtags(String(item.hashtags || item.tags || item.keywords || '')),
          media_url: mediaUrl || '',
        })
      )
      allCreated.push(...created)
    } catch (e) {
      console.error(`Failed generating ${order.type}:`, e)
    }
  }

  return NextResponse.json({ created: allCreated.length, posts: allCreated })
}
