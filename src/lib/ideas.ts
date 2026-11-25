// Phase 6 · Loop 14: ideas from the agents.
//
// Any agent may add one or two ideas INSIDE ITS OWN LANE to its report, labeled as its own
// (never passed off as Mandi's words). The way up: agent → Commander → Her; Ed's go straight
// to Her. Her presents them when the day has room. On Mandi's yes, Commander routes the idea
// to Biz or Cap like any note (a `piece` handoff). On her no, it goes to Notes with her reason
// (the killed pile, which only Her reads). No agent ever acts on its own idea: nothing here
// creates a card, a plan, a send or a spend.

import { readDb, writeDb, createNote, type AgentIdea, type SkillOwner } from './db'
import { openHandoff, AGENT_LABEL } from './handoffs'
import { noSkill } from './skills'
import { cut } from './jsonkit'
import { getPlanConfig } from './plan'

const nowIso = () => new Date().toISOString()
const MAX_PER_REPORT = 2

// What each agent may bring (SOPs, "Who can ideate").
export const IDEA_LANES: Record<SkillOwner, string> = {
  her: 'anything, with Mandi, in conversation',
  commander: 'connections between notes that nobody asked for',
  cap: 'campaigns and series, from the gaps in the map and the winners',
  rex: 'hooks and angles',
  pod: 'episodes and long-form pieces',
  cora: 'stories, from the headlines',
  ten: 'what only Mandi can film this week',
  owl: 'openings found while researching',
  biz: 'new businesses, offers and partners',
  fin: 'where to spend less or charge more',
  ed: 'patterns in Mandi’s edits',
  tool: '',
}

// The line an agent's prompt carries so it may (not must) add ideas in its lane.
export function ideaAsk(agent: SkillOwner): string {
  return `IDEAS (optional): you may add up to ${MAX_PER_REPORT} ideas of your own, ONLY inside your lane (${IDEA_LANES[agent]}). Each is one plain line plus one line of why. They are labeled as yours and go to Mandi for a yes or no; you never act on them. Leave "ideas" empty when nothing is worth her time.`
}

// An agent's report carries its ideas. Kept to its best one or two; duplicates dropped.
export function addIdeas(from: SkillOwner, ideas: { text?: string; why?: string }[] | undefined, source: string): AgentIdea[] {
  const list = (ideas ?? []).filter(i => i && typeof i.text === 'string' && i.text.trim()).slice(0, MAX_PER_REPORT)
  if (!list.length || from === 'tool') return []
  const db = readDb()
  db.agent_ideas ??= []
  const now = nowIso()
  const seen = new Set(db.agent_ideas.map(i => i.text.trim().toLowerCase()))
  const added: AgentIdea[] = []
  for (const i of list) {
    const text = cut(i.text!.trim(), 300)
    if (seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    const idea: AgentIdea = {
      id: `idea_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      from, lane: IDEA_LANES[from], text, why: cut(i.why?.trim() ?? '', 300) || undefined, source: cut(source, 200),
      // Ed's (and Commander's own) go straight to Her; everyone else's ride up through Commander.
      status: from === 'ed' || from === 'commander' || from === 'her' ? 'with_her' : 'with_commander',
      created_at: now, updated_at: now,
    }
    db.agent_ideas.push(idea)
    added.push(idea)
  }
  if (added.length) writeDb(db)
  return added
}

// Commander's report to Her carries the ideas up (plain code: he labels and passes them, he
// doesn't rewrite them). Returns how many moved.
export function commanderCarriesIdeas(): number {
  const db = readDb()
  let n = 0
  for (const i of db.agent_ideas ?? []) if (i.status === 'with_commander') { i.status = 'with_her'; i.updated_at = nowIso(); n++ }
  if (n) writeDb(db)
  return n
}

// "When the day has room": what's on today's calendar and not filmed yet, against her capacity.
export function dayRoom(today = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)): { room: boolean; due_today: number; capacity: number } {
  const db = readDb()
  const cap = getPlanConfig().day_capacity
  const byId = new Map(db.content.map(c => [c.id, c]))
  const due = (db.calendar_items ?? []).filter(i => i.date === today).filter(i => {
    const c = byId.get(i.content_id)
    return c && !['published', 'archived'].includes(c.status) && !c.filmed_at && !(c.platform_posts ?? []).some(p => p.status === 'posted')
  }).length
  return { room: due < cap, due_today: due, capacity: cap }
}

export function ideasForHer(): { room: boolean; due_today: number; capacity: number; ideas: (AgentIdea & { from_label: string })[]; waiting: number } {
  const r = dayRoom()
  const all = (readDb().agent_ideas ?? []).filter(i => i.status === 'with_her').sort((a, b) => a.created_at.localeCompare(b.created_at))
  return { ...r, waiting: all.length, ideas: all.slice(0, 3).map(i => ({ ...i, from_label: AGENT_LABEL[i.from as keyof typeof AGENT_LABEL] ?? i.from })) }
}

// Mandi's answer. Yes → Commander routes it (Biz for business/money ideas, Cap for the rest).
// No → Notes with her reason. Either way the agent who had it does nothing with it.
export function decideIdea(id: string, answer: 'yes' | 'no', reason?: string): AgentIdea | { error: string } {
  const db = readDb()
  const i = (db.agent_ideas ?? []).find(x => x.id === id)
  if (!i) return { error: 'That idea isn’t in RISE any more.' }
  if (i.status === 'yes' || i.status === 'no') return { error: 'You already answered this one.' }
  const who = AGENT_LABEL[i.from as keyof typeof AGENT_LABEL] ?? i.from
  const now = nowIso()
  if (answer === 'yes') {
    const to: 'cap' | 'biz' = i.from === 'biz' || i.from === 'fin' ? 'biz' : 'cap'
    const h = openHandoff({ kind: 'piece', from: 'commander', to, what: cut(`${who}’s idea (Mandi said yes): ${i.text}`, 300), note: `This is ${who}’s idea, not Mandi’s words. Mandi said yes.\nWhy ${who} suggested it: ${i.why ?? '(no reason given)'}${reason ? `\nMandi added: ${reason}` : ''}` })
    if (to === 'biz') noSkill('biz', i.text)
    Object.assign(i, { status: 'yes', routed_to: to, handoff_id: h.id, reason: reason ? cut(reason, 400) : null, decided_at: now, updated_at: now })
  } else {
    const why = (reason ?? '').trim() || '(no reason given)'
    const n = createNote({ title: cut(`Killed: ${who}’s idea · ${i.text}`, 120), body: `${who}’s idea (not Mandi’s words): ${i.text}\nWhy ${who} suggested it: ${i.why ?? '(none)'}\nMandi said no. Her reason: ${why}`, category: 'idea', source: 'rise', tags: ['killed', 'agent-idea', i.from], pinned: false })
    Object.assign(i, { status: 'no', note_id: n.id, reason: why, decided_at: now, updated_at: now })
  }
  // Re-read: openHandoff / createNote wrote the db in between.
  const d2 = readDb()
  const j = (d2.agent_ideas ?? []).find(x => x.id === id)
  if (j) { Object.assign(j, i); writeDb(d2) }
  return i
}
