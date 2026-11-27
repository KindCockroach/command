// Phase 6b: the long-form chain shared by the Story desk (Loop 11) and Substack (Loop 13),
// plus Ed's check of finished writing (used by the Loop 15 sweep too).
//
// THE CHAIN (Phase 4 reversal is intentional): Pod writes long-form from an outline → Ed checks
// → Cap gives it a date → Her presents → Mandi approves. Every pass is a handoff with a receipt.
// Ed never rewrites: he passes it, or sends it back to Pod with exactly what to fix (up to 3
// rounds; on the 4th check he lets it through with his notes, and it still waits for Mandi).
// Nothing here publishes or sends.

import { readDb, writeDb, getVoiceLessonsContext, type BranchId, type EdLongVerdict, type Handoff, type HandoffRef, type LongDraft } from './db'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'
import { fableText } from './fable'
import { wellLinesFor, wellStatus } from './well'
import { JOYFUL_BAD, WFH_BAD, WFH_SERVICES } from './review'
import { skillPrompt } from './skills'
import { getPlanConfig, addDays } from './plan'
import { cut, extractJsonObject } from './jsonkit'
import { ROLE_LINES } from './roles'

const nowIso = () => new Date().toISOString()
const todayCT = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)
export const MAX_ED_ROUNDS = 3

export type LongForm = 'medium' | 'teleprompter' | 'substack'
export type LongKind = LongForm | 'outreach' | 'post' | 'email' | 'longform' | 'other'

// ── Ed's check (Ed 1 · Check a draft) ───────────────────────────────────────
// Plain-code rules first (the same every time), then one cheap read for what a pattern can't
// see: real names, kids' identifying details, hurtful lines, implied income. `mandiText` is
// what Mandi wrote herself: a number found there is hers; any other money number is flagged.
const MONEY = /\$\s?\d[\d,.]*\s?(k|K|m|M)?(\/(mo|month|wk|week|yr|year))?|\b\d[\d,.]*\s?(k|K)\s?(\/|a|per)\s?(mo|month|year)\b|\b\d+(\.\d+)?\s?%/g
const INCOME = /\b(you (can|could|will) (make|earn)|make \$|earn \$|six[- ]figures?|seven[- ]figures?|passive income|replace your (income|salary)|quit your (job|9 ?to ?5)|guaranteed (income|results)|financial freedom)\b/i
const TREATMENT = /\b(cures?|heals? your (anxiety|depression|trauma)|treat(s|ment)? (for )?(anxiety|depression|trauma|adhd)|instead of therapy)\b/i
const OTHER_CTA = /\b(register|sign up for (the|my) (reset|session|call)|book (a|your) (call|session)|link in (my )?bio|dm me|buy (now|it)|download (the|my)|join the waitlist|grab your (seat|spot))\b/i

export async function edCheck(text: string, ctx: { branch: BranchId; kind: LongKind; mandiText?: string; round?: number; ctaRule?: 'podcast_only' | 'one' | 'none' }): Promise<EdLongVerdict> {
  const reasons: string[] = []
  const notes: string[] = []
  const t = text ?? ''
  if (!t.trim()) return { verdict: 'sent_back', reasons: ['It’s empty.'], notes, round: ctx.round ?? 1, checked_at: nowIso() }
  if (/\bbeck team\b/i.test(t)) reasons.push('Names “Beck Team”. The parent company is never marketed.')
  if (ctx.branch === 'joyful_media' && JOYFUL_BAD.test(t)) reasons.push(`Cross-promotion: this is Joyful Media and it points at the podcast or AI (“${t.match(JOYFUL_BAD)![0]}”).`)
  if (ctx.branch === 'joyful_media' && /\bAI\b|artificial intelligence|\bRISE\b|\bchatbots?\b/.test(t)) reasons.push(`Cross-promotion: Joyful Media never talks about AI or RISE (“${t.match(/\bAI\b|artificial intelligence|\bRISE\b|\bchatbots?\b/)![0]}”). That story belongs to WFH.`)
  if (ctx.branch === 'wfh' && WFH_BAD.test(t)) reasons.push(`Cross-promotion: this is WFH and it points at Joyful Media (“${t.match(WFH_BAD)![0]}”). No Reset, no meditations, no Be There For Her.`)
  if (WFH_SERVICES.test(t)) reasons.push('Pitches the AI services, which are paused.')
  if (INCOME.test(t)) reasons.push(`Promises or implies income (“${t.match(INCOME)![0]}”). Report what happened, never what she could make.`)
  if (TREATMENT.test(t)) reasons.push(`Promises a treatment result (“${t.match(TREATMENT)![0]}”).`)
  const mine = ctx.mandiText ?? ''
  const nums = [...new Set((t.match(MONEY) ?? []).map(x => x.trim()))].filter(n => !mine.includes(n.replace(/\s/g, '')) && !mine.includes(n))
  if (nums.length) reasons.push(`Money or result numbers Mandi didn’t give: ${nums.slice(0, 5).join(', ')}. Take them out unless she puts them in herself.`)
  if (ctx.ctaRule === 'podcast_only' && OTHER_CTA.test(t)) reasons.push(`The only call to action here is the AI Mom podcast; this one also asks for “${t.match(OTHER_CTA)![0]}”.`)
  const wc = t.split(/\s+/).filter(Boolean).length
  if (ctx.kind === 'medium' && wc < 600) notes.push(`Short for Medium (${wc} words; aim for 700+).`)
  if (ctx.kind === 'substack' && wc < 600) notes.push(`Short for an issue (${wc} words; aim for 700+).`)
  if (ctx.ctaRule === 'podcast_only' && !/\bpodcast\b|\blisten\b|\bepisode\b/i.test(t)) notes.push('No call to the AI Mom podcast. It’s the one call to action for Substack.')

  // The read a pattern can't do. Cheap; never decides alone (it only adds reasons).
  if (process.env.OPENAI_API_KEY) {
    try {
      const out = JSON.parse(await fableText({ cheap: true, json: true, maxTokens: 400,
        instructions: 'You are Ed, the editor, checking a draft for guardrails only. Flag ONLY real problems: (1) a real person named other than Mandi herself (public figures and companies are fine); (2) a child\'s name, face description, school, or other identifying detail; (3) a hurtful line about a real person (an ex, a family member) that should be transmuted; (4) wording that implies the reader will earn money; (5) a claim to treat or cure a condition. Quote the words. Reply ONLY with JSON: {"flags":[{"kind":"name|kid|hurtful|income|treatment","quote":"","fix":"one line"}]} (empty list if clean).',
        input: cut(t, 9000) })) as { flags?: { kind: string; quote: string; fix: string }[] }
      // Mandi is the author: her own name is never a guardrail problem.
      for (const f of (out.flags ?? []).filter(f => !(f.kind === 'name' && /\b(mandi|amanda|beck|mandi joy)\b/i.test(f.quote ?? ''))).slice(0, 6)) if (f.quote) reasons.push(`${({ name: 'Names a real person', kid: 'Identifies a child', hurtful: 'Hurtful about a real person', income: 'Implies income', treatment: 'Promises treatment' } as Record<string, string>)[f.kind] ?? 'Guardrail'}: “${cut(f.quote, 80)}”. ${cut(f.fix, 160)}`)
    } catch { notes.push('Ed’s guardrail read didn’t answer; the plain checks ran.') }
  }
  const round = ctx.round ?? 1
  if (!reasons.length) return { verdict: 'pass', reasons, notes, round, checked_at: nowIso() }
  if (round > MAX_ED_ROUNDS) return { verdict: 'let_through', reasons: [], notes: [...reasons, ...notes], round, checked_at: nowIso() }
  return { verdict: 'sent_back', reasons, notes, round, checked_at: nowIso() }
}

// ── The record a long-form handoff is about ─────────────────────────────────
type LongRef = { type: 'story'; id: string } | { type: 'substack'; id: number }
type Rec = { title: string; branch: BranchId; form: LongForm; brief: string; mandiText: string; draft?: LongDraft | null; ed?: EdLongVerdict | null }

function readRec(ref: LongRef): Rec | null {
  const db = readDb()
  if (ref.type === 'story') {
    const s = (db.stories ?? []).find(x => x.id === ref.id)
    if (!s || !s.outline) return null
    const o = s.outline
    return { title: o.headline || s.title, branch: s.branch, form: o.form, mandiText: s.raw, draft: s.draft, ed: s.ed,
      brief: `CORA'S OUTLINE (don't change its point)\nThe take only Mandi has: ${o.take}\nHeadline: ${o.headline}\nBeats:\n${o.beats.map((b, i) => `${i + 1}. ${b}`).join('\n')}\nTHE EMPHASIS (the line or moment that carries it): ${o.emphasis}\nGoal: ${s.goal}\nCampaign: ${s.campaign}\nOwl's solid facts: ${(s.facts?.solid ?? []).join(' | ') || '(none)'}\nOwl's uncertain (don't state as fact): ${(s.facts?.uncertain ?? []).join(' | ') || '(none)'}\nTen's open angle: ${s.angle?.open ?? '(none)'}\n\nHER OWN WORDS (the story as she told it):\n${cut(s.raw, 5000)}` }
  }
  const sub = db.substack
  const i = sub?.issues.find(x => x.n === ref.id)
  if (!sub || !i || !i.outline) return null
  return { title: i.title, branch: 'wfh', form: 'substack', mandiText: '', draft: i.draft, ed: i.ed,
    brief: `BIZ + CAP'S OUTLINE for issue ${i.n} of the backlog series (don't change its point)\nThe turn of the story: ${i.turn}\nThe one lesson a mom can use: ${i.lesson}\nThe parenting moment: ${i.parenting ?? 'NONE GIVEN. Do not invent one; leave a line in [brackets] asking Mandi for hers.'}\nBiz's business angle: ${i.biz_angle ?? '(none)'}\nBeats:\n${i.outline.beats.map((b, k) => `${k + 1}. ${b}`).join('\n')}\nCall to action: ${i.outline.cta}\nWhat it's built from (the build history, the sawdust):\n${i.sources.map(x => `- ${x}`).join('\n')}` }
}

type RecPatch = { draft?: LongDraft; ed?: EdLongVerdict; status?: 'checking' | 'ready'; date?: string | null; date_note?: string | null }
function saveRec(ref: LongRef, patch: RecPatch) {
  const db = readDb()
  if (ref.type === 'story') {
    const s = (db.stories ?? []).find(x => x.id === ref.id)
    if (s) Object.assign(s, patch, { updated_at: nowIso() })
  } else {
    const i = db.substack?.issues.find(x => x.n === ref.id)
    if (i && db.substack) { const { date: _d, ...rest } = patch; void _d; Object.assign(i, rest); db.substack.updated_at = nowIso() }
  }
  writeDb(db)
}

const refOf = (h: Handoff): LongRef | null => h.ref?.type === 'story' ? { type: 'story', id: String(h.ref.id) } : h.ref?.type === 'substack' ? { type: 'substack', id: Number(h.ref.id) } : null
const asHandoffRef = (r: LongRef, label: string): HandoffRef => ({ type: r.type, id: r.id, label })

const FORM_RULES: Record<LongForm, string> = {
  medium: 'A Medium article for the Joyful Media branch (mindfulness): 900–1,200 words (never under 800), a headline a stranger clicks and a one-line subtitle, short paragraphs, opens inside the moment, lands on the emphasis. No podcast, no AI, no WFH.',
  teleprompter: 'A teleprompter script she reads to camera: 350–600 words, spoken rhythm, short lines, one idea per line, [pause] marks where she breathes, the emphasis said plainly once near the end.',
  substack: 'A Substack issue for the WFH branch: an honest build-in-public report for moms who want to use AI to make money. 900–1,300 words (never under 800). Name the actual decision, what broke, and what it cost in time; no hype words (no “empire”, “unlock”, “game-changer”). Report what happened, the losses included, with the one lesson a mom can use. It is the sawdust of building RISE, never invented. The ONLY call to action is the AI Mom podcast. No prices, no services, no income promises, no Joyful Media (no Reset, no meditations, no Be There For Her). No kids’ names or identifying details; parenting stories are Mandi’s own, told her way. No money numbers unless the outline says Mandi gave them.',
}

// ── Pod writes (Pod 4 · Write from an outline) ──────────────────────────────
export async function startLongform(ref: LongRef, label: string, from: 'cora' | 'cap', opts: { run?: boolean } = {}): Promise<Handoff> {
  const h = openHandoff({ kind: 'longform_write', from, to: 'pod', what: cut(`Write it long-form: ${label}`, 280), ref: asHandoffRef(ref, label) })
  if (opts.run !== false) await runLongformWrite(h)
  return h
}

export async function runLongformWrite(h: Handoff) {
  startAttempt(h.id)
  const ref = refOf(h)
  if (!ref) return failHandoff(h.id, 'This handoff isn’t tied to a story or a Substack issue.')
  const rec = readRec(ref)
  if (!rec) return failHandoff(h.id, 'The outline is missing, so Pod has nothing to write from.')
  const well = wellLinesFor(`${rec.title} ${rec.brief}`.slice(0, 600), 5)
  const fixes = h.note ? `\n\nED SENT IT BACK. Fix exactly this and keep everything else:\n${h.note}\n\nYOUR LAST DRAFT:\n${cut(rec.draft?.body ?? '', 7000)}` : ''
  const instructions = `You are Pod. ${ROLE_LINES.pod} Write in her voice: strong, daring, plain, silly-serious, never soft. Her own words come first: pull and sharpen her phrasing, never invent a voice or a fact. Never name a real person. Never promise treatment or financial results. Don't exploit vulnerability.
FORM: ${FORM_RULES[rec.form]}

${skillPrompt('pod-write-from-outline')}

${getVoiceLessonsContext()}
Reply ONLY with JSON: {"title":"","subtitle":"","body":""}`
  const input = `${rec.brief}\n\n${well.length ? `HER WORDS FROM THE WELL (her own past captions):\n${well.map(w => `- ${w.cap}`).join('\n')}` : wellStatus().loaded ? '' : '(The Well isn’t loaded here.)'}${fixes}`
  let out: { title?: string; subtitle?: string; body?: string }
  // Pod writes with the Claude writer when its key is set (her voice holds better); gpt-4o otherwise.
  try { out = JSON.parse(extractJsonObject(await fableText({ instructions, input, json: true, useClaude: true, maxTokens: 5000 }))) }
  catch (e) { return failHandoff(h.id, `Pod couldn’t write it: ${e instanceof Error ? e.message : 'no answer'}`) }
  if (!out.body?.trim()) return failHandoff(h.id, 'Pod came back with an empty draft. Retry.')
  const draft: LongDraft = { title: cut(out.title || rec.title, 160), subtitle: out.subtitle ? cut(out.subtitle, 240) : undefined, body: cut(out.body, 12000), written_by: 'pod', written_at: nowIso() }
  saveRec(ref, { draft, status: 'checking' })
  const words = draft.body.split(/\s+/).filter(Boolean).length
  completeHandoff(h.id, 'pod', `Wrote “${draft.title}” (${words} words, ${rec.form}). Handed to Ed.`, [asHandoffRef(ref, draft.title)])
  const next = openHandoff({ kind: 'longform_check', from: 'pod', to: 'ed', what: cut(`Check it: ${draft.title}`, 280), ref: asHandoffRef(ref, draft.title), parent_id: h.id })
  await runLongformCheck(next, (h.round ?? 0) + 1)
}

// ── Ed checks; Cap dates it; it waits for Mandi ─────────────────────────────
export async function runLongformCheck(h: Handoff, round?: number) {
  startAttempt(h.id)
  const ref = refOf(h)
  if (!ref) return failHandoff(h.id, 'This handoff isn’t tied to a story or a Substack issue.')
  const rec = readRec(ref)
  if (!rec?.draft) return failHandoff(h.id, 'There’s no draft to check.')
  const r = round ?? ((rec.ed?.round ?? 0) + 1)
  const v = await edCheck(`${rec.draft.title}\n${rec.draft.subtitle ?? ''}\n${rec.draft.body}`, { branch: rec.branch, kind: rec.form, mandiText: rec.mandiText, round: r, ctaRule: rec.form === 'substack' ? 'podcast_only' : 'one' })
  saveRec(ref, { ed: v })
  if (v.verdict === 'sent_back') {
    completeHandoff(h.id, 'ed', `Sent back to Pod (check ${r}): ${v.reasons.join(' ')}`.slice(0, 1100), [asHandoffRef(ref, rec.draft.title)])
    const again = openHandoff({ kind: 'longform_write', from: 'ed', to: 'pod', what: cut(`Rewrite: ${rec.draft.title}`, 280), ref: asHandoffRef(ref, rec.draft.title), parent_id: h.id, note: v.reasons.map(x => `- ${x}`).join('\n') })
    // carry the round so Ed's next check counts on
    const db = readDb(); const a = db.handoffs?.find(x => x.id === again.id); if (a) { a.round = r; writeDb(db) }
    await runLongformWrite({ ...again, round: r })
    return
  }
  // Cap gives it a date (his call; Mandi can move it). Substack has no cadence until Mandi sets one.
  const dated = capDate(ref, rec)
  saveRec(ref, { status: 'ready', ...dated })
  completeHandoff(h.id, 'ed', `${v.verdict === 'pass' ? 'Passed' : `Let through after ${MAX_ED_ROUNDS} rewrites, with notes`}. ${dated.date ? `Cap dated it ${dated.date}.` : dated.date_note ?? ''} Waiting for Mandi’s approval.`.trim(), [asHandoffRef(ref, rec.draft.title)])
}

function capDate(ref: LongRef, rec: Rec): { date?: string | null; date_note?: string | null } {
  if (ref.type === 'substack') {
    const cadence = readDb().substack?.cadence
    return { date_note: cadence ? `Cap: goes out on your ${cadence} rhythm, after the issue before it.` : 'No date yet: you haven’t said how often Substack goes out.' }
  }
  // First day from 3 days out where that branch's calendar is under her day capacity.
  const db = readDb()
  const capPerDay = getPlanConfig().day_capacity
  let d = addDays(todayCT(), 3)
  for (let i = 0; i < 30; i++, d = addDays(d, 1)) {
    const n = (db.calendar_items ?? []).filter(x => x.date === d && x.branch_id === rec.branch).length
    if (n < capPerDay) break
  }
  return { date: d, date_note: `Cap’s date: the first day with room on the ${rec.branch === 'wfh' ? 'WFH' : 'Joyful Media'} calendar. Move it if it doesn’t fit.` }
}
