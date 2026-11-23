// Phase 5: the welcome emails and Cap's six-touch post-Reset sequence.
//
// THE CHAIN (Nov 22 reversal, intentional): Cap briefs → Ed writes (short-form) → back to Cap,
// who confirms or sends it back for a rewrite → the confirmed draft waits for Mandi's approval.
// Handoffs carry every step (email_write → email_review → email_rewrite), with receipts.
//
// SENDING is off by default and stays off in testing. A touch can only go out when:
//   the draft is approved by Mandi, the sequence is switched live, the touch is due, the send is
//   confirmed, Resend is configured, and the person passes every eligibility check below.
// Every send, skip and failure is logged with its reason on the person's history.
//
// Prices are fixed (never invent others): Reset $33, $25 returning ($8 coupon), $44/month pass
// offered ONLY after two attendances, $9 Listen To Your Intuition. No 2-pack. Luma keeps
// registration, payment and confirmations; nothing here sells a Reset seat natively.

import {
  readDb, writeDb, getPeople, logSend, logActivity, getVoiceLessonsContext,
  type BranchId, type Contact, type Handoff, type PersonView, type ResetEvent,
  type SeqEmail, type SeqEmailKey, type SeqSettings, type ResetSequenceStore, type SeqSend, type PersonEvent,
} from './db'
import { fableText } from './fable'
import { wellLinesFor, wellStatus } from './well'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'
import { renderBrandEmail } from './emailTemplate'
import { resendSend } from './resend'
import { unsubscribeUrl, unsubscribeApiUrl } from './unsubscribe'

export const OWNER_TEST_ADDRESS = 'hi@aimomeducation.com'
const MAX_ROUNDS = 3   // Cap's reviews before he lets a draft through with notes (it still waits for Mandi)

export const DEFAULT_SETTINGS: SeqSettings = {
  coupon_code: '',
  next_reset_url: 'https://www.bethereforher.com/reset',
  survey_url: 'https://www.bethereforher.com/reset/survey',
  nine_url: '',
  pass_url: '',
  gift_name: '',
  gift_url: '',
  medium_url: '',
  podcast_url: 'https://www.aiworksforher.com/listen',
  sequence_live: false,
  welcome_live: { joyful_media: false, wfh: false },
}

// ── Cap's plan: what each email is for, its timing, and the must-haves ──
// Timing (Cap's call): the Reset is Sunday 8 PM CT and the next one is 14 days later.
//   T1 Mon (+1)  thank-you while it's fresh · T2 Wed (+3) the optional $9 · T3 Fri (+5) survey nudge
//   T4 Sun (+7)  one week out, the invite · T5 Thu (+11) reminder, only if not registered
//   T6 Fri (+12) a gift with no ask, two days before; it never mentions registering.
type Plan = { key: SeqEmailKey; branch: BranchId; title: string; day_offset: number | null; cta: SeqEmail['cta']; extras: string[]; brief: string }
export const CAP_PLAN: Plan[] = [
  {
    key: 'welcome_joyful_media', branch: 'joyful_media', title: 'Welcome · Joyful Media list', day_offset: null, cta: 'next_reset', extras: [],
    brief: 'Someone just joined the Joyful Media (Be There For Her) list. Welcome her like a friend opening the door. Say in one line what she will get from these emails (a little room for herself, practices, the Reset when it is on). One call to action: the next Reset (every other Sunday, 8 PM Central, $33). No other offers. No podcast, no AI.',
  },
  {
    key: 'welcome_wfh', branch: 'wfh', title: 'Welcome · WFH (AI Mom podcast) list', day_offset: null, cta: 'podcast', extras: [],
    brief: 'Someone just joined the AI Mom podcast list (WFH). Welcome her. Say what the podcast is for in her words: AI as the tool, her own peace, action and intuition as the point. One call to action: listen to the podcast. PODCAST ONLY: never the Reset, meditations, the $9 collection, Be There For Her, Joyful Media, or any AI services (paused). No prices at all.',
  },
  {
    key: 't1', branch: 'joyful_media', title: 'Touch 1 · Thank you + survey + $8 coupon', day_offset: 1, cta: 'survey', extras: ['coupon_block'],
    brief: 'The morning after the Reset. Thank her for giving herself the hour; name what that took without making it heavy. Ask her to take the short survey (the button). "coupon_block" is a separate short paragraph used for everyone except pass holders: her returning price is $25 instead of $33 with the code {{coupon_code}} on Luma for the next Reset ({{next_reset_date}}). The survey is the one call to action; the coupon is a gift, not a second ask.',
  },
  {
    key: 't2', branch: 'joyful_media', title: 'Touch 2 · Optional $9 Listen To Your Intuition', day_offset: 3, cta: 'nine',
    extras: [],
    brief: 'Two days after touch 1. A light, truly optional offer: the Listen To Your Intuition collection, seven short guided meditations, $9, for the days between Resets. Make it easy to say no. No pressure, no scarcity, no promise of results. One call to action: the collection.',
  },
  {
    key: 't3', branch: 'joyful_media', title: 'Touch 3 · Survey reminder + invite to reply', day_offset: 5, cta: 'survey', extras: [],
    brief: 'A short, human nudge for the survey, plus an open invitation to simply hit reply and tell Mandi how it landed; she reads every one. Keep it short. One call to action: the survey (replying is an invitation, not a second button).',
  },
  {
    key: 't4', branch: 'joyful_media', title: 'Touch 4 · Next Reset invitation', day_offset: 7, cta: 'next_reset', extras: ['price_returning', 'pass_offer', 'pass_holder_note'],
    brief: 'One week out: invite her to the next Reset on {{next_reset_date}} at 8 PM Central. The body itself names NO price. The price goes in segment paragraphs, exactly one of which is shown: "price_returning" (attended once): her returning price is $25 with code {{coupon_code}} instead of $33. "pass_offer" (attended two or more): the same $25 returning price, AND, because she has come twice, the option of the $44/month Reset pass for every Reset. "pass_holder_note" (already has the pass): no price, her seat is part of her pass; a warm line that she belongs here. One call to action: save your seat.',
  },
  {
    key: 't5', branch: 'joyful_media', title: 'Touch 5 · Reminder (only if not registered)', day_offset: 11, cta: 'next_reset', extras: [],
    brief: 'Sent ONLY to people who have not registered for the next Reset on {{next_reset_date}}. A short reminder that the door is open, no guilt, no countdown, no fake scarcity. Mention her returning price ($25 with code {{coupon_code}}) in one plain line. One call to action: save your seat.',
  },
  {
    key: 't6', branch: 'joyful_media', title: 'Touch 6 · A free gift, no sales pressure', day_offset: 12, cta: 'gift', extras: ['medium_note'],
    brief: 'A genuine free gift: {{gift_name}}. Give it with no ask and no strings. Do NOT mention registering, the Reset price, seats, or any offer. One call to action: open the gift. "medium_note" is one optional line for pass holders only: a more personal story Mandi wrote, on Medium.',
  },
]

const planFor = (k: SeqEmailKey) => CAP_PLAN.find(p => p.key === k)!
const nowIso = () => new Date().toISOString()

function blankEmail(p: Plan): SeqEmail {
  return {
    key: p.key, branch: p.branch, title: p.title, day_offset: p.day_offset, brief: p.brief,
    subject: '', preheader: '', body: '', cta_label: '', cta: p.cta, ps: '',
    extras: Object.fromEntries(p.extras.map(x => [x, ''])), status: 'brief', round: 0,
    cap_reasons: [], cap_notes: [], written_by: null, approved_at: null, updated_at: nowIso(),
  }
}

function ensure(db: ReturnType<typeof readDb>): ResetSequenceStore {
  if (!db.reset_sequence) db.reset_sequence = { settings: { ...DEFAULT_SETTINGS, welcome_live: { ...DEFAULT_SETTINGS.welcome_live } }, emails: [], sends: [] }
  const s = db.reset_sequence
  s.settings = { ...DEFAULT_SETTINGS, ...s.settings, welcome_live: { ...DEFAULT_SETTINGS.welcome_live, ...(s.settings?.welcome_live ?? {}) } }
  for (const p of CAP_PLAN) {
    let e = s.emails.find(x => x.key === p.key)
    if (!e) { e = blankEmail(p); s.emails.push(e) }
    // Cap owns the brief and timing; keep them current with the plan.
    e.brief = p.brief; e.day_offset = p.day_offset; e.title = p.title; e.cta = p.cta; e.branch = p.branch
    for (const x of p.extras) if (e.extras[x] === undefined) e.extras[x] = ''
  }
  s.emails.sort((a, b) => CAP_PLAN.findIndex(p => p.key === a.key) - CAP_PLAN.findIndex(p => p.key === b.key))
  return s
}

export function getSequence(): ResetSequenceStore {
  const db = readDb()
  const had = JSON.stringify(db.reset_sequence ?? null)
  const s = ensure(db)
  if (JSON.stringify(s) !== had) writeDb(db)
  return s
}

export function updateSettings(patch: Partial<SeqSettings>): SeqSettings {
  const db = readDb()
  const s = ensure(db)
  const str = ['coupon_code', 'next_reset_url', 'survey_url', 'nine_url', 'pass_url', 'gift_name', 'gift_url', 'medium_url', 'podcast_url'] as const
  for (const k of str) if (typeof patch[k] === 'string') s.settings[k] = (patch[k] as string).trim()
  if (typeof patch.sequence_live === 'boolean') s.settings.sequence_live = patch.sequence_live
  if (patch.welcome_live) for (const b of ['joyful_media', 'wfh'] as BranchId[]) if (typeof patch.welcome_live[b] === 'boolean') s.settings.welcome_live[b] = patch.welcome_live[b]
  writeDb(db)
  return s.settings
}

// Mandi edits a draft by hand. Her words are hers: Cap still shows his check, but doesn't send it back.
export function editEmail(key: SeqEmailKey, patch: Partial<Pick<SeqEmail, 'subject' | 'preheader' | 'body' | 'cta_label' | 'ps' | 'extras'>>): SeqEmail | null {
  const db = readDb()
  const e = ensure(db).emails.find(x => x.key === key)
  if (!e) return null
  for (const k of ['subject', 'preheader', 'body', 'cta_label', 'ps'] as const) if (typeof patch[k] === 'string') e[k] = patch[k] as string
  if (patch.extras) for (const [k, v] of Object.entries(patch.extras)) if (k in e.extras && typeof v === 'string') e.extras[k] = v
  e.written_by = 'mandi'
  const chk = capCheck(e, db)
  e.cap_reasons = []; e.cap_notes = chk.reasons.length ? chk.reasons.map(r => `Cap would flag: ${r}`) : []
  e.status = e.status === 'approved' ? 'approved' : 'confirmed'
  e.updated_at = nowIso()
  writeDb(db)
  return e
}

export function approveEmail(key: SeqEmailKey, on: boolean): SeqEmail | { error: string } {
  const db = readDb()
  const e = ensure(db).emails.find(x => x.key === key)
  if (!e) return { error: 'No such email.' }
  if (on && !e.body.trim()) return { error: 'There’s nothing to approve yet: Ed hasn’t written it.' }
  if (on && !['confirmed', 'approved'].includes(e.status)) return { error: 'Cap hasn’t confirmed this draft yet.' }
  e.status = on ? 'approved' : 'confirmed'
  e.approved_at = on ? nowIso() : null
  e.updated_at = nowIso()
  writeDb(db)
  return e
}

// ── Cap's checks: the same way every time ──
const ALLOWED_PRICES = new Set(['33', '25', '44', '8', '9'])
const JOYFUL_BAD = /\bpodcast\b|\bepisodes?\b|\bai mom\b|\baiworksforher\b|\bworks for her\b|\bai (tools?|services?)\b|\bchatgpt\b/i
const WFH_BAD = /\bthe reset\b|\breset\b|\bmeditations?\b|\$\s?9\b|\bwellspring\b|\bbethereforher\b|\bjoyful media\b|\bbe there for her\b|\bintuition collection\b/i
const WFH_SERVICES = /\bcheat code\b|\bai (assessment|setup|onboarding)\b|\bwork with me on ai\b|\blocal support\b|\/assessment\b/i
const PROMISES = /\bcure[sd]?\b|\bheal(s|ed)? (you|your)\b|\btherapy\b|\btherapeutic\b|\bdiagnos|\btreat(s|ment)?\b|\bguarantee[sd]?\b|\bmake money\b|\bincome\b|\bfinancial (freedom|results)\b|\bclinically\b/i
const PRESSURE = /\blast chance\b|\bonly \d+ (spots|seats)\b|\bspots? (are )?(filling|left)\b|\bhurry\b|\bdon[’']?t miss out\b|\bbefore it[’']?s gone\b|\bact now\b/i
const SELL = /\bregister\b|\bseat\b|\bsign up\b|\$\s?\d|\bcoupon\b|\bcode\b|\bbuy\b|\bpurchase\b|\bpass\b/i
const BUNDLE = /\b(2|two)[\s-]?pack\b|\bbundle\b/i

function fullText(e: SeqEmail): string {
  return [e.subject, e.preheader, e.body, e.cta_label, e.ps, ...Object.values(e.extras)].join('\n')
}

function realNames(db: ReturnType<typeof readDb>): string[] {
  const names = new Set<string>()
  for (const c of db.contacts ?? []) if (c.name && c.name.trim().split(/\s+/).length >= 2) names.add(c.name.trim().toLowerCase())
  for (const g of db.podcast_guests ?? []) if (g.name && g.name.trim().split(/\s+/).length >= 2) names.add(g.name.trim().toLowerCase())
  for (const w of db.waitlist ?? []) if (w.name && w.name.trim().split(/\s+/).length >= 2) names.add(w.name.trim().toLowerCase())
  names.delete('mandi beck'); names.delete('amanda beck'); names.delete('mandi joy beck')
  return [...names]
}

export function capCheck(e: SeqEmail, db = readDb()): { reasons: string[]; notes: string[] } {
  const reasons: string[] = []
  const notes: string[] = []
  const all = fullText(e)
  const p = planFor(e.key)
  if (!e.subject.trim()) reasons.push('No subject line.')
  if (!e.body.trim()) reasons.push('The body is empty.')
  if (!e.cta_label.trim() && e.cta !== 'none') reasons.push('No button label for the one call to action.')
  for (const x of p.extras) if (!(e.extras[x] ?? '').trim()) reasons.push(`The "${x}" paragraph is missing.`)
  const badTokens = [...all.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).filter(t => !['first_name', 'next_reset_date', 'coupon_code', 'gift_name'].includes(t))
  if (badTokens.length) reasons.push(`Unknown token${badTokens.length > 1 ? 's' : ''} in the text: ${[...new Set(badTokens)].map(t => `{{${t}}}`).join(', ')}. The segment paragraphs are added automatically; only {{first_name}}, {{next_reset_date}}, {{coupon_code}} and {{gift_name}} are filled in.`)
  if (/(^|\n)\s*(warmly|with warmth|with love|love|be well|xo+|cheers|best|with you|hugs)?,?\s*\n?\s*mandi( beck)?\s*$/i.test(e.body.trim()) || /(^|\n)\s*(warmly|with warmth|with love|be well|xo+|cheers|best|hugs),?\s*$/i.test(e.body.trim())) reasons.push('The body ends with a sign-off. The email template already signs it "With you, Mandi Beck"; take the sign-off out.')
  if (/https?:\/\/|www\./i.test(all)) reasons.push('A link is written into the text. The button carries the one link; take the URL out.')
  // Prices: only the real ones, only where they belong.
  for (const m of all.matchAll(/\$\s?(\d+(?:\.\d{2})?)/g)) {
    const n = String(Math.round(parseFloat(m[1])))
    if (!ALLOWED_PRICES.has(n)) reasons.push(`A price that isn’t real: "${m[0]}". The only prices are $33, $25 returning ($8 off), the $44/month pass and the $9 collection.`)
  }
  if (BUNDLE.test(all)) reasons.push('Mentions a 2-pack or bundle. There is no 2-pack.')
  const outsidePass = [e.subject, e.preheader, e.body, e.cta_label, e.ps, ...Object.entries(e.extras).filter(([k]) => k !== 'pass_offer' && k !== 'pass_holder_note').map(([, v]) => v)].join('\n')
  if (/\$\s?44\b|\b44 ?(a|\/|per) ?month\b|\bmonthly pass\b|\breset pass\b/i.test(outsidePass)) reasons.push('The $44/month pass appears outside the "pass_offer" paragraph. It is offered only to people who came twice.')
  if (e.key !== 't2' && /\$\s?9\b/.test(all)) reasons.push('The $9 collection belongs in touch 2 only.')
  if (e.key === 't4' && /\$\s?\d/.test(e.body)) reasons.push('Touch 4’s body names a price. Prices go in the segment paragraphs so each person sees the right one.')
  if (e.key === 't4' && /\$|code|coupon|price/i.test(e.extras.pass_holder_note ?? '')) reasons.push('The pass-holder paragraph mentions a price or code. Pass holders don’t pay per Reset.')
  if ((e.key === 't1' || e.key === 't4' || e.key === 't5') && !/\{\{coupon_code\}\}/.test(all)) reasons.push('The coupon code token {{coupon_code}} is missing, so she won’t see her $25 code.')
  if (e.key === 't6' && SELL.test([e.subject, e.preheader, e.body, e.cta_label, e.ps].join('\n'))) reasons.push(`Touch 6 is a gift with no sales pressure, but it mentions "${[e.subject, e.preheader, e.body, e.cta_label, e.ps].join('\n').match(SELL)![0]}". Take every ask out.`)
  if (PRESSURE.test(all)) reasons.push(`Pressure language ("${all.match(PRESSURE)![0]}"). No fake scarcity, no countdowns.`)
  // Guardrails.
  if (PROMISES.test(all)) reasons.push(`Promises a treatment or financial result ("${all.match(PROMISES)![0]}"). The Reset is a practice, not therapy or a money promise.`)
  if (/beck team/i.test(all)) reasons.push('Says "Beck Team". It never appears in public copy.')
  const low = all.toLowerCase()
  const named = realNames(db).find(n => low.includes(n))
  if (named) reasons.push('Names a real person. Never name anyone.')
  // No cross-promotion between branches.
  if (e.branch === 'joyful_media' && JOYFUL_BAD.test(all)) reasons.push(`Cross-promotion: a Joyful Media email that points at the podcast or AI ("${all.match(JOYFUL_BAD)![0]}").`)
  if (e.branch === 'wfh' && WFH_BAD.test(all)) reasons.push(`Cross-promotion: the WFH welcome points at a Joyful Media thing ("${all.match(WFH_BAD)![0]}").`)
  if (e.branch === 'wfh' && /\$\s?\d/.test(all)) reasons.push('The WFH welcome names a price. Podcast only.')
  if (WFH_SERVICES.test(all)) reasons.push('Promotes the AI services, which are paused.')
  // Short-form.
  const words = e.body.split(/\s+/).filter(Boolean).length
  if (words > 230) reasons.push(`${words} words in the body. Keep it short: under about 200.`)
  if (words > 0 && words < 35) notes.push('Very short. Fine if it lands, but make sure it says why she’s getting it.')
  return { reasons: [...new Set(reasons)], notes }
}

// ── the chain ──
// Cap briefs: one email_write handoff per email that isn't approved (or the ones asked for).
export function briefEmails(keys?: SeqEmailKey[]): { opened: string[]; skipped: string[] } {
  const db = readDb()
  const s = ensure(db)
  writeDb(db)
  const opened: string[] = [], skipped: string[] = []
  for (const e of s.emails) {
    if (keys?.length && !keys.includes(e.key)) continue
    if (e.status === 'approved' || e.written_by === 'mandi') { skipped.push(`${e.title}: ${e.status === 'approved' ? 'already approved' : 'your words, left alone'}`); continue }
    const h = openHandoff({ kind: 'email_write', from: 'cap', to: 'ed', what: `Write the email: ${e.title}`, ref: { type: 'email', id: e.key, label: e.title }, note: e.brief })
    setEmail(e.key, x => { x.status = 'writing'; x.round = 0; x.cap_reasons = []; x.cap_notes = [] })
    opened.push(h.id)
  }
  return { opened, skipped }
}

// Cap rechecks drafts he already confirmed (after his checks change): any that now fail go back
// through review → rewrite. Approved drafts and her own words are left alone.
export function recheckEmails(): { opened: string[]; passed: string[] } {
  const db = readDb()
  const s = ensure(db)
  writeDb(db)
  const opened: string[] = [], passed: string[] = []
  for (const e of s.emails) {
    if (e.status !== 'confirmed' || e.written_by === 'mandi' || !e.body) continue
    if (!capCheck(e, db).reasons.length) { passed.push(e.title); continue }
    setEmail(e.key, x => { x.round = 0; x.status = 'review' })
    opened.push(openHandoff({ kind: 'email_review', from: 'cap', to: 'cap', what: `Recheck the email: ${e.title}`, ref: { type: 'email', id: e.key, label: e.title } }).id)
  }
  return { opened, passed }
}

function setEmail(key: SeqEmailKey, fn: (e: SeqEmail) => void): SeqEmail | null {
  const db = readDb()
  const e = ensure(db).emails.find(x => x.key === key)
  if (!e) return null
  fn(e)
  e.updated_at = nowIso()
  writeDb(db)
  return e
}

const emailKeyOf = (h: Handoff) => (h.ref?.type === 'email' ? String(h.ref.id) : '') as SeqEmailKey

const PRICE_FACTS = `FACTS (never invent others):
- The Reset: a live, guided hour, every other Sunday at 8 PM Central. $33 standard. $25 returning (an $8 coupon code, written {{coupon_code}}). After two attendances only: a $44/month pass for every Reset. There is NO 2-pack. Registration is on Luma.
- Listen To Your Intuition: seven short guided meditations, $9.
- Tokens you may use and must not fill in yourself: {{first_name}} (may be blank, so write so it reads fine either way, e.g. "Hi {{first_name}},"), {{next_reset_date}}, {{coupon_code}}, {{gift_name}}.
- Links go on the button only. Never write a URL.
- Don't sign off: the template signs every email "With you, Mandi Beck". Never put a segment paragraph's name (like {{coupon_block}}) in the body; those paragraphs are added after the body automatically.`

export async function runEmailWrite(h: Handoff) {
  const key = emailKeyOf(h)
  const e0 = getSequence().emails.find(x => x.key === key)
  if (!e0) return failHandoff(h.id, 'That email isn’t in the sequence any more.')
  startAttempt(h.id)
  const rewrite = h.kind === 'email_rewrite'
  const p = planFor(key)
  const well = wellLinesFor(`${p.brief} ${p.branch === 'wfh' ? 'AI mom podcast tools intuition peace action' : 'reset rest breathe yourself mother tired self-respect intuition gift'}`, 6)
  const instructions = `You are Ed, the short-form writer. Cap, the campaign manager, briefed you on one email for Mandi Beck's ${p.branch === 'wfh' ? 'AI Mom podcast list (WFH)' : 'Joyful Media / Be There For Her list'}.
Write in Mandi's voice, to the reader (you/your), from her own words first. Warm, direct, a little funny when it's earned, never syrupy. Short paragraphs separated by a blank line. Exactly ONE call to action (the button). Never name a real person. Never promise healing, therapy, treatment or money. Never exploit how she's feeling; no guilt, no fake urgency. ${p.branch === 'wfh' ? 'PODCAST ONLY: never the Reset, meditations, the $9 collection, Be There For Her or Joyful Media. No prices. No AI services (paused).' : 'JOYFUL MEDIA ONLY: never the podcast, AI, or WFH.'} Never "Beck Team".

${PRICE_FACTS}
${getVoiceLessonsContext()}

Reply ONLY with JSON: {"subject": "...", "preheader": "...", "body": "...", "cta_label": "...", "ps": ""${p.extras.length ? `, "extras": {${p.extras.map(x => `"${x}": "..."`).join(', ')}}` : ''}}
subject under 60 characters; preheader under 90; cta_label 2-5 words; ps optional (empty string if none).`
  const input = [
    `CAP'S BRIEF — ${p.title}${p.day_offset !== null ? ` (goes out ${p.day_offset} day${p.day_offset === 1 ? '' : 's'} after the Reset)` : ' (sent right after she joins)'}:\n${p.brief}`,
    well.length ? `HER WORDS FROM THE WELL (her own past captions; pull and sharpen her phrasing first, never invent a voice):\n${well.map(w => `- ${Array.from(w.cap).slice(0, 400).join("")}`).join('\n')}` : 'The Well isn’t loaded here: stay plain and honest, and keep it short.',
    rewrite && `CAP SENT YOUR LAST DRAFT BACK. Fix exactly this and keep the rest:\n${e0.cap_reasons.map(r => '- ' + r).join('\n')}\n\nYour last draft:\n${JSON.stringify({ subject: e0.subject, preheader: e0.preheader, body: e0.body, cta_label: e0.cta_label, ps: e0.ps, extras: e0.extras })}`,
  ].filter(Boolean).join('\n\n')
    // drop half-emoji (lone surrogates) so the AI request body is always valid JSON
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')

  let out: { subject?: string; preheader?: string; body?: string; cta_label?: string; ps?: string; extras?: Record<string, string> } = {}
  try {
    out = JSON.parse(await fableText({ instructions, input, json: true, maxTokens: 1400 }))
  } catch (err) {
    setEmail(key, x => { x.status = x.body ? 'sent_back' : 'brief' })
    return failHandoff(h.id, `Ed couldn’t write it: ${err instanceof Error ? err.message : 'no answer'}`)
  }
  if (!String(out.body ?? '').trim()) { setEmail(key, x => { x.status = 'brief' }); return failHandoff(h.id, 'Ed came back empty. Retry.') }
  setEmail(key, x => {
    x.subject = String(out.subject ?? '').trim().slice(0, 120)
    x.preheader = String(out.preheader ?? '').trim().slice(0, 160)
    x.body = String(out.body ?? '').trim()
    x.cta_label = String(out.cta_label ?? '').trim().slice(0, 40)
    x.ps = String(out.ps ?? '').trim()
    for (const k of p.extras) x.extras[k] = String(out.extras?.[k] ?? '').trim()
    x.written_by = 'ed'; x.status = 'review'
  })
  completeHandoff(h.id, 'ed', `Ed wrote "${String(out.subject ?? '').slice(0, 80)}" (${String(out.body).split(/\s+/).length} words${well.length ? `, from ${well.length} of her own captions` : wellStatus().loaded ? '' : ', the Well isn’t loaded here'}). Back to Cap.`, [{ type: 'email', id: key, label: p.title }])
  const r = openHandoff({ kind: 'email_review', from: 'ed', to: 'cap', what: `Check the email: ${p.title}`, ref: { type: 'email', id: key, label: p.title }, parent_id: h.id }, { log: false })
  await runEmailReview(r)
}

export async function runEmailReview(h: Handoff) {
  const key = emailKeyOf(h)
  startAttempt(h.id)
  const db = readDb()
  const e = ensure(db).emails.find(x => x.key === key)
  if (!e) return failHandoff(h.id, 'That email isn’t in the sequence any more.')
  const round = (e.round ?? 0) + 1
  const chk = capCheck(e, db)
  if (!chk.reasons.length) {
    setEmail(key, x => { x.round = round; x.status = 'confirmed'; x.cap_reasons = []; x.cap_notes = chk.notes })
    return completeHandoff(h.id, 'cap', `Cap confirmed it on review ${round}. It waits for your approval; nothing sends until you approve it and switch it live.`, [{ type: 'email', id: key, label: e.title }])
  }
  if (round >= MAX_ROUNDS) {
    setEmail(key, x => { x.round = round; x.status = 'confirmed'; x.cap_reasons = []; x.cap_notes = [...chk.reasons.map(r => `Still: ${r}`), ...chk.notes] })
    return completeHandoff(h.id, 'cap', `Cap let it through after ${round} reviews, with what he’d still change as notes. It waits for your approval.`, [{ type: 'email', id: key, label: e.title }])
  }
  setEmail(key, x => { x.round = round; x.status = 'sent_back'; x.cap_reasons = chk.reasons })
  completeHandoff(h.id, 'cap', `Cap sent it back (review ${round}): ${chk.reasons.join(' ')}`.slice(0, 1200), [{ type: 'email', id: key, label: e.title }])
  const r = openHandoff({ kind: 'email_rewrite', from: 'cap', to: 'ed', what: `Rewrite the email: ${e.title}`, ref: { type: 'email', id: key, label: e.title }, note: chk.reasons.join('\n'), parent_id: h.id }, { log: false })
  await runEmailWrite(r)
}

// ── rendering ──
export type Segment = 'returning' | 'pass_eligible' | 'pass_holder' | 'list'
const SEGMENT_TEXT: Record<Segment, string> = { returning: 'came once', pass_eligible: 'came 2+ times: pass offer', pass_holder: 'has the pass', list: 'list member' }

function niceDate(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? '').replace(/Hi ,/g, 'Hi,').replace(/ +([,.!])/g, '$1')
}

function ctaUrl(e: SeqEmail, s: SeqSettings): string {
  switch (e.cta) {
    case 'survey': return s.survey_url
    case 'next_reset': return s.next_reset_url
    case 'nine': return s.nine_url
    case 'gift': return s.gift_url
    case 'podcast': return s.podcast_url
    default: return ''
  }
}

export function renderEmail(e: SeqEmail, opts: { first_name?: string; segment: Segment; next_reset_date?: string | null; unsubscribe?: string | null; settings: SeqSettings }) {
  const s = opts.settings
  const vars: Record<string, string> = {
    first_name: (opts.first_name ?? '').trim(),
    coupon_code: s.coupon_code,
    next_reset_date: opts.next_reset_date ? niceDate(opts.next_reset_date) : 'the next Reset',
    gift_name: s.gift_name,
  }
  const blocks: string[] = [e.body]
  if (e.key === 't1' && opts.segment !== 'pass_holder') blocks.push(e.extras.coupon_block ?? '')
  if (e.key === 't4') {
    if (opts.segment === 'pass_holder') blocks.push(e.extras.pass_holder_note ?? '')
    else if (opts.segment === 'pass_eligible' && s.pass_url) blocks.push(e.extras.pass_offer ?? '')
    else blocks.push(e.extras.price_returning ?? '')
  }
  if (e.key === 't6' && opts.segment === 'pass_holder' && s.medium_url) blocks.push(e.extras.medium_note ?? '')
  const body = fill(blocks.filter(b => b.trim()).join('\n\n'), vars)
  const content = {
    preheader: fill(e.preheader, vars), body,
    cta_label: fill(e.cta_label, vars), cta_url: ctaUrl(e, s), ps: fill(e.ps, vars),
    reason: e.branch === 'wfh' ? 'You’re getting this because you joined the AI Mom podcast list.' : opts.segment === 'list' ? 'You’re getting this because you joined the Be There For Her list.' : 'You’re getting this because you came to The Reset and said Mandi could email you.',
  }
  const html = renderBrandEmail(e.branch === 'wfh' ? 'wfh' : 'btfh', content, { unsubscribeUrl: opts.unsubscribe ?? undefined })
  return { subject: fill(e.subject, vars), html, text: [body, content.cta_label && content.cta_url ? `${content.cta_label}: ${content.cta_url}` : '', content.ps ? `P.S. ${content.ps}` : ''].filter(Boolean).join('\n\n') }
}

// ── eligibility ──
export type Decision = { email: string; name: string; send: boolean; reason: string; segment?: Segment }
export type TouchPlan = { key: SeqEmailKey; title: string; send_on: string | null; due: boolean; blockers: string[]; send: Decision[]; skip: Decision[] }
export type DryRun = { event: ResetEvent; next_event: ResetEvent | null; today: string; touches: TouchPlan[]; totals: { would_send: number; skipped: number }; live: boolean }

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const todayCT = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)

function settingsBlockers(e: SeqEmail, s: SeqSettings): string[] {
  const b: string[] = []
  if (e.status !== 'approved') b.push(e.body ? 'Waiting for your approval of the draft.' : 'Ed hasn’t written it yet.')
  if (['t1', 't4', 't5'].includes(e.key) && !s.coupon_code) b.push('No $8 coupon code is set, so the $25 price can’t be given.')
  if (e.key === 't2' && !s.nine_url) b.push('No link for Listen To Your Intuition ($9) is set. Touch 2 is optional, so it simply holds.')
  if (e.key === 't6' && (!s.gift_name || !s.gift_url)) b.push('No free gift is set (name and link).')
  if (!ctaUrl(e, s) && e.cta !== 'none' && e.cta !== 'reply') b.push('The button has no link.')
  return b
}

function segmentOf(c: Contact | undefined): Segment {
  if (c?.labels.includes('reset_pass')) return 'pass_holder'
  if ((c?.attendance_count ?? 0) >= 2) return 'pass_eligible'
  return 'returning'
}

// The one decision every send goes through. Pure: reads, never writes.
function decide(key: SeqEmailKey, p: PersonView, c: Contact | undefined, ctx: { eventId: string; next: ResetEvent | null; sends: SeqSend[] }): Decision {
  const email = p.email ?? ''
  const name = p.name || c?.name || ''
  const no = (reason: string): Decision => ({ email, name, send: false, reason })
  if (!email) return no('No email address.')
  if (p.unsubscribed) return no('Unsubscribed.')
  if (p.bounced || c?.bounced) return no('An earlier email bounced.')
  if (c?.consent?.luma?.value === 'no') return no('Luma says no to marketing email.')
  if (!(p.lists ?? []).includes('joyful_media')) {
    if ((p.lists ?? []).includes('wfh')) return no('Wrong list: she’s on the WFH (podcast) list only, not Joyful Media.')
    return no('No consent: Luma didn’t say yes and she hasn’t joined the Joyful Media list.')
  }
  const a = c?.resets?.find(r => r.event_id === ctx.eventId)
  if (!a?.attended) return no(a?.status === 'registered' ? 'Registered but didn’t attend this Reset.' : a?.status === 'invited' ? 'Invited on Luma, never registered.' : `Didn’t attend (${a?.status ?? 'not on this Reset'}).`)
  if (ctx.sends.some(s => s.event_id === ctx.eventId && s.key === key && s.email === email && s.status === 'sent')) return no(`Already got this touch for this Reset.`)
  const segment = segmentOf(c)
  if (key === 't5') {
    if (segment === 'pass_holder') return no('Has the pass: no reminder pressure.')
    if (!ctx.next) return no('Can’t tell yet whether she registered: import the next Reset’s Luma list first.')
    const n = c?.resets?.find(r => r.event_id === ctx.next!.id)
    if (n && (n.status === 'registered' || n.attended)) return no('Already registered for the next Reset.')
  }
  return { email, name, send: true, reason: `Eligible · ${SEGMENT_TEXT[segment]}`, segment }
}

export function dryRun(eventId: string, opts: { today?: string } = {}): DryRun | { error: string } {
  const db = readDb()
  const seq = ensure(db)
  const event = (db.reset_events ?? []).find(e => e.id === eventId)
  if (!event) return { error: 'That Reset isn’t in RISE. Import its Luma list first.' }
  const target = addDays(event.date, 14)
  const next = (db.reset_events ?? []).filter(e => e.date > event.date).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  const people = getPeople()
  const contacts = new Map((db.contacts ?? []).filter(c => c.email).map(c => [c.email!, c]))
  const onEvent = people.filter(p => p.email && contacts.get(p.email)?.resets?.some(r => r.event_id === eventId))
  const today = opts.today ?? todayCT()
  const touches: TouchPlan[] = []
  for (const e of seq.emails.filter(x => x.day_offset !== null)) {
    const send_on = addDays(event.date, e.day_offset!)
    const blockers = settingsBlockers(e, seq.settings)
    if (e.key === 't4' || e.key === 't5') {
      if (!next) blockers.push(`The next Reset (${target}?) isn’t in RISE yet. Import its Luma list (even with no one registered) so the date and the registrations are right.`)
      else if (next.date !== target) blockers.push(`Heads up: the next Reset in RISE is ${next.date}, not ${target} (two weeks later). Check the date.`)
    }
    const decisions = onEvent.map(p => decide(e.key, p, contacts.get(p.email!), { eventId, next, sends: seq.sends }))
    touches.push({ key: e.key, title: e.title, send_on, due: send_on <= today, blockers, send: decisions.filter(d => d.send), skip: decisions.filter(d => !d.send) })
  }
  return { event, next_event: next, today, touches, totals: { would_send: touches.reduce((n, t) => n + (t.blockers.length ? 0 : t.send.length), 0), skipped: touches.reduce((n, t) => n + t.skip.length, 0) }, live: seq.settings.sequence_live }
}

// Who's on each list and would get its welcome (when it's approved and live). New signups only
// get it at the moment they join; this shows the current list for checking.
export function welcomeDryRun(branch: BranchId) {
  const db = readDb()
  const seq = ensure(db)
  const key: SeqEmailKey = branch === 'wfh' ? 'welcome_wfh' : 'welcome_joyful_media'
  const e = seq.emails.find(x => x.key === key)!
  const contacts = new Map((db.contacts ?? []).filter(c => c.email).map(c => [c.email!, c]))
  const send: Decision[] = [], skip: Decision[] = []
  for (const p of getPeople()) {
    if (!p.email) continue
    const onList = (p.lists ?? []).includes(branch)
    const d: Decision = { email: p.email, name: p.name, send: false, reason: '' }
    if (!onList) continue
    if (p.unsubscribed) d.reason = 'Unsubscribed.'
    else if (p.bounced || contacts.get(p.email)?.bounced) d.reason = 'An earlier email bounced.'
    else if (seq.sends.some(s => s.key === key && s.email === p.email && s.status === 'sent')) d.reason = 'Already welcomed.'
    else { d.send = true; d.reason = 'On the list' }
    ;(d.send ? send : skip).push(d)
  }
  return { key, title: e.title, live: seq.settings.welcome_live[branch], blockers: settingsBlockers(e, seq.settings).filter(b => !b.includes('coupon')), send, skip }
}

// ── logging on the person's history ──
function logOnContact(email: string, ev: PersonEvent, flag?: { bounced?: boolean }) {
  const db = readDb()
  db.contacts ??= []
  let c = db.contacts.find(x => x.email === email)
  const now = nowIso()
  if (!c) { c = { id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, email, name: '', labels: [], created_at: now, updated_at: now }; db.contacts.push(c) }
  c.history ??= []
  // A skip is logged once per reason, not every time the runner looks.
  if (ev.kind === 'skipped' && c.history.some(h => h.kind === 'skipped' && h.text === ev.text)) return
  c.history.push(ev)
  if (flag?.bounced) c.bounced = true
  c.updated_at = now
  writeDb(db)
}

function recordSend(rec: Omit<SeqSend, 'id' | 'at'>) {
  const db = readDb()
  const s = ensure(db)
  s.sends.push({ ...rec, id: `ss_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: nowIso() })
  writeDb(db)
}

async function sendOne(e: SeqEmail, d: Decision, ctx: { eventId: string | null; next: ResetEvent | null; settings: SeqSettings }): Promise<{ ok: boolean; error?: string }> {
  const link = unsubscribeUrl(d.email), oneClick = unsubscribeApiUrl(d.email)
  if (!link || !oneClick) return { ok: false, error: 'Could not sign an unsubscribe link.' }
  const r = renderEmail(e, { first_name: d.name.split(/\s+/)[0], segment: d.segment ?? 'list', next_reset_date: ctx.next?.date ?? null, unsubscribe: link, settings: ctx.settings })
  const from = e.branch === 'wfh' ? '"Mandi Beck · AI Mom Podcast" <hi@aimomeducation.com>' : '"Mandi · Be There For Her" <hi@aimomeducation.com>'
  return resendSend(d.email, r.subject, r.html, OWNER_TEST_ADDRESS, from, { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' })
}

// The real runner. Refuses unless every gate is open. Sends only touches that are due today or
// earlier, have no blockers, and only to people who pass decide(). Logs everything.
export async function runSequence(eventId: string, opts: { confirm?: string } = {}): Promise<{ error: string } | { sent: number; failed: number; skipped: number; held: string[] }> {
  const seq = getSequence()
  if (!seq.settings.sequence_live) return { error: 'The sequence isn’t switched live. Nothing was sent.' }
  if (opts.confirm !== 'SEND') return { error: 'Confirm with "SEND" to send for real. Nothing was sent.' }
  if (!process.env.RESEND_API_KEY) return { error: 'Resend isn’t configured here. Nothing was sent.' }
  const plan = dryRun(eventId)
  if ('error' in plan) return plan
  let sent = 0, failed = 0, skipped = 0
  const held: string[] = []
  for (const t of plan.touches) {
    if (!t.due) continue
    if (t.blockers.length) { held.push(`${t.title}: ${t.blockers.join(' ')}`); continue }
    const e = getSequence().emails.find(x => x.key === t.key)!
    for (const d of t.skip) { skipped++; logOnContact(d.email, { at: nowIso(), kind: 'skipped', text: `Reset sequence · ${t.title} (${plan.event.date}): skipped. ${d.reason}` }) }
    for (const d of t.send) {
      const r = await sendOne(e, d, { eventId, next: plan.next_event, settings: seq.settings })
      recordSend({ event_id: eventId, key: t.key, email: d.email, status: r.ok ? 'sent' : 'failed', error: r.error, segment: d.segment })
      logSend({ email: d.email, subject: `${t.title} (${plan.event.date})`, product: 'reset-sequence', status: r.ok ? 'sent' : 'failed', via: 'resend' })
      if (r.ok) sent++
      else { failed++; logOnContact(d.email, { at: nowIso(), kind: 'note', status: 'failed', text: `Reset sequence · ${t.title}: failed. ${r.error ?? ''}` }, { bounced: /bounce|suppress/i.test(r.error ?? '') }) }
    }
  }
  logActivity({ type: 'note', icon: '🌙', source: 'cap', title: `Reset sequence · ${plan.event.date}: ${sent} sent`, detail: `${failed} failed, ${skipped} skipped${held.length ? `, ${held.length} touch(es) held` : ''}` })
  return { sent, failed, skipped, held }
}

// A signup joined a list: send that list's welcome if it's approved and switched live. Called
// from the public signup route. Logs skips and sends on her history. Never throws.
export async function welcomeOnSignup(email: string, branch: BranchId, name = ''): Promise<void> {
  try {
    const seq = getSequence()
    const key: SeqEmailKey = branch === 'wfh' ? 'welcome_wfh' : 'welcome_joyful_media'
    const e = seq.emails.find(x => x.key === key)!
    const em = email.trim().toLowerCase()
    if (!seq.settings.welcome_live[branch] || e.status !== 'approved' || !process.env.RESEND_API_KEY) return
    const p = getPeople().find(x => x.email === em)
    if (!p || !(p.lists ?? []).includes(branch)) return
    if (p.unsubscribed || p.bounced) { logOnContact(em, { at: nowIso(), kind: 'skipped', text: `${e.title}: skipped. ${p.unsubscribed ? 'Unsubscribed.' : 'An earlier email bounced.'}` }); return }
    if (seq.sends.some(s => s.key === key && s.email === em && s.status === 'sent')) return
    const upcoming = (readDb().reset_events ?? []).filter(x => x.date >= todayCT()).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
    const r = await sendOne(e, { email: em, name: name || p.name, send: true, reason: '', segment: 'list' }, { eventId: null, next: upcoming, settings: seq.settings })
    recordSend({ event_id: null, key, email: em, status: r.ok ? 'sent' : 'failed', error: r.error, segment: 'list' })
    logSend({ email: em, subject: e.title, product: key, status: r.ok ? 'sent' : 'failed', via: 'resend' })
    if (!r.ok) logOnContact(em, { at: nowIso(), kind: 'note', status: 'failed', text: `${e.title}: failed. ${r.error ?? ''}` }, { bounced: /bounce|suppress/i.test(r.error ?? '') })
  } catch { /* a welcome never breaks a signup */ }
}

// A test send: ONLY to Mandi's own address, only with "TEST". Used when she says so.
export async function testSend(key: SeqEmailKey, segment: Segment, confirm?: string): Promise<{ ok: boolean; error?: string; to?: string }> {
  if (confirm !== 'TEST') return { ok: false, error: 'Confirm with "TEST". Nothing was sent.' }
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'Resend isn’t configured here. Nothing was sent.' }
  const seq = getSequence()
  const e = seq.emails.find(x => x.key === key)
  if (!e?.body) return { ok: false, error: 'There’s no draft to test.' }
  const next = (readDb().reset_events ?? []).filter(x => x.date >= todayCT()).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  const r = await sendOne({ ...e, subject: `[TEST · ${segment}] ${e.subject}` }, { email: OWNER_TEST_ADDRESS, name: 'Mandi', send: true, reason: 'test', segment }, { eventId: null, next, settings: seq.settings })
  logSend({ email: OWNER_TEST_ADDRESS, subject: `[TEST] ${e.title}`, product: 'reset-sequence-test', status: r.ok ? 'sent' : 'failed', via: 'resend' })
  return { ...r, to: OWNER_TEST_ADDRESS }
}

// A preview of one email as a given segment would see it (no send).
export function previewEmail(key: SeqEmailKey, segment: Segment) {
  const db = readDb()
  const seq = ensure(db)
  const e = seq.emails.find(x => x.key === key)
  if (!e) return null
  const next = (db.reset_events ?? []).filter(x => x.date >= todayCT()).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  return renderEmail(e, { first_name: 'Jess', segment, next_reset_date: next?.date ?? null, unsubscribe: '#unsubscribe', settings: { ...seq.settings, coupon_code: seq.settings.coupon_code || '[COUPON CODE]', gift_name: seq.settings.gift_name || '[GIFT]' } })
}
