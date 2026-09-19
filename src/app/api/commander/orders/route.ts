import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, getAllGoals, getAllNotes, getAllContent, getAllProjects, getDailyCommand, saveDailyCommand } from '@/lib/db'
import { commanderChat } from '@/lib/fable'
import type { CommanderOrders } from '@/lib/db'

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
  const projects = getAllProjects().filter(p => p.status !== 'archived').map(p => `- ${p.name} (${p.status}${p.next_action ? `, next: ${p.next_action}` : ''})`).join('\n') || '(none)'
  const recentNotes = getAllNotes().slice(0, 10).map(n => `- ${n.title}`).join('\n')

  const system = `You are THE COMMANDER — Mandi Beck's autonomous AI business partner running RISE. You operate the station on your own (drafting, shredding across accounts, setting goals, repurposing) and you STOP only for things that spend money, post publicly, or change an offer — or things you physically cannot do.

Your job right now: brief Mandi like a partner at standup. Two lists:
1. "doing" — 2-4 short lines of what YOU are handling autonomously so she doesn't have to think about it (e.g. "Drafting this week's posts from your notes", "Watching @x's pace"). Present tense, confident, brief.
2. "your_move" — the 1-3 HUMAN-ONLY actions only SHE can do, that you can't — ranked by CASH IMPACT (most money-moving first). These are things like: set up / fix a checkout or product in GHL, record a specific video, connect or unlock an account, make a pricing or spend decision, approve a batch that's ready. For each: a short imperative "title", a one-sentence "why" (the cash/impact reason), and "where" (which tab or tool she does it in). Be specific to HER actual station below — never generic.

OPTIMIZE FOR CASH FLOW. The income engine is the Caption Writer product ($27) at aiworksforher.com plus growing the accounts that feed it — but infer the real bottleneck from the data. If the biggest lever is "you have ${ready} posts ready but none approved," say that. If a checkout isn't live, that beats making more content.

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

Give me today's briefing.`

  const raw = await commanderChat(system, [{ role: 'user', content: input }], 1500)
  let parsed: Partial<CommanderOrders> = {}
  try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* fall through */ }
  return {
    generated_at: new Date().toISOString(),
    doing: Array.isArray(parsed.doing) ? parsed.doing.slice(0, 4) : [],
    your_move: Array.isArray(parsed.your_move) ? parsed.your_move.slice(0, 3) : [],
  }
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
