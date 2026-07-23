import { NextRequest, NextResponse } from 'next/server'
import { CRAFT_RULES } from '@/lib/craft'
import { fableText, researchWithWeb } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Where every episode CTA sends people: the SHOW, on the platforms it lives on.
const SHOW_LINKS = {
  apple: 'https://podcasts.apple.com/us/podcast/ai-mom/id6786440414',
  spotify: 'https://open.spotify.com/show/033I8hRPjXiKlCHhaq5YYc',
  youtube: 'https://youtube.com/playlist?list=PLZ5DeAJ0I0WI',
}
// The email-capture destination (coming-soon page collecting name + email).
const OPT_IN = 'aimomeducation.com'

export async function POST(req: NextRequest) {
  const { transcript, episodeNumber, guestName, showName = 'AI Mom Podcast' } = await req.json()
  if (!transcript) return NextResponse.json({ error: 'transcript required' }, { status: 400 })

  const clip = String(transcript).slice(0, 9000)

  // 1) RISE does its own homework — pull real, current context so Medium + Substack
  //    have depth beyond what was said in the room (facts, studies, current events).
  let researched = ''
  try {
    researched = await researchWithWeb({
      maxSearches: 6,
      maxTokens: 2500,
      instructions: 'You are RISE\'s research desk. From this podcast transcript, identify the 2-3 threads worth deepening with real outside evidence (studies, data, current developments, expert sources). Search the live web and return a tight brief: for each thread, the fact/finding, the source name, and one sentence on why it matters. Real sources only — flag anything uncertain with "VERIFY:". Plain text, no preamble.',
      input: clip,
    })
  } catch { /* research is best-effort — the episode still generates without it */ }

  const context = `SHOW: ${showName}
HOST: Mandi Beck — AI Mom. Warm, bold, direct, plain English, real mom of 4. This is HER show; write as her, never as a persona.
EPISODE: ${episodeNumber ? `#${episodeNumber}` : 'TBD'}
GUEST: ${guestName ?? 'None — solo episode'}
${researched ? `\nOUTSIDE RESEARCH RISE PULLED (weave the real facts + name the sources into the Medium article and the Substack body — never invent, keep VERIFY: flags):\n${researched}\n` : ''}
TRANSCRIPT:
${clip}`

  const instructions = `You are the podcast production engine for RISE Station — Mandi Beck's AI content operating system. Given a transcript, you produce every deliverable to publish and promote the episode, in MANDI'S OWN VOICE.

Obey the craft laws — PLAIN VOICE (one point, plain words, no flowery lines), FACTS (never invent a stat/quote; prefix "VERIFY:" if unsure), right-sized LENGTH per platform (never a thin stub).

${CRAFT_RULES}

HOOK DOCTRINE (governs title, subtitle, every headline, every reel hook): a hook STOPS A THUMB — a bold claim, strange specific, scene, or provocation. NOT an SEO headline. BANNED lazy defaults: "AI's rapid growth", "Are you prepared?", "The future of X", "Why X matters", "5 ways to…", "How AI is changing…". If it could open a corporate blog post, delete it.

Return ONLY valid JSON. No markdown fences, no explanation.`

  const schema = `Return this exact JSON:
{
  "title": "punchy episode title in Mandi's voice (under 60 chars)",
  "subtitle": "one sentence that makes someone hit play",
  "questions": ["the real question this episode asks/answers", "3-6 of them — what a listener came to figure out"],
  "headlines": ["5 scroll-stopping options at the hook-doctrine bar"],
  "description": "3-paragraph show notes in Mandi's voice — scene, key insight, why it matters. Under 300 words.",
  "seo_description": "150-character search meta description",
  "keywords": ["5 keywords"],
  "pull_quotes": ["5 real quotes pulled from the transcript"],
  "reels_scripts": [
    {"hook": "ONE-line hook at the doctrine bar", "body": "15-30 sec middle", "cta": "comment-trigger CTA", "platform": "Instagram Reels"},
    {"hook": "different angle", "body": "...", "cta": "...", "platform": "TikTok"},
    {"hook": "third angle", "body": "...", "cta": "...", "platform": "YouTube Shorts"}
  ],
  "medium_article": {
    "title": "curiosity-driven, keyword-aware Medium title",
    "subtitle": "one-sentence deck",
    "sections": [
      {"heading": "section heading (plain text, NO # symbols)", "body": "2-4 rich paragraphs. Weave in the outside research with named sources where it fits."}
    ],
    "closing": "closing paragraph that invites the reader to follow the podcast"
  },
  "newsletter_subject": "Substack subject line that gets opened",
  "newsletter_body": "Full 400-700 word Substack issue in Mandi's voice — one observation, one insight, one takeaway, deepened with the outside research. Short paragraphs. Ends with a warm invite to follow the show.",
  "episode_description": "ONE ready-to-post episode description (200-400 words) used identically on YouTube, Spotify, and Apple. Scene + what's inside + who it's for.",
  "youtube_title": "YouTube-optimized title",
  "youtube_tags": ["8-12 tags"],
  "pinterest_pins": [
    {"title": "pin title", "description": "keyword-rich pin description", "image_prompt": "a detailed, ready-to-generate visual prompt for this pin — warm, on-brand, no text baked in"}
  ],
  "resources": [
    {"name": "tool / book / study / person mentioned in the episode", "url": "the real link if known or a best-guess official URL (else empty string)", "note": "one line on what it is"}
  ],
  "ad_reads": {
    "pre_roll": "15-sec SPOKEN invite in Mandi's voice to follow AI Mom Podcast on Apple, Spotify, or YouTube. Warm, pure-give. You MAY say '${OPT_IN}' aloud to invite them to join the list. No other URLs.",
    "mid_roll": "30-sec SPOKEN mid-roll inviting listeners to follow the show AND to go to ${OPT_IN} to get on the list. Pure-give, no hard sell.",
    "post_roll": "10-sec SPOKEN outro — follow AI Mom on Apple/Spotify/YouTube, mention ${OPT_IN}, end on a signature line."
  },
  "manychat_trigger": "single keyword for comment-to-DM automation",
  "manychat_dm": "auto-DM sent when someone comments the trigger word — warm, points to ${OPT_IN}",
  "producer_feedback": {
    "overall_grade": "JUST the letter grade, nothing else — e.g. \\"A-\\", \\"B+\\", \\"C\\"",
    "verdict": "one honest sentence — the verdict on this episode",
    "strengths": ["3 specific strengths"],
    "topic_drift": "did she stay on topic or wander? specific moments.",
    "depth_gaps": "what was mentioned but under-covered — what listeners wanted more of",
    "too_many_directions": "if it tried to cover too much, name the ONE thread it should have been",
    "biggest_win": "the single best moment or insight",
    "next_episode_suggestion": "the perfect follow-up episode based on what was discussed"
  }
}`

  try {
    const raw = await fableText({ instructions, input: `${context}\n\n${schema}`, maxTokens: 16000, effort: 'medium' })
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')
    const deliverables = JSON.parse(match[0])
    deliverables.show_links = SHOW_LINKS
    deliverables.opt_in = OPT_IN
    return NextResponse.json({ deliverables })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not parse deliverables' }, { status: 500 })
  }
}
