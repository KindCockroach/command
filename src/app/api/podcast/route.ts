import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CRAFT_RULES } from '@/lib/craft'

export const dynamic = 'force-dynamic'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Where every episode CTA sends people: the SHOW, on the platforms it lives on.
// Not aiworksforyou.co. Replace the three URLs below with the real show links.
const SHOW_LINKS = {
  apple: 'https://podcasts.apple.com/us/podcast/ai-mom/id6786440414',
  spotify: 'https://open.spotify.com/show/033I8hRPjXiKlCHhaq5YYc',
  youtube: 'https://youtube.com/playlist?list=PLZ5DeAJ0I0WI',
}
const SHOW_LINKS_BLOCK = `Listen & follow the AI Mom Podcast — 🎧 Apple Podcasts: ${SHOW_LINKS.apple} · 🟢 Spotify: ${SHOW_LINKS.spotify} · ▶️ YouTube: ${SHOW_LINKS.youtube}`

export async function POST(req: NextRequest) {
  const { transcript, episodeNumber, guestName, showName = 'AI Mom Podcast' } = await req.json()

  if (!transcript) return NextResponse.json({ error: 'transcript required' }, { status: 400 })

  const context = `
SHOW: ${showName}
HOST: Mandi Beck — AI Mom. Warm, bold, direct, plain English, real mom of 4.
EPISODE: ${episodeNumber ? `#${episodeNumber}` : 'TBD'}
GUEST: ${guestName ?? 'None — solo episode'}
TRANSCRIPT:
${transcript.slice(0, 8000)}
`

  const response = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are the podcast production engine for RISE Station — Mandi Beck's AI content operating system.
Given a podcast transcript, you produce EVERY deliverable needed to publish and promote the episode.
You also provide honest, constructive producer feedback to help Mandi improve.

Everything you write stays in MANDI'S OWN VOICE (this is her show, she is the host — do not write as a persona). But every deliverable still obeys the craft laws below — especially PLAIN VOICE (one point, plain words, no flowery or convoluted lines), FACTS (never invent a stat/quote — prefix "VERIFY:" if unsure), and right-sized LENGTH per platform (never publish a thin stub).

${CRAFT_RULES}

HOOK DOCTRINE (governs the title, subtitle, EVERY headline, and EVERY reel hook — this is the bar):
A hook must STOP A THUMB — make a scroller think "wait, WHAT?" It is a bold claim, a strange specific, a scene, or a provocation she cannot walk past. It is NOT an SEO/informational headline.
BANNED — never produce these lazy defaults: "AI's rapid growth", "Are you prepared?", "The future of X", "Why X matters", "Everything you need to know about…", "5 ways to…", "How AI is changing…". If a headline could open a corporate blog post, DELETE it and write a real hook.
NORTH STAR (write at this level): "We generated a new species. Follow this podcast to follow the evolution and our newfound understanding of consciousness." — a claim that reframes reality and makes her NEED to know more.
Every headline and reel hook must be that specific and that alive. Reel hooks = ONE line at this bar.

Return ONLY valid JSON. No markdown. No explanation.`,
    input: `${context}

Generate ALL podcast deliverables. Return this exact JSON structure:
{
  "title": "punchy episode title in Mandi's voice (under 60 chars)",
  "subtitle": "one sentence that makes someone click play",
  "headlines": [
    "SCROLL-STOPPING headline option 1 — pattern interrupt, bold claim or contrast",
    "SCROLL-STOPPING headline option 2 — curiosity gap or unexpected angle",
    "SCROLL-STOPPING headline option 3 — listicle or direct benefit",
    "SCROLL-STOPPING headline option 4 — emotional hook or personal story angle",
    "SCROLL-STOPPING headline option 5 — controversy or counter-narrative"
  ],
  "description": "3-paragraph show notes in Mandi's voice — scene-setting, key insights, why it matters. Under 300 words.",
  "seo_description": "150-character meta description optimized for search",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "chapters": [
    {"time": "0:00", "title": "chapter title"},
    {"time": "X:XX", "title": "chapter title"}
  ],
  "pull_quotes": ["quote 1", "quote 2", "quote 3", "quote 4", "quote 5"],
  "reels_scripts": [
    {
      "hook": "ONE-line scroll-stopping hook at the HOOK DOCTRINE bar — a claim/scene/provocation, never an SEO headline",
      "body": "15-30 second middle",
      "cta": "comment trigger CTA",
      "platform": "Instagram Reels"
    },
    {
      "hook": "different hook angle",
      "body": "15-30 second middle",
      "cta": "comment trigger CTA",
      "platform": "TikTok"
    },
    {
      "hook": "third angle",
      "body": "15-30 second middle",
      "cta": "comment trigger CTA",
      "platform": "YouTube Shorts"
    }
  ],
  "newsletter_angle": "specific angle for Substack email — one observation, one insight, one takeaway",
  "newsletter_subject": "email subject line that gets opened",
  "medium_article": {
    "title": "Medium-optimized article title with keywords (SEO-friendly, curiosity-driven)",
    "subtitle": "one-sentence deck under the title",
    "body": "Full 600-900 word Medium article in Mandi's voice. Structure: opening hook paragraph, 3-4 substantive sections with bold subheadings, and a closing call to action inviting the reader to FOLLOW THE PODCAST — end the article with this exact line, links included verbatim: '${SHOW_LINKS_BLOCK}'. NEVER point to aiworksforyou.co. Conversational tone, short paragraphs, real examples from the episode. No fluff."
  },
  "youtube_title": "YouTube-optimized title with keywords",
  "youtube_description": "YouTube description with timestamps, hashtags, and this exact show-links line included verbatim: '${SHOW_LINKS_BLOCK}'",
  "youtube_tags": ["tag1", "tag2", "tag3"],
  "pinterest_pins": [
    {"title": "pin title", "description": "pin description with keywords"},
    {"title": "pin title", "description": "pin description with keywords"}
  ],
  "spotify_description": "short Spotify episode description under 200 chars",
  "apple_description": "Apple Podcasts description under 255 chars",
  "ad_reads": {
    "pre_roll": "15-second SPOKEN invitation in Mandi's voice to follow the AI Mom Podcast — warm, pure-give (never a sales pitch). Tell them to follow AI Mom on Apple Podcasts, Spotify, or YouTube. Spoken words only — NEVER read a URL aloud, never mention aiworksforyou.co.",
    "mid_roll": "30-second SPOKEN mid-roll in Mandi's voice inviting listeners to follow/subscribe to the AI Mom Podcast so they don't miss an episode — on Apple, Spotify, or YouTube. Pure-give energy, no sales ask. Spoken only, no URLs, no aiworksforyou.co.",
    "post_roll": "10-second SPOKEN outro in Mandi's voice — invite them to follow AI Mom on Apple, Spotify, or YouTube and end on a signature line. Spoken only, no URLs, no aiworksforyou.co."
  },
  "guest_share_kit": {
    "dm_message": "message to send guest asking them to share (if applicable, else empty string)",
    "suggested_caption": "caption guest can copy-paste to share the episode",
    "quote_graphic_text": "text for a quote graphic the guest can share"
  },
  "manychat_trigger": "keyword for comment-to-DM automation for this episode",
  "manychat_dm": "auto-DM message sent when someone comments the trigger word",
  "producer_feedback": {
    "overall_grade": "A/B/C/D with one sentence verdict",
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "topic_drift": "honest assessment of whether Mandi stayed on topic or wandered — specific timestamps or moments if possible",
    "depth_gaps": "topics that were mentioned but not covered thoroughly enough — what listeners probably wanted more of",
    "too_many_directions": "if the episode tried to cover too much, call it out clearly and suggest which thread should have been the main one",
    "biggest_win": "the single best moment or insight from this episode",
    "next_episode_suggestion": "based on what was discussed, what topic would be the perfect follow-up episode"
  }
}`,
  })

  try {
    const raw = response.output_text
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')
    const deliverables = JSON.parse(match[0])
    return NextResponse.json({ deliverables })
  } catch {
    return NextResponse.json({ error: 'Could not parse deliverables', raw: response.output_text }, { status: 500 })
  }
}
