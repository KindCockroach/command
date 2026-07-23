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

  // Read the WHOLE episode — Fable's context is huge. (The old 8-9k cap meant the
  // model never saw the last third of an episode, where the real takeaway usually lands.)
  const clip = String(transcript).slice(0, 120000)

  // RISE's homework is SUPPORTING evidence only — real sources that back the claims
  // MANDI ALREADY MADE. It must never introduce new specifics that become the story.
  let researched = ''
  try {
    researched = await researchWithWeb({
      maxSearches: 5,
      maxTokens: 2000,
      instructions: 'You are RISE\'s fact-checking desk. Read this podcast transcript and find real outside sources that SUPPORT or gently contextualize the specific claims THE HOST ALREADY MADE (do not introduce new topics she did not raise). Return a short list: [her claim] → [supporting source name + URL] → [one line of context]. Real sources only; "VERIFY:" anything uncertain. This is a further-reading layer, not new content. Plain text.',
      input: clip,
    })
  } catch { /* research is best-effort — the episode still generates without it */ }

  const context = `SHOW: ${showName}
HOST: Mandi Beck — AI Mom. Warm, tangential, self-aware, philosophical, plain-spoken — a mom at the window, NOT a tech-bro explainer. This is HER show; write AS her.
EPISODE: ${episodeNumber ? `#${episodeNumber}` : 'TBD'}
GUEST: ${guestName ?? 'None — solo episode'}
${researched ? `\nSUPPORTING SOURCES (further-reading ONLY — real sources that back claims Mandi already made. Use them ONLY as citations/links in the Medium article's further-reading. NEVER state one of these specifics as something discussed in the episode, NEVER put them in headlines, quotes, show notes, reels, or the episode description, NEVER speak them in her voice):\n${researched}\n` : ''}
FULL TRANSCRIPT (this is the source of truth — everything you write must come from HERE):
${clip}`

  const instructions = `You are the podcast production engine for RISE Station — Mandi Beck's AI content operating system. You turn ONE episode into every deliverable, in MANDI'S OWN VOICE.

⚑ UNDERSTAND THE EPISODE FIRST. Before writing anything, read the whole transcript and lock three things (you'll return them):
1. THE ONE TAKEAWAY — the host's actual thesis, in HER framing, not the generic topic. (This episode's topic is "AI and water," but its TAKEAWAY is a specific argument she builds. Find the real argument.)
2. THE EMOTIONAL SPINE — the story or wound at the center (who it's about, what actually happened, why it matters to her).
3. HER REAL LINES — the 6-8 most striking things she ACTUALLY said, verbatim.
Then make EVERY asset serve the takeaway and honor the spine. TEST: if a headline, quote, or reel could have been written from the episode's TITLE alone — without reading the transcript — it FAILS. Rewrite it so it could only have come from THIS episode.

⚑ GROUND EVERYTHING IN WHAT SHE SAID. Every fact, number, name, place, and quote must come from the transcript. Do NOT import outside statistics, institutions, or place names into headlines, pull_quotes, show notes, reels, keywords, or the episode description — those come ONLY from her words. "pull_quotes" must be VERBATIM (or near-verbatim) lines from the transcript — never paraphrased or invented. If she gave a number ("50% less than lawns", "4,000 residents, 1,200 data centers"), use HER number, not one from research.

⚑ HEADLINES PROMISE WHAT THE EPISODE DELIVERS. Every headline and reel hook must be answerable BY her actual takeaway — never promise a technical exposé or facts-deep-dive she didn't give. A hook still STOPS A THUMB (a bold claim, a scene, a provocation from HER argument) — but it must be TRUE to this episode. Banned lazy defaults: "The future of X", "Why X matters", "5 ways to…", "How AI is changing…", "The truth about…".

⚑ RESEARCH IS SUBORDINATE. The supporting sources above are a further-reading layer for the Medium article only. They support claims she already made; they never replace her argument, never appear in her voice, never become the story.

⚑ VOICE. Warm, human, a little tangential, philosophical, self-aware, funny when it lands. Never corporate, never "arm you with the facts", never explainer-bro. If a line sounds like a content marketer wrote it, rewrite it as her.

Obey the craft laws below for HOW every line is built. Return ONLY valid JSON — no markdown fences, no explanation.

${CRAFT_RULES}`

  const schema = `Return this exact JSON:
{
  "core_takeaway": "the ONE real thesis of this episode, in Mandi's framing — the argument she actually builds, not the topic. One or two sentences.",
  "emotional_spine": "the story or wound at the center — who it's about, what happened, why it matters to her. One or two sentences.",
  "title": "punchy episode title in Mandi's voice (under 60 chars) — TRUE to the core_takeaway",
  "subtitle": "one sentence that makes someone hit play — reflects the real takeaway, not a generic topic",
  "questions": ["the real questions THIS episode asks/answers (many are literally asked near the end) — 3-6, in her words"],
  "headlines": ["5 scroll-stopping options — each must be answerable by core_takeaway and honor emotional_spine; none writable from the title alone"],
  "description": "3-paragraph show notes in Mandi's voice — open on the emotional spine (the real story), land the core takeaway, why it matters. Under 300 words. Her warm, tangential voice.",
  "seo_description": "150-character search meta description",
  "keywords": ["5 keywords drawn from what she actually discussed"],
  "pull_quotes": ["6 VERBATIM (or near-verbatim) lines she ACTUALLY said — the most striking, quotable, human ones. Copy them from the transcript; never invent or paraphrase into a marketer's line."],
  "reels_scripts": [
    {"hook": "ONE-line hook at the doctrine bar", "body": "15-30 sec middle", "cta": "comment-trigger CTA", "platform": "Instagram Reels"},
    {"hook": "different angle", "body": "...", "cta": "...", "platform": "TikTok"},
    {"hook": "third angle", "body": "...", "cta": "...", "platform": "YouTube Shorts"}
  ],
  "medium_article": {
    "title": "curiosity-driven Medium title — TRUE to the core_takeaway",
    "subtitle": "one-sentence deck",
    "sections": [
      {"heading": "section heading (plain text, NO # symbols)", "body": "2-4 rich paragraphs that follow HER argument from the episode. You MAY cite a supporting source (with its name) to back a point she made — but the spine is her episode, never the research. Never state an outside specific as something she discussed."}
    ],
    "closing": "closing paragraph in her voice that invites the reader to follow the podcast (optionally: a short 'further reading' line with 1-2 real source links from the supporting sources)"
  },
  "newsletter_subject": "Substack subject line that gets opened — reflects the real takeaway",
  "newsletter_body": "Full 400-700 word Substack issue in HER voice, built on the episode's actual argument and story. One observation, one insight, one takeaway. You may reference a real supporting source to deepen a point she made, clearly as outside context — never invented, never as her episode content. Short paragraphs, warm close inviting them to follow the show.",
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
