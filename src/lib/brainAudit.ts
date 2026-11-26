// Phase 8 · A2: the Brain audit. Step 1 (this file's PROPOSAL) changes nothing: it shows up as ONE
// Approve item for Mandi. Step 2 (applyBrainAudit) runs only on her Approve: back up db.json,
// write the merged "business now" memory, retag the keepers, and mark the rest retired (inactive,
// never deleted; getMemoryContext skips retired memories). The 171 voice_archive memories and the
// 15 core voice rules are untouched (they already live in the writers' voice block).
//
// Tags keep the old role names (callGPT still asks by strategist/ceo/…) and add the roster keys
// (her, commander, cap, rex, pod, ed, cora, biz, fin) so the new agents read the same set.

import { readDb, writeDb, backupDb, createMemory } from './db'

export type BrainAuditAction =
  | { id: number; action: 'keep'; tags: string[]; why: string }
  | { id: number; action: 'rewrite'; tags: string[]; title: string; body: string; why: string }
  | { id: number; action: 'merge'; into: 'business_now'; why: string }
  | { id: number; action: 'retire'; why: string }

const HER = ['her']
const MAN = ['commander', 'strategist', 'ceo', 'operator']
const CAP = ['cap', 'content_director']
const WRITERS = ['rex', 'pod', 'ed', 'cora']
const FIN = ['biz', 'fin', 'cfo']

export const BUSINESS_NOW = {
  title: 'The business now (Nov 2026)',
  body: 'Two separate companies under a never-advertised LLC, never cross-promoted. JOYFUL MEDIA (mindfulness, PRIMARY): Be There For Her; The Reset, live every other Sunday 8 PM CT, $33 ($25 returning, $44/month pass), registration on Luma; Listen To Your Intuition ($9, Stripe). AI MOM (AI/tech): the AI Mom Podcast, biweekly, earns from sponsors, podcast-only CTA; AI services paused. Goal: cover the bills ($2–3k/month). Mandi has about 4 hours a day for the business. RISE is her internal tool, not a product. RETIRED, never recommend or mention: Caption Writer, RISE Lite / River Lite / RISE OS / RISE Journal, AI Mom at Work (@aimomatwork), Room30.',
  tags: [...HER, ...MAN, ...CAP, ...FIN],
}

export const BRAIN_AUDIT_PROPOSAL: BrainAuditAction[] = [
  { id: 1, action: 'merge', into: 'business_now', why: '$100k/90 days, the $10 workshop and Room30 are all out of date.' },
  { id: 3, action: 'rewrite', tags: [...HER, 'commander', 'operator', 'strategist'], title: 'Build windows', body: 'About 4 hours a day for the business (Nov 18). Kid time is protected; quick voice memos are fine. Her asks Mandi for the kids’ ages and homeschool days once and remembers them.', why: 'Kids’ ages and hours were stale; Her owns Mandi’s capacity.' },
  { id: 4, action: 'keep', tags: [...HER, 'commander', 'contrarian', 'strategist'], why: 'Still true; Her and Man should flag new shiny ideas.' },
  { id: 5, action: 'retire', why: '@aimomatwork is retired.' },
  { id: 6, action: 'merge', into: 'business_now', why: '“RISE is the product” is reversed: RISE is internal now.' },
  { id: 7, action: 'retire', why: 'RISE pricing questions: RISE is no longer a product.' },
  { id: 8, action: 'retire', why: 'Account tiers for the old $30k/90-day plan.' },
  { id: 9, action: 'keep', tags: ['pod', ...CAP], why: 'The podcast content boundary still applies.' },
  { id: 10, action: 'retire', why: 'RISE Lite is retired.' },
  { id: 11, action: 'keep', tags: ['commander', 'ceo'], why: 'Man’s daily raw-note review ritual.' },
  { id: 12, action: 'retire', why: 'RISE product tiers: RISE is no longer a product.' },
  { id: 15, action: 'retire', why: 'RISE Lite build: retired.' },
  { id: 16, action: 'retire', why: 'River Lite GPT: retired.' },
  { id: 17, action: 'retire', why: 'RISE OS tier: retired.' },
  { id: 18, action: 'retire', why: 'Productizing the station: retired.' },
  { id: 19, action: 'retire', why: 'RISE Journal: killed Sept 30.' },
  { id: 20, action: 'retire', why: '@airevealsus as the River Lite sales engine: retired.' },
  { id: 21, action: 'retire', why: '@airevealsus content mix for River Lite: retired with it.' },
  { id: 23, action: 'retire', why: 'Routing writing to @onetangledmind was the Caption Writer setup.' },
  { id: 24, action: 'merge', into: 'business_now', why: 'Folded into the retired list in “The business now”.' },
  { id: 28, action: 'retire', why: 'The July 15 River Lite focus is over.' },
  { id: 29, action: 'retire', why: 'Meta ads hacks for $27 products: no paid ads running. History kept.' },
  { id: 31, action: 'merge', into: 'business_now', why: 'Podcast + Reset is still the core, but the branches are separate now.' },
  { id: 33, action: 'retire', why: 'A July build note (the Commander shipped); the build log holds it.' },
  { id: 188, action: 'merge', into: 'business_now', why: 'The Reset is every other Sunday now, not weekly.' },
  { id: 189, action: 'keep', tags: ['pod', 'cora', ...CAP, 'strategist'], why: 'The podcast’s intuition thesis still holds.' },
]

/** True while the audit is waiting for Mandi (shown in Approve). */
export function brainAuditPending(): boolean {
  const s = readDb().brain_audit?.status
  return !s || s === 'proposed'
}

export function brainAuditSummary(): string {
  const n = (a: BrainAuditAction['action']) => BRAIN_AUDIT_PROPOSAL.filter(x => x.action === a).length
  return `Keep ${n('keep')}, rewrite ${n('rewrite')}, merge ${n('merge')} into “${BUSINESS_NOW.title}”, retire ${n('retire')} (inactive, never deleted). The 171 archived voice lessons and your 15 core voice rules stay as they are. Agents would read about 85% fewer memory tokens per call (the strategist set drops from about 4,100 to about 600).`
}

export function brainAuditDetail(): string {
  const mems = new Map((readDb().memories ?? []).map(m => [m.id, m.title]))
  return BRAIN_AUDIT_PROPOSAL.map(a => `${a.action.toUpperCase()} #${a.id} ${mems.get(a.id) ?? '(missing)'}: ${a.why}`).join('\n')
}

export function applyBrainAudit(): { ok: true; backup: string; merged_id: number; retired: number; retagged: number } | { ok: false; error: string } {
  if (!brainAuditPending()) return { ok: false, error: 'The Brain audit was already applied.' }
  const backup = backupDb('before-brain-audit')
  const merged = createMemory({ category: 'decision', title: BUSINESS_NOW.title, body: BUSINESS_NOW.body, agent_tags: BUSINESS_NOW.tags })
  const db = readDb()
  const now = new Date().toISOString()
  let retired = 0
  let retagged = 0
  for (const a of BRAIN_AUDIT_PROPOSAL) {
    const m = (db.memories ?? []).find(x => x.id === a.id)
    if (!m) continue
    if (a.action === 'keep') { m.agent_tags = a.tags; m.updated_at = now; retagged++ }
    else if (a.action === 'rewrite') { m.agent_tags = a.tags; m.title = a.title; m.body = a.body; m.updated_at = now; retagged++ }
    else { m.retired_at = now; m.retired_why = a.action === 'merge' ? `Merged into #${merged.id} “${BUSINESS_NOW.title}”. ${a.why}` : a.why; retired++ }
  }
  db.brain_audit = { status: 'applied', applied_at: now, backup, merged_id: merged.id }
  writeDb(db)
  return { ok: true, backup, merged_id: merged.id, retired, retagged }
}

export function declineBrainAudit(reason?: string) {
  const db = readDb()
  db.brain_audit = { status: 'declined', declined_at: new Date().toISOString(), reason: reason ?? '' }
  writeDb(db)
}
