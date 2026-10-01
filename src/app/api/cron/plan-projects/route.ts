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

  const force = new URL(req.url).searchParams.get('force') === '1'
  const active = getAllProjects('active')
  // Normally only projects that still need a breakdown; force=1 re-plans all of them.
  const targets = (force ? active : active.filter(p => !(p.checklist && p.checklist.length > 0))).slice(0, 10)
  if (!targets.length) return NextResponse.json({ ran: true, planned: 0, note: 'all active projects already broken down' })

  let planned = 0
  const names: string[] = []
  for (const p of targets) {
    const instructions = `You are Mandi Beck's chief of staff, writing her shoot/work plan for ONE project. Two hard rules:

1. WRITE IN HER VOICE, as HER steps. First person or direct imperative, the way SHE'd say it to herself — concrete and specific to THIS project, never process filler. BANNED: "notify the Commander", "schedule time to", "share with Commander", "coordinate", "leverage", "utilize", vague "create a strategy". Say the real thing: "Pick which of the 3 opinions to film first", "Film it in the car", "Dump this week's photos into Media".

2. LABEL EVERY TASK BY WHO DOES IT:
   • "mine" = ONLY Mandi can do it — film/record herself, decide/choose, approve, wire money, connect an account, upload her own footage, anything needing her face, voice, judgment, or wallet.
   • "commander" = RISE can do it FOR her once her inputs exist — draft/write captions, compile, sort, generate on-screen text, propose a schedule, assemble the carousel. These depend on her "mine" steps being done first.
   ORDER the list so her "mine" steps come first, then the "commander" steps that unlock after them.

Ground everything in the project's real description/notes — never invent scope. Return ONLY valid JSON:
{ "next_action": "her single most important NEXT step, in her voice (usually the first 'mine' task)", "tasks": [ { "text": "the step in her voice", "owner": "mine" | "commander" } ] } — 3 to 6 tasks.`
    const input = `PROJECT: ${p.name}\nSTATUS: ${p.status} · priority ${p.priority} · ${p.progress ?? 0}% done\n${p.next_action ? `CURRENT NEXT ACTION (keep if still right): ${p.next_action}\n` : ''}DESCRIPTION: ${p.description || '(none)'}\nNOTES / SOURCE MATERIAL:\n${(p.notes || '(none)').slice(0, 3000)}`
    try {
      const raw = await fableText({ instructions, input, maxTokens: 1100, effort: 'low' })
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { next_action?: string; tasks?: Array<{ text?: string; owner?: string } | string> }
      const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : []
      const tasks = rawTasks
        .map(t => typeof t === 'string' ? { text: t, owner: 'mine' } : { text: String(t?.text ?? ''), owner: t?.owner === 'commander' ? 'commander' : 'mine' })
        .filter(t => t.text.trim())
        .slice(0, 6)
      if (!tasks.length) continue
      const checklist: ChecklistItem[] = tasks.map(t => ({ id: randomUUID().slice(0, 8), text: t.text.trim(), done: false, owner: t.owner as 'mine' | 'commander' }))
      // Prefer her first "mine" step as the next action; keep her own if she set one.
      const firstMine = tasks.find(t => t.owner === 'mine')?.text || tasks[0].text
      const next_action = (p.next_action && p.next_action.trim()) ? p.next_action : (parsed.next_action?.trim() || firstMine)
      updateProject(p.id, { checklist, next_action })
      planned++; names.push(p.name)
    } catch { /* skip this one, continue */ }
  }

  if (planned) logActivity({ type: 'projects_planned', title: `Broke down ${planned} project${planned > 1 ? 's' : ''} into tasks`, detail: names.slice(0, 3).join(' · ').slice(0, 120), icon: '🗂️', source: 'cron' })
  return NextResponse.json({ ran: true, planned, projects: names })
}
