// Phase 6b · Loop 13: ONE Substack, on the WFH branch, for moms who want to use AI to make money.
//
// An honest build-in-public report: everything RISE and WFH did, the trials and tribulations,
// the wins and losses, and the parenting stories in between. The sawdust of building, never
// written from scratch.
//   1. The backlog series first. Cap mines the build history (the RISE_*.md files, the audit,
//      the build log, git history, the station brain) and proposes 6–10 issues: one turn of the
//      story, one lesson a mom can use, and the parenting moment if Mandi has one (never invented).
//   2. Mandi approves the series. Biz + Cap outline each issue → Pod writes → Ed checks →
//      Mandi approves and publishes it herself. No Substack API, no auto-publish.
//   3. Replies and signups she logs come back to Cap and Biz.
// Call to action: the AI Mom podcast only. No prices, no services, no Joyful Media.
// Cadence is Mandi's call; until she sets it, nothing gets a date.
//
// The build history lives on Mandi's Mac, not on the server, so it's loaded into RISE as Notes
// tagged `build-history` (POST action:'load_history'). Cap mines those notes plus the app's own
// build log.

import { readDb, writeDb, createNote, getAllBrandAccounts, upsertBrandAccount, backupDb, getBuildLogMerged, type Handoff, type SubstackIssue, type SubstackStore } from './db'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'
import { fableText } from './fable'
import { skillPrompt } from './skills'
import { addIdeas, ideaAsk } from './ideas'
import { startLongform } from './longform'
import { cut, asLines } from './jsonkit'
import { WFH_BAD } from './review'

const nowIso = () => new Date().toISOString()
const CTA = 'Listen to the AI Mom podcast (the one call to action; no prices, no services).'

export function getSubstack(): SubstackStore {
  const db = readDb()
  return db.substack ?? { account_id: '', cadence: null, history_note_ids: [], series_status: 'none', issues: [], updated_at: nowIso() }
}

function save(fn: (s: SubstackStore) => void): SubstackStore {
  const db = readDb()
  db.substack ??= { account_id: '', cadence: null, history_note_ids: [], series_status: 'none', issues: [], updated_at: nowIso() }
  fn(db.substack)
  db.substack.updated_at = nowIso()
  writeDb(db)
  return db.substack
}

// The `substack` account card, under WFH. Creates it (planned) only if no card exists; backs up first.
export function ensureSubstackAccount(): { account_id: string; created: boolean; moved: boolean; backup?: string } {
  const all = getAllBrandAccounts()
  const have = all.find(a => a.id === 'substack' || /substack/i.test(a.platform ?? '') || /substack/i.test(a.handle ?? ''))
  if (have) {
    const moved = have.branch_id !== 'wfh'
    if (moved) upsertBrandAccount({ id: have.id, branch_id: 'wfh' })
    save(s => { s.account_id = have.id })
    return { account_id: have.id, created: false, moved }
  }
  const backup = backupDb('substack_card')
  upsertBrandAccount({ id: 'substack', handle: 'Substack (WFH)', platform: 'Substack', status: 'planned', priority: 'medium', color: '#FF6719', emoji: '📰', branch_id: 'wfh',
    brand_name: 'WFH build-in-public report', topic: 'Building RISE and the WFH business in public, for moms who want to use AI to make money',
    bio: '', mission: 'An honest report of what we built, what broke, what it cost in time, and the parenting in between. Never income promises.',
    content_format: 'Long-form issues written from the build history', underlying_message: 'Here is exactly what happened, losses included.', problem_message: '', solution_message: '', transformation: '', the_how: 'One honest issue at a time', tone: 'Honest, daring, plain', beliefs: [], hooks: [],
    notes: 'ONE Substack on the WFH branch. CTA = the AI Mom podcast only. No Joyful Media cross-promotion. Mandi publishes it herself.' } as never)
  save(s => { s.account_id = 'substack' })
  return { account_id: 'substack', created: true, moved: false, backup }
}

// Load the build history (from Mandi's Mac) as Notes Cap can mine. Chunked by whole characters.
export function loadHistory(text: string, label = 'RISE build history'): number[] {
  const chars = Array.from(text ?? '')
  if (chars.length < 200) return []
  const ids: number[] = []
  for (let i = 0, part = 1; i < chars.length; i += 12000, part++) {
    ids.push(createNote({ title: cut(`${label} (part ${part})`, 120), body: chars.slice(i, i + 12000).join(''), category: 'framework', source: 'rise', tags: ['build-history', 'substack-source'], pinned: false }).id)
  }
  save(s => { s.history_note_ids = [...new Set([...s.history_note_ids, ...ids])] })
  return ids
}

export function setCadence(cadence: string | null): SubstackStore {
  return save(s => { s.cadence = cadence?.trim() ? cut(cadence.trim(), 80) : null })
}

// ── Cap proposes the backlog series ──
export function openSeries(): Handoff | { error: string } {
  if (getSubstack().issues.some(i => i.status !== 'proposed')) return { error: 'Issues are already being outlined or written; Cap won’t replace the series under them.' }
  return openHandoff({ kind: 'substack_series', from: 'cap', to: 'cap', what: 'Mine the build history and propose the Substack backlog series (6–10 issues)', ref: { type: 'substack', id: 0, label: 'series' } })
}

export async function runSeries(h: Handoff) {
  startAttempt(h.id)
  const db = readDb()
  const notes = db.notes.filter(n => (n.tags ?? []).includes('build-history'))
  const log = getBuildLogMerged().slice(-80).map(b => `- ${b.date} [${b.status}] ${b.title}`).join('\n')
  if (!notes.length && !log) return failHandoff(h.id, 'There’s no build history in RISE to mine yet. Load it first (Substack → Load the build history).')
  const history = cut(notes.map(n => `### ${n.title}\n${n.body}`).join('\n\n'), 60000)
  let out: { summary?: string; issues?: { title: string; turn: string; lesson: string; parenting: string | null; sources: string[] }[]; ideas?: { text?: string; why?: string }[] }
  try {
    out = JSON.parse(await fableText({ json: true, maxTokens: 3500,
      instructions: `You are Cap, the campaign boss. Mine this build history for the arc of ONE Substack's backlog series: the honest build-in-public report of building RISE (an AI content system) and the WFH business, for moms who want to use AI to make money. Issues 1 through N tell the story from where the building began to where it's about to land. Find the pivots (for example: AI avatars to real video, GoHighLevel to RISE's own People CRM, the products that were killed), what broke, what worked, and what it cost in time.
Propose 6 to 10 issues, in order. For each: title; turn (the ONE turn of the story it covers, from the history); lesson (ONE lesson a mom can use, plain); parenting (a parenting moment ONLY if the history shows Mandi's own one; otherwise null; never invent one, and never a child's name or identifying detail); sources (the 2–4 lines or sections of the history it's built from).
Never promise or imply income. Losses are part of the story. Never name a real person other than Mandi. No money figures. This is the WFH branch: never mention Joyful Media, the Reset, meditations, Be There For Her or the Wellspring, even as a killed product (the killed products to talk about are the RISE/WFH ones, like Caption Writer, the Journal and RISE Lite). Be specific to what the history shows: name the actual decision and what it cost in time, not a generic business lesson.
${ideaAsk('cap')}
Reply ONLY with JSON: {"summary":"two sentences: the arc","issues":[{"title":"","turn":"","lesson":"","parenting":null,"sources":[]}],"ideas":[{"text":"","why":""}]}`,
      input: `THE BUILD LOG (RISE's own):\n${log || '(empty)'}\n\nTHE BUILD HISTORY:\n${history || '(none loaded; use the build log)'}` }))
  } catch (e) { return failHandoff(h.id, `Cap couldn’t mine it: ${e instanceof Error ? e.message : 'no answer'}`) }
  addIdeas('cap', out.ideas, 'Cap, mining the build history for Substack')
  // Keep the branches apart even if the model slips: an issue built on Joyful Media is dropped.
  const issues: SubstackIssue[] = (out.issues ?? []).filter(i => i?.title && i?.turn && i?.lesson && !WFH_BAD.test(`${i.title} ${i.turn} ${i.lesson}`)).slice(0, 10).map((i, k) => ({
    n: k + 1, title: cut(i.title, 140), turn: cut(i.turn, 500), lesson: cut(i.lesson, 400), parenting: i.parenting ? cut(String(i.parenting), 400) : null,
    sources: asLines(i.sources, 4), status: 'proposed' as const,
  }))
  if (issues.length < 6) return failHandoff(h.id, `Cap found only ${issues.length} issues; the series needs 6 to 10. Load more of the build history, then retry.`)
  save(s => { s.issues = issues; s.series_status = 'proposed'; s.series_summary = cut(out.summary ?? '', 500) })
  completeHandoff(h.id, 'cap', `Proposed a ${issues.length}-issue backlog series: ${issues.map(i => `${i.n}. ${i.title}`).join(' · ')}. ${issues.filter(i => !i.parenting).length} have no parenting moment yet (only Mandi has those). Waiting for her yes.`, [], 'cap-substack-series')
}

export function approveSeries(): SubstackStore | { error: string } {
  const s = getSubstack()
  if (s.series_status !== 'proposed') return { error: 'There’s no proposed series to approve.' }
  return save(x => { x.series_status = 'approved' })
}

export function editIssue(n: number, patch: { title?: string; turn?: string; lesson?: string; parenting?: string | null }): SubstackStore | { error: string } {
  if (!getSubstack().issues.some(i => i.n === n)) return { error: 'No such issue.' }
  return save(s => {
    const i = s.issues.find(x => x.n === n)!
    if (patch.title !== undefined) i.title = cut(patch.title, 140)
    if (patch.turn !== undefined) i.turn = cut(patch.turn, 500)
    if (patch.lesson !== undefined) i.lesson = cut(patch.lesson, 400)
    if (patch.parenting !== undefined) i.parenting = patch.parenting?.trim() ? cut(patch.parenting, 600) : null
  })
}

// ── Biz + Cap outline one issue → Pod → Ed ──
export function openOutline(n: number): Handoff | { error: string } {
  const s = getSubstack()
  if (s.series_status !== 'approved') return { error: 'Approve the series first.' }
  const i = s.issues.find(x => x.n === n)
  if (!i) return { error: 'No such issue.' }
  save(x => { x.issues.find(y => y.n === n)!.status = 'outlining' })
  return openHandoff({ kind: 'substack_outline', from: 'cap', to: 'biz', what: cut(`Outline Substack issue ${n}: ${i.title}`, 280), ref: { type: 'substack', id: n, label: i.title } })
}

export async function runOutline(h: Handoff) {
  startAttempt(h.id)
  const n = Number(h.ref?.id)
  const i = getSubstack().issues.find(x => x.n === n)
  if (!i) return failHandoff(h.id, 'That issue isn’t in the series any more.')
  const facts = `Issue ${n}: ${i.title}\nThe turn: ${i.turn}\nThe lesson: ${i.lesson}\nParenting moment: ${i.parenting ?? '(none from Mandi yet)'}\nBuilt from:\n${i.sources.map(x => `- ${x}`).join('\n')}`
  let biz = ''
  try {
    biz = (await fableText({ maxTokens: 300, instructions: `You are Biz, business development for the WFH branch. ${skillPrompt('biz-substack-outline')}\nIn 2–3 plain sentences, bring the business angle for this issue: what a mom who wants to use AI to make money should notice about the decision, the cost in time, or the trade-off. Never promise or imply income. No prices, no services (they're paused), no Joyful Media.`, input: facts })).trim()
  } catch (e) { return failHandoff(h.id, `Biz couldn’t answer: ${e instanceof Error ? e.message : 'no answer'}`) }
  let out: { beats?: unknown }
  try {
    out = JSON.parse(await fableText({ json: true, maxTokens: 900, instructions: `You are Cap. With Biz, outline this Substack issue for Pod (who writes it; you don't). 5 to 8 beats in order: open inside the moment, the turn, what broke or worked and what it cost in time, the lesson a mom can use, the parenting moment only if Mandi gave one (else one beat in [brackets] asking her for hers), and the close to the AI Mom podcast. Keep Biz's angle. Reply ONLY with JSON: {"beats":[]}`, input: `${facts}\n\nBIZ'S ANGLE: ${biz}` }))
  } catch (e) { return failHandoff(h.id, `Cap couldn’t outline it: ${e instanceof Error ? e.message : 'no answer'}`) }
  const beats = asLines(out.beats, 8)
  if (beats.length < 3) return failHandoff(h.id, 'The outline came back too thin. Retry.')
  const cadence = getSubstack().cadence
  save(s => { const x = s.issues.find(y => y.n === n)!; x.biz_angle = cut(biz, 600); x.outline = { beats, cta: CTA, date_note: cadence ? `Goes out on the ${cadence} rhythm.` : 'No date: you haven’t said how often it goes out.' }; x.status = 'writing' })
  completeHandoff(h.id, 'cap', `Biz’s angle: ${cut(biz, 240)} Cap outlined ${beats.length} beats; handed to Pod.`, [], 'biz-substack-outline')
  await startLongform({ type: 'substack', id: n }, i.title, 'cap')
}

export function approveIssue(n: number): SubstackStore | { error: string } {
  const i = getSubstack().issues.find(x => x.n === n)
  if (!i) return { error: 'No such issue.' }
  if (i.status !== 'ready') return { error: 'It isn’t ready for your approval yet.' }
  return save(s => { s.issues.find(x => x.n === n)!.status = 'approved' })
}

// Mandi publishes it on Substack herself, then marks it here.
export function markPublished(n: number, url: string): SubstackStore | { error: string } {
  const i = getSubstack().issues.find(x => x.n === n)
  if (!i) return { error: 'No such issue.' }
  if (i.status !== 'approved') return { error: 'Approve it before marking it published.' }
  return save(s => { const x = s.issues.find(y => y.n === n)!; x.status = 'published'; x.published_url = cut(url.trim(), 300) || null; x.published_at = nowIso() })
}

// Replies and signups come back to Cap and Biz.
export function logResponse(n: number, kind: 'reply' | 'signup', text: string): SubstackStore | { error: string } {
  const i = getSubstack().issues.find(x => x.n === n)
  if (!i) return { error: 'No such issue.' }
  if (!text?.trim()) return { error: 'What came in?' }
  const s = save(x => { const y = x.issues.find(z => z.n === n)!; y.replies = [...(y.replies ?? []), { at: nowIso(), kind, text: cut(text.trim(), 1500) }] })
  for (const to of ['cap', 'biz'] as const) openHandoff({ kind: 'piece', from: 'mandi', to, what: cut(`Substack issue ${n} ${kind}: ${text}`, 280), ref: { type: 'substack', id: n, label: i.title } }, { log: to === 'cap' })
  return s
}
