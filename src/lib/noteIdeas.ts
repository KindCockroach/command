// Phase 8 A7 · the Notes sweep (Mandi, Nov 26: "look through all of my notes to find quotes,
// lines, and skits that I've dropped ideas on over the last several weeks to months").
//
// Cap reads her Notes and banks what's usable, in HER exact words, labeled "Note #N":
//   QUOTE  a line that stands alone (an image, a carousel)
//   LINE   a hook or caption line
//   SKIT   a character / role-play / humor bit she could film
// One backfill reads every note once (she okays the cost first). After that, the daily run reads
// only new or edited notes. A note Cap has read is never read again unless she edits it.
// Then Cap picks the best few ("BITCH, ME TOO!") → ONE item in Approve. On her yes they become
// cards: quotes/lines → quote cards Cap's calendar slots pick up; skits → Content Day film cards.
// Everything else stays in the bank, and Ed draws on it when he fills a quote slot.

import {
  readDb, writeDb, createContent, getAllBrandAccounts, branchOfAccount, logActivity,
  type Db, type Handoff, type Note, type NoteIdea, type NoteIdeaKind, type NoteIdeaStore, type QuoteFormat,
} from './db'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'
import { fableText, WRITER_CLAUDE } from './fable'
import { estimateCost, BudgetError } from './spendCap'
import { cut, extractJsonObject } from './jsonkit'
import { ensureRoster, matchCharacter, setCardCharacters } from './characters'
import { QUOTE_RULES, FORMAT_LABEL, quoteLabel, isHerWords, normWords, pointsAtRealPerson, softenLine } from './quotes'
import { PROTECT_PEOPLE } from './craft'

const nowIso = () => new Date().toISOString()

// What Cap doesn't read: research and trend byproducts, transcripts, kits, finished long-form,
// the killed/parked pile (Her's), build history, and the Format Finder library (notes 228–304).
const SKIP_TAGS = ['trends-source', 'river-research', 'transcript', 'episode-kit', 'deliverables', 'medium', 'newsletter', 'killed', 'parked', 'build-history', 'substack-source', 'her', 'format-finder']
const FORMAT_FINDER = (id: number) => id >= 228 && id <= 304
const RETIRED_TOPIC = /\broom\s?30\b|\bgo\s?high\s?level\b|\bGHL\b|\bcaption writer\b|\brise lite\b|\bheygen\b/i
const MAX_NOTE_CHARS = 2500
const BATCH_CHARS = 9000
const OUT_TOKENS = 2500
const DAILY_MAX_BATCHES = 3       // the daily run stays small; anything left waits for tomorrow
const PICKS = 8

function store(db: Db): NoteIdeaStore {
  db.note_ideas ??= { ideas: [], mined: {} }
  db.note_ideas.ideas ??= []
  db.note_ideas.mined ??= {}
  return db.note_ideas
}

/** Her notes that can hold a quote, a line or a skit. Mostly hers; RISE's own notes only when they carry her words (an interview). */
export function mineableNotes(db: Db = readDb()): Note[] {
  return (db.notes ?? []).filter(n => !n.archived
    && ((n.source ?? 'mine') === 'mine' || (n.tags ?? []).includes('interview'))
    && !FORMAT_FINDER(n.id)
    && !(n.tags ?? []).some(t => SKIP_TAGS.includes(t))
    && (n.body ?? '').trim().length >= 15
    && !RETIRED_TOPIC.test(`${n.title} ${(n.body ?? '').slice(0, 2000)}`))
}

export function unminedNotes(db: Db = readDb()): Note[] {
  const mined = store(db).mined
  return mineableNotes(db).filter(n => mined[String(n.id)] !== n.updated_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))   // oldest first: the backlog she asked about
}

const noteText = (n: Note) => `[Note #${n.id}] ${cut(n.title, 120)} (${n.created_at.slice(0, 10)})\n${cut(n.body, MAX_NOTE_CHARS)}`

function batches(notes: Note[]): Note[][] {
  const out: Note[][] = []
  let cur: Note[] = [], size = 0
  for (const n of notes) {
    const len = noteText(n).length
    if (cur.length && size + len > BATCH_CHARS) { out.push(cur); cur = []; size = 0 }
    cur.push(n); size += len
  }
  if (cur.length) out.push(cur)
  return out
}

function accountsBlock(): { text: string; ids: Set<string> } {
  const accts = getAllBrandAccounts().filter(a => a.status !== 'paused' &&!['aimomatwork', 'sage'].includes(a.id))
  return {
    ids: new Set(accts.map(a => a.id)),
    text: accts.map(a => `- ${a.id} (${a.handle}; ${branchOfAccount(a) === 'wfh' ? 'AI Mom' : 'Joyful Media'}): ${cut(a.topic ?? '', 90)}`).join('\n'),
  }
}

const INSTRUCTIONS_LEN = 2600   // rough size of the extraction prompt, for the estimate

/** What the backfill will cost before it runs (shown to Mandi as one Go?). */
export function estimateBackfill(db: Db = readDb()): { notes: number; batches: number; usd: number } {
  const bs = batches(unminedNotes(db))
  const usd = bs.reduce((s, b) => s + estimateCost(WRITER_CLAUDE, INSTRUCTIONS_LEN + b.reduce((n, x) => n + noteText(x).length, 0), OUT_TOKENS), 0)
    + estimateCost(WRITER_CLAUDE, 12000, 2000)   // Cap's pick at the end
  return { notes: bs.reduce((n, b) => n + b.length, 0), batches: bs.length, usd: Math.round(usd * 100) / 100 }
}

type Find = { note_id?: number; kind?: string; text?: string; account?: string; why?: string; careful?: string; characters?: string[] }

async function mineBatch(notes: Note[]): Promise<NoteIdea[]> {
  const db = readDb()
  const { text: acctText, ids } = accountsBlock()
  const roster = ensureRoster(db).map(c => c.name).join(', ')
  const raw = await fableText({ json: true, useClaude: true, maxTokens: OUT_TOKENS,
    instructions: `You are Cap, the campaign boss, reading Mandi Beck's own notes for ideas she dropped and never used. Pull out ONLY what she could post, in HER EXACT WORDS copied from the note (you may cut to the part that lands; never reword, never add, never write new lines).
Three kinds:
- "quote": a line that stands on its own on an image or a carousel slide (a truth, a gratitude, a funny-true observation).
- "line": a hook or caption line (opens a gap, makes her want the rest).
- "skit": a character / role-play / humor bit she could film (who she plays, the setup, the turn). Copy her description of it as written. "characters": who she'd play, from this roster where it fits: ${roster}.
SKIP: to-do lists, plans, business notes, research, prompts for AI, anything about retired things (Room30, GHL, Caption Writer, avatars), and anything that doesn't clear this bar:
${QUOTE_RULES}
GUARDRAIL: ${PROTECT_PEOPLE.trim().split('\n').slice(1, 3).join(' ')} If a find names, blames or exposes a real person, still bank it but say how in "careful" (one short line). Otherwise "careful": "".
"account": the one account it fits best, by id, from:
${acctText}
Keep the two companies apart: Joyful Media (mindfulness, belonging, intuition, the Reset) and AI Mom (AI, tech, the podcast). Never put one company's idea on the other's account.
"why": one short line, why it's usable.
Most notes hold nothing usable. That's fine: return only real finds. Reply ONLY with JSON: {"finds":[{"note_id":0,"kind":"quote","text":"","account":"","why":"","careful":"","characters":[]}]}`,
    input: notes.map(noteText).join('\n\n---\n\n') })
  let finds: Find[] = []
  try { finds = (JSON.parse(extractJsonObject(raw)) as { finds?: Find[] }).finds ?? [] } catch { finds = [] }

  const byId = new Map(notes.map(n => [n.id, n]))
  const s = store(db)
  const seen = new Set(s.ideas.map(i => normWords(i.text)))
  const accts = new Map(getAllBrandAccounts().map(a => [a.id, a]))
  const now = nowIso()
  const added: NoteIdea[] = []
  for (const f of finds) {
    const note = byId.get(Number(f.note_id))
    const kind = (['quote', 'line', 'skit'] as const).find(k => k === f.kind)
    const text = (f.text ?? '').trim()
    if (!note || !kind || text.length < 8) continue
    // Her words only: anything Cap reworded is dropped, never banked as hers.
    if (!isHerWords(text, `${note.title}\n${note.body}`)) continue
    const k = normWords(text)
    if (seen.has(k)) continue
    seen.add(k)
    const account_id = f.account && ids.has(f.account) ? f.account : null
    const careful = (f.careful ?? '').trim() || (pointsAtRealPerson(text) ? 'Points at a real person in your life.' : '')
    added.push({
      id: `ni_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      kind, text: cut(text, kind === 'skit' ? 1500 : 400), note_id: note.id, note_title: cut(note.title, 120),
      account_id, branch: account_id ? branchOfAccount(accts.get(account_id)) : null,
      why: cut(f.why ?? '', 200) || undefined, careful: careful || null,
      characters: kind === 'skit' ? (f.characters ?? []).map(String).filter(Boolean).slice(0, 4) : undefined,
      status: 'banked', created_at: now, updated_at: now,
    })
  }
  for (const n of notes) s.mined[String(n.id)] = n.updated_at
  s.ideas.push(...added)
  writeDb(db)
  return added
}

export function openNotesMine(mode: 'backfill' | 'daily'): Handoff {
  const total = unminedNotes().length
  const h = openHandoff({ kind: 'notes_mine', from: 'cap', to: 'cap', what: mode === 'backfill' ? `Read all ${total} notes for quotes, lines and skits` : 'Read new notes for quotes, lines and skits', note: mode })
  if (mode === 'backfill') {
    const db = readDb()   // read AFTER openHandoff wrote, so the handoff isn't overwritten
    const s = store(db)
    s.backfill = { status: 'running', started_at: nowIso(), finished_at: null, notes_total: total, notes_read: 0, found: 0, error: null, handoff_id: h.id }
    writeDb(db)
  }
  return h
}

export async function runNotesMine(h: Handoff) {
  startAttempt(h.id)
  const mode = h.note === 'backfill' ? 'backfill' : 'daily'
  const all = batches(unminedNotes())
  const todo = mode === 'daily' ? all.slice(0, DAILY_MAX_BATCHES) : all
  let read = 0, found = 0, stopped: string | null = null
  for (const b of todo) {
    try {
      const added = await mineBatch(b)
      read += b.length; found += added.length
    } catch (e) {
      stopped = e instanceof BudgetError ? e.message.replace(/^💸 RISE budget:\s*/, '') : e instanceof Error ? e.message : 'no answer'
      // A batch that failed for any reason other than the budget is skipped (marked read) so one bad note never blocks the rest.
      if (!(e instanceof BudgetError)) { const db = readDb(); for (const n of b) store(db).mined[String(n.id)] = n.updated_at; writeDb(db); read += b.length; stopped = null; continue }
      break
    }
    if (mode === 'backfill') {
      const db = readDb(); const s = store(db)
      if (s.backfill) { s.backfill.notes_read = read; s.backfill.found = found }
      writeDb(db)
    }
  }

  const db = readDb(); const s = store(db)
  if (mode === 'backfill' && s.backfill) {
    s.backfill = { ...s.backfill, status: stopped ? 'failed' : 'done', finished_at: nowIso(), notes_read: read, found, error: stopped }
  } else s.last_daily = nowIso()
  writeDb(db)

  // Cap picks the best ones for Approve: after the backfill, or when the daily run found a few.
  let picked = 0
  if (!stopped && (mode === 'backfill' || found >= 3) && s.review?.status !== 'proposed') {
    try { picked = (await proposePicks()).length } catch { /* the bank keeps them; the next run picks */ }
  }
  const left = unminedNotes().length
  const receipt = `Read ${read} notes: banked ${found} (${countKinds(s.ideas.slice(-found))}).${picked ? ` Picked ${picked} for you in Approve.` : ''}${left ? ` ${left} notes left${mode === 'daily' ? ' for the next runs' : ''}.` : ''}${stopped ? ` Stopped: ${stopped}` : ''}`
  if (found || mode === 'backfill') logActivity({ type: 'note', title: mode === 'backfill' ? 'Cap read your notes for quotes, lines and skits' : 'Cap checked your new notes', detail: receipt, icon: '📝', source: 'notes-ideas' })
  if (stopped && !read) return failHandoff(h.id, stopped)
  return completeHandoff(h.id, 'cap', receipt, [])
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
export const kindsText = (c: Record<NoteIdeaKind, number>) => `${plural(c.quote, 'quote')}, ${plural(c.line, 'line')} and ${plural(c.skit, 'skit')}`
function countKinds(ideas: NoteIdea[]): string {
  const c = { quote: 0, line: 0, skit: 0 } as Record<NoteIdeaKind, number>
  for (const i of ideas) c[i.kind]++
  return kindsText(c)
}

// ── Cap picks the best few → one Approve item ─────────────────────────────────
type Pick = { id?: string; account?: string; format?: string; why?: string }

export async function proposePicks(): Promise<NoteIdea[]> {
  const db = readDb()
  const s = store(db)
  const banked = s.ideas.filter(i => i.status === 'banked').slice(-80)
  if (!banked.length) return []
  const { text: acctText, ids } = accountsBlock()
  const lastNo = s.review?.status === 'declined' && s.review.reason ? `Last time Mandi said no to the picks. Her reason (follow it): ${s.review.reason}\n` : ''
  const raw = await fableText({ json: true, useClaude: true, maxTokens: 2000,
    instructions: `You are Cap. These are Mandi's own ideas, found in her notes. Pick the best ${PICKS} to turn into posts first. The bar: the reader says "BITCH, ME TOO!" (funny-true, specific, original). Mix the kinds when the bank allows (quotes, lines, skits). Prefer ideas without a "careful" flag; a careful one gets softened by Ed first.
For each pick: the account (by id, keep the two companies apart) and the format: "still" (her photo + her words), "carousel", "broll_overlay" (b-roll with the words over it) or "film" (skits are always "film"). "why": one short line for Mandi.
Accounts:\n${acctText}\n${lastNo}Reply ONLY with JSON: {"picks":[{"id":"","account":"","format":"","why":""}]}`,
    input: banked.map(i => `[${i.id}] ${i.kind.toUpperCase()}${i.account_id ? ` · ${i.account_id}` : ''}${i.careful ? ` · careful: ${i.careful}` : ''}\n${cut(i.text, 500)}`).join('\n\n') })
  let picks: Pick[] = []
  try { picks = (JSON.parse(extractJsonObject(raw)) as { picks?: Pick[] }).picks ?? [] } catch { picks = [] }

  const db2 = readDb(); const s2 = store(db2)
  const accts = new Map(getAllBrandAccounts().map(a => [a.id, a]))
  const chosen: NoteIdea[] = []
  for (const p of picks) {
    const idea = s2.ideas.find(i => i.id === p.id && i.status === 'banked')
    if (!idea || chosen.includes(idea)) continue
    const acct = p.account && ids.has(p.account) ? p.account : idea.account_id
    // Never across companies: a pick moved to the other company's account keeps its own.
    if (acct && idea.branch && branchOfAccount(accts.get(acct)) !== idea.branch) { /* keep idea.account_id */ } else if (acct) { idea.account_id = acct; idea.branch = branchOfAccount(accts.get(acct)) }
    idea.format = idea.kind === 'skit' ? 'film' : (['still', 'carousel', 'broll_overlay'] as QuoteFormat[]).find(f => f === p.format) ?? 'still'
    idea.pick_why = cut(p.why ?? '', 200) || null
    idea.status = 'picked'; idea.updated_at = nowIso()
    chosen.push(idea)
    if (chosen.length >= PICKS) break
  }
  if (!chosen.length) { writeDb(db2); return [] }
  const counts = { quote: 0, line: 0, skit: 0 } as Record<NoteIdeaKind, number>
  for (const i of s2.ideas.filter(i => i.status !== 'passed')) counts[i.kind]++
  s2.review = { status: 'proposed', at: nowIso(), pick_ids: chosen.map(i => i.id), counts, reason: null,
    summary: `Found ${kindsText(counts)} in your notes. Cap's top ${chosen.length} are below; the rest stay in the bank for Ed's quote slots.` }
  writeDb(db2)
  return chosen
}

export function reviewBody(db: Db = readDb()): string {
  const s = store(db)
  const picks = (s.review?.pick_ids ?? []).map(id => s.ideas.find(i => i.id === id)).filter((i): i is NoteIdea => !!i)
  const handle = new Map(getAllBrandAccounts().map(a => [a.id, a.handle]))
  return picks.map((i, k) => `${k + 1}. ${i.kind.toUpperCase()} · ${i.account_id ? handle.get(i.account_id) ?? i.account_id : 'account: yours to pick'} · ${FORMAT_LABEL[i.format ?? 'still']}\n   “${cut(i.text, 400)}”\n   From Note #${i.note_id} (${i.note_title})${i.pick_why ? `\n   Why: ${i.pick_why}` : ''}${i.careful ? `\n   Careful: ${i.careful} Ed softens it before it goes on the card.` : ''}`).join('\n\n')
}

/** Her yes: each pick becomes a card. Quotes/lines → quote cards; skits → Content Day film cards. */
export async function approvePicks(): Promise<{ cards: number[] } | { error: string }> {
  const db = readDb(); const s = store(db)
  if (s.review?.status !== 'proposed') return { error: 'Nothing waiting.' }
  const picks = s.review.pick_ids.map(id => s.ideas.find(i => i.id === id)).filter((i): i is NoteIdea => !!i && i.status === 'picked')
  s.review.status = 'approved'; s.review.at = nowIso()
  writeDb(db)
  const cards: number[] = []
  for (const idea of picks) {
    const id = await cardFromIdea(idea).catch(() => null)
    if (id) cards.push(id)
  }
  logActivity({ type: 'note', title: `Your note ideas → ${cards.length} cards`, detail: 'Cap’s calendar slots pick them up; skits are on Content Day.', icon: '📝', source: 'notes-ideas' })
  return { cards }
}

export function declinePicks(reason: string): { ok: true } | { error: string } {
  const db = readDb(); const s = store(db)
  if (s.review?.status !== 'proposed') return { error: 'Nothing waiting.' }
  for (const id of s.review.pick_ids) { const i = s.ideas.find(x => x.id === id); if (i && i.status === 'picked') { i.status = 'banked'; i.updated_at = nowIso() } }
  s.review = { ...s.review, status: 'declined', at: nowIso(), reason: cut(reason, 500) || null }
  writeDb(db)
  return { ok: true }
}

export async function cardFromIdea(idea: NoteIdea): Promise<number | null> {
  let text = idea.text, softened = false
  if (idea.careful) {
    const soft = await softenLine(text, idea.account_id)
    if (!soft) return null   // couldn't make it safe: it stays in the bank, never on a card
    text = soft; softened = true
  }
  const format: QuoteFormat = idea.kind === 'skit' ? 'film' : idea.format ?? 'still'
  const q = { kind: 'note' as const, text, label: '', note_id: idea.note_id, idea_id: idea.id, softened }
  q.label = quoteLabel(q)
  const from = `From your Note #${idea.note_id} (“${idea.note_title}”).${idea.pick_why ? ` Cap: ${idea.pick_why}` : ''}`
  const short = (s: string) => { const w = s.replace(/^\s*(skit|quote|line|hook)\s*:\s*/i, '').replace(/\s+/g, ' ').trim().split(' '); return w.length > 8 ? `${w.slice(0, 8).join(' ')}…` : w.join(' ') }
  const card = idea.kind === 'skit'
    ? createContent({ title: `Skit · ${short(text)}`, status: 'idea', type: 'video', account_id: idea.account_id, river_source: 'notes-ideas',
        script: text, shoot_format: 'role_play', note_id: idea.note_id, source_context: cut(text, 1500), quote: q, quote_format: 'film',
        notes: `${from} Skit, your words as you wrote them${softened ? ' (softened so no real person is named)' : ''}. Ed shapes the script around them.` })
    : createContent({ title: `${idea.kind === 'line' ? 'Line' : 'Quote'} · ${short(text)}`, status: 'idea', type: format === 'carousel' ? 'carousel' : format === 'broll_overlay' ? 'video' : 'image',
        account_id: idea.account_id, river_source: 'notes-ideas', onscreen_text: cut(text, 400), note_id: idea.note_id, source_context: cut(text, 1500), quote: q, quote_format: format,
        notes: `${from} Quote card · ${FORMAT_LABEL[format]} · ${q.label}.${format === 'still' ? ' Needs: a photo of you.' : format === 'broll_overlay' ? ' Needs: a b-roll clip to put the words over.' : ''}` })

  const db = readDb()
  const c = db.content.find(x => x.id === card.id)
  if (c && idea.kind === 'skit') {
    const names = (idea.characters ?? []).filter(n => matchCharacter(db, n))
    if (names.length) setCardCharacters(db, c, names)
    if (c.characters_by === 'mandi') c.characters_by = 'cap'
  }
  const i = store(db).ideas.find(x => x.id === idea.id)
  if (i) { i.status = 'carded'; i.content_id = card.id; i.updated_at = nowIso() }
  writeDb(db)
  // Ed fills the rest (a hook for skits, the job), same as any planned card.
  await import('./cardAudit').then(m => m.fillCardBasics(card.id)).catch(() => null)
  return card.id
}

export function noteIdeasView() {
  const db = readDb(); const s = store(db)
  const counts = { quote: 0, line: 0, skit: 0 } as Record<NoteIdeaKind, number>
  const byStatus: Record<string, number> = {}
  for (const i of s.ideas) { if (i.status !== 'passed') counts[i.kind]++; byStatus[i.status] = (byStatus[i.status] ?? 0) + 1 }
  const est = estimateBackfill(db)
  return { counts, by_status: byStatus, notes_mineable: mineableNotes(db).length, notes_unread: est.notes, estimate_usd: est.usd, backfill: s.backfill ?? null, review: s.review ?? null, last_daily: s.last_daily ?? null }
}

