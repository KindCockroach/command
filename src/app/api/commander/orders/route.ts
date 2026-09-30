import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, getAllGoals, getAllNotes, getAllContent, getAllProjects, getDailyCommand, saveDailyCommand, getCommanderDone, addCommanderDone, removeCommanderDone } from '@/lib/db'
import { commanderChat } from '@/lib/fable'
import type { CommanderOrders } from '@/lib/db'

// Fuzzy match a freshly-worded move against the DONE list (the model rewords each
// brief). Significant word overlap = the same task, so we drop it.
const keyWords = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3)
function isAlreadyDone(title: string, done: string[]): boolean {
  const tw = new Set(keyWords(title))
  return done.some(d => { const dw = keyWords(d); if (!dw.length) return false; const overlap = dw.filter(w => tw.has(w)).length; return overlap / dw.length >= 0.5 })
}

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// THE COMMANDER COMMANDS YOU BACK. She runs RISE autonomously (full-auto except
// money & public posts) and reports the human-only next actions — the things only
// Mandi can do — ranked by cash impact. Cached once per day in the daily_command
// record so it costs one Opus call a day; ?refresh=1 regenerates on demand.

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

async function generate(): Promise<CommanderOrders> {
  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted' || a.status === 'planned')
  const roster = accounts.map(a => `- ${a.handle} (${a.status}, priority ${a.priority}): ${a.topic}`).join('\n')
  const goals = getAllGoals().filter(g => g.active)
  const goalLines = goals.map(g => `- ${g.title}: ${g.target_per_week}/wk`).join('\n') || '(none set)'
  const content = getAllContent()
  const counts = content.reduce((m, c) => { m[c.status] = (m[c.status] ?? 0) + 1; return m }, {} as Record<string, number>)
  const ready = content.filter(c => c.status === 'ready').length
  const needFinish = content.filter(c => ['idea', 'in_progress'].includes(c.status)).length
  // Active projects in HER priority order (top = #1 she set) with their next action.
  const projects = getAllProjects().filter(p => p.status === 'active')
    .map((p, i) => `${i + 1}. ${p.name}${typeof p.progress === 'number' ? ` (${p.progress}%)` : ''}${p.next_action ? ` — NEXT: ${p.next_action}` : ' — (no next action set)'}${p.label ? ` [${p.label}]` : ''}`)
    .join('\n') || '(none active)'
  const recentNotes = getAllNotes().slice(0, 10).map(n => `- ${n.title}`).join('\n')
  const done = getCommanderDone()

  const system = `You are THE COMMANDER — Mandi Beck's autonomous AI business partner running RISE. You operate the station on your own (drafting, shredding across accounts, setting goals, repurposing) and you STOP only for things that spend money, post publicly, or change an offer — or things you physically cannot do.

Your job right now: brief Mandi like a partner at standup so she can log in with an EMPTY BRAIN and just work top-down. Two lists:
1. "doing" — 2-4 short lines of what YOU are handling autonomously so she doesn't have to think about it (e.g. "Drafting this week's posts from your notes", "Watching @x's pace"). Present tense, confident, brief.
2. "your_move" — her PRIORITIZED ACTION LIST for right now: **6-8 concrete next steps, ranked HIGHEST-IMPACT FIRST.** She has SEVERAL projects going at once and needs the whole landscape, ordered. Draw from ALL of it, and make sure each active thread is represented:
   • ACTIVE PROJECTS (listed below in HER OWN priority order, top = #1) — surface the concrete NEXT ACTION for each of the top projects so every one of them moves forward. If a project has no next action, the move is "decide the next step for [project]".
   • The CONTENT bottleneck — e.g. "N posts ready but unapproved" (approving ships them), or a specific high-reach post to film/finish.
   • MONEY / setup moves only SHE can do — wire a checkout, connect an account, a pricing or spend decision.
   For each: a short imperative "title", a one-sentence "why" (the impact), and "where" (tab/tool). Be specific to HER data below — never generic filler. Include real work even if it isn't strictly "only you can do" (a project's next step counts) — the point is a TRUE, complete, ranked to-do.

RANK BY INCOME + MOMENTUM. Her income comes from her products (Caption Writer $27, Be There For Her $9) and the content engine that feeds them. Put the thing that moves money or unblocks the most work at #1. If a checkout isn't live, that beats making more content; if ${ready} posts are ready but unapproved, approving them is high on the list. But do NOT collapse everything to one theme — give her the full ranked spread across her projects and content.

Return ONLY valid JSON: { "doing": ["..."], "your_move": [ { "title": "...", "why": "...", "where": "..." } ] }`

  const input = `HER STATION TODAY (${today()}):
ACCOUNTS:
${roster || '(none)'}
ACTIVE GOALS:
${goalLines}
CONTENT: ${content.length} total — ${ready} READY to approve, ${needFinish} need finishing. Status mix: ${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(', ')}.
PROJECTS:
${projects}
RECENT NOTES/IDEAS:
${recentNotes || '(none)'}
${done.length ? `\n✅ ALREADY HANDLED BY MANDI — these are DONE. NEVER put any of these in "your_move" again, even reworded:\n${done.map(d => `- ${d}`).join('\n')}\n` : ''}
Give me today's briefing.`

  const raw = await commanderChat(system, [{ role: 'user', content: input }], 3000)
  let parsed: Partial<CommanderOrders> = {}
  try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* fall through */ }
  return {
    generated_at: new Date().toISOString(),
    doing: Array.isArray(parsed.doing) ? parsed.doing.slice(0, 4) : [],
    // Safety net: even if the model slips, drop anything Mandi already checked off.
    your_move: (Array.isArray(parsed.your_move) ? parsed.your_move : []).filter(m => !isAlreadyDone(m?.title ?? '', done)).slice(0, 8),
  }
}

// Mark a "Your Move" item done (durable) so it never comes back, or un-done it.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const text = String(body.done ?? body.undone ?? '').trim()
  if (!text) return NextResponse.json({ error: 'done or undone text required' }, { status: 400 })
  if (body.undone) return NextResponse.json({ ok: true, done: removeCommanderDone(text) })
  const list = addCommanderDone(text)
  // Also prune it from today's cached brief so it disappears immediately.
  try {
    const dc = getDailyCommand(today())
    if (dc.orders?.your_move) {
      dc.orders.your_move = dc.orders.your_move.filter(m => !isAlreadyDone(m.title, [text]))
      saveDailyCommand({ ...dc, orders: dc.orders })
    }
  } catch { /* non-fatal */ }
  return NextResponse.json({ ok: true, done: list })
}

export async function GET(req: NextRequest) {
  const refresh = new URL(req.url).searchParams.get('refresh') === '1'
  const dc = getDailyCommand(today())
  if (!refresh && dc.orders?.your_move) {
    return NextResponse.json({ orders: dc.orders, cached: true })
  }
  try {
    const orders = await generate()
    saveDailyCommand({ ...dc, orders })
    return NextResponse.json({ orders, cached: false })
  } catch (e) {
    // Fall back to any cached copy rather than erroring the home screen.
    if (dc.orders) return NextResponse.json({ orders: dc.orders, cached: true, stale: true })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not brief' }, { status: 502 })
  }
}
