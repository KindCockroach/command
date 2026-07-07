import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllEvents, getAllGoals, getAllBrandAccounts, getWatchContext } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Concept engine: upcoming events + goals + tracked-account trends →
// headline/hook/concept suggestions, each ready to send through the River
export async function POST() {
  const now = new Date()
  const horizon = new Date(now.getTime() + 21 * 86400000)
  const todayKey = now.toISOString().split('T')[0]
  const horizonKey = horizon.toISOString().split('T')[0]

  const events = getAllEvents().filter(e => e.date >= todayKey && e.date <= horizonKey)
  const goals = getAllGoals().filter(g => g.active)
  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')
  const watchContext = getWatchContext()

  const eventList = events.length
    ? events.map(e => `- ${e.date}${e.time ? ` ${e.time}` : ''}: [${e.kind}] ${e.title}${e.notes ? ` — ${e.notes}` : ''}${e.account_id ? ` (account: ${e.account_id})` : ''}`).join('\n')
    : 'No events in the next 3 weeks — suggest evergreen concepts tied to goals and trends instead.'

  const res = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are the CONCEPT ENGINE of Mandi Beck's content command center. Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Given upcoming calendar events, active goals, and trend intelligence from tracked winning accounts, produce 6-9 content concepts. Each concept ties an event (or a goal/trend if no event fits) to a specific account.

RULES: lead with HER (the reader's) problem, 3-second cold-stranger test, concrete over abstract. Use trend buzzwords naturally, never forced. Timing matters — a concept for an event should land 1-3 days BEFORE the event. SHOW don't tell: every headline/hook should dramatize a specific moment and earn an emotional shift, never just describe a topic. Humor from collision of big ideas with ordinary life.

Return ONLY a valid JSON array:
[{
  "post_on": "YYYY-MM-DD (when to post it)",
  "event": "which event/goal/trend this rides, short",
  "account_id": "account id from roster",
  "headline": "the scroll-stopping headline/title",
  "hook": "the opening line (spoken or written)",
  "concept": "2-3 sentences: the full content concept — format, angle, what happens",
  "urgency": "high | medium | low"
}]`,
    input: `UPCOMING EVENTS (next 21 days):\n${eventList}\n\nACTIVE GOALS:\n${goals.map(g => `- ${g.title}${g.account_id ? ` [${g.account_id}]` : ''} (${g.target_per_week}/wk${g.deadline ? `, deadline ${g.deadline}` : ''})`).join('\n') || 'none'}\n\nACCOUNT ROSTER:\n${accounts.map(a => `- id:"${a.id}" ${a.handle} — ${a.topic}. ${a.offer ? `Offer: ${a.offer}` : ''}`).join('\n')}\n${watchContext}`,
  })

  try {
    const parsed = JSON.parse(res.output_text.match(/\[[\s\S]*\]/)![0])
    return NextResponse.json({ suggestions: parsed, events_considered: events.length })
  } catch {
    return NextResponse.json({ error: 'Could not generate suggestions', raw: res.output_text }, { status: 502 })
  }
}
