// Every card that takes up space (the board, Content Day, the calendar) has what it needs, so
// nothing trips Mandi up:
//   • a real title (not a slot label like "@mandijoybeck: carousel (quotes / gratitudes)")
//   • an ON-SCREEN HOOK: the headline. It opens a gap the post answers. Even a talking script has one.
//   • the post's job (reach / authority / dms): Cap picks it, Mandi never has to
//   • a caption once the card is ready, approved or scheduled
//   • for a planned slot with nothing in it yet: what to film (in notes, never posts)
//   • an account (only Mandi can fix that one)
// fillCardBasics writes ONLY what's missing, never over her words (a slot-label title is the one
// exception). The bulk fix runs as a Cap → Ed handoff after a backup of db.json.

import { readDb, updateContent, getBrandAccount, backupDb, type ContentPiece, type Handoff } from './db'
import { craftFor, HOOK_RULES } from './craft'
import { fableText } from './fable'
import { cut, extractJsonObject } from './jsonkit'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'

const DONE = new Set(['published', 'archived', 'declined', 'trash', 'deleted'])
const EVENT_TYPES = new Set(['workshop', 'podcast'])   // the Reset, an episode: a title, no overlay hook
const JOBS = ['reach', 'authority', 'dms'] as const
const isSlotTitle = (t: string) => /^@[\w.]+:\s/.test(t.trim()) || /^(untitled|new post|post)$/i.test(t.trim())
const blank = (s?: string | null) => !(s ?? '').trim()

// The hook law lives in craft.ts (every writer gets it).


export type CardGap = { id: number; title: string; account: string | null; status: string; type: string; where: string[]; missing: string[]; auto: boolean }

export function auditCards(): { cards: CardGap[]; counts: Record<string, number>; checked: number } {
  const db = readDb()
  const onCal = new Set((db.calendar_items ?? []).map(c => c.content_id))
  const cards: CardGap[] = []
  const counts: Record<string, number> = {}
  let checked = 0
  for (const c of db.content.filter(c => !DONE.has(c.status))) {
    checked++
    const where = [onCal.has(c.id) || c.scheduled_at ? 'calendar' : '', c.type === 'video' && !c.media_url && ['idea', 'in_progress', 'ready'].includes(c.status) ? 'content day' : '', 'board'].filter(Boolean)
    const missing: string[] = []
    if (blank(c.title) || isSlotTitle(c.title)) missing.push('title')
    if (!EVENT_TYPES.has(c.type) && blank(c.onscreen_text)) missing.push('on-screen hook')
    if (!EVENT_TYPES.has(c.type) && !c.post_job) missing.push('job')
    if (['ready', 'approved', 'scheduled'].includes(c.status) && blank(c.description) && !EVENT_TYPES.has(c.type)) missing.push('caption')
    if (!c.account_id) missing.push('account')
    if (!missing.length) continue
    for (const m of missing) counts[m] = (counts[m] ?? 0) + 1
    cards.push({ id: c.id, title: cut(c.title, 90), account: c.account_id ?? null, status: c.status, type: c.type, where, missing, auto: missing.some(m => m !== 'account') && !!c.account_id })
  }
  return { cards, counts, checked }
}

// Write only what this card is missing. Returns what was filled.
export async function fillCardBasics(id: number): Promise<{ filled: string[]; error?: string }> {
  const c = readDb().content.find(x => x.id === id)
  if (!c) return { filled: [], error: 'No such card.' }
  if (!c.account_id) return { filled: [], error: 'No account on this card (yours to pick).' }
  const needTitle = blank(c.title) || isSlotTitle(c.title)
  const needHook = !EVENT_TYPES.has(c.type) && blank(c.onscreen_text)
  const needJob = !EVENT_TYPES.has(c.type) && !c.post_job
  const needCaption = ['ready', 'approved', 'scheduled'].includes(c.status) && blank(c.description) && !EVENT_TYPES.has(c.type)
  const emptySlot = blank(c.script) && blank(c.description) && blank(c.transcript) && blank(c.onscreen_text)
  const needFilm = emptySlot && c.river_source === 'cap-plan' && !/What to film:/.test(c.notes ?? '')
  if (!needTitle && !needHook && !needJob && !needCaption && !needFilm) return { filled: [] }

  const acct = getBrandAccount(c.account_id)
  const voice = acct ? `ACCOUNT: ${acct.handle} (${acct.brand_name}): ${acct.topic}. Tone: ${acct.tone}.${acct.notes ? `\nNON-NEGOTIABLE: ${acct.notes}` : ''}` : ''
  const isCarousel = c.type === 'carousel'
  let out: { title?: string; hook?: string; job?: string; job_why?: string; caption?: string; film?: string } = {}
  try {
    out = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 1200,
      instructions: `You are Ed, writing the missing pieces of ONE card for Mandi Beck. Cap picks the post's job. Write ONLY the fields listed as NEEDED; leave the rest empty. Never contradict what's already on the card; build from it.
${voice}
${craftFor(c.account_id)}
${HOOK_RULES}
FIELDS:
- title: a plain working name for Mandi (what this post IS), 3–8 words, no handle, no format label.
- hook: the on-screen hook${isCarousel ? ' (slide 1 only)' : ''}.
- job (Cap's pick): "reach" (get in front of new women), "authority" (stop being seen as a peer), or "dms" (turn watchers into DMs). job_why: one short line.
- caption: the caption that posts (one call to action; its first line must differ from the hook).
- film: for an empty planned slot, ONE line telling Mandi exactly what to film for it (shot, where, what she does or says).
Reply ONLY with JSON: {"title":"","hook":"","job":"","job_why":"","caption":"","film":""}`,
      input: `NEEDED: ${[needTitle && 'title', needHook && 'hook', needJob && 'job', needCaption && 'caption', needFilm && 'film'].filter(Boolean).join(', ')}
THE CARD #${c.id} (${c.type}, ${c.status}):
Title: ${c.title}
${c.onscreen_text ? `On-screen: ${c.onscreen_text}\n` : ''}${c.script ? `Script: ${cut(c.script, 2500)}\n` : ''}${c.description ? `Caption: ${cut(c.description, 1500)}\n` : ''}${c.transcript ? `Transcript: ${cut(c.transcript, 1500)}\n` : ''}${c.notes ? `Notes: ${cut(c.notes, 800)}\n` : ''}${c.source_context ? `Context: ${cut(c.source_context, 600)}` : ''}` })))
  } catch (e) { return { filled: [], error: e instanceof Error ? e.message : 'no answer' } }

  const patch: Partial<ContentPiece> = {}
  const filled: string[] = []
  const t = (x?: string) => (x ?? '').trim()
  if (needTitle && t(out.title)) { patch.title = cut(t(out.title), 120); filled.push('title') }
  if (needHook && t(out.hook)) { patch.onscreen_text = cut(t(out.hook).replace(/^["“]|["”]$/g, ''), 200); filled.push('on-screen hook') }
  if (needJob && JOBS.includes(t(out.job) as typeof JOBS[number])) { patch.post_job = t(out.job); filled.push('job') }
  if (needCaption && t(out.caption)) { patch.description = cut(t(out.caption), 2200); filled.push('caption') }
  if (needFilm && t(out.film)) { patch.notes = `${(c.notes ?? '').trim()}\nWhat to film: ${cut(t(out.film), 300)}`.trim(); filled.push('what to film') }
  if (filled.length) updateContent(c.id, patch)
  return { filled }
}

// The bulk fix: back up, then Ed fills every card that can be filled (Cap's handoff).
// Cards that only need Cap's job pick: one cheap call per 25 cards (no full writer needed).
export async function pickJobs(ids: number[]): Promise<number> {
  const db = readDb()
  const cards = ids.map(id => db.content.find(c => c.id === id)).filter((c): c is ContentPiece => !!c && !c.post_job)
  let done = 0
  for (let i = 0; i < cards.length; i += 25) {
    const batch = cards.slice(i, i + 25)
    try {
      const raw = await fableText({ json: true, cheap: true, maxTokens: 1500,
        instructions: `You are Cap. For each post, pick its ONE job: "reach" (get in front of new women who don't follow yet), "authority" (stop being seen as a peer; the one to learn from), or "dms" (turn the ones already watching into DMs). Use each post's number (after #) as its id, one entry per post, in the same order. Reply ONLY with JSON: {"jobs":[{"id":${batch[0].id},"job":"reach"}]}`,
        input: batch.map(c => `#${c.id} [${c.type}] ${cut(c.title, 80)} | ${cut(c.onscreen_text || c.script || c.description || '', 200)}`).join('\n') })
      const out = JSON.parse(extractJsonObject(raw)) as { jobs?: { id: number | string; job: string }[] }
      const answers = out.jobs ?? []
      for (const [k, j] of answers.entries()) {
        let id = Number(String(j.id ?? '').replace(/\D/g, ''))
        // A wrong id but the right count: match by order.
        if (!batch.some(c => c.id === id) && answers.length === batch.length) id = batch[k].id
        const job = String(j.job ?? '').toLowerCase().trim()
        if (!batch.some(c => c.id === id) || !JOBS.includes(job as typeof JOBS[number])) continue
        updateContent(id, { post_job: job }); done++
      }
    } catch (e) { console.error('[pickJobs]', e instanceof Error ? e.message : e) }
  }
  return done
}

export function openCardFix(limit?: number): { handoff: Handoff; backup: string; count: number } | { error: string } {
  const a = auditCards()
  const todo = a.cards.filter(c => c.auto).slice(0, limit && limit > 0 ? limit : undefined)
  if (!todo.length) return { error: 'Every card already has what it needs (or only needs an account from you).' }
  const backup = backupDb('card-fix')
  const handoff = openHandoff({ kind: 'card_fix', from: 'cap', to: 'ed', what: `Fill what ${todo.length} cards are missing (titles, on-screen hooks, Cap’s job pick, captions, what to film)`, note: limit ? `limit:${limit}` : undefined })
  return { handoff, backup, count: todo.length }
}

export async function runCardFix(h: Handoff) {
  startAttempt(h.id)
  const lim = Number((h.note ?? '').match(/limit:(\d+)/)?.[1] ?? 0)
  const all = auditCards().cards.filter(c => c.auto).slice(0, lim || undefined)
  // Job-only cards: Cap's cheap batch pick. The rest: Ed writes what's missing.
  const jobOnly = all.filter(c => c.missing.every(m => m === 'job' || m === 'account')).map(c => c.id)
  const jobs = await pickJobs(jobOnly)
  const todo = all.filter(c => !jobOnly.includes(c.id))
  let ok = 0
  const tally: Record<string, number> = {}
  const errors: string[] = []
  for (const c of todo) {
    const r = await fillCardBasics(c.id)
    if (r.error) { if (errors.length < 5) errors.push(`#${c.id}: ${r.error}`); continue }
    if (r.filled.length) ok++
    for (const f of r.filled) tally[f] = (tally[f] ?? 0) + 1
  }
  if (!ok && !jobs && errors.length) return failHandoff(h.id, `Ed couldn’t fill the cards: ${errors.join(' · ')}`)
  return completeHandoff(h.id, 'ed', `Cap picked the job on ${jobs} of ${jobOnly.length} job-only cards. Ed filled ${ok} of ${todo.length} cards: ${Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(', ')}.${errors.length ? ` Didn’t finish: ${errors.join(' · ')}` : ''}`)
}
