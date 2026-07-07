import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllBrandAccounts, getAllGoals, getWatchContext, createContent, createNote, createTask, createEvent } from '@/lib/db'
import type { ContentType, EventKind } from '@/lib/db'
import { CRAFT_RULES } from '@/lib/craft'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type RiverVerdict = {
  kind: 'content' | 'task' | 'event'
  // task fields
  task_title?: string
  task_notes?: string
  task_priority?: 'urgent' | 'high' | 'medium' | 'low'
  task_due?: string | null
  // event fields
  event_title?: string
  event_date?: string
  event_time?: string
  event_kind?: string
  // content fields
  stands_alone: boolean
  account_id: string | null
  account_reason: string
  title: string
  body: string
  onscreen_text: string
  image_prompt: string
  hashtags: string
  content_type: string
  needs: ('media' | 'research' | 'answers')[]
  open_questions: string[]
  research_topic: string | null
}

// The River: every stream (capture, story, vision, podcast, avatars, projects)
// flows through here. It sorts raw input to the right account, decides whether
// it can stand alone, researches what it can, and composes a complete post-card
// — or parks it with the exact questions only Mandi can answer.
export async function POST(req: NextRequest) {
  const { input, source, mediaUrl, mediaType } = await req.json()
  if (!input?.trim() && !mediaUrl) return NextResponse.json({ error: 'input or media required' }, { status: 400 })
  const isStillImage = mediaUrl && (mediaType?.startsWith('image') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(mediaUrl))

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')
  const goals = getAllGoals().filter(g => g.active)
  const watchContext = getWatchContext()

  const accountList = accounts.map(a =>
    `- id:"${a.id}" ${a.handle} (${a.platform}) — ${a.topic}. Mission: ${a.mission}. Tone: ${a.tone}. ${a.offer ? `Offer: ${a.offer} (${a.offer_price})` : ''}${a.notes ? ` ⚠ RULES: ${a.notes}` : ''}`
  ).join('\n')

  const goalList = goals.map(g =>
    `- "${g.title}"${g.account_id ? ` [account: ${g.account_id}]` : ' [station-wide]'} — ${g.target_per_week}/week${g.deadline ? `, deadline ${g.deadline}` : ''}`
  ).join('\n')

  const triage = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are the RIVER — the sorting-hat brain of Mandi Beck's content command center. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Raw ideas, stories, fragments, tasks, and images flow in from every tab. Your job:

0. CLASSIFY FIRST — is this input a TASK, an EVENT, or CONTENT?
   - TASK: a to-do directed at Mandi herself ("remind me to...", "I need to call...", "upload the podcast", "email the school"). Set kind:"task" and fill task_title (imperative, short), task_notes, task_priority (urgent/high/medium/low), task_due (YYYY-MM-DD if a date/day is mentioned, else null). Skip all content fields.
   - EVENT: a dated happening ("workshop goes live July 10", "twins' birthday on the 15th", "launch next Friday"). Set kind:"event" and fill event_title, event_date (YYYY-MM-DD — resolve relative dates from today's date above), event_time (HH:MM or ""), event_kind (launch/promo/holiday/personal/trend/other). Skip content fields.
   - CONTENT: everything else — an idea, story, observation, or fragment meant to become a post. Set kind:"content" and continue below.

For kind:"content" only:
1. SORT: pick the ONE best account for this input from the roster below (prioritize accounts tied to active goals). If an account lists ⚠ RULES, obey them — never sort content to an account whose rules exclude that topic (e.g. don't put avatar/monetization talk on a jobs-and-training podcast channel).
2. JUDGE: can this stand alone as a complete post, or does it need something?
   - "research": facts/stats/context you can supply yourself — supply them, don't flag them.
   - "media": it truly requires a photo/video only Mandi can capture (her kids, her face, her home). An AI image prompt does NOT count as needing media.
   - "answers": it's missing personal specifics ONLY Mandi knows (which kid, what happened next, real numbers, permission to share). Ask 1-3 sharp questions max.
3. COMPOSE: if it stands alone (or you researched the gaps), write the COMPLETE post in the account's voice.

CONTENT AUDIT RULES for composed posts: lead with HER (the reader's) specific problem, pass the 3-second cold-stranger test, end with the account's comment-keyword CTA. If the chosen account lists ⚠ RULES, obey them literally.

${CRAFT_RULES}
${watchContext}

Return ONLY valid JSON:
{
  "kind": "content" | "task" | "event",
  "task_title": "...", "task_notes": "...", "task_priority": "urgent|high|medium|low", "task_due": "YYYY-MM-DD" | null,
  "event_title": "...", "event_date": "YYYY-MM-DD", "event_time": "HH:MM" | "", "event_kind": "launch|promo|holiday|personal|trend|other",
  "stands_alone": boolean,
  "account_id": "id from roster" | null,
  "account_reason": "one sentence why this account",
  "title": "short internal title",
  "body": "full post caption/body, complete and ready to post (empty string if it can't stand alone)",
  "onscreen_text": "text overlay / opening on-screen line",
  "image_prompt": "detailed AI image/video prompt for the visual",
  "hashtags": "15-25 hashtags space-separated",
  "content_type": "post | video | image | podcast | workshop | other",
  "needs": ["media" | "answers"],
  "open_questions": ["question only Mandi can answer", ...],
  "research_topic": "topic you researched and folded in, or null"
}`,
    input: (isStillImage ? [{
      type: 'message', role: 'user',
      content: [
        { type: 'input_image', image_url: mediaUrl },
        { type: 'input_text', text: `ACCOUNT ROSTER:\n${accountList}\n\nACTIVE GOALS (weight sorting toward these):\n${goalList || 'none set'}\n\nSOURCE STREAM: ${source ?? 'capture'}\n\nAn IMAGE is attached — Mandi wants this actual image filed under the account it fits. LOOK at it, decide which account it belongs to, and write the post AROUND it (never describe the image; add value the picture can't). It stands alone (media is provided).\n\nHER NOTE:\n${input}` },
      ],
    }] : `ACCOUNT ROSTER:\n${accountList}\n\nACTIVE GOALS (weight sorting toward these):\n${goalList || 'none set'}\n\nSOURCE STREAM: ${source ?? 'capture'}\n\nRAW INPUT:\n${input}`) as Parameters<typeof client.responses.create>[0]['input'],
  })

  let verdict: RiverVerdict
  try {
    const match = triage.output_text.match(/\{[\s\S]*\}/)
    verdict = JSON.parse(match![0])
  } catch {
    return NextResponse.json({ error: 'River could not parse this input', raw: triage.output_text }, { status: 502 })
  }

  // Task capture: "remind me to..." → straight to the Tasks panel
  if (verdict.kind === 'task' && verdict.task_title) {
    const today = new Date().toISOString().split('T')[0]
    const task = createTask({
      title: verdict.task_title,
      notes: verdict.task_notes ?? '',
      priority: verdict.task_priority ?? 'medium',
      status: verdict.task_due && verdict.task_due <= today ? 'today' : verdict.task_due ? 'this_week' : 'today',
      due_date: verdict.task_due ?? null,
    })
    return NextResponse.json({ kind: 'task', task })
  }

  // Event capture: "workshop July 10" → onto the Goals calendar
  if (verdict.kind === 'event' && verdict.event_title && verdict.event_date) {
    const event = createEvent({
      title: verdict.event_title,
      date: verdict.event_date,
      time: verdict.event_time ?? '',
      kind: (verdict.event_kind as EventKind) ?? 'other',
      notes: `Captured via the river: "${String(input).slice(0, 200)}"`,
    })
    return NextResponse.json({ kind: 'event', event })
  }

  // Always keep a verbatim copy of direct captures in Notes — the raw-idea vault.
  // (Only for hand-typed capture sources; processed streams like story/podcast store their own way.)
  const rawSources = ['capture', 'quick-capture', 'kanban', 'daily', 'station-chat']
  if (rawSources.includes(source ?? 'capture')) {
    try {
      const words = String(input).trim()
      createNote({
        title: `💡 ${words.slice(0, 56)}${words.length > 56 ? '…' : ''}`,
        body: words,
        category: 'idea',
        tags: ['raw-capture', verdict.account_id ?? 'unsorted'],
      })
    } catch { /* vault write is best-effort */ }
  }

  // If the river researched something, store the research to Notes (storage, not the river)
  if (verdict.research_topic) {
    try {
      createNote({
        title: `Research: ${verdict.research_topic}`,
        body: `Auto-researched by the River while composing "${verdict.title}".\nSource input: ${String(input).slice(0, 300)}`,
        category: 'framework',
        tags: ['river-research', verdict.account_id ?? 'general'],
      })
    } catch { /* research note is best-effort */ }
  }

  // With a real image attached, the post stands alone (the visual IS the media)
  const complete = (verdict.stands_alone && !!verdict.body) || (!!mediaUrl && !!verdict.body)
  const piece = createContent({
    title: verdict.title || 'River capture',
    description: complete ? verdict.body : `RAW: ${input}`,
    status: complete ? 'ready' : 'idea',
    type: (verdict.content_type as ContentType) || (mediaUrl ? 'image' : 'post'),
    platforms: verdict.account_id ? [accounts.find(a => a.id === verdict.account_id)?.platform.toLowerCase() ?? 'instagram'] : [],
    tags: ['river', source ?? 'capture'],
    notes: verdict.account_reason,
    account_id: verdict.account_id,
    // Real uploaded media beats a prompt — attach it; only keep a prompt when there's no image
    media_url: mediaUrl || '',
    media_urls: mediaUrl ? [mediaUrl] : [],
    image_prompt: mediaUrl ? '' : (verdict.image_prompt || ''),
    onscreen_text: verdict.onscreen_text || '',
    hashtags: verdict.hashtags || '',
    open_questions: complete ? [] : (verdict.open_questions ?? []),
    river_source: source ?? 'capture',
  })

  return NextResponse.json({
    kind: 'content',
    complete,
    piece,
    account: accounts.find(a => a.id === verdict.account_id) ?? null,
    needs: complete ? [] : verdict.needs,
    open_questions: complete ? [] : verdict.open_questions,
    researched: verdict.research_topic,
  })
}
