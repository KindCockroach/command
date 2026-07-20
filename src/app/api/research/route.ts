import { NextRequest, NextResponse } from 'next/server'
import { researchWithWeb } from '@/lib/fable'
import {
  getResearchBriefs, getTodaysBrief, saveResearchBrief,
  getBrandAccount, getAudienceContext, createNote,
} from '@/lib/db'
import type { ResearchItem } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ITEM_SHAPE = `Each item: { "headline": "the story in one line", "source": "publication name", "url": "link", "why_it_matters": "why Mandi specifically should care — one sharp sentence", "talk_track": "the angle if she speaks to it on AI Mom Podcast — a hook, not a summary" }`

function parseItems(raw: string): { items: ResearchItem[]; summary: string } {
  const match = raw.match(/\{[\s\S]*\}/)
  const parsed = match ? JSON.parse(match[0]) : {}
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  }
}

// GET → today's daily brief (or latest) + recent digs
export async function GET() {
  return NextResponse.json({
    today: getTodaysBrief(),
    recent: getResearchBriefs(undefined, 12),
  })
}

// POST { action: 'brief' } → generate today's 3-5 must-reads
// POST { action: 'dig', topic, accountId?, save? } → deep-dig a topic (optionally for an account)
export async function POST(req: NextRequest) {
  const { action, topic, accountId, save } = await req.json()

  try {
    if (action === 'brief') {
      const existing = getTodaysBrief()
      if (existing) return NextResponse.json({ brief: existing, cached: true })

      const raw = await researchWithWeb({
        maxSearches: 10,
        instructions: `You are RISE's research desk — a very intelligent reader curating for Mandi Beck: mom of four, AI educator, host of AI Mom Podcast, building AI-powered content businesses. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' })}.

Search the live web and pick the 3-5 articles she MUST be aware of today across: (1) AI news — real developments, not hype cycles; (2) the job market — especially how AI is reshaping work; (3) nationwide trends in education relevant to report on. The bar: does this inform her economic awareness, or is it something she'd speak to on the podcast? Skip press releases, listicles, and anything a week stale unless it's still the story.

Return ONLY valid JSON: { "summary": "one-paragraph read of today's landscape in plain English", "items": [ ...3 to 5 items... ] }
${ITEM_SHAPE}`,
        input: 'Curate today\'s must-read brief.',
      })
      const { items, summary } = parseItems(raw)
      if (!items.length) return NextResponse.json({ error: 'Research came back empty — try again in a minute', raw }, { status: 502 })
      const brief = saveResearchBrief({
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
        kind: 'daily', topic: 'daily brief', account_id: null, items, summary,
      })
      return NextResponse.json({ brief })
    }

    if (action === 'dig') {
      if (!topic?.trim()) return NextResponse.json({ error: 'topic required' }, { status: 400 })
      const account = accountId ? getBrandAccount(accountId) : null
      const accountCtx = account
        ? `\nThis research feeds the account ${account.handle} (${account.brand_name}) — ${account.topic}. Mission: ${account.mission}. ${getAudienceContext(account.audience_id)}\nPrioritize findings that become CONTENT for this account: real names, real numbers, real studies — never invent, and note anything uncertain with "VERIFY:".`
        : ''

      const raw = await researchWithWeb({
        maxSearches: 10,
        instructions: `You are RISE's research desk — a rigorous, intelligent researcher for Mandi Beck. Search the live web deeply on the topic given. Prefer primary sources: peer-reviewed research, .gov/.edu, established journalism — over blogs and content farms. Real facts only; flag anything uncertain with "VERIFY:".${accountCtx}

Return ONLY valid JSON: { "summary": "one-paragraph synthesis of what you found", "items": [ ...3 to 6 of the strongest findings/articles... ] }
${ITEM_SHAPE}`,
        input: `Dig into: ${topic}`,
      })
      const { items, summary } = parseItems(raw)
      if (!items.length) return NextResponse.json({ error: 'Nothing solid found — try rewording the topic', raw }, { status: 502 })
      const brief = saveResearchBrief({
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
        kind: 'dig', topic: topic.trim(), account_id: account?.id ?? null, items, summary,
      })
      // Optionally archive to Notes so it's fuel for the River
      if (save) {
        try {
          createNote({
            title: `🔬 Research: ${topic.trim().slice(0, 60)}`,
            body: `${summary}\n\n${items.map(i => `• ${i.headline} (${i.source})\n  ${i.url}\n  Why: ${i.why_it_matters}\n  Angle: ${i.talk_track}`).join('\n\n')}`,
            category: 'idea',
            tags: ['research', account?.id ?? 'general'],
          })
        } catch { /* best-effort */ }
      }
      return NextResponse.json({ brief })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'research failed' }, { status: 502 })
  }
}
