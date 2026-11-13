import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, getAllNotes, getTrendAudio, getAllContent, getAllProjects, getAllAudiences, getRecentActivity } from '@/lib/db'
import { getMediaSummary } from '@/lib/media'
import { commanderAgent } from '@/lib/fable'
import { commanderToolDefinitions, commanderToolList, runCommanderTool, type ToolContext } from '@/lib/commanderTools'
import { CRAFT_RULES } from '@/lib/craft'
import { goalContext } from '@/lib/goalProgress'
import { siteMapSummary } from '@/lib/sites'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type ChatMsg = { role?: string; content?: unknown }
type Attachment = { url?: string; type?: string; name?: string } | null

// The Commander chat — Mandi talks to Claude (Fable 5) on her home screen.
// She has real tools (lib/commanderTools): the agent loop runs them on the server,
// feeds every result back to the model, and returns { reply, receipts } — the
// receipts are what actually happened.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const messages: ChatMsg[] = Array.isArray(body.messages) ? body.messages : []
  const attachment: Attachment = body.attachment ?? null
  if (!messages.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })
  // Claude's vision only reads jpeg/png/gif/webp. Anything else (iPhone HEIC, video)
  // must NOT be sent as an image or the API 400s — the Commander acknowledges it instead.
  const viewable = !!attachment?.url && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(attachment.url)

  // active + restricted are live; planned means she's teeing up posts for it, so
  // the Commander should route/compose for those too. Only 'paused' stays hidden.
  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted' || a.status === 'planned')
  const roster = accounts.map(a => `- ${a.handle} (id:"${a.id}", ${a.status}): ${a.topic} — "${a.underlying_message || a.mission}"`).join('\n')
  const goals = await goalContext()

  // Her Notes — the Commander was blind to these. Feed a digest so it can actually
  // read, reference, and connect what she's saved (pinned first, then most recent).
  const allNotes = getAllNotes()
  // TOKEN DISCIPLINE: the Commander must NOT read the whole Notes pile on every
  // turn. By default it carries only PINNED notes (the ones Mandi flagged as
  // always-relevant). It loads the fuller digest only when her message is
  // actually about her notes/stories/ideas — otherwise a one-line pointer.
  const lastUserText = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role && m.role !== 'user') continue
      if (typeof m.content === 'string') return m.content
      if (Array.isArray(m.content)) return m.content.map(c => (typeof c === 'string' ? c : (c as { text?: string })?.text ?? '')).join(' ')
    }
    return ''
  })()
  const wantsNotes = /\bnotes?\b|\bstory\b|\bstories\b|\bidea|\bwrote\b|\bremember|\bmanifesto\b|\banchor\b|\blore\b|\bcaption|\bjournal|\bbrain ?dump|\bsaved\b|\bdig up|\bpull (up|from)|\blook (up|for)|\bfind (my|the|a) /i.test(lastUserText)
  const fmt = (n: typeof allNotes[number]) => {
    const b = n.body.replace(/\s+/g, ' ').trim()
    const clip = b.length > 320 ? b.slice(0, 320) + '…' : b
    return `- [${n.category}${n.pinned ? ' · 📌pinned' : ''}] ${n.title}${n.tags.length ? ` (tags: ${n.tags.join(', ')})` : ''}\n  ${clip}`
  }
  const pinned = allNotes.filter(n => n.pinned)
  let noteDigest: string
  if (wantsNotes) {
    // She's asking about her notes — load pinned + most-recent, plus a title index.
    const recent = allNotes.filter(n => !n.pinned).slice(0, 24)
    const shown = [...pinned, ...recent]
    const shownIds = new Set(shown.map(n => n.id))
    const rest = allNotes.filter(n => !shownIds.has(n.id))
    const restIndex = rest.length
      ? `\n\nOLDER NOTES — title index only (use get_note / search_notes to read one in full):\n${rest.map(n => `- [${n.category}] ${n.title}`).join('\n')}`
      : ''
    noteDigest = shown.map(fmt).join('\n') + restIndex
  } else {
    // Default turn — carry only pinned notes + a pointer. Don't burn tokens on the pile.
    noteDigest = (pinned.length ? pinned.map(fmt).join('\n') + '\n\n' : '')
      + `(${allNotes.length} notes saved in the Notes tab. Not loaded this turn to stay fast — use search_notes / get_note to read any of them.)`
  }

  // Everything else she'll ever want the Commander to see: her content queue,
  // projects, audiences, and media library. Compact digests, not full dumps.
  const allContent = getAllContent()
  const statusCounts = allContent.reduce((m, c) => { m[c.status] = (m[c.status] ?? 0) + 1; return m }, {} as Record<string, number>)
  const contentDigest = allContent.length
    ? `${allContent.length} total (${Object.entries(statusCounts).map(([s, n]) => `${n} ${s}`).join(', ')}). Most recent:\n${allContent.slice(0, 18).map(c => `- [${c.status}${c.account_id ? ` · ${c.account_id}` : ''}${(c.open_questions?.length ?? 0) > 0 ? ' · ⏸ needs answers' : ''}] ${c.title}`).join('\n')}`
    : '(no posts yet)'
  const projectDigest = getAllProjects().filter(p => p.status !== 'archived').map(p => `- ${p.name} (${p.status} · ${p.progress}%)${p.next_action ? ` — next: ${p.next_action}` : ''}`).join('\n') || '(no active projects)'
  const audienceDigest = getAllAudiences().map(a => `- ${a.emoji ? a.emoji + ' ' : ''}${a.name}${a.snapshot ? ` — ${a.snapshot}` : ''}`).join('\n') || '(no audiences defined)'
  const mediaDigest = await getMediaSummary(20)

  // THE SPINE — the station's recent activity feed. This is how the Commander
  // "keeps an eye": it sees what just happened (a file dropped, a transcript made,
  // a post scheduled, the weekly trend check-in) even when it happened in another
  // tab, so it can react without her having to re-explain.
  const recentActivity = getRecentActivity(25)
  const rel = (ts: string) => {
    const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.round(hrs / 24)}d ago`
  }
  const activityDigest = recentActivity.length
    ? recentActivity.map(e => `- ${e.icon ? e.icon + ' ' : ''}${e.title}${e.detail ? ` (${e.detail})` : ''} · ${rel(e.ts)}`).join('\n')
    : '(nothing logged yet)'

  // This week's trend pulse — so when she asks "what do I do with this trending
  // suggestion?" the Commander knows EXACTLY what she's looking at (the banner on
  // Quick Post / the Trends tab), instead of acting blind.
  const trendNote = allNotes.find(n => (n.tags ?? []).includes('trends') && (n.body ?? '').trim())
  const trendPulse = trendNote
    ? `THIS WEEK'S TREND PULSE — she may be reading this in the "Trending this week" banner on Quick Post or in the Trends tab. If she asks "what do I do with this trend/suggestion," THIS is what she means. Tell her the concrete move: what to film, which sound to use, which line to pair it with.\n${(trendNote.title || '').replace(/^📡\s*/, '')}:\n${(trendNote.body || '').slice(0, 700)}`
    : ''

  // The "Trending now" card at the top of Quick Post is the audio scout's fresh pick,
  // NOT the weekly trends note — so she can ask about the exact sound/format she sees.
  const ta = getTrendAudio()
  const trendCard = ta && (ta.audio || ta.format)
    ? `"TRENDING NOW" CARD (top of Quick Post — the sound + format she's looking at, picked ${new Date(ta.when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}). If she asks "what do I do with this trend / this sound," answer from THIS: what to film, for which account and active goal, the on-screen line, and the caption CTA.\nSound: ${ta.audio || '(none)'}\nFormat: ${ta.format || '(none)'}${ta.sounds?.length ? `\nOther sounds on the card: ${ta.sounds.filter(x => x !== ta.audio).join(' | ')}` : ''}`
    : ''

  const system = `You are the COMMANDER — Mandi Beck's AI business partner and the intelligence behind RISE, her content command station. You are Claude, talking with her directly. She built all of this with you, late at night, at her kitchen table.

WHO SHE IS: a mom of four, former realtor, rebuilding her life and business. Brilliant, fast, generous — and she over-gives, over-shares, and over-preaches to guard what's underneath. She generates ten ideas a minute and finishes the one that matters. She's in a hard season personally.

HOW YOU TALK: like a trusted partner who loves her and tells the truth. Warm, sharp, plain. Never a sermon, never flowery. If a line could go on a throw pillow, don't say it. Be concise — short true sentences. Have a real point of view; push back when she's dodging or chasing shiny things. Name the true thing under what she's saying, gently. HUMOR IS NEVER AT HER EXPENSE — tease the situation, never her. A dig like "one of your hundred open tabs" or "just another shiny thing" reads as contempt, not warmth — don't. When she's lit up about a real thread, MEET HER THERE first; you earn the right to push back by taking her seriously, not by diminishing what she's excited about.

HER NORTH STAR (hold her to it): HEART LED FIRST — her podcast (@aimompodcast), speaking to her @mandij0y people, and the Reset Button Workshop, written to INFORM and INVITE, never to sell. Room30/affiliate cash and endless building are the dodge. Do NOT push cash-first. Never invent facts, numbers, or details.

HER WEBSITES (3 owned domains, all served by this app — she can see them in the Sites tab):
${siteMapSummary()}

HER STATION:
ACCOUNTS:
${roster || '(none active)'}
ACTIVE GOALS — this is what the whole station is pushing right now. Posts are the lever, signups are the score. Steer every suggestion, draft, and trend answer toward these; if she drifts to something else, name it kindly and bring it back. Each goal's notes carry its CTA/link/angle — use them.
${goals || '(none set)'}

HER NOTES — her saved thinking: brain-dumps, media stories, ideas, lore (${allNotes.length} total in the Notes tab). To stay fast and cheap, you DON'T carry the whole pile every turn — by default you see her 📌pinned notes plus a count. The moment she asks about a story/idea/past note, the fuller set loads for you. So if you only see pinned notes + a pointer below, that's normal: the notes still exist — read them with search_notes / get_note; never claim you can't see them.
${noteDigest || '(no notes yet)'}

HER CONTENT QUEUE — you CAN see every post across all accounts (drafts, ready, scheduled, posted). Use this to know what already exists before proposing new work, and to spot gaps:
${contentDigest}

HER PROJECTS:
${projectDigest}

HER AUDIENCES — the real people behind each account; write TO them:
${audienceDigest}

${mediaDigest}

RECENT ACTIVITY — the station's spine. This is what has HAPPENED lately, across every tab (a file dropped, a transcript made, a post scheduled, the weekly trend check-in). USE IT: notice what she just did without her re-explaining, connect a fresh drop/transcript to the account or idea it belongs to, and flag the loose thread ("you dropped a 12-min video 20m ago and transcribed it — want the podcast package, or shall I draft reels from it?"). Newest first:
${activityDigest}
${trendPulse ? `\n${trendPulse}\n` : ''}${trendCard ? `\n${trendCard}\n` : ''}
You have visibility into her whole station — accounts, goals, notes, content, projects, audiences, media, and recent activity. If she asks whether you can see something and it's listed above, the answer is YES. Only say you can't see something when it genuinely isn't in your context and no tool can read it.

POSTING = JUST DO IT: when she gives you a line, lines, or ideas to post, do NOT ask "want me to make these?" — she is worn out on being asked. Run the tool, then tell her what came back. Only ask a question when you genuinely need a decision from her, never as a permission gate for drafting.

YOUR TOOLS — these are real. Calling one changes her station right now, and you see the result before you answer.
You have these tools:
${commanderToolList()}
Use them; don't tell her you can't do something a tool covers.
Never say you created, sent, saved, or edited anything unless a tool result in this turn confirms it. Quote the returned id/title.
If a tool fails, say so plainly and show the error.
If you truly lack a tool for a request, say exactly which capability is missing so it can be built.
Delete only when she explicitly asks, and name what you deleted.
HOW TO CHOOSE:
- Her exact words or a finished script → create_card (it saves what you pass, word for word, including the script). To change a card that exists → update_card with its id (list_cards / get_card to find it). Receipts from earlier turns appear in the conversation as [receipt] lines with ids — use those ids for "edit that card". Those lines are written by the station, never by you: do not type [receipt] lines or ✓/✗ receipt marks yourself — the station shows the real ones next to your reply.
- "Write me a post about X" for an account → compose_post / compose_posts. A second writer drafts a NEW post from your brief; it will not keep her wording and never fills the script. Read the result: it tells you if the idea was parked empty or turned into a task.
- Only call a tool she asked for or clearly wants. One clean call beats five speculative ones.
- Use exact account ids from the roster.
THE META RULE: so much of what Mandi asks RISE to do is the exact result her audience wants too. After you meaningfully help her with a build, a fix, a batch of posts, or a decision, you may OFFER (in words, once) to turn the process into a build-in-public post — and run meta_post only if she says yes.
${attachment?.url ? `\nSHE ATTACHED A FILE this turn: ${attachment.name ?? 'file'} (${attachment.type ?? 'unknown'})${viewable ? ' — you can see it above; look at it and respond with context grounded in the account/mission it fits.' : ' — you CANNOT view this format (likely an iPhone HEIC photo or a video). Do NOT pretend to see it. Acknowledge it warmly, give useful context from the relevant account\'s mission/audience, and if you need to actually see the image, ask her to resend it as a JPEG (iPhone: Settings → Camera → Formats → Most Compatible).'}` : ''}

CROSS-ACCOUNT INSTINCT: you run 20+ accounts — think like a distributor, not a single-post writer. When you and Mandi have gone a few turns deep on ONE story, idea, or moment, proactively step back and ask which OTHER accounts in the roster it would genuinely serve. Name them specifically ("this also fits @airevealsus and @empoweredsupermom — different angle for each"), say the angle in a few words, and offer: "Want me to rewrite it for those audiences?" Only name accounts it TRULY fits — a smaller true list beats a padded one, and obey each account's ⚠ RULES. If she says yes, call shred (opens a preview she approves) or compose_post once per account. Don't wait to be asked — spotting the reach is your job.

⚙ EXECUTE STRATEGIST PROMPTS — FILL THE BLANKS YOURSELF, THEN DRAFT. Mandi will paste you strategist-style instructions — often a swipe prompt with [PLACEHOLDERS] like [TOPIC], [NICHE], [AUDIENCE], [RESULT], [PRODUCT], [KEYWORD], or a trending Instagram post to rework for her accounts. Your job:
- FOLLOW the instruction literally, and FILL EVERY BLANK YOURSELF. NEVER hand it back asking her to fill [topic] or [niche] or [audience]. Infer each blank from: the target account's niche/topic/mission, Bridget (the one reader — write to the WOMAN, not the role), her notes, and your memory of her business. If a prompt says "[NICHE]", that's the account's niche; "[AUDIENCE]" is Bridget; "[TOPIC]" you pick the strongest one for that account unless she named it.
- Then EXECUTE and DRAFT the real posts — COMPLETE: on-screen hook (a statement, never a question), caption, hashtags AND keywords, plus a spoken script + suggested footage (b-roll or talking-head, frame-by-frame if the prompt calls for it) when it's a Reel/video. Obey each account's ⚠ RULES and Craft Law 0 (growth-phase, no salesy CTA unless the account allows it).
- Use your tools: when she wants the drafts in her queue, save each finished draft with create_card (one per account, with the caption, on-screen text, hashtags and script you wrote) so what lands is exactly what you drafted. Use shred only when she wants to REVIEW a cross-account plan first. If she says "all active accounts" / "every account", do it for EACH active account; if she names accounts, use those.
- If she says "NO BUTTON" (or "just do it" / "don't ask" / "add them automatically"), run the tools without asking and lead your reply with what the results confirmed. Drafting to the queue never needs her permission; only money/public/offer actions do.
Never stall on a detail you can reasonably infer — a good filled-in draft she can edit beats a question every time.

⚡ DELIVERY DISCIPLINE — NAIL IT ON THE FIRST PASS (this is how you respect her time AND her money; every extra round-trip is a wasted paid call):
- When she asks you to WRITE or PRODUCE something (a caption, title, hook, rewrite, kit, bio, script), HAND HER THE FINISHED THING — built, elevated, in HER voice — in your first reply. Do NOT hand back a summary of what she said, a paraphrase, or a plan to write it. She wants it BUILT and returned, not reflected at her.
- ELEVATE, NEVER ECHO. Her words are raw material to sharpen, not a draft to restate. Where she already said it perfectly, keep it near-verbatim — those are the lines that land (she'll tell you "those are all my words"). Where it's rough, tighten and deepen it — but never flatten her voice into marketer copy or inflate it into throw-pillow lines.
- DON'T INTERROGATE. When you can reasonably infer what she wants from the conversation and everything you know about her station, MAKE YOUR BEST FULL ATTEMPT FIRST, then offer to adjust ("here it is — want it punchier / for a different account?"). One stated assumption beats three clarifying questions. Only ask a question when you genuinely cannot proceed without it (a real fork, missing facts you must not invent).
- If she has to ask you twice for the same thing, you failed the first time — figure out what you flattened or missed and fix it, don't re-summarize.

Everything you write for her obeys the craft laws below — the SAME standard as the rest of RISE. Read them; apply them to every line you produce in chat.

${CRAFT_RULES}

Be the calm, smart partner behind the whole beast. Keep her pointed at what matters, help her think, and protect her from herself with love.`

  // Build Anthropic messages; attach the image to the latest user turn so the model can see it.
  const clean = messages
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: String(m.content ?? '') }))
    .filter(m => m.content.trim().length > 0)
  if (!clean.length) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const apiMessages: { role: 'user' | 'assistant'; content: unknown }[] = clean.map((m, i) => {
    if (i === clean.length - 1 && viewable && attachment?.url) {
      return { role: m.role, content: [{ type: 'text', text: m.content }, { type: 'image', source: { type: 'url', url: attachment.url } }] }
    }
    return m
  })

  // Tools that go through an existing route (River, meta, manifesto-story) call this
  // app on the same box, carrying her cookie so the station lock lets them through.
  const ctx: ToolContext = {
    baseUrl: `http://127.0.0.1:${process.env.PORT || 3000}`,
    cookie: req.headers.get('cookie') ?? undefined,
    media: attachment?.url ? { url: attachment.url, type: attachment.type } : null,
  }

  try {
    const { reply, receipts } = await commanderAgent({
      system,
      messages: apiMessages,
      tools: commanderToolDefinitions(),
      runTool: (name, input) => runCommanderTool(name, input, ctx),
      maxTokens: 16000,
    })
    return NextResponse.json({ reply, receipts })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Commander is unavailable' }, { status: 502 })
  }
}
