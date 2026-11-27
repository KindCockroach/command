// Phase 6b · Loop 15: use what already exists (Cap 8 · Sweep Notes against the map).
//
// Cap reads the goals on the map (active goals + the goals in approved monthly plans), searches
// Notes for drafts, scripts and pitches that already serve one (example: the podcast guest
// pitch drafts), and PROPOSES each: which goal, who it goes to, by when. Ed checks it like any
// finished writing. It shows in Cap's report → Commander → Her as "ready for you to send".
// Mandi sends it herself and marks it sent; it's counted against its goal, and replies come back
// to Cap. Cap proposes only: putting it on the plan is his plan tool, and this sweep leaves the
// plan alone. He never reads the killed pile (Her's) and never sends.

import { readDb, writeDb, logActivity, type Handoff, type ReuseProposal } from './db'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'
import { fableText } from './fable'
import { edCheck } from './longform'
import { skillPrompt } from './skills'
import { addIdeas, ideaAsk } from './ideas'
import { cut } from './jsonkit'
import { RETIRED } from './health'
import { ROLE_LINES } from './roles'

const nowIso = () => new Date().toISOString()
const words = (s: string) => new Set((s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(w => !STOP.has(w)))
const STOP = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'will', 'what', 'about', 'they', 'them', 'into', 'more', 'than', 'when', 'week', 'each', 'every', 'just', 'like', 'make', 'post', 'posts'])

export function mapGoals(): { goal: string; goal_id: number | null }[] {
  const db = readDb()
  const out: { goal: string; goal_id: number | null }[] = (db.goals ?? []).filter(g => g.active && (!g.deadline || g.deadline.slice(0, 10) >= new Date().toISOString().slice(0, 10))).map(g => ({ goal: g.title, goal_id: g.id }))
  for (const p of (db.plans ?? []).filter(p => p.level === 'monthly' && p.status === 'approved')) for (const g of p.monthly?.goals ?? []) out.push({ goal: g, goal_id: null })
  const seen = new Set<string>()
  return out.filter(g => { const k = g.goal.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 15)
}

// Finished work: substantial notes that aren't raw transcripts, kits, research byproducts or
// anything killed/parked (the killed pile is Her's to read, not Cap's).
function candidates() {
  const db = readDb()
  const skipTags = ['killed', 'parked', 'transcript', 'river-research', 'trends-source', 'build-history', 'her']
  const done = new Set((db.reuse ?? []).map(r => r.note_id))
  return db.notes.filter(n => !n.archived && !done.has(n.id) && (n.body ?? '').length >= 200 && !(n.tags ?? []).some(t => skipTags.includes(t)) && n.category !== 'reflection' && n.category !== 'personal'
    // Work written for something RISE retired (Room30, GHL, the avatars…) doesn't serve today's map.
    && !RETIRED.some(r => r.re.test(`${n.title} ${n.body.slice(0, 3000)}`)))
}

export function openSweep(): Handoff {
  return openHandoff({ kind: 'sweep', from: 'cap', to: 'cap', what: 'Sweep Notes against the goals on the map' })
}

export async function runSweep(h: Handoff) {
  startAttempt(h.id)
  const goals = mapGoals()
  if (!goals.length) return failHandoff(h.id, 'There are no live goals on the map to sweep against.')
  const gw = goals.map(g => words(g.goal))
  const scored = candidates().map(n => {
    const nw = words(`${n.title} ${n.body.slice(0, 1500)}`)
    const best = Math.max(...gw.map(G => [...G].filter(w => nw.has(w)).length))
    const draftish = /pitch|draft|script|email|outreach|invite|dm|letter|post|article|outline/i.test(`${n.title} ${(n.tags ?? []).join(' ')}`) ? 2 : 0
    return { n, score: best + draftish }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 20)
  if (!scored.length) return completeHandoff(h.id, 'cap', `Swept ${candidates().length} notes against ${goals.length} goals: nothing finished fits a goal right now.`)

  let out: { proposals?: { note_id: number; goal: string; who_for: string; by_when: string | null; kind: string; why: string }[]; ideas?: { text?: string; why?: string }[] }
  try {
    out = JSON.parse(await fableText({ json: true, maxTokens: 1800,
      instructions: `You are Cap, the campaign boss. ${ROLE_LINES.cap}
${skillPrompt('cap-sweep-notes')}\nOnly propose a note that is ALREADY finished (or nearly) and truly serves one of the goals as it is. Say who it goes to (a person type or a channel, never invent a name) and by when (a date YYYY-MM-DD or null if the goal sets none). kind: outreach (Mandi sends it herself), post, longform, email, other. Up to 6. If nothing fits, return none. Keep the branches apart: Joyful Media (mindfulness, the Reset) and WFH (the AI Mom podcast; AI services paused).\n${ideaAsk('cap')}\nReply ONLY with JSON: {"proposals":[{"note_id":0,"goal":"","who_for":"","by_when":null,"kind":"","why":""}],"ideas":[{"text":"","why":""}]}`,
      input: `TODAY: ${new Date().toISOString().slice(0, 10)}\nGOALS ON THE MAP:\n${goals.map(g => `- ${g.goal}`).join('\n')}\n\nNOTES THAT MAY ALREADY SERVE ONE:\n${scored.map(({ n }) => `[#${n.id}] ${cut(n.title, 100)} (${n.category}; ${(n.tags ?? []).join(', ')})\n${cut(n.body, 700)}`).join('\n\n')}` }))
  } catch (e) { return failHandoff(h.id, `Cap couldn’t sweep: ${e instanceof Error ? e.message : 'no answer'}`) }
  addIdeas('cap', out.ideas, 'Cap’s Notes sweep')

  const db = readDb()
  const valid = (out.proposals ?? []).filter(p => scored.some(x => x.n.id === Number(p.note_id))).slice(0, 6)
  const made: ReuseProposal[] = []
  for (const p of valid) {
    const note = db.notes.find(n => n.id === Number(p.note_id))!
    const g = goals.find(x => x.goal.toLowerCase() === String(p.goal).toLowerCase()) ?? goals.find(x => String(p.goal).toLowerCase().includes(x.goal.toLowerCase().slice(0, 20)))
    const kind = (['outreach', 'post', 'longform', 'email', 'other'].includes(p.kind) ? p.kind : 'other') as ReuseProposal['kind']
    made.push({ id: `ru_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, note_id: note.id, note_title: cut(note.title, 120), goal: cut(g?.goal ?? p.goal, 200), goal_id: g?.goal_id ?? null, who_for: cut(p.who_for || '(not said)', 160), by_when: /^\d{4}-\d{2}-\d{2}$/.test(String(p.by_when)) ? String(p.by_when) : null, kind, why: cut(p.why ?? '', 300), status: 'with_ed', handoff_id: h.id, created_at: nowIso(), updated_at: nowIso() })
  }
  db.reuse ??= []
  db.reuse.push(...made)
  writeDb(db)

  // Ed checks each like any finished writing. Mandi's own writing isn't rewritten: Ed's flags
  // ride with it as notes and she decides.
  for (const r of made) {
    const note = readDb().notes.find(n => n.id === r.note_id)
    const isWfh = /podcast|ai mom|wfh|guest/i.test(`${r.goal} ${note?.title ?? ''}`)
    const v = await edCheck(note?.body ?? '', { branch: isWfh ? 'wfh' : 'joyful_media', kind: r.kind, mandiText: note?.source === 'mine' ? note.body : '', round: 1 })
    const d = readDb(); const x = d.reuse!.find(y => y.id === r.id)!
    x.ed = v.verdict === 'pass' ? v : { ...v, verdict: 'let_through', notes: [...v.reasons, ...v.notes], reasons: [] }
    x.status = 'ready'; x.updated_at = nowIso(); writeDb(d)
  }
  const flagged = readDb().reuse!.filter(r => made.some(m => m.id === r.id) && (r.ed?.notes.length ?? 0) > 0).length
  return completeHandoff(h.id, 'cap', made.length
    ? `Found ${made.length} finished piece${made.length > 1 ? 's that already serve' : ' that already serves'} a goal: ${made.map(m => `#${m.note_id} → ${m.goal}`).join('; ')}. Ed checked them${flagged ? ` (${flagged} with notes for you)` : ''}. Ready for you to send; I left the plan alone.`
    : `Swept ${scored.length} likely notes against ${goals.length} goals: none is finished enough to send as it is.`)
}

export function getReuse(): ReuseProposal[] { return (readDb().reuse ?? []).slice().reverse() }

// Mandi sent it herself → counted against its goal; replies come back to Cap.
export function markReuse(id: string, action: 'sent' | 'dismiss' | 'reply', text?: string): ReuseProposal | { error: string } {
  const db = readDb()
  const r = (db.reuse ?? []).find(x => x.id === id)
  if (!r) return { error: 'No such proposal.' }
  const now = nowIso()
  if (action === 'sent') { r.status = 'sent'; r.sent_at = now }
  else if (action === 'dismiss') r.status = 'dismissed'
  else { if (!text?.trim()) return { error: 'What did they say?' }; r.replies = [...(r.replies ?? []), { at: now, text: cut(text.trim(), 1500) }] }
  r.updated_at = now
  writeDb(db)
  if (action === 'sent') {
    const sentForGoal = (readDb().reuse ?? []).filter(x => x.status === 'sent' && x.goal === r.goal).length
    logActivity({ type: 'reuse_sent', icon: '📤', source: 'mandi', title: `Sent existing work toward “${cut(r.goal, 60)}”: ${cut(r.note_title, 60)}`, detail: `${sentForGoal} sent toward this goal so far.` })
    openHandoff({ kind: 'piece', from: 'mandi', to: 'cap', what: cut(`Sent: ${r.note_title} → ${r.who_for}. Watch for replies.`, 280), ref: { type: 'reuse', id: r.id, label: r.note_title } })
  }
  if (action === 'reply') openHandoff({ kind: 'piece', from: 'mandi', to: 'cap', what: cut(`Reply to “${r.note_title}”: ${text}`, 280), ref: { type: 'reuse', id: r.id, label: r.note_title } })
  return r
}

// "Counted on the map": how much existing work went out per goal.
export function reuseCounts(): Record<string, { sent: number; ready: number; replies: number }> {
  const out: Record<string, { sent: number; ready: number; replies: number }> = {}
  for (const r of readDb().reuse ?? []) {
    const c = (out[r.goal] ??= { sent: 0, ready: 0, replies: 0 })
    if (r.status === 'sent') c.sent++
    if (r.status === 'ready') c.ready++
    c.replies += r.replies?.length ?? 0
  }
  return out
}
