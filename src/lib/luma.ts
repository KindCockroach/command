// Phase 5: Luma CSV import into People.
//
// Mandi exports an event's guests from Luma (Manage event → Guests → Export) and drops the CSV.
// RISE previews what it would do (new / merged / skipped, and why) and writes only when she says so.
//
// Rules:
// - Dedupe by email, case-insensitive. A second row with the same email in one file is skipped.
// - Merging never wipes anything: names fill only when blank, labels and products are only added,
//   history only grows, and a Reset already recorded is updated in place (attended stays true).
// - Registered vs actually attended, per event: approval_status (approved = registered) and
//   has_joined_event (Yes = attended). Each contact carries has_joined_event + attendance_count.
// - Consent is kept exactly as Luma gives it. Luma's standard guest export has NO consent column;
//   if the event asked a registration question about email, that column is read. No column, or a
//   blank answer, is 'unknown', and unknown is never treated as yes: no marketing email.

import { readDb, writeDb, logActivity, type Contact, type ConsentValue, type ResetAttendance, type ResetEvent } from './db'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// RFC 4180-ish: quoted fields, doubled quotes, CRLF, a BOM.
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = [], field = '', q = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { field += '"'; i++ } else q = false }
      else field += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(c => c.trim())) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(c => c.trim())) rows.push(row)
  return rows
}

// A registration question about email/marketing, if the event asked one.
const CONSENT_COL = /consent|opt[\s_-]?in|marketing|newsletter|subscribe|email (updates|list)|hear from|keep (me|you) (posted|updated)|email (you|me)\b|contact (you|me)\b|permission|agree/i
const KNOWN = new Set(['guest_id', 'name', 'first_name', 'last_name', 'email', 'phone_number', 'created_at', 'approval_status', 'has_joined_event', 'amount', 'amount_tax', 'amount_discount', 'currency', 'coupon_code', 'ticket_type_id', 'ticket_name', 'referrer', 'referred_by', 'qr_code_url', 'survey_response_rating', 'survey_response_feedback'])

function consentFrom(raw: string): ConsentValue {
  const v = raw.trim().toLowerCase()
  if (!v) return 'unknown'
  if (/^(yes|y|true|1|checked|agree|agreed|i agree|opt in|opted in|subscribed?)\b/.test(v)) return 'yes'
  if (/^(no|n|false|0|unchecked|opt out|opted out|decline)/.test(v)) return 'no'
  return 'unknown'
}

function statusFrom(raw: string): ResetAttendance['status'] {
  const v = raw.trim().toLowerCase()
  if (v === 'approved' || v === 'going' || v === 'registered') return 'registered'
  if (v === 'pending_approval' || v === 'pending') return 'pending'
  return v || 'unknown'
}

// "RESET Live With Mandi - Guests - 2026-11-23-03-06-38.csv" → the Reset that export is about:
// the Sunday on or just before the export date (Resets run Sunday 8 PM CT, so a Monday export
// at 3 AM is still Sunday's Reset). Mandi can change it before importing.
export function guessFromFilename(name: string): { event_name: string; event_date: string } {
  const base = (name.split(/[\\/]/).pop() || '').replace(/\.csv$/i, '')
  const event_name = (base.split(/\s+-\s+Guests\b/i)[0] || base).trim() || 'The Reset'
  const m = base.match(/(\d{4})-(\d{2})-(\d{2})/)
  let d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date()
  const dow = d.getUTCDay()
  d = new Date(d.getTime() - dow * 86400000)
  return { event_name, event_date: d.toISOString().slice(0, 10) }
}

export type LumaRow = {
  line: number
  email: string
  name: string
  status: ResetAttendance['status']
  attended: boolean
  paid?: string
  coupon?: string
  ticket?: string
  luma_guest_id?: string
  registered_at?: string
  consent: ConsentValue
}

export type PreviewRow = {
  line: number
  email: string
  name: string
  action: 'new' | 'merged' | 'skipped'
  why: string
  status?: string
  attended?: boolean
  consent?: ConsentValue
  attendance_after?: number
}

export type LumaPreview = {
  event: { id: string; name: string; date: string; exists: boolean }
  consent_column: string | null
  counts: { rows: number; new: number; merged: number; skipped: number; registered: number; attended: number; invited: number; consent_yes: number; consent_no: number; consent_unknown: number }
  warnings: string[]
  rows: PreviewRow[]
}

export const eventIdFor = (date: string) => `reset_${date}`

function readRows(csv: string): { rows: LumaRow[]; skipped: PreviewRow[]; consentCol: string | null; error?: string } {
  const grid = parseCsv(csv)
  if (grid.length < 1) return { rows: [], skipped: [], consentCol: null, error: 'The file is empty.' }
  const head = grid[0].map(h => h.trim())
  const col = (n: string) => head.findIndex(h => h.toLowerCase() === n)
  const iEmail = col('email')
  if (iEmail < 0) return { rows: [], skipped: [], consentCol: null, error: 'This doesn’t look like a Luma guest export: there’s no "email" column.' }
  const iName = col('name'), iFirst = col('first_name'), iLast = col('last_name'), iStatus = col('approval_status'), iJoined = col('has_joined_event')
  const iAmt = col('amount'), iCoupon = col('coupon_code'), iTicket = col('ticket_name'), iGid = col('guest_id'), iCreated = col('created_at')
  const iConsent = head.findIndex(h => !KNOWN.has(h.toLowerCase()) && CONSENT_COL.test(h))
  const consentCol = iConsent >= 0 ? head[iConsent] : null
  const rows: LumaRow[] = []
  const skipped: PreviewRow[] = []
  const seen = new Map<string, number>()
  for (let r = 1; r < grid.length; r++) {
    const g = grid[r]
    const get = (i: number) => (i >= 0 ? (g[i] ?? '') : '').trim()
    const email = get(iEmail).toLowerCase()
    const name = get(iName) || [get(iFirst), get(iLast)].filter(Boolean).join(' ')
    const line = r + 1
    if (!EMAIL_RE.test(email)) { skipped.push({ line, email: get(iEmail), name, action: 'skipped', why: email ? 'Not a valid email address.' : 'No email on this row.' }); continue }
    if (seen.has(email)) { skipped.push({ line, email, name, action: 'skipped', why: `Same email as line ${seen.get(email)} in this file (counted once).` }); continue }
    seen.set(email, line)
    rows.push({
      line, email, name,
      status: statusFrom(get(iStatus)),
      attended: /^(yes|true|1)$/i.test(get(iJoined)),
      paid: get(iAmt) || undefined,
      coupon: get(iCoupon) || undefined,
      ticket: get(iTicket) || undefined,
      luma_guest_id: get(iGid) || undefined,
      registered_at: get(iCreated) || undefined,
      consent: iConsent >= 0 ? consentFrom(get(iConsent)) : 'unknown',
    })
  }
  return { rows, skipped, consentCol }
}

const paidMoney = (paid?: string) => { const n = parseFloat((paid ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 }

// The preview: what an import WOULD do. Writes nothing.
export function previewLuma(csv: string, ev: { name: string; date: string }): LumaPreview | { error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) return { error: 'Pick the date of the Reset this export is for.' }
  const { rows, skipped, consentCol, error } = readRows(csv)
  if (error) return { error }
  const db = readDb()
  const id = eventIdFor(ev.date)
  const byEmail = new Map((db.contacts ?? []).filter(c => c.email).map(c => [c.email!, c]))
  // People who exist only as signups or guests (no CRM record yet) are a merge too: the import
  // creates their CRM record and their signup/guest history stays attached by email.
  const known = new Set<string>([...(db.waitlist ?? []).map(w => w.email.toLowerCase()), ...(db.podcast_guests ?? []).map(g => (g.email ?? '').toLowerCase()).filter(Boolean)])
  const out: PreviewRow[] = []
  const upcoming = ev.date >= new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)
  for (const r of rows) {
    const c = byEmail.get(r.email)
    const prior = (c?.resets ?? []).filter(x => x.attended && x.event_id !== id).length
    const after = prior + (r.attended || (c?.resets ?? []).some(x => x.event_id === id && x.attended) ? 1 : 0)
    const what = r.attended ? 'attended' : r.status === 'registered' ? (upcoming ? 'registered' : 'registered, didn’t attend') : r.status === 'invited' ? 'invited on Luma, didn’t register' : r.status
    const again = c?.resets?.some(x => x.event_id === id) ? ' This Reset is already on her record; it’s updated, not doubled.' : ''
    if (c) out.push({ line: r.line, email: r.email, name: r.name || c.name, action: 'merged', why: `Already in People. Adds this Reset (${what}); keeps her history.${again}`, status: r.status, attended: r.attended, consent: r.consent, attendance_after: after })
    else if (known.has(r.email)) out.push({ line: r.line, email: r.email, name: r.name, action: 'merged', why: `Already in People as a signup or guest. Adds a CRM record with this Reset (${what}).`, status: r.status, attended: r.attended, consent: r.consent, attendance_after: after })
    else out.push({ line: r.line, email: r.email, name: r.name, action: 'new', why: `New person: ${what}.`, status: r.status, attended: r.attended, consent: r.consent, attendance_after: after })
  }
  const all = [...out, ...skipped].sort((a, b) => a.line - b.line)
  const warnings: string[] = []
  if (!consentCol) warnings.push('This export has no consent column, so everyone’s email consent is "unknown" and none of them will get marketing email (the Reset sequence) from it. To change that, add a registration question on Luma (for example "Can Mandi email you about future Resets?") or have them join the Joyful Media list on the site.')
  if (rows.length && !rows.some(r => r.attended)) warnings.push('Nobody in this file is marked as attended (has_joined_event). If the Reset already happened, export again after check-in, or the sequence will have no one to send to.')
  const existing = (db.reset_events ?? []).find(e => e.id === id)
  if (existing && existing.name !== ev.name) warnings.push(`There’s already a Reset on ${ev.date} called "${existing.name}". This import adds to it.`)
  return {
    event: { id, name: ev.name, date: ev.date, exists: !!existing },
    consent_column: consentCol,
    counts: {
      rows: rows.length + skipped.length,
      new: out.filter(r => r.action === 'new').length,
      merged: out.filter(r => r.action === 'merged').length,
      skipped: skipped.length,
      registered: rows.filter(r => r.status === 'registered').length,
      attended: rows.filter(r => r.attended).length,
      invited: rows.filter(r => r.status === 'invited').length,
      consent_yes: rows.filter(r => r.consent === 'yes').length,
      consent_no: rows.filter(r => r.consent === 'no').length,
      consent_unknown: rows.filter(r => r.consent === 'unknown').length,
    },
    warnings,
    rows: all,
  }
}

// Write it. Same reading as the preview; returns the preview it applied.
export function applyLuma(csv: string, ev: { name: string; date: string }): LumaPreview | { error: string } {
  const pv = previewLuma(csv, ev)
  if ('error' in pv) return pv
  const { rows } = readRows(csv)
  const db = readDb()
  db.contacts ??= []
  db.reset_events ??= []
  const now = new Date().toISOString()
  const id = pv.event.id
  const nice = new Date(`${ev.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  for (const r of rows) {
    let c: Contact | undefined = db.contacts.find(x => x.email === r.email)
    if (!c) {
      c = { id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, email: r.email, name: r.name, labels: [], products: [], created_at: now, updated_at: now }
      db.contacts.push(c)
    }
    if (!c.name && r.name) c.name = r.name
    c.resets ??= []
    let a = c.resets.find(x => x.event_id === id)
    const firstTime = !a
    if (!a) { a = { event_id: id, status: r.status, attended: r.attended, imported_at: now }; c.resets.push(a) }
    else {
      // Re-import of the same Reset: update in place. Attendance never flips back to "no".
      a.status = a.status === 'registered' && r.status === 'invited' ? a.status : r.status
      a.attended = a.attended || r.attended
      a.imported_at = now
    }
    if (r.paid) a.paid = r.paid
    if (r.coupon) a.coupon = r.coupon
    if (r.ticket) a.ticket = r.ticket
    if (r.luma_guest_id) a.luma_guest_id = r.luma_guest_id
    if (r.registered_at) a.registered_at = r.registered_at
    c.attendance_count = c.resets.filter(x => x.attended).length
    c.has_joined_event = c.attendance_count > 0
    // Consent as Luma gave it. A blank in a later export never erases an earlier answer.
    if (r.consent !== 'unknown' || !c.consent?.luma) c.consent = { ...(c.consent ?? {}), luma: { value: r.consent, ...(pv.consent_column ? { question: pv.consent_column } : {}), at: now } }
    const add = (l: Contact['labels'][number]) => { if (!c!.labels.includes(l)) c!.labels.push(l) }
    if (r.attended) add('reset_attendee')
    if (r.status === 'invited' && !r.attended) add('invited')
    if (paidMoney(r.paid)) { add('paid_customer'); c.products ??= []; if (!c.products.includes('reset')) c.products.push('reset') }
    c.history ??= []
    const line = r.attended ? `The Reset · ${nice}: attended` : r.status === 'registered' ? `The Reset · ${nice}: registered${ev.date >= new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10) ? '' : ' (didn’t attend)'}` : `The Reset · ${nice}: ${r.status} on Luma`
    if (firstTime || !c.history.some(h => h.text.startsWith(line))) c.history.push({ at: now, kind: 'event', text: line + (paidMoney(r.paid) ? ` · paid ${r.paid}` : '') })
    c.updated_at = now
  }
  const evRec: ResetEvent = db.reset_events.find(e => e.id === id) ?? { id, name: ev.name, date: ev.date, imported_at: now, updated_at: now }
  if (!db.reset_events.includes(evRec)) db.reset_events.push(evRec)
  evRec.updated_at = now
  const onEvent = db.contacts.filter(c => c.resets?.some(x => x.event_id === id))
  evRec.counts = {
    rows: onEvent.length,
    registered: onEvent.filter(c => c.resets!.find(x => x.event_id === id)!.status === 'registered').length,
    attended: onEvent.filter(c => c.resets!.find(x => x.event_id === id)!.attended).length,
    invited: onEvent.filter(c => c.resets!.find(x => x.event_id === id)!.status === 'invited').length,
  }
  db.reset_events.sort((a, b) => a.date.localeCompare(b.date))
  writeDb(db)
  logActivity({ type: 'note', icon: '🎟️', source: 'luma', title: `Luma import · ${ev.name} (${ev.date})`, detail: `${pv.counts.new} new, ${pv.counts.merged} merged, ${pv.counts.skipped} skipped · ${pv.counts.attended} attended` })
  return pv
}

export function listResetEvents(): ResetEvent[] { return [...(readDb().reset_events ?? [])].sort((a, b) => a.date.localeCompare(b.date)) }
