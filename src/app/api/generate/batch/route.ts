import { NextRequest, NextResponse } from 'next/server'
import { createContent, getBrandAccount, getWatchContext, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText, fableHooks } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export type ContentOrder = {
  type: string
  qty: number
}

const TYPE_PROMPTS: Record<string, (project: string, desc: string, notes: string, qty: number) => string> = {
  instagram_post: (p, d, n, q) => `
Generate ${q} Instagram posts for project "${p}".
Description: ${d}. Notes: ${n}.

Obey the CRAFT LAWS above — they govern voice, hook, specificity, and CTA. The list below is STRUCTURE only; it never overrides a Law.
- The on-screen hook and the caption's FIRST LINE must be two DIFFERENT doors — never the same words (Craft Law 2). Don't default every hook to a question; vary the door.
- CTA follows the OFFERS law: INVITE her into the conversation unless a real offer exists in THIS account's DNA. Use this account's own keyword/CTA — never a generic "Comment WISH", never "link in bio" as the primary ask.

Each post must have:
- "body": full post-ready caption with line breaks (headline first line ≠ on-screen hook; curiosity-gap last line; its CTA per the OFFERS law)
- "hashtags": string of NO MORE THAN 5 hashtags (space-separated — the 5 most relevant, niche over broad)
- "alt_text": 1-sentence image description for accessibility
- "angle": the emotional door used (reframe / permission / objection / untold detail / confession) — vary across the batch

Return JSON array. Each item: { title, body, hashtags, alt_text, angle, platform: "instagram" }`,

  instagram_reel: (p, d, n, q) => `
Generate ${q} Instagram Reel scripts for project "${p}".
Description: ${d}. Notes: ${n}.

Obey the CRAFT LAWS above (hook, specificity, offers, plain voice). Structure only below.
- "hook" = ONE on-screen line that stops the scroll; the "caption" first line must be a DIFFERENT door than that hook — never the same words.
- CTA follows the OFFERS law — invite unless a real offer exists in this account's DNA; use this account's own keyword, never a generic "Comment WISH".

Each reel must have:
- "hook": the single opening/on-screen line (specific, about HER, stops scroll)
- "script": full spoken script (15–30 seconds, conversational, pays off the hook, ends on its CTA) — no emojis, labels, or stage cues
- "caption": post-ready caption (first line ≠ hook; curiosity-gap last line)
- "hashtags": up to 5 hashtags
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

Obey the CRAFT LAWS above. Structure only below.
- "hook" = ONE opening/on-screen line; the "caption" first line must be a DIFFERENT door than the hook — never the same words.
- CTA follows the OFFERS law — invite unless a real offer exists in this account's DNA; use this account's own keyword, never a generic "Comment WISH".

Each script must have:
- "hook": first spoken/on-screen line (under 3 seconds — specific, about HER, stops scroll)
- "script": full 30–60 second spoken script (casual, fast-paced, pays off the hook, ends on its CTA)
- "caption": TikTok caption, 1–2 sentences max (first line ≠ hook)
- "hashtags": up to 5 hashtags
- "trending_sound_vibe": description of the audio energy that fits (e.g. "emotional reveal", "hype build")

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
- "onscreen_text": the exact text overlay (or opening on-screen line for video) shown on the visual — short, bold, scroll-stopping. It MUST be a DIFFERENT line than the caption's first line (two-hooks rule) — never the same words.`

// House rule: never more than 5 hashtags on anything, no matter what the model returns
function capHashtags(raw: string): string {
  const tags = String(raw || '').split(/\s+/).filter(t => t.startsWith('#'))
  const rest = String(raw || '').split(/\s+/).filter(t => t && !t.startsWith('#'))
  const source = tags.length ? tags : rest.map(t => `#${t.replace(/[^A-Za-z0-9]/g, '')}`).filter(t => t.length > 1)
  return source.slice(0, 5).join(' ')
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
${account.pushing ? `CURRENTLY PUSHING (the business → product every CTA ultimately serves): ${account.pushing}` : ''}
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
CAROUSEL FORMAT (required for this batch): make "onscreen_text" a set of 5–8 numbered slide lines, each on its own line ("Slide 1: ...", "Slide 2: ..."), each slide pulling to the next, the last slide a mic drop + the CTA per the OFFERS law (this account's own keyword — never a generic "Comment WISH"). These lines are the skeleton Mandi builds in Canva.` : ''

    const basePrompt = promptFn(projectName, projectDescription || '', projectNotes || '', order.qty)
    // PASS 1 — Claude Fable 5 writes the two hardest lines (on-screen hook + caption opener).
    // Degrades to pure 4o if Fable is unavailable, so generation never hard-fails.
    let fableHookSet: Array<{ onscreen_text?: string; first_line?: string; angle?: string }> = []
    try {
      const hookSys = 'You are Claude Fable writing the two hardest lines of a social post: the scroll-stopping on-screen hook and the caption\'s first sentence (a DIFFERENT door — never the same words). THE RULE THAT MATTERS MOST: speak from INSIDE her experience; never describe her own scene back at her. BANNED openers: "It\'s 9pm and you\'re watching your fourth tutorial", "You have 23 tabs open", "You\'re exhausted and the coffee\'s cold" — labeling her life reads as manufactured relatability and she scrolls instantly (insta-sales). INSTEAD, answer the feeling she already has with a specific FIRST-PERSON true moment she recognizes herself in: "The first time I closed all my tabs without thinking twice. No restore necessary." / "Wasted. Wasted. Wasted. And I\'m not talking about my husband." / "The same month I put the bacon back at the checkout was the month I launched a location-free business at nap time." First-person over second-person; a real specific moment over a described one; imply the scene, never announce it — she should think "how did you know," not "you\'re describing me." NO CTA. Return ONLY a valid JSON array, no prose.'
      const hookPrompt = `${accountContext}\n${getWatchContext()}\n\n${craftFor(accountId)}\n\nWrite ${order.qty} DISTINCT hook pairs for "${projectName}" (${projectDescription || ''}). Each speaks from INSIDE her experience — a first-person, specific, true moment she recognizes herself in — NEVER describing her scene at her, never generic. Vary the emotional door across the batch. NO CTA of any kind.\nReturn JSON array: [{ "onscreen_text": "the on-screen line (from inside, first-person)", "first_line": "the caption's first sentence, a different door", "angle": "the door used" }]`
      const hookRaw = await fableHooks(hookSys, hookPrompt, 3000)
      fableHookSet = JSON.parse(hookRaw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim())
    } catch { fableHookSet = [] }

    const anchors = fableHookSet.length
      ? `\n\nFABLE WROTE THESE HOOKS — write ONE full post per hook, IN ORDER. Use the given on-screen line as-is, and OPEN the caption with the given first sentence verbatim, then continue in this account's voice, pulling SPECIFIC real details from the brand DNA and notes above. Do NOT change, restate, or re-hook — continue and deliver the value. End per the craft laws (growth phase = no CTA).\n${fableHookSet.map((h, i) => `${i + 1}. ON-SCREEN: ${h.onscreen_text}\n   CAPTION OPENS: ${h.first_line}`).join('\n')}`
      : ''

    const prompt = `${accountContext}\n${getWatchContext()}\n\n${craftFor(accountId)}\n\n${basePrompt}\n${VISUAL_RULE}${carouselRule}${anchors}\n\nHARD RULE: never output more than 5 hashtags on any item.`

    try {
      const output = await fableText({
        instructions: 'You are a master storyteller writing scroll-stopping content that makes people FEEL something and see themselves differently. Show, never tell. Earn one emotional shift per piece. Return only valid JSON arrays, no markdown, no explanation.',
        input: prompt,
        maxTokens: 16000,
        effort: 'medium',
      })

      const raw = output.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      const items: Array<Record<string, string>> = JSON.parse(raw)

      const accountTag = account ? account.handle.replace('@', '') : 'generic'
      const isVideo = order.type === 'instagram_reel' || order.type === 'tiktok'
      const created = items.map((item, idx) => {
        const hashtags = capHashtags(String(item.hashtags || item.tags || item.keywords || ''))
        // BODY = post-ready caption + hashtags ONLY. No labels, no slides, no scripts.
        const caption = String(item.body || item.caption || item.description || item.title || '').trim()
        const description = [caption, hashtags].filter(Boolean).join('\n\n')
        const hook = String(fableHookSet[idx]?.onscreen_text || item.onscreen_text || item.hook || '').trim()
        const baseImg = item.image_prompt || item.thumbnail_concept || item.image_concept || ''
        // SCRIPT (spoken) is its own field for videos; ON-SCREEN is slides/overlays and can differ
        const script = isVideo ? String(item.script || '').trim() : ''
        let onscreen_text = hook
        if (wantCarousel) onscreen_text = String(item.onscreen_text || hook)
        else if (isVideo) onscreen_text = String(item.hook || '').trim() // on-screen hook/overlay; script lives in its own field
        // SINGLE IMAGE POST → bake the hook text into the image prompt so it generates and posts as-is
        const image_prompt = (!wantCarousel && !isVideo && hook)
          ? `${baseImg}${baseImg ? '. ' : ''}On the image, render the exact headline text "${hook}" in bold, clean, legible sans-serif type with strong contrast, centered — Instagram-ready 1:1 square.`
          : baseImg
        return createContent({
          title: item.title || `${order.type} — ${projectName}`,
          description,
          status: holdInProject ? 'held' : 'ready',
          type: (wantCarousel ? 'carousel' : (isVideo ? 'video' : order.type)) as import('@/lib/db').ContentType,
          platforms: [item.platform || order.type],
          tags: ['generated', projectName.toLowerCase().replace(/\s+/g, '-'), order.type, accountTag],
          notes: buildNotes(item, order.type) + (account ? ` | Account: ${account.handle}` : ''),
          project_id: holdInProject && projectId ? projectId : null,
          account_id: account ? account.id : null,
          image_prompt,
          script,
          onscreen_text,
          hashtags,
          media_url: mediaUrl || '',
        })
      })
      allCreated.push(...created)
    } catch (e) {
      console.error(`Failed generating ${order.type}:`, e)
    }
  }

  return NextResponse.json({ created: allCreated.length, posts: allCreated })
}
