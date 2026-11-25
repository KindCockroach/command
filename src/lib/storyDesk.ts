// Phase 6b · Loop 11: the Story desk.
//
// Cap sends a story to Cora with the goal and campaign it serves. Several tangled stories are
// separated and named first (Cora 1), each filed as its own note and run on its own.
// Cora checks the facts with Owl and the open angle with Ten, decides the story (the take only
// Mandi has), outlines it and marks the emphasis (Cora 2). Pod writes it long-form (a
// teleprompter script, or a Medium article: Medium = Joyful Media). Ed checks it. Cap dates it.
// Mandi approves. A story that doesn't hold up goes to Notes with the reason.
//
// Cora replaces the old Anchor persona (lib/agents.ts keeps the 'anchor' key for old chats).
// Owl and Ten are the smallest version that does the job: one research call each, with live
// web search when the Anthropic key is set, and saying plainly when they had no live sources.

import { readDb, writeDb, createNote, type BranchId, type Handoff, type Story } from './db'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'
import { fableText, researchWithWeb } from './fable'
import { skillPrompt } from './skills'
import { addIdeas, ideaAsk } from './ideas'
import { startLongform } from './longform'
import { cut, extractJsonObject, asLines } from './jsonkit'

const nowIso = () => new Date().toISOString()
const newId = () => `st_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function getStories(): Story[] {
  return (readDb().stories ?? []).slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

function patchStory(id: string, patch: Partial<Story>) {
  const db = readDb()
  const s = (db.stories ?? []).find(x => x.id === id)
  if (s) { Object.assign(s, patch, { updated_at: nowIso() }); writeDb(db) }
  return s ?? null
}

// Cap → Cora. Returns the story and its handoff; the route runs it after answering.
export function sendStory(data: { text: string; goal: string; campaign?: string; branch: BranchId; title?: string; parent_id?: string | null }): { story: Story; handoff: Handoff } | { error: string } {
  const raw = (data.text ?? '').trim()
  if (raw.length < 40) return { error: 'Give Cora the story as Mandi told it (a few sentences at least).' }
  if (!data.goal?.trim()) return { error: 'Which goal does it serve? Cap sends every story with its goal.' }
  const now = nowIso()
  const story: Story = { id: newId(), title: cut(data.title?.trim() || raw.split(/[.!?\n]/)[0], 90), raw: cut(raw, 12000), goal: cut(data.goal.trim(), 200), campaign: cut(data.campaign?.trim() || '(none named)', 200), branch: data.branch, status: 'forming', parent_id: data.parent_id ?? null, created_at: now, updated_at: now }
  const db = readDb()
  db.stories ??= []
  db.stories.push(story)
  writeDb(db)
  const handoff = openHandoff({ kind: 'story', from: 'cap', to: 'cora', what: cut(`Form this story: ${story.title} (goal: ${story.goal})`, 280), ref: { type: 'story', id: story.id, label: story.title } })
  return { story, handoff }
}

// Owl 1 · Dig, and Ten 2 · Answer a story check. Live web when it can; says so when it can't.
async function research(kind: 'owl' | 'ten', s: Story): Promise<{ text: string; live: boolean }> {
  const ask = kind === 'owl'
    ? `You are Owl, the researcher. Check the facts in this story for Cora. Separate what is solid from what is a guess. Cite sources for anything checkable. Never present a guess as a finding. Reply ONLY with JSON: {"solid":[],"uncertain":[],"sources":[]}`
    : `You are Ten, the trend reader. For Cora: what headlines and takes already exist on this story's subject, what angle is taken, what angle is open (the take only this mom has), and would it be shared and why. Cite sources. Reply ONLY with JSON: {"taken":[],"open":"","shareable":"","sources":[]}`
  const input = `The story (Mandi's words):\n${cut(s.raw, 4000)}\n\nGoal it serves: ${s.goal}`
  if (process.env.ANTHROPIC_API_KEY) {
    try { return { text: await researchWithWeb({ instructions: ask, input, maxTokens: 1500, maxSearches: 3 }), live: true } }
    catch { /* fall through to knowledge-only */ }
  }
  return { text: await fableText({ instructions: `${ask}\nYou have NO live web access right now: say what you know, mark it as not checked live, and leave sources empty rather than invent them.`, input, json: true, maxTokens: 800 }), live: false }
}

const parse = <T,>(t: string): T => JSON.parse(extractJsonObject(t)) as T

export async function runStory(h: Handoff) {
  startAttempt(h.id)
  const id = h.ref?.type === 'story' ? String(h.ref.id) : ''
  const s = (readDb().stories ?? []).find(x => x.id === id)
  if (!s) return failHandoff(h.id, 'The story isn’t in RISE any more.')

  // Cora 1 · Untangle (only for a story Cap sent, not one she already split out).
  if (!s.parent_id) {
    let parts: { title: string; text: string; branch?: string }[] = []
    try {
      const out = parse<{ stories?: { title: string; text: string; branch?: string }[] }>(await fableText({ json: true, maxTokens: 2500,
        instructions: `You are Cora, the journalist on Mandi's Story desk. ${skillPrompt('cora-untangle')}\nIf this is ONE story, return it as one. If several stories are tangled together, separate them and give each a short plain name. Keep her exact words for each part; don't add any. For each, say which branch it belongs to: "wfh" if it is about AI, building RISE, the podcast or making money with AI; "joyful_media" if it is about mindfulness, her inner life, motherhood or the Reset. Joyful Media never touches AI. Reply ONLY with JSON: {"stories":[{"title":"","text":"","branch":"joyful_media|wfh"}]}`,
        input: cut(s.raw, 10000) }))
      parts = (out.stories ?? []).filter(p => p?.text?.trim().length > 40).slice(0, 5)
    } catch { /* treat it as one */ }
    if (parts.length > 1) {
      const kids: string[] = []
      for (const p of parts) {
        createNote({ title: cut(`Story: ${p.title}`, 120), body: p.text, category: 'idea', source: 'mine', tags: ['story', 'cora-untangled'], pinned: false })
        const branch: BranchId = p.branch === 'wfh' ? 'wfh' : p.branch === 'joyful_media' ? 'joyful_media' : s.branch
        const r = sendStory({ text: p.text, title: p.title, goal: branch === s.branch ? s.goal : `(Cap to match: Cora moved this to ${branch === 'wfh' ? 'WFH' : 'Joyful Media'}; it was sent for “${s.goal}”)`, campaign: branch === s.branch ? s.campaign : '(none yet)', branch, parent_id: s.id })
        if (!('error' in r)) kids.push(r.handoff.id)
      }
      patchStory(s.id, { status: 'split' })
      completeHandoff(h.id, 'cora', `Untangled into ${parts.length} stories, each filed as its own note: ${parts.map(p => `“${p.title}”${p.branch && p.branch !== s.branch ? ` (moved to ${p.branch === 'wfh' ? 'WFH' : 'Joyful Media'})` : ''}`).join(', ')}. Forming each one now.`, [], 'cora-untangle')
      for (const k of kids) { const kh = readDb().handoffs?.find(x => x.id === k); if (kh) await runStory(kh) }
      return
    }
  }

  // Cora asks Owl for the facts and Ten for the open angle (each a handoff with a receipt).
  const facts = { solid: [] as string[], uncertain: [] as string[], sources: [] as string[], live: false }
  const angle = { taken: [] as string[], open: '', shareable: '', sources: [] as string[], live: false }
  for (const who of ['owl', 'ten'] as const) {
    const ch = openHandoff({ kind: 'story_check', from: 'cora', to: who, what: cut(`${who === 'owl' ? 'Facts and sources' : 'Headlines and the open angle'}: ${s.title}`, 280), ref: { type: 'story', id: s.id, label: s.title }, parent_id: h.id }, { log: false })
    try {
      const r = await research(who, s)
      if (who === 'owl') { const o = parse<{ solid?: string[]; uncertain?: string[]; sources?: string[] }>(r.text); Object.assign(facts, { solid: (o.solid ?? []).slice(0, 8), uncertain: (o.uncertain ?? []).slice(0, 8), sources: (o.sources ?? []).slice(0, 8), live: r.live }) }
      else { const o = parse<{ taken?: string[]; open?: string; shareable?: string; sources?: string[] }>(r.text); Object.assign(angle, { taken: (o.taken ?? []).slice(0, 6), open: cut(o.open ?? '', 400), shareable: cut(o.shareable ?? '', 300), sources: (o.sources ?? []).slice(0, 8), live: r.live }) }
      completeHandoff(ch.id, who, who === 'owl'
        ? `${facts.solid.length} solid, ${facts.uncertain.length} uncertain, ${facts.sources.length} sources${r.live ? '' : ' (no live web: not checked live)'}.`
        : `Open angle: ${angle.open || '(none found)'}${r.live ? '' : ' (no live web: from what Ten knows)'}.`, [], who === 'owl' ? 'owl-dig' : 'ten-story-check')
    } catch (e) { failHandoff(ch.id, `${who === 'owl' ? 'Owl' : 'Ten'} couldn’t answer: ${e instanceof Error ? e.message : 'no answer'}`) }
  }
  patchStory(s.id, { facts, angle })

  // Cora 2 · Determine the story, outline it, mark the emphasis — or say it doesn't hold up.
  const formRule = s.branch === 'wfh' ? 'This is the WFH branch, so the form is "teleprompter" (Medium belongs to Joyful Media).' : 'This is the Joyful Media branch: "medium" for a written story, or "teleprompter" if it is better said to camera.'
  let out: { holds?: boolean; why?: string; title?: string; take?: string; headline?: string; beats?: unknown; emphasis?: string; form?: string; ideas?: { text?: string; why?: string }[] }
  try {
    out = parse(await fableText({ json: true, maxTokens: 1500,
      instructions: `You are Cora, the journalist on Mandi's Story desk. You form the story; you never write the piece.\n${skillPrompt('cora-form-story')}\nA story HOLDS when there is a turn, a stranger would care, it serves the goal, and it is Mandi's to tell (not a child's or a family member's private moment). If it doesn't hold, say why in one plain line. Never present a guess as a finding; use only Owl's solid facts as facts. ${formRule}\n${ideaAsk('cora')}\nReply ONLY with JSON: {"holds":true,"why":"","title":"","take":"","headline":"","beats":[],"emphasis":"","form":"medium|teleprompter","ideas":[{"text":"","why":""}]}`,
      input: `GOAL: ${s.goal}\nCAMPAIGN: ${s.campaign}\nBRANCH: ${s.branch}\n\nOWL (facts): solid: ${facts.solid.join(' | ') || 'none'} · uncertain: ${facts.uncertain.join(' | ') || 'none'}\nTEN (angle): taken: ${angle.taken.join(' | ') || 'none'} · open: ${angle.open || 'none'} · shareable: ${angle.shareable || '?'}\n\nTHE STORY (Mandi's words):\n${cut(s.raw, 8000)}` }))
  } catch (e) { patchStory(s.id, { status: 'failed' }); return failHandoff(h.id, `Cora couldn’t form it: ${e instanceof Error ? e.message : 'no answer'}`) }
  addIdeas('cora', out.ideas, `Cora, forming “${s.title}”`)

  if (!out.holds) {
    const why = cut(out.why || 'It doesn’t hold up yet.', 400)
    const n = createNote({ title: cut(`Story didn’t hold: ${s.title}`, 120), body: `${s.raw}\n\n— Cora: ${why}\nGoal it was sent for: ${s.goal}`, category: 'idea', source: 'rise', tags: ['story', 'killed', 'cora'], pinned: false })
    patchStory(s.id, { status: 'killed', kill_reason: why, note_id: n.id })
    return completeHandoff(h.id, 'cora', `Doesn’t hold up: ${why} Stored in Notes with the reason.`)
  }
  const form = s.branch === 'wfh' ? 'teleprompter' : out.form === 'teleprompter' ? 'teleprompter' : 'medium'
  const outline = { take: cut(out.take ?? '', 400), headline: cut(out.headline || out.title || s.title, 160), beats: asLines(out.beats, 8), emphasis: cut(out.emphasis ?? '', 300), form: form as 'medium' | 'teleprompter' }
  if (!outline.take || !outline.beats.length) { patchStory(s.id, { status: 'failed' }); return failHandoff(h.id, 'Cora came back without a take or beats. Retry.') }
  patchStory(s.id, { status: 'writing', outline, title: cut(out.title || s.title, 90) })
  completeHandoff(h.id, 'cora', `The story: ${outline.take} Emphasis: “${outline.emphasis}”. Outlined for ${form === 'medium' ? 'a Medium article' : 'the teleprompter'}; handed to Pod and told Cap so it gets a date.`)
  await startLongform({ type: 'story', id: s.id }, outline.headline, 'cora')
}

export function approveStory(id: string): Story | { error: string } {
  const s = (readDb().stories ?? []).find(x => x.id === id)
  if (!s) return { error: 'No such story.' }
  if (s.status !== 'ready') return { error: 'It isn’t ready for your approval yet.' }
  return patchStory(id, { status: 'approved', approved_at: nowIso() })!
}

export function killStory(id: string, reason: string): Story | { error: string } {
  const s = (readDb().stories ?? []).find(x => x.id === id)
  if (!s) return { error: 'No such story.' }
  const why = (reason ?? '').trim() || '(no reason given)'
  const n = createNote({ title: cut(`Story parked: ${s.title}`, 120), body: `${s.raw}\n\n— Mandi parked it: ${why}`, category: 'idea', source: 'rise', tags: ['story', 'killed'], pinned: false })
  return patchStory(id, { status: 'killed', kill_reason: why, note_id: n.id })!
}
