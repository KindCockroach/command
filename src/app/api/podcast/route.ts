import { NextRequest, NextResponse } from 'next/server'
import { CRAFT_RULES } from '@/lib/craft'
import { fableText, researchWithWeb } from '@/lib/fable'
import { getAllNotes } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Pull a compact digest of her PAST episodes so the newsletter can weave the
// bigger picture across the show. Reads saved transcripts + kits from Notes,
// newest first, excluding the current episode's title.
function priorEpisodes(excludeTitle?: string): string {
  const notes = getAllNotes()
  const eps = notes.filter(n => {
    const t = (n.title || '').toLowerCase()
    const isEp = n.tags?.includes('transcript') || n.tags?.includes('episode-kit') || /transcript|ep kit|episode kit|deliverables/i.test(n.title || '')
    return isEp && (!excludeTitle || !t.includes(excludeTitle.toLowerCase().slice(0, 24)))
  }).slice(0, 6)
  if (!eps.length) return ''
  return eps.map(n => {
    const body = (n.body || '').replace(/\s+/g, ' ').trim().slice(0, 500)
    return `- ${n.title.replace(/^[^A-Za-z0-9]+/, '')}: ${body}…`
  }).join('\n')
}

// Where every episode CTA sends people: the SHOW, on the platforms it lives on.
const SHOW_LINKS = {
  apple: 'https://podcasts.apple.com/us/podcast/ai-mom/id6786440414',
  spotify: 'https://open.spotify.com/show/033I8hRPjXiKlCHhaq5YYc',
  youtube: 'https://youtube.com/playlist?list=PLZ5DeAJ0I0WI',
}
// The email-capture destination (coming-soon page collecting name + email).
const OPT_IN = 'aimomeducation.com'

// The full "find us / follow us" footer, dropped at the bottom of every kit so she
// can paste it straight into Riverside show notes. BARE URLs on purpose — they
// auto-link in every hosting/description box (no manual hyperlinking), and RISE's
// note reader renders them clickable too. "coming soon" items carry no link yet.
// TODO(confirm): LinkedIn URL — replace the placeholder once Mandi sends it.
const LINKS_FOOTER = `— — —
🎙 AI Mom Podcast — listen & follow:
▶️ YouTube: ${SHOW_LINKS.youtube}
🍎 Apple Podcasts: ${SHOW_LINKS.apple}
🎧 Spotify: ${SHOW_LINKS.spotify}
📸 Instagram: https://instagram.com/aimompodcast

More from AI Mom:
💻 AI Mom at Work (Instagram): https://instagram.com/aimomatwork
💼 LinkedIn — connect with AI Mom: https://www.linkedin.com/in/aimom
✍️ Substack: coming soon
📝 Medium: coming soon
🎵 TikTok: coming soon

💌 Get on the list: ${OPT_IN}`

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { transcript, episodeNumber, guestName, showName = 'AI Mom Podcast', action, title, core_takeaway } = body
  if (!transcript) return NextResponse.json({ error: 'transcript required' }, { status: 400 })

  // ── DEEP MEDIUM ARTICLE (on demand) — borderline journalism ─────────────────
  // Runs live web research for REAL numbers/studies on the episode's topic, then
  // writes a newspaper-style piece: 4-5 sub-headline sections that each carry a
  // real figure or finding, HER stories woven in to make the point, sources at end.
  if (action === 'medium') {
    const clip = String(transcript).slice(0, 120000)
    let research = ''
    try {
      research = await researchWithWeb({
        maxSearches: 6, maxTokens: 3000,
        instructions: `You are RISE's research desk. The host just recorded a podcast on the topic below. Search the live web for REAL, current numbers, studies, and reporting that speak to THIS topic — the kind a journalist would cite (Pew, BLS, peer-reviewed studies, established outlets). Return a plain list: [statistic/finding] — [source name] — [full URL] — [one line of what it shows]. Real sources only; mark anything shaky "VERIFY:". 8-14 of the strongest.`,
        input: `Topic of the episode: ${title || core_takeaway || 'see transcript'}\n\nTranscript (for what she actually argued):\n${clip.slice(0, 12000)}`,
      })
    } catch { /* research best-effort; article can still run on her stories */ }

    const mInstr = `You are Mandi Beck's ghostwriter, writing a MEDIUM ARTICLE that reads like real journalism — a newspaper feature, not a blog post. It takes the argument she made on this episode and builds it out with evidence.

RULES:
- 900-1300 words. Journalistic register: authoritative, specific, human. Not salesy, not a listicle.
- 4-5 SECTION HEADINGS, and each heading must carry a real NUMBER or a research finding (e.g. "Half of new grads are chasing jobs that won't exist in a decade"). Headings are claims backed by data, never vague labels.
- Weave REAL research (the sources below) INTO the piece — cite the source inline as a journalist would ("according to Pew…", "BLS data shows…"). Never invent a number; if you don't have a real one for a point, make the point without a fake figure.
- Weave HER OWN STORIES from the transcript through the article — they are the human thread that articulates the point. Her lived detail + the hard data, braided together.
- End with a "Sources" section: numbered, each "Publication — headline" then the URL.
- Her voice underneath the journalism: warm, plain, unafraid. Show, don't preach.

${research ? `REAL RESEARCH TO USE (cite these; never state one as something she said on the episode):\n${research}\n` : 'No external research came back — build it from her argument and stories; do not fabricate statistics.\n'}

Obey the craft laws for how lines are built.
${CRAFT_RULES}`

    const mSchema = `Return ONLY valid JSON:
{
  "title": "the article headline — a claim, addressed to the reader, ideally carrying the through-line",
  "subtitle": "one-sentence deck under the title",
  "sections": [ { "heading": "section heading that carries a real number/finding", "body": "2-4 rich paragraphs: research cited inline + her story woven in" } ],
  "closing": "closing paragraph in her voice that invites the reader to the podcast",
  "sources": ["Publication — headline — https://url", "..."]
}`
    try {
      const raw = await fableText({ instructions: mInstr, input: `EPISODE TITLE: ${title || '(untitled)'}\nTRANSCRIPT:\n${clip}\n\n${mSchema}`, maxTokens: 8000, json: true, useClaude: true })
      let medium_article
      try { medium_article = JSON.parse(raw) } catch { const m = raw.match(/\{[\s\S]*\}/); medium_article = m ? JSON.parse(m[0]) : null }
      if (!medium_article) throw new Error('Could not parse the article')
      return NextResponse.json({ medium_article })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Medium article failed' }, { status: 500 })
    }
  }

  // ── NEWSLETTER (on demand) — shorter, weaves the bigger picture ─────────────
  if (action === 'newsletter') {
    const clip = String(transcript).slice(0, 120000)
    const prior = priorEpisodes(title)
    const nInstr = `You are Mandi Beck writing this week's SUBSTACK NEWSLETTER off her latest episode. Shorter than an article — 350-550 words — and its job is to connect THIS episode to the BIGGER PICTURE of the show.

RULES:
- Open on the one true thing from this episode (her real takeaway), in her voice.
- WEAVE IN references to her PAST episodes below — call back to a theme or moment from an earlier one and show how it connects to this week. This is the point of the newsletter: the throughline across the show, not a recap of one episode.
- Warm, plain, personal — a letter to a friend who's been following along. Short paragraphs.
- Address the reader (you/your), never a wall of "I". Close by inviting her to the full episode.
- No fabricated facts. If you reference a past episode, only use what's in the digest below.

${prior ? `HER PAST EPISODES (weave a real callback from one or two of these):\n${prior}\n` : 'No past episodes on file — write it strong on this one alone, gesturing to "the show" generally.\n'}

Obey the craft laws.
${CRAFT_RULES}`
    const nSchema = `Return ONLY valid JSON: { "newsletter_subject": "a subject line that gets opened", "newsletter_body": "the full 350-550 word issue, markdown ok" }`
    try {
      const raw = await fableText({ instructions: nInstr, input: `THIS EPISODE ("${title || 'latest'}"):\n${clip}\n\n${nSchema}`, maxTokens: 3000, json: true, useClaude: true })
      let out
      try { out = JSON.parse(raw) } catch { const m = raw.match(/\{[\s\S]*\}/); out = m ? JSON.parse(m[0]) : null }
      if (!out) throw new Error('Could not parse the newsletter')
      return NextResponse.json({ newsletter_subject: out.newsletter_subject, newsletter_body: out.newsletter_body })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Newsletter failed' }, { status: 500 })
    }
  }

  // Read the WHOLE episode — Fable's context is huge. (The old 8-9k cap meant the
  // model never saw the last third of an episode, where the real takeaway usually lands.)
  const clip = String(transcript).slice(0, 120000)

  // NOTE: the old blocking web-research pre-step was removed — it ran Opus + up to
  // 5 live web searches BEFORE the kit even started writing, pushing the whole
  // request past the timeout. Sources were "further-reading only" for the Medium
  // article anyway. If we want them back, run them as a separate, non-blocking call.
  const researched = ''

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
  "title": "punchy episode title (under 60 chars) — TRUE to the core_takeaway. ADDRESS THE LISTENER: use 'you/your', never 'I/my/me'. It talks TO her, not about Mandi. (e.g. NOT 'I'm the AI Mom and AI Can't Raise My Kids' → 'AI Is Useful, But It Still Can't Tell You How to Raise Your Kids')",
  "subtitle": "one sentence that makes someone hit play — reflects the real takeaway, not a generic topic",
  "questions": ["the real questions THIS episode asks/answers (many are literally asked near the end) — 3-6, in her words"],
  "headlines": ["5 scroll-stopping options — each ADDRESSED TO THE LISTENER (you/your), NOT the host (I/my); each answerable by core_takeaway and honoring emotional_spine; none writable from the title alone"],
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
  "share_prompt": "a fresh 2-3 sentence spoken/written CTA — a NEW variation each episode, never boilerplate — inviting the listener to RATE and REVIEW the show AND to send this episode to a friend who's just starting to dabble in AI. Warm, specific to this episode's takeaway, pure-give. (e.g. tie it to what THIS episode was about.)",
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
    // useClaude routes the WHOLE kit to Opus 4.8 — the same upgrade the caption
    // paths got. gpt-4o was the reason every kit read like a content marketer wrote
    // it ("Embracing Uncertainty", "Why X Matters"). json:true is kept as a fallback:
    // it's ignored on the Opus path (JSON is enforced by the prompt) but kicks in if
    // ANTHROPIC_API_KEY is missing and we drop back to gpt-4o.
    const raw = await fableText({ instructions, input: `${context}\n\n${schema}`, maxTokens: 16000, effort: 'high', json: true, useClaude: true })
    let deliverables
    try { deliverables = JSON.parse(raw) } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON found')
      deliverables = JSON.parse(match[0])
    }
    deliverables.show_links = SHOW_LINKS
    deliverables.opt_in = OPT_IN
    deliverables.links_footer = LINKS_FOOTER
    if (!deliverables.share_prompt) deliverables.share_prompt = 'If this gave you something, do two quick things: rate & review the show (it helps another mom find it), and send this episode to a friend who\'s just starting to dabble in AI — she\'ll thank you.'
    return NextResponse.json({ deliverables })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not parse deliverables' }, { status: 500 })
  }
}
