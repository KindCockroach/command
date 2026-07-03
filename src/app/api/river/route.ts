import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllBrandAccounts, getAllGoals, getWatchContext, createContent, createNote } from '@/lib/db'
import type { ContentType } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type RiverVerdict = {
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
  const { input, source } = await req.json()
  if (!input?.trim()) return NextResponse.json({ error: 'input required' }, { status: 400 })

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')
  const goals = getAllGoals().filter(g => g.active)
  const watchContext = getWatchContext()

  const accountList = accounts.map(a =>
    `- id:"${a.id}" ${a.handle} (${a.platform}) — ${a.topic}. Mission: ${a.mission}. Tone: ${a.tone}. ${a.offer ? `Offer: ${a.offer} (${a.offer_price})` : ''}`
  ).join('\n')

  const goalList = goals.map(g =>
    `- "${g.title}"${g.account_id ? ` [account: ${g.account_id}]` : ' [station-wide]'} — ${g.target_per_week}/week${g.deadline ? `, deadline ${g.deadline}` : ''}`
  ).join('\n')

  const triage = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are the RIVER — the sorting-hat brain of Mandi Beck's content command center.
Raw ideas, stories, fragments, and images flow in from every tab. Your job:
1. SORT: pick the ONE best account for this input from the roster below (prioritize accounts tied to active goals).
2. JUDGE: can this stand alone as a complete post, or does it need something?
   - "research": facts/stats/context you can supply yourself — supply them, don't flag them.
   - "media": it truly requires a photo/video only Mandi can capture (her kids, her face, her home). An AI image prompt does NOT count as needing media.
   - "answers": it's missing personal specifics ONLY Mandi knows (which kid, what happened next, real numbers, permission to share). Ask 1-3 sharp questions max.
3. COMPOSE: if it stands alone (or you researched the gaps), write the COMPLETE post in the account's voice.

CONTENT AUDIT RULES for composed posts: lead with HER (the reader's) specific problem, pass the 3-second cold-stranger test, end with the account's comment-keyword CTA, structure pain→proof→tool→CTA.
${watchContext}

Return ONLY valid JSON:
{
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
    input: `ACCOUNT ROSTER:\n${accountList}\n\nACTIVE GOALS (weight sorting toward these):\n${goalList || 'none set'}\n\nSOURCE STREAM: ${source ?? 'capture'}\n\nRAW INPUT:\n${input}`,
  })

  let verdict: RiverVerdict
  try {
    const match = triage.output_text.match(/\{[\s\S]*\}/)
    verdict = JSON.parse(match![0])
  } catch {
    return NextResponse.json({ error: 'River could not parse this input', raw: triage.output_text }, { status: 502 })
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

  const complete = verdict.stands_alone && !!verdict.body
  const piece = createContent({
    title: verdict.title || 'River capture',
    description: complete ? verdict.body : `RAW: ${input}`,
    status: complete ? 'ready' : 'idea',
    type: (verdict.content_type as ContentType) || 'post',
    platforms: verdict.account_id ? [accounts.find(a => a.id === verdict.account_id)?.platform.toLowerCase() ?? 'instagram'] : [],
    tags: ['river', source ?? 'capture'],
    notes: verdict.account_reason,
    account_id: verdict.account_id,
    image_prompt: verdict.image_prompt || '',
    onscreen_text: verdict.onscreen_text || '',
    hashtags: verdict.hashtags || '',
    open_questions: complete ? [] : (verdict.open_questions ?? []),
    river_source: source ?? 'capture',
  })

  return NextResponse.json({
    complete,
    piece,
    account: accounts.find(a => a.id === verdict.account_id) ?? null,
    needs: complete ? [] : verdict.needs,
    open_questions: complete ? [] : verdict.open_questions,
    researched: verdict.research_topic,
  })
}
