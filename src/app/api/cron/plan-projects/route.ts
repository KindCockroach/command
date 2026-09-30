import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects, updateProject, logActivity } from '@/lib/db'
import type { ChecklistItem } from '@/lib/db'
import { fableText } from '@/lib/fable'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// PLAN PROJECTS — the Commander, in perpetuity, breaks every active project into
// small concrete tasks and keeps a live NEXT ACTION on each, so "Your Move" always
// has a real ranked to-do spanning current AND future projects. Runs daily (and any
// new project that lacks a breakdown gets one on the next run). Propose-only: it
// writes checklists + next actions to projects; it never posts or spends.
//
// Trigger: /api/cron/plan-projects?key=CRON_SECRET  (also fired by instrumentation.ts)
export async function POST(req: NextRequest) { return run(req) }
export async function GET(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && new URL(req.url).searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ran: false, reason: 'no model key' })
  }

  const active = getAllProjects('active')
  // Only projects that still need a breakdown (no checklist yet) — cap per run for cost.
  const targets = active.filter(p => !(p.checklist && p.checklist.length > 0)).slice(0, 8)
  if (!targets.length) return NextResponse.json({ ran: true, planned: 0, note: 'all active projects already broken down' })

  let planned = 0
  const names: string[] = []
  for (const p of targets) {
    const instructions = `You are RISE's chief of staff. Break ONE project into the smallest useful set of concrete next tasks so Mandi can just DO them, top to bottom. Ground everything in the project's real description/notes — never invent scope it doesn't imply. Each task is a single imperative action doable in one sitting (start with a verb, be specific to THIS project). Order them so the FIRST is the true next step. Return ONLY valid JSON: { "next_action": "the single most important next step (imperative)", "tasks": ["task 1", "task 2", "task 3", "..."] } — 3 to 6 tasks.`
    const input = `PROJECT: ${p.name}\nSTATUS: ${p.status} · priority ${p.priority} · ${p.progress ?? 0}% done\n${p.next_action ? `CURRENT NEXT ACTION (keep if still right): ${p.next_action}\n` : ''}DESCRIPTION: ${p.description || '(none)'}\nNOTES / SOURCE MATERIAL:\n${(p.notes || '(none)').slice(0, 3000)}`
    try {
      const raw = await fableText({ instructions, input, maxTokens: 900, effort: 'low' })
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { next_action?: string; tasks?: string[] }
      const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.filter(t => typeof t === 'string' && t.trim()).slice(0, 6) : []
      if (!tasks.length) continue
      const checklist: ChecklistItem[] = tasks.map(t => ({ id: randomUUID().slice(0, 8), text: t.trim(), done: false }))
      // Keep her existing next action if she set one; otherwise use the model's (or the first task).
      const next_action = (p.next_action && p.next_action.trim()) ? p.next_action : (parsed.next_action?.trim() || tasks[0])
      updateProject(p.id, { checklist, next_action })
      planned++; names.push(p.name)
    } catch { /* skip this one, continue */ }
  }

  if (planned) logActivity({ type: 'projects_planned', title: `Broke down ${planned} project${planned > 1 ? 's' : ''} into tasks`, detail: names.slice(0, 3).join(' · ').slice(0, 120), icon: '🗂️', source: 'cron' })
  return NextResponse.json({ ran: true, planned, projects: names })
}
