import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllNotes, updateNote, createTask, getAllGoals, getAllBrandAccounts } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// CEO daily review: reads unreviewed raw-capture notes → expands each into a plan,
// creates tasks, proposes goal updates, and mines extra post hooks.
export async function POST() {
  const notes = getAllNotes().filter(n =>
    (n.tags ?? []).includes('raw-capture') && !(n.tags ?? []).includes('reviewed')
  )
  if (notes.length === 0) {
    return NextResponse.json({ reviewed: 0, message: 'No new raw ideas to review — all caught up.' })
  }

  const goals = getAllGoals().filter(g => g.active).map(g => `${g.title} (${g.target_per_week}/wk${g.deadline ? `, due ${g.deadline}` : ''})`)
  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted').map(a => `${a.id}: ${a.handle} — ${a.topic}`)

  const res = await client.responses.create({
    model: 'gpt-4o',
    instructions: `You are Mandi's CEO doing her daily raw-idea review. She dumps raw thoughts; you turn them into action and content.
North star: RISE is the product (tiers: RISE Lite → Build Your Own Command Station course → DFY Command Station). AI Mom is the funnel. Room30 is near-term cash ($30k/90 days).

For the raw notes below, produce a JSON object:
{
  "plans": [{ "idea": "which note (short)", "plan": "2-3 sentence actionable plan" }],
  "tasks": [{ "title": "concrete next action (imperative)", "priority": "urgent|high|medium|low" }],
  "goal_suggestions": ["short suggestion to add/adjust a goal — do NOT restate existing goals"],
  "hooks": [{ "hook": "a scroll-stopping hook mined from her raw words", "account_id": "best-fit account id" }]
}
Mine hooks aggressively — her raw voice is the gold (e.g. pull "It says POST but it doesn't know what you know. Till NOW" out of a rant). 3-8 hooks. Keep tasks concrete and few (max 6). Return ONLY the JSON.

EXISTING GOALS (don't duplicate): ${goals.join(' | ') || 'none'}
ACCOUNTS: ${accounts.join(' | ')}`,
    input: `RAW IDEAS TO REVIEW:\n\n${notes.map((n, i) => `[${i + 1}] ${n.body}`).join('\n\n')}`,
  })

  let parsed
  try {
    parsed = JSON.parse(res.output_text.match(/\{[\s\S]*\}/)![0])
  } catch {
    return NextResponse.json({ error: 'CEO review could not parse', raw: res.output_text }, { status: 502 })
  }

  // Create the tasks the CEO proposed
  const createdTasks = (parsed.tasks ?? []).slice(0, 6).map((t: { title: string; priority?: string }) =>
    createTask({ title: t.title, notes: 'From CEO daily idea review', priority: (t.priority as 'urgent' | 'high' | 'medium' | 'low') ?? 'medium', status: 'this_week' })
  )

  // Mark these notes reviewed so tomorrow's pass skips them
  notes.forEach(n => updateNote(n.id, { tags: [...(n.tags ?? []), 'reviewed'] }))

  return NextResponse.json({
    reviewed: notes.length,
    plans: parsed.plans ?? [],
    tasks_created: createdTasks.length,
    goal_suggestions: parsed.goal_suggestions ?? [],
    hooks: parsed.hooks ?? [],
  })
}

// GET: how many raw ideas are waiting for review (drives the "run review" nudge)
export async function GET() {
  const pending = getAllNotes().filter(n =>
    (n.tags ?? []).includes('raw-capture') && !(n.tags ?? []).includes('reviewed')
  ).length
  return NextResponse.json({ pending })
}
