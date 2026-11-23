// Phase 4: handoff receipts — the one way agents pass work to each other.
//
// Every handoff says who it is from and to, what it is, the card or record it is about,
// its status (open → done, or failed with the reason) and a receipt of what was produced.
// An automated handoff that sits open too long reads as STUCK. Failed and stuck ones stay
// visible with a retry (acceptance scenario 6); nothing is ever marked done without a receipt.

import { readDb, writeDb, logActivity, type Handoff, type HandoffAgent, type HandoffKind, type HandoffRef } from './db'

const nowIso = () => new Date().toISOString()

// Handoffs an agent picks up by itself. If one of these is still open after this long,
// the run died (a restart, a timeout) and it shows as stuck with a retry.
export const AUTO_KINDS: HandoffKind[] = ['footage_in', 'write', 'review', 'ed_check', 'rewrite', 'her_note', 'winners_in', 'film_now']
export const STUCK_MS = 10 * 60 * 1000

export const AGENT_LABEL: Record<HandoffAgent, string> = {
  mandi: 'You', her: 'Her', commander: 'Man', cap: 'Cap', ed: 'Ed', rex: 'Rex', pod: 'Pod', biz: 'Biz',
  notes: 'Notes', build_log: 'Build log', posted: 'Posted',
}

export type HandoffView = Handoff & { state: 'open' | 'waiting' | 'stuck' | 'done' | 'failed'; can_retry: boolean; title?: string }

export function viewHandoff(h: Handoff, titles?: Map<number, string>): HandoffView {
  const auto = AUTO_KINDS.includes(h.kind)
  let state: HandoffView['state'] = h.status
  if (h.status === 'open') state = auto ? (Date.now() - Date.parse(h.updated_at) > STUCK_MS ? 'stuck' : 'open') : 'waiting'
  return { ...h, state, can_retry: auto && (state === 'failed' || state === 'stuck'), title: h.content_id && titles ? titles.get(h.content_id) : undefined }
}

export function listHandoffs(f: { to?: string; from?: string; status?: string; content_id?: number; thread_id?: string; kind?: string; limit?: number } = {}): HandoffView[] {
  const db = readDb()
  const titles = new Map(db.content.map(c => [c.id, c.title]))
  return (db.handoffs ?? [])
    .map(normalize)
    .filter(h => (!f.to || h.to === f.to) && (!f.from || h.from === f.from) && (!f.kind || h.kind === f.kind)
      && (!f.content_id || h.content_id === f.content_id) && (!f.thread_id || h.thread_id === f.thread_id))
    .map(h => viewHandoff(h, titles))
    .filter(h => !f.status || h.status === f.status || h.state === f.status)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, f.limit ?? 500)
}

export function getHandoff(id: string): Handoff | null {
  const h = (readDb().handoffs ?? []).find(x => x.id === id)
  return h ? normalize(h) : null
}

// Phase 3 records predate from/to/what on every kind; read them the same way.
function normalize(h: Handoff): Handoff {
  return { ...h, media_urls: h.media_urls ?? [], missing: h.missing ?? [], content_id: h.content_id ?? null, what: h.what ?? (h.kind === 'footage_in' ? 'Footage landed: brief the writers' : undefined) }
}

let seq = 0
export function openHandoff(data: {
  kind: HandoffKind; from: HandoffAgent; to: HandoffAgent; what: string
  content_id?: number | null; ref?: HandoffRef | null; account_id?: string | null; note?: string
  parent_id?: string | null; thread_id?: string | null; calendar_item_id?: string | null
}, opts: { log?: boolean } = {}): Handoff {
  const db = readDb()
  db.handoffs ??= []
  const now = nowIso()
  const h: Handoff = {
    id: `ho_${Date.now().toString(36)}_${(++seq).toString(36)}${db.handoffs.length}`,
    kind: data.kind, from: data.from, to: data.to, what: data.what.slice(0, 300),
    content_id: data.content_id ?? null, ref: data.ref ?? null, account_id: data.account_id ?? null,
    calendar_item_id: data.calendar_item_id ?? null, media_urls: [], missing: [], status: 'open',
    ...(data.note ? { note: data.note.slice(0, 2000) } : {}),
    parent_id: data.parent_id ?? null, thread_id: data.thread_id ?? null, attempts: 0,
    created_at: now, updated_at: now,
  }
  db.handoffs.push(h)
  writeDb(db)
  if (opts.log !== false) logActivity({ type: 'handoff', icon: '↪︎', source: data.from, account_id: h.account_id, content_id: h.content_id,
    title: `${AGENT_LABEL[h.from]} → ${AGENT_LABEL[h.to]}: ${h.what}`.slice(0, 140) })
  return h
}

function patch(id: string, fn: (h: Handoff) => void): Handoff | null {
  const db = readDb()
  const h = (db.handoffs ?? []).find(x => x.id === id)
  if (!h) return null
  fn(h)
  h.updated_at = nowIso()
  writeDb(db)
  return normalize(h)
}

// A run began (first try or a retry): it is open again and counts an attempt.
export function startAttempt(id: string): Handoff | null {
  return patch(id, h => { h.status = 'open'; h.error = null; h.attempts = (h.attempts ?? 0) + 1 })
}

export function completeHandoff(id: string, by: string, receipt: string, refs: HandoffRef[] = []): Handoff | null {
  const h = patch(id, x => { x.status = 'done'; x.done_at = nowIso(); x.done_by = by; x.receipt = receipt.slice(0, 1200); x.receipt_refs = refs; x.error = null })
  if (h) logActivity({ type: 'handoff_done', icon: '✓', source: by, account_id: h.account_id, content_id: h.content_id,
    title: `${AGENT_LABEL[h.to]} finished: ${h.what ?? h.kind}`.slice(0, 140), detail: receipt.slice(0, 300) })
  return h
}

export function failHandoff(id: string, error: string): Handoff | null {
  const h = patch(id, x => { x.status = 'failed'; x.error = (error || 'It failed without saying why.').slice(0, 500) })
  if (h) logActivity({ type: 'handoff_failed', icon: '⚠️', source: h.to, account_id: h.account_id, content_id: h.content_id,
    title: `${AGENT_LABEL[h.to]} couldn’t finish: ${h.what ?? h.kind}`.slice(0, 140), detail: h.error ?? undefined })
  return h
}

// Mandi (or a later agent) closes a waiting handoff by hand: still needs a line saying why.
export function closeByHand(id: string, by: string, receipt: string): Handoff | null {
  return completeHandoff(id, by, receipt || 'Closed by hand.')
}
