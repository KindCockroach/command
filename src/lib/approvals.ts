// One window for everything waiting on Mandi's yes. Read-only: it gathers from where each thing
// lives (Plan, Campaigns, Story, Notes sweep, agents' ideas, Her's questions, the health check)
// and every action calls that thing's own route. Nothing moves; it all still lives in its tab.
// A new kind of approval belongs here too: add a source below so nothing hides in a tab again.

import { readDb, getAllBrandAccounts } from './db'
import { AGENT_LABEL } from './handoffs'
import { cut } from './jsonkit'

export type ApprovalAction =
  | { label: string; kind: 'post'; url: string; method?: 'POST' | 'PATCH'; body: Record<string, unknown>; reason?: string; primary?: boolean }
  | { label: string; kind: 'open'; view: string }

export type Approval = {
  id: string
  source: 'plan' | 'email' | 'story' | 'substack' | 'send' | 'idea' | 'question' | 'health'
  from: string            // who it's from ("Cap", "Ed", "Cora"...)
  title: string
  detail?: string
  body?: string           // the draft itself, to read without leaving
  at: string
  view: string            // the tab it lives in
  actions: ApprovalAction[]
}

const SOURCE_LABEL: Record<Approval['source'], string> = { plan: 'Plans', email: 'Campaign emails', story: 'Story desk', substack: 'Substack', send: 'Ready to send', idea: 'Agents’ ideas', question: 'Questions for you', health: 'Needs you (health check)' }
export { SOURCE_LABEL }

export function getApprovals(): { items: Approval[]; counts: Record<string, number>; total: number } {
  const db = readDb()
  const items: Approval[] = []
  const handle = new Map(getAllBrandAccounts().map(a => [a.id, a.handle]))

  // Cap's plans waiting for approval.
  for (const p of (db.plans ?? []).filter(p => p.status === 'proposed')) {
    items.push({ id: `plan:${p.id}`, source: 'plan', from: 'Cap', view: 'plan', at: p.updated_at,
      title: p.level === 'monthly' ? `Monthly plan · ${p.branch_id === 'wfh' ? 'WFH' : 'Joyful Media'} (${p.period_start} → ${p.period_end})` : `Weekly plan · ${p.weekly?.handle ?? handle.get(p.weekly?.account_id ?? '') ?? ''}`,
      detail: cut(p.summary, 300) + (p.weekly?.experiments?.length ? ` · Experiment: ${cut(p.weekly.experiments[0].text, 160)}` : ''),
      actions: [{ label: 'Approve', kind: 'post', url: '/api/plan', body: { action: 'approve', id: p.id }, primary: true }, { label: 'Decline…', kind: 'post', url: '/api/plan', body: { action: 'decline', id: p.id }, reason: 'Why not? (goes onto Cap’s next draft)' }, { label: 'Edit counts / ask Cap', kind: 'open', view: 'plan' }] })
  }

  // Campaign emails Cap confirmed (the Reset sequence today).
  for (const e of (db.reset_sequence?.emails ?? []).filter(e => e.status === 'confirmed')) {
    items.push({ id: `email:${e.key}`, source: 'email', from: e.written_by === 'mandi' ? 'You' : 'Ed (Cap checked)', view: 'campaigns', at: e.updated_at,
      title: `Reset email · ${e.title}`, detail: `Subject: ${e.subject}${e.cap_notes?.length ? ` · Cap noticed: ${e.cap_notes.join('; ')}` : ''}`,
      body: [e.preheader && `(${e.preheader})`, e.body, e.cta_label && `[ ${e.cta_label} ]`, e.ps && `P.S. ${e.ps}`].filter(Boolean).join('\n\n'),
      actions: [{ label: 'Approve', kind: 'post', url: '/api/reset-sequence', body: { action: 'approve', key: e.key, on: true }, primary: true }, { label: 'Edit in Campaigns', kind: 'open', view: 'campaigns' }] })
  }

  // Story desk drafts.
  for (const s of (db.stories ?? []).filter(s => s.status === 'ready')) {
    items.push({ id: `story:${s.id}`, source: 'story', from: 'Pod (Ed checked, Cora outlined)', view: 'story', at: s.updated_at,
      title: s.draft?.title ?? s.title, detail: `${s.outline?.form === 'medium' ? 'Medium article' : 'Teleprompter script'} · ${s.branch === 'wfh' ? 'WFH' : 'Joyful Media'} · for: ${s.goal}${s.date ? ` · Cap’s date ${s.date}` : ''}${s.ed?.notes.length ? ` · Ed noticed: ${s.ed.notes.join('; ')}` : ''}`,
      body: s.draft ? `${s.draft.subtitle ? s.draft.subtitle + '\n\n' : ''}${s.draft.body}` : undefined,
      actions: [{ label: 'Approve', kind: 'post', url: '/api/stories', method: 'PATCH', body: { id: s.id, action: 'approve' }, primary: true }, { label: 'Park it…', kind: 'post', url: '/api/stories', method: 'PATCH', body: { id: s.id, action: 'kill' }, reason: 'Why park it? (goes to Notes with it)' }] })
  }

  // Substack: the proposed series, then issues ready.
  const sub = db.substack
  if (sub?.series_status === 'proposed' && sub.issues.length) {
    items.push({ id: 'substack:series', source: 'substack', from: 'Cap', view: 'story', at: sub.updated_at,
      title: `Substack backlog series · ${sub.issues.length} issues`, detail: cut(sub.series_summary ?? '', 300),
      body: sub.issues.map(i => `${i.n}. ${i.title}\n   Turn: ${i.turn}\n   Lesson: ${i.lesson}\n   Parenting: ${i.parenting ?? '(yours to add)'}`).join('\n\n'),
      actions: [{ label: 'Approve the series', kind: 'post', url: '/api/substack', body: { action: 'approve_series' }, primary: true }, { label: 'Edit / add parenting moments', kind: 'open', view: 'story' }] })
  }
  for (const i of (sub?.issues ?? []).filter(i => i.status === 'ready')) {
    items.push({ id: `substack:${i.n}`, source: 'substack', from: 'Pod (Ed checked, Biz + Cap outlined)', view: 'story', at: sub!.updated_at,
      title: `Substack issue ${i.n} · ${i.draft?.title ?? i.title}`, detail: `${i.outline?.date_note ?? ''}${i.ed?.notes.length ? ` · Ed noticed: ${i.ed.notes.join('; ')}` : ''}`,
      body: i.draft ? `${i.draft.subtitle ? i.draft.subtitle + '\n\n' : ''}${i.draft.body}` : undefined,
      actions: [{ label: 'Approve', kind: 'post', url: '/api/substack', body: { action: 'approve_issue', n: i.n }, primary: true }] })
  }

  // Finished work Cap found that's ready for her to send.
  for (const r of (db.reuse ?? []).filter(r => r.status === 'ready')) {
    const note = db.notes.find(n => n.id === r.note_id)
    items.push({ id: `send:${r.id}`, source: 'send', from: 'Cap (Ed checked)', view: 'story', at: r.updated_at,
      title: r.note_title, detail: `For: ${r.goal} · To: ${r.who_for}${r.by_when ? ` · By ${r.by_when}` : ''}${r.ed?.notes.length ? ` · Ed noticed: ${r.ed.notes.join('; ')}` : ''}`,
      body: note?.body,
      actions: [{ label: 'I sent it', kind: 'post', url: '/api/sweep', method: 'PATCH', body: { id: r.id, action: 'sent' }, primary: true }, { label: 'Not now', kind: 'post', url: '/api/sweep', method: 'PATCH', body: { id: r.id, action: 'dismiss' } }] })
  }

  // The agents' ideas (labeled as theirs).
  for (const i of (db.agent_ideas ?? []).filter(i => i.status === 'with_her' || i.status === 'with_commander')) {
    const who = AGENT_LABEL[i.from as keyof typeof AGENT_LABEL] ?? i.from
    items.push({ id: `idea:${i.id}`, source: 'idea', from: `${who} (its idea, not yours)`, view: 'command', at: i.created_at,
      title: i.text, detail: i.why ? `Why: ${i.why}` : undefined,
      actions: [{ label: 'Yes, hand it on', kind: 'post', url: '/api/ideas', method: 'PATCH', body: { id: i.id, answer: 'yes' }, primary: true }, { label: 'No…', kind: 'post', url: '/api/ideas', method: 'PATCH', body: { id: i.id, answer: 'no' }, reason: 'Why not? (goes to Notes with it)' }] })
  }

  // Questions Man sent back that only she can answer.
  for (const t of db.her_threads ?? []) for (const q of t.questions.filter(q => !q.answered)) {
    items.push({ id: `question:${q.id}`, source: 'question', from: AGENT_LABEL[q.from] ?? q.from, view: 'command', at: t.updated_at,
      title: q.text, detail: `From the conversation “${t.title}”. Answer it in Her.`, actions: [{ label: 'Answer in Her', kind: 'open', view: 'command' }] })
  }

  // What the last health check says needs her (not approvals, but hers to do).
  const h = db.health?.last_quick ?? db.health?.last_full
  for (const f of (h?.findings ?? []).filter(f => f.level === 'needs_you' && !['reset:approve'].includes(f.key))) {
    items.push({ id: `health:${f.key}`, source: 'health', from: 'Man (health check)', view: 'activity', at: h!.ran_at,
      title: f.title, detail: `${f.detail ? f.detail + ' · ' : ''}Next: ${f.fix}`, actions: [{ label: 'See it in Activity', kind: 'open', view: 'activity' }] })
  }

  const counts: Record<string, number> = {}
  for (const i of items) counts[i.source] = (counts[i.source] ?? 0) + 1
  const total = items.filter(i => i.source !== 'health').length
  return { items, counts, total }
}
