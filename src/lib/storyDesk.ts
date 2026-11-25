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

import { readDb, writeDb, createNote, type BranchId, type Handoff, type Story, type StoryPitch } from './db'
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

// ── Cora finds stories in the Well (her 697 captions) ────────────────────────
// Mandi asked: "look at my captions and find a story: what's compelling, based on everything
// I've done, who I am and what I'm working on". Two passes so every caption is actually read:
//   1. Seeds, year by year: moments, turns and recurring truths, with her exact words + dates.
//   2. Cora picks the 6–8 strongest stories against who she is now and what she's building,
//      with 3 clickable headlines each. Ed's guardrail check runs on each pitch.
// Pitches wait in Approve. "Write this one" sends it through the Story desk; "Pass" → Notes.

export const HEADLINE_RULES = `HEADLINES: clickable, specific, and hers. A stranger stops scrolling. Each one carries a concrete detail or a tension only her story has (a place, an object, a number she lived, a line someone said, a contradiction). Never generic: no "journey", "unlock", "embrace", "navigating", "the power of", "lessons I learned", "how I found", "a guide to", "transform your", "secret", no colon-plus-subtitle filler, no questions that a yes/no answers. Under 14 words. No colons. Every detail in a headline must come from HER lines; never invent a place, age, job or event she didn't write. Never a real person's name, never a child's name.
GOOD (the bar): "I Sat in a Costco Parking Lot for Eleven Minutes Because I Couldn't Walk In" · "My Son Has Four Moms and None of Us Are Competing" · "I Quit the Party Scene at 27 and Spent a Decade Finding Out Who Was Left". BAD: "Finding Peace Through Mindfulness" · "Redefining My Narrative" · anything that could top a stranger's blog.`
export const BANNED_HEAD = /\b(journey|unlock|embrac|navigat|the power of|lessons i learned|how i found|a guide to|transform your|game[- ]?changer|secret to|finding (myself|peace|deeper|lightness|my)|redefin|beyond|paradox|authenticity|self-discovery|transformation)\b|:/i

export function getPitches() { return (readDb().story_pitches ?? []).slice().reverse() }

export function openFindStories(): Handoff {
  return openHandoff({ kind: 'story_find', from: 'mandi', to: 'cora', what: 'Read my captions (the Well) and pitch me the stories in them' })
}

export async function runFindStories(h: Handoff) {
  startAttempt(h.id)
  const { readWell } = await import('./well')
  const well = readWell()
  if (well.length < 50) return failHandoff(h.id, 'The Well isn’t loaded here, so Cora has no captions to read.')
  const year = (d: string) => (d.match(/\b(20\d\d)\b/) ?? [])[1] ?? 'undated'
  const byYear = new Map<string, typeof well>()
  for (const l of well) byYear.set(year(l.date), [...(byYear.get(year(l.date)) ?? []), l])
  // Group into chunks of roughly 120 captions, keeping years together.
  const chunks: { label: string; lines: typeof well }[] = []
  for (const [y, lines] of [...byYear.entries()].sort()) {
    for (let i = 0; i < lines.length; i += 120) chunks.push({ label: `${y}${lines.length > 120 ? ` (${i / 120 + 1})` : ''}`, lines: lines.slice(i, i + 120) })
  }

  // Pass 1: seeds (saved, so a rerun within 7 days skips straight to pass 2).
  const cached = readDb().story_seeds
  const seeds: string[] = cached && Date.now() - Date.parse(cached.at) < 7 * 86400000 && cached.count === well.length ? [...cached.seeds] : []
  for (const c of seeds.length ? [] : chunks) {
    try {
      const out = JSON.parse(extractJsonObject(await fableText({ json: true, maxTokens: 1800,
        instructions: `You are Cora, the journalist on Mandi's Story desk, reading her own Instagram captions from ${c.label}. Find the story seeds: real moments, turns, confessions, recurring truths, contradictions, things she did that most people wouldn't. For each, quote HER exact words (short) with the date. Skip generic inspiration. Never use a child's name or a real person's name in your summary. Up to 8. Reply ONLY with JSON: {"seeds":[{"seed":"one plain line","quote":"her exact words","date":""}]}`,
        input: c.lines.map(l => `[${l.date}] ${cut(l.cap, 600)}`).join('\n\n') })) ) as { seeds?: { seed: string; quote: string; date: string }[] }
      for (const s of (out.seeds ?? []).slice(0, 8)) if (s?.seed) seeds.push(`(${s.date}) ${cut(s.seed, 200)} | “${cut(s.quote ?? '', 220)}”`)
    } catch { /* one chunk failing doesn't stop the read */ }
  }
  if (seeds.length < 6) return failHandoff(h.id, `Cora only found ${seeds.length} seeds; retry.`)
  if (!cached || cached.seeds.join() !== seeds.join()) { const dz = readDb(); dz.story_seeds = { at: nowIso(), count: well.length, seeds }; writeDb(dz) }

  // Who she is now and what she's building (from the Brain and the map), for pass 2.
  const db = readDb()
  const { RETIRED } = await import('./health')
  const who = db.memories.filter(m => m.category !== 'voice_archive' && /(intuition|thesis|mission|purpose|identity|backstory|persona|who)/i.test(`${m.title} ${m.body}`) && !RETIRED.some(r => r.re.test(`${m.title} ${m.body}`))).slice(-6).map(m => `- ${cut(m.title, 80)}: ${cut(m.body, 240)}`).join('\n')
  const goals = (db.goals ?? []).filter(g => g.active).slice(0, 8).map(g => `- ${g.title}`).join('\n')

  let out: { stories?: { title: string; take: string; why_now: string; branch: string; form: string; headlines: string[]; her_lines: { date: string; line: string }[]; holds_because: string }[] }
  try {
    out = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 6000,
      instructions: `You are Cora, the journalist on Mandi's Story desk. You've read every caption she has posted since 2015 (the seeds below). Find the 6 to 8 most compelling stories in her life and work: the takes ONLY she has, given who she is now and what she's building. Some can braid seeds across years (a thread that runs from 2016 to now). A story holds when there's a turn, a stranger would care, and it's hers to tell (not a child's or a family member's private moment).
For each: title (plain working name); take (one sentence: what the story IS); why_now (why it matters given what she's building now); branch ("joyful_media" for mindfulness/inner life/motherhood; "wfh" only if it's about AI or building with AI; Medium belongs to Joyful Media); form ("medium" or "teleprompter"); headlines (exactly 3); her_lines (2–4 of her exact quotes with dates, from the seeds); holds_because (one line).
${HEADLINE_RULES}
Reply ONLY with JSON: {"stories":[{"title":"","take":"","why_now":"","branch":"","form":"","headlines":["","",""],"her_lines":[{"date":"","line":""}],"holds_because":""}]}`,
      input: `(Background only, NOT her words: never quote it as her_lines; her_lines come ONLY from the seeds.)\nWHO SHE IS AND WHAT SHE'S BUILDING:\n${who || '(see the seeds)'}\n\nGOALS ON THE MAP:\n${goals || '(none listed)'}\n\nSTORY SEEDS FROM ${well.length} CAPTIONS:\n${seeds.join('\n')}` })))
  } catch (e) { return failHandoff(h.id, `Cora couldn’t pick the stories: ${e instanceof Error ? e.message : 'no answer'}`) }

  const { edCheck } = await import('./longform')
  const now = nowIso()
  const made: StoryPitch[] = []
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const corpus = norm(well.map(l => l.cap).join(' \n '))
  const isHers = (line: string) => { const n = norm(line); return n.length >= 12 && corpus.includes(n.slice(0, Math.min(60, n.length))) }
  for (const s of (out.stories ?? []).slice(0, 8)) {
    // Her lines must really be hers (in a caption), not a RISE note or Cora's paraphrase.
    s.her_lines = (s.her_lines ?? []).filter(l => isHers(String(l.line ?? '')))
    if (!s.her_lines.length) continue
    let headlines = asLines(s.headlines, 3, 160)
    // One punch-up pass when the headlines lean generic.
    if (headlines.filter(x => BANNED_HEAD.test(x)).length >= 2) {
      try {
        const fix = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 600, instructions: `You are Cora. Rewrite these headlines so a stranger stops scrolling. Use a concrete detail from HER lines.\n${HEADLINE_RULES}\nReply ONLY with JSON: {"headlines":["","",""]}`, input: `THE STORY: ${s.take}\nHER LINES:\n${s.her_lines.map(l => `"${l.line}" (${l.date})`).join('\n')}\nTOO GENERIC:\n${headlines.join('\n')}` })))
        const better = asLines(fix.headlines, 3, 160)
        if (better.length >= 2) headlines = better
      } catch { /* keep the first set, flagged */ }
    }
    if (!s?.take || headlines.length < 2) continue
    const branch: BranchId = s.branch === 'wfh' ? 'wfh' : 'joyful_media'
    const risks: string[] = []
    const generic = headlines.filter(x => BANNED_HEAD.test(x))
    if (generic.length) risks.push(`${generic.length} headline${generic.length > 1 ? 's' : ''} lean generic (“${cut(generic[0], 60)}”)`)
    const v = await edCheck(`${headlines.join('\n')}\n${s.take}\n${(s.her_lines ?? []).map(l => l.line).join('\n')}`, { branch, kind: 'medium', mandiText: (s.her_lines ?? []).map(l => l.line).join('\n'), round: 1 })
    risks.push(...v.reasons.filter(r => !/^Money or result numbers/.test(r)).slice(0, 3))
    made.push({ id: `sp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title: cut(s.title || headlines[0], 120), take: cut(s.take, 400), why_now: cut(s.why_now ?? '', 300), branch, form: s.form === 'teleprompter' || branch === 'wfh' ? 'teleprompter' : 'medium', headlines, her_lines: (s.her_lines ?? []).slice(0, 4).map(l => ({ date: cut(String(l.date ?? ''), 40), line: cut(String(l.line ?? ''), 300) })), holds_because: cut(s.holds_because ?? '', 300), risks, status: 'proposed', handoff_id: h.id, created_at: now, updated_at: now })
  }
  if (!made.length) return failHandoff(h.id, 'Cora came back without usable stories. Retry.')
  const d = readDb(); d.story_pitches = [...(d.story_pitches ?? []), ...made]; writeDb(d)
  return completeHandoff(h.id, 'cora', `Read ${well.length} captions (${chunks.length} passes, ${seeds.length} seeds) and pitched ${made.length} stories: ${made.map(m => `“${m.headlines[0]}”`).join(' · ')}. They wait in Approve.`)
}

// Mandi picks a pitch → it goes through the Story desk (Owl, Ten, Cora's outline, Pod, Ed).
export function pickPitch(id: string, headline?: string, goal?: string): { story: Story; handoff: Handoff } | { error: string } {
  const db = readDb()
  const p = (db.story_pitches ?? []).find(x => x.id === id)
  if (!p) return { error: 'No such pitch.' }
  if (p.status !== 'proposed') return { error: 'You already answered this one.' }
  const head = headline?.trim() || p.headlines[0]
  const text = `${p.take}\n\nHer own words:\n${p.her_lines.map(l => `“${l.line}” (${l.date})`).join('\n')}${p.interview_lines?.length ? `\n\nWhat she said in Cora’s interview:\n${p.interview_lines.map(l => `“${l}”`).join('\n')}` : ''}${p.reader ? `\n\nThe reader: ${p.reader}` : ''}${p.opening ? `\nOpening line (her words): ${p.opening}` : ''}${p.beats?.length ? `\nBeats: ${p.beats.join(' → ')}` : ''}\n\nWhy now: ${p.why_now}\nThe headline she picked: ${head}\nThis is lived experience for a reader who is struggling, not advice or treatment.`
  const r = sendStory({ text, title: head, goal: goal?.trim() || (p.branch === 'wfh' ? 'The AI Mom podcast' : 'Medium: Joyful Media long-form'), campaign: 'Cora’s pick from the Well', branch: p.branch, parent_id: 'pitch' })
  if ('error' in r) return r
  const d2 = readDb(); const x = d2.story_pitches!.find(y => y.id === id)!
  Object.assign(x, { status: 'picked', picked_headline: head, story_id: r.story.id, updated_at: nowIso() }); writeDb(d2)
  return r
}

export function passPitch(id: string, reason: string): StoryPitch | { error: string } {
  const db = readDb()
  const p = (db.story_pitches ?? []).find(x => x.id === id)
  if (!p) return { error: 'No such pitch.' }
  const why = (reason ?? '').trim() || '(no reason given)'
  const n = createNote({ title: cut(`Passed: Cora’s story · ${p.headlines[0]}`, 120), body: `${p.take}\nHeadlines: ${p.headlines.join(' | ')}\nMandi passed: ${why}`, category: 'idea', source: 'rise', tags: ['story', 'killed', 'cora'], pinned: false })
  const d2 = readDb(); const x = d2.story_pitches!.find(y => y.id === id)!
  Object.assign(x, { status: 'passed', reason: why, note_id: n.id, updated_at: nowIso() }); writeDb(d2)
  return x
}
