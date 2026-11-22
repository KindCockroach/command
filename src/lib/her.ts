// Her: the front door (SOP Her 1, Her 2, Her 6; Loop 12, acceptance scenario 1).
//
// Mandi says or types something. Her works out what she means, says it back, saves her words
// to Notes as they are, and hands it to the right place with a receipt:
//   Commander (an idea or a decision to shred), Cap (plainly about the plan or calendar),
//   the build log (a change to RISE), or nowhere (private, or a question Her can answer).
// The conversation is a thread. When Mandi comes back, Her reads what happened to every
// handoff in it (receipts, failures, Commander's questions) so she never has to repeat herself.
// Her never writes or edits a piece, never places anything on the map, never sends.

import { readDb, writeDb, createNote, addBuildLogEntry, branchOfAccount, type HerThread, type HerTurn, type Handoff, type HandoffRef } from './db'
import { fableText } from './fable'
import { openHandoff, startAttempt, completeHandoff, failHandoff, listHandoffs, AGENT_LABEL } from './handoffs'

const nowIso = () => new Date().toISOString()
const newId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function getThreads(limit = 20) {
  const db = readDb()
  return (db.her_threads ?? []).slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, limit)
    .map(t => ({ ...t, outcome: threadOutcome(t.id) }))
}
export function getThread(id: string) {
  const t = (readDb().her_threads ?? []).find(x => x.id === id)
  return t ? { ...t, outcome: threadOutcome(t.id) } : null
}

// What happened to everything handed off in this thread, newest last.
export function threadOutcome(threadId: string) {
  const hs = listHandoffs({ thread_id: threadId }).slice().reverse()
  return hs.map(h => ({ id: h.id, kind: h.kind, from: h.from, to: h.to, what: h.what ?? '', state: h.state, receipt: h.receipt ?? null, error: h.error ?? null, can_retry: h.can_retry, content_id: h.content_id, created_at: h.created_at, updated_at: h.updated_at, attempts: h.attempts ?? 0 }))
}

const STATE_WORDS: Record<string, string> = {
  open: 'WORKING on it right now', waiting: 'WAITING in that agent’s queue until the next plan (nobody is working on it yet)',
  stuck: 'STUCK (stopped partway; needs a retry)', done: 'DONE', failed: 'FAILED',
}
function outcomeText(threadId: string): string {
  const o = threadOutcome(threadId)
  if (!o.length) return '(nothing handed off yet)'
  return o.map(h => `- ${AGENT_LABEL[h.from]} → ${AGENT_LABEL[h.to]}: ${h.what} · ${STATE_WORDS[h.state] ?? h.state}${h.receipt ? ` · receipt: ${h.receipt}` : ''}${h.error ? ` · failed: ${h.error}` : ''}`).join('\n')
}

type HerRead = {
  reply: string
  kind: 'idea' | 'decision' | 'request' | 'status' | 'rise_change' | 'private' | 'answer'
  route: 'commander' | 'cap' | 'build_log' | 'none'
  what: string
  title?: string
  answers_question_id?: string | null
}

const HER_RULES = `You are Her, the one agent between Mandi and the rest of RISE. You think with her and route; you never write, edit or rewrite a piece, never put anything on the map or change a date, never send or publish.

Read what she just said, against the thread so far and what already happened to it. Decide:
- kind: "idea" (a thought worth using), "decision" (she decided something), "request" (she wants something done), "status" (she is asking what happened / where things stand), "rise_change" (an idea for changing the RISE app itself), "private" (a personal reflection or what she is going through, not for content), "answer" (she is answering one of the open questions listed).
- route: "commander" for ideas, decisions, requests and answers (he shreds them and hands each piece on); "cap" ONLY when it is plainly about the content plan, the calendar or a card's captions; "build_log" for rise_change; "none" for status and private.
- what: one plain line naming what is being handed over, in her terms. Never claim it is done.
- reply: 2 to 4 short sentences to her. For a decision, say it back in one sentence. Push back once when it helps: name the strongest reason it might fail, kindly and directly. Say where it is going ("Handing this to Commander."). For status, answer ONLY from the receipts listed; if something failed or is stuck, say so plainly. Never pretend something happened that the receipts don't show. Never ask her something the thread already answers.
- title: 3 to 6 words naming this thread (only if it is new).
- answers_question_id: the id of the open question she answered, if any.
Private context (her cycle, what she is going through) is never passed down the line; route "none".
Reply ONLY with JSON: {"reply":"","kind":"","route":"","what":"","title":"","answers_question_id":null}`

export async function herSay(input: { text: string; thread_id?: string | null; spoken?: boolean }): Promise<{ thread: ReturnType<typeof getThread>; handoff?: Handoff | null; note_id?: number | null } | { error: string }> {
  const text = (input.text ?? '').trim().slice(0, 6000)
  if (!text) return { error: 'Say or type something first.' }
  let db = readDb()
  db.her_threads ??= []
  let t: HerThread | undefined = input.thread_id ? db.her_threads.find(x => x.id === input.thread_id) : undefined
  if (input.thread_id && !t) return { error: 'That conversation isn’t in RISE any more.' }
  const now = nowIso()
  if (!t) { t = { id: newId('her'), title: text.slice(0, 50), turns: [], questions: [], status: 'open', created_at: now, updated_at: now }; db.her_threads.push(t) }
  const turn: HerTurn = { role: 'mandi', text, at: now, ...(input.spoken ? { spoken: true } : {}) }
  t.turns.push(turn); t.updated_at = now
  writeDb(db)
  const threadId = t.id

  const goals = (db.goals ?? []).filter(g => g.active).slice(0, 8).map(g => `- ${g.title}`).join('\n')
  const history = t.turns.slice(-12, -1).map(x => `${x.role === 'mandi' ? 'MANDI' : 'HER'}: ${x.text.slice(0, 700)}`).join('\n')
  const openQs = t.questions.filter(q => !q.answered).map(q => `- [${q.id}] from ${AGENT_LABEL[q.from]}: ${q.text}`).join('\n')
  const ctx = `ACTIVE GOALS:\n${goals || '(none)'}\n\nTHE THREAD SO FAR:\n${history || '(new conversation)'}\n\nWHAT HAPPENED TO WHAT SHE HANDED OVER (live receipts):\n${outcomeText(threadId)}\n\nOPEN QUESTIONS FOR HER:\n${openQs || '(none)'}\n\nWHAT SHE JUST SAID${input.spoken ? ' (spoken, transcribed)' : ''}:\n${text}`

  let read: HerRead
  try {
    read = JSON.parse(await fableText({ instructions: HER_RULES, input: ctx, json: true, maxTokens: 500 })) as HerRead
  } catch (e) {
    // Her's words are already saved on the thread; say plainly that routing didn't happen.
    db = readDb(); const tt = db.her_threads!.find(x => x.id === threadId)!
    tt.turns.push({ role: 'her', text: `I saved what you said, but I couldn’t think it through just now (${e instanceof Error ? e.message : 'no answer'}). Nothing was handed on. Send it again when you’re ready.`, at: nowIso() })
    writeDb(db)
    return { thread: getThread(threadId) }
  }
  const route = (['commander', 'cap', 'build_log', 'none'] as const).includes(read.route) ? read.route : 'commander'
  const what = (read.what || text).trim().slice(0, 200)

  // Her 2: save her words as they are (not for status questions).
  let noteId: number | null = null
  if (read.kind !== 'status') {
    const cat = read.kind === 'decision' ? 'decision' : read.kind === 'private' ? 'reflection' : 'idea'
    noteId = createNote({ title: `Her · ${what}`.slice(0, 120), body: text, category: cat, source: 'mine', tags: ['her', ...(input.spoken ? ['spoken'] : [])], pinned: false }).id
  }

  let handoff: Handoff | null = null
  const ref: HandoffRef | null = noteId ? { type: 'note', id: noteId } : null
  if (route === 'commander') {
    handoff = openHandoff({ kind: 'her_note', from: 'her', to: 'commander', what, ref, thread_id: threadId, note: text })
  } else if (route === 'cap') {
    handoff = openHandoff({ kind: 'piece', from: 'her', to: 'cap', what, ref, thread_id: threadId, note: text })
  } else if (route === 'build_log') {
    handoff = openHandoff({ kind: 'piece', from: 'her', to: 'build_log', what, ref, thread_id: threadId, note: text })
    const e = addBuildLogEntry({ title: what, detail: text.slice(0, 1000), status: 'todo', source: 'rise' })
    handoff = completeHandoff(handoff.id, 'her', `Logged as a to-do for the next build session: “${e.title}”.`, [{ type: 'build_log', id: e.id }])
  }

  db = readDb()
  const tt = db.her_threads!.find(x => x.id === threadId)!
  if (read.title && tt.turns.length <= 2) tt.title = read.title.slice(0, 60)
  if (read.answers_question_id) { const q = tt.questions.find(x => x.id === read.answers_question_id); if (q) q.answered = true }
  const last = tt.turns[tt.turns.length - 1]; if (last.role === 'mandi') last.note_id = noteId
  tt.turns.push({ role: 'her', text: (read.reply || 'Got it.').slice(0, 1500), at: nowIso(), handoff_ids: handoff ? [handoff.id] : [] })
  tt.updated_at = nowIso()
  writeDb(db)
  return { thread: getThread(threadId), handoff, note_id: noteId }
}

// ── Commander 1 · Read a note three ways, shred it, hand each piece on ──
type Piece = { to: 'cap' | 'biz' | 'notes' | 'her'; text: string; why: string; from_line: string; reading: 'said' | 'between_lines' | 'meta' }

const COMMANDER_RULES = `You are Commander. Her handed you something Mandi said, as it is. Read it three ways: what it says outright; what is between the lines; and what it means against her goals, her accounts and the map. Then shred it into every usable piece (often 1 to 4) and decide where each goes:
- "cap": anything about content, posts, captions, the plan, the calendar or an account.
- "biz": business priorities, offers, prices, launches, money.
- "notes": not worth acting on now; it is stored with the reason (never deleted).
- "her": something only Mandi can answer; write it as one short question to her.
For each piece give: text (what the piece IS, in one line), why (one line), from_line (the exact words of hers it came from), reading ("said", "between_lines" or "meta"; anything not said outright is YOUR reading, never presented as her words).
You never write the piece and never decide if or when it runs; that is Cap's or Biz's call. Keep the branches separate: Joyful Media (mindfulness: the Reset, @mandijoybeck) and WFH (the AI Mom podcast; AI services are paused). Never invent a fact.
Reply ONLY with JSON: {"pieces":[{"to":"","text":"","why":"","from_line":"","reading":""}],"summary":"one line: what the note became"}`

export async function runCommanderPickup(h: Handoff) {
  startAttempt(h.id)
  const db = readDb()
  const words = h.note ?? (h.ref?.type === 'note' ? db.notes.find(n => n.id === Number(h.ref!.id))?.body : '') ?? ''
  if (!words.trim()) return failHandoff(h.id, 'The note Her handed over is empty or missing.')
  const accounts = db.brand_accounts.filter(a => a.status === 'active').map(a => `- ${a.handle} (${branchOfAccount(a) ?? 'no branch'})`).join('\n')
  const goals = (db.goals ?? []).filter(g => g.active).slice(0, 8).map(g => `- ${g.title}`).join('\n')
  const products = (db.products ?? []).slice(0, 12).map(p => `- ${p.name} (${p.status})`).join('\n')
  let out: { pieces?: Piece[]; summary?: string }
  try {
    out = JSON.parse(await fableText({ instructions: COMMANDER_RULES, input: `GOALS:\n${goals}\n\nACCOUNTS:\n${accounts}\n\nPRODUCTS:\n${products}\n\nWHAT MANDI SAID (via Her):\n${words.slice(0, 5000)}`, json: true, maxTokens: 1200 }))
  } catch (e) {
    return failHandoff(h.id, `Commander couldn’t read it: ${e instanceof Error ? e.message : 'no answer'}`)
  }
  const pieces = (out.pieces ?? []).filter(p => p && p.text && ['cap', 'biz', 'notes', 'her'].includes(p.to)).slice(0, 8)
  if (!pieces.length) return failHandoff(h.id, 'Commander came back with no pieces. Retry, or say it another way.')

  const refs: HandoffRef[] = []
  const counts: Record<string, number> = {}
  for (const p of pieces) {
    counts[p.to] = (counts[p.to] ?? 0) + 1
    const label = p.reading === 'said' ? '' : ' (Commander’s reading)'
    if (p.to === 'cap' || p.to === 'biz') {
      const child = openHandoff({ kind: 'piece', from: 'commander', to: p.to, what: `${p.text}${label}`, parent_id: h.id, thread_id: h.thread_id, ref: h.ref, note: `Her words: “${p.from_line}”\nWhy: ${p.why}` })
      refs.push({ type: 'note', id: child.id, label: child.what })
    } else if (p.to === 'notes') {
      const n = createNote({ title: `Parked: ${p.text}`.slice(0, 120), body: `Her words: “${p.from_line}”\nWhy parked: ${p.why}\n(Commander, from a note Her handed over.)`, category: 'idea', source: 'rise', tags: ['parked', 'commander'], pinned: false })
      refs.push({ type: 'note', id: n.id, label: n.title })
    } else if (p.to === 'her' && h.thread_id) {
      const d = readDb(); const t = d.her_threads?.find(x => x.id === h.thread_id)
      if (t) { t.questions.push({ id: newId('q'), text: p.text, from: 'commander', handoff_id: h.id }); t.updated_at = nowIso(); writeDb(d) }
    }
  }
  const parts = [counts.cap && `${counts.cap} for Cap`, counts.biz && `${counts.biz} for Biz`, counts.notes && `${counts.notes} parked in Notes`, counts.her && `${counts.her} question${counts.her > 1 ? 's' : ''} for you`].filter(Boolean)
  return completeHandoff(h.id, 'commander', `Became ${pieces.length} piece${pieces.length > 1 ? 's' : ''}: ${parts.join(', ')}. ${out.summary ?? ''}`.trim(), refs)
}
