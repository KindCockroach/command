import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CRAFT_RULES } from '@/lib/craft'

export const dynamic = 'force-dynamic'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
      "hook": "first 3 seconds",
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
    "body": "Full 600-900 word Medium article in Mandi's voice. Structure: opening hook paragraph, 3-4 substantive sections with bold subheadings, closing call to action pointing to aiworksforyou.co. Use conversational tone, short paragraphs, real examples from the episode. No fluff."
  },
  "youtube_title": "YouTube-optimized title with keywords",
  "youtube_description": "YouTube description with timestamps, links placeholder, and hashtags",
  "youtube_tags": ["tag1", "tag2", "tag3"],
  "pinterest_pins": [
    {"title": "pin title", "description": "pin description with keywords"},
    {"title": "pin title", "description": "pin description with keywords"}
  ],
  "spotify_description": "short Spotify episode description under 200 chars",
  "apple_description": "Apple Podcasts description under 255 chars",
  "ad_reads": {
    "pre_roll": "15-second ad read in Mandi's voice for aiworksforyou.co",
    "mid_roll": "30-second mid-roll ad read for aiworksforyou.co",
    "post_roll": "10-second outro ad for aiworksforyou.co"
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
