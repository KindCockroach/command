// THE GUEST KIT — podcast guests and influencer collaborations, end to end, on ONE record:
// the existing guest card (podcast_guests) plus its booking from /book.
//   invite → booked → questionnaire (can go out automatically) → prep → record → thank-you
//   → follow-up kit (replay, episode link, assets, caption) → their promo.
// Email goes through Resend (lib/email). Every send is logged on the guest's comms, and a
// failed send stays visible as "failed" (never silently marked done).
// Branch rule: the podcast is WFH and podcast-only. No Reset or Joyful Media offers here.

import { randomUUID } from 'crypto'
import { readDb, writeDb, addGuestComm, createPodcastGuest, logActivity, type PodcastGuest, type GuestKit, type GuestKitConfig, type PodcastBooking } from './db'
import { sendEmail, basicEmailHtml } from './email'

export const DEFAULT_GUEST_KIT_CONFIG: GuestKitConfig = { auto_questionnaire: false, questionnaire_days_before: 7 }

// ── the checklist (offsets are days from the recording / collab date) ──
type Step = { id: string; text: string; offset: number; auto?: (g: PodcastGuest, b?: PodcastBooking) => string | undefined }
export const PODCAST_STEPS: Step[] = [
  { id: 'invite', text: 'Invite sent', offset: -21, auto: (g, b) => g.kit?.invite?.sent_at || g.stages?.attempt1 || b?.created_at },
  { id: 'booked', text: 'Booked a recording slot', offset: -14, auto: (_g, b) => b?.created_at },
  { id: 'questionnaire_sent', text: 'Questionnaire sent', offset: -7, auto: g => g.kit?.questionnaire?.sent_at },
  { id: 'questionnaire_back', text: 'Questionnaire answered', offset: -3, auto: g => g.kit?.questionnaire?.answered_at },
  { id: 'prep', text: 'Read their answers, skim their work, pick 3 questions', offset: -2 },
  { id: 'reminder', text: 'Reminder with the recording link', offset: -1 },
  { id: 'tech', text: 'Mic, camera, quiet room, water', offset: 0 },
  { id: 'record', text: 'Record the episode', offset: 0, auto: g => g.stages?.recorded },
  { id: 'thanks', text: 'Thank-you note', offset: 1 },
  { id: 'live', text: 'Episode published', offset: 7, auto: g => g.stages?.posted },
  { id: 'followup_sent', text: 'Sent the replay, link and promo assets', offset: 7, auto: g => g.kit?.followup?.sent_at },
  { id: 'their_promo', text: 'They shared it (check their posts)', offset: 10, auto: g => g.stages?.their_promo },
]
export const COLLAB_STEPS: Step[] = [
  { id: 'invite', text: 'Collab invite sent', offset: -14, auto: g => g.kit?.invite?.sent_at },
  { id: 'yes', text: 'They said yes', offset: -10, auto: g => g.stages?.connected },
  { id: 'brief', text: 'Agree the idea, format and date', offset: -7 },
  { id: 'questionnaire_sent', text: 'Questionnaire sent', offset: -7, auto: g => g.kit?.questionnaire?.sent_at },
  { id: 'questionnaire_back', text: 'Questionnaire answered', offset: -3, auto: g => g.kit?.questionnaire?.answered_at },
  { id: 'make', text: 'Film / make our piece', offset: 0 },
  { id: 'post', text: 'Post it together (collab post or both accounts)', offset: 0 },
  { id: 'followup_sent', text: 'Sent the link and assets', offset: 1, auto: g => g.kit?.followup?.sent_at },
  { id: 'their_promo', text: 'They shared it', offset: 3 },
]

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const today = () => new Date().toISOString().slice(0, 10)

export type KitStep = { id: string; text: string; due: string | null; done: string | null; auto: boolean; overdue: boolean }
export type GuestKitView = {
  id: string; name: string; show: string; email: string; kind: 'podcast' | 'collab'
  date: string | null; time: string | null; booking_id: string | null
  handles: NonNullable<GuestKit['handles']>; collab_idea: string
  steps: KitStep[]; done: number; total: number
  questionnaire: { status: 'not_sent' | 'sent' | 'answered'; sent_at?: string; answered_at?: string; answers?: Record<string, string>; link: string | null }
  followup: NonNullable<GuestKit['followup']>
  comms: { at: string; subject?: string; status: string; channel: string }[]
}

export function getGuestKitConfig(): GuestKitConfig { return { ...DEFAULT_GUEST_KIT_CONFIG, ...(readDb().guest_kit_config ?? {}) } }
export function setGuestKitConfig(patch: Partial<GuestKitConfig>): GuestKitConfig {
  const db = readDb()
  const next = { ...getGuestKitConfig(), ...patch }
  next.questionnaire_days_before = Math.min(30, Math.max(1, Math.round(Number(next.questionnaire_days_before) || 7)))
  next.auto_questionnaire = !!next.auto_questionnaire
  db.guest_kit_config = next; writeDb(db); return next
}

function nextBooking(g: PodcastGuest, booked: PodcastBooking[]): PodcastBooking | undefined {
  const mine = booked.filter(b => b.guest_id === g.id || (!!g.email && b.email?.toLowerCase() === g.email.toLowerCase())).sort((a, b) => a.date.localeCompare(b.date))
  return mine.find(b => b.date >= addDays(today(), -14)) ?? mine[mine.length - 1]
}

function view(g: PodcastGuest, booked: PodcastBooking[], origin: string): GuestKitView {
  const kind = g.kit?.kind ?? 'podcast'
  const b = kind === 'podcast' ? nextBooking(g, booked) : undefined
  const date = kind === 'podcast' ? (b?.date ?? null) : (g.kit?.collab_date ?? null)
  const t = today()
  const steps = (kind === 'podcast' ? PODCAST_STEPS : COLLAB_STEPS).map(s => {
    const done = g.kit?.checklist?.[s.id] || s.auto?.(g, b) || null
    const due = date ? addDays(date, s.offset) : null
    return { id: s.id, text: s.text, due, done, auto: !!s.auto, overdue: !done && !!due && due < t }
  })
  const q = g.kit?.questionnaire
  return {
    id: g.id, name: g.name, show: g.show || '', email: g.email || '', kind, date, time: b?.time ?? null, booking_id: b?.id ?? null,
    handles: { instagram: g.kit?.handles?.instagram ?? g.instagram, website: g.kit?.handles?.website ?? g.website, ...g.kit?.handles },
    collab_idea: g.kit?.collab_idea ?? '',
    steps, done: steps.filter(s => s.done).length, total: steps.length,
    questionnaire: { status: q?.answered_at ? 'answered' : q?.sent_at ? 'sent' : 'not_sent', sent_at: q?.sent_at, answered_at: q?.answered_at, answers: q?.answers, link: q?.token ? `${origin}/guest?t=${q.token}` : null },
    followup: g.kit?.followup ?? {},
    comms: (g.comms ?? []).slice(-6).reverse().map(c => ({ at: c.at, subject: c.subject, status: c.status, channel: c.channel })),
  }
}

// Guests whose recording (or collab) falls in [from, to], plus everyone else who is active.
export function getGuestKits(origin: string, from?: string, to?: string): GuestKitView[] {
  const db = readDb()
  const booked = db.podcast_schedule?.booked ?? []
  const all = (db.podcast_guests ?? []).map(g => view(g, booked, origin))
  if (!from || !to) return all
  return all.filter(v => v.date && v.date >= from && v.date <= to)
}
export function getGuestKit(id: string, origin: string): GuestKitView | null {
  const db = readDb()
  const g = (db.podcast_guests ?? []).find(x => x.id === id)
  return g ? view(g, db.podcast_schedule?.booked ?? [], origin) : null
}

function patchKit(id: string, fn: (k: GuestKit, g: PodcastGuest) => void): PodcastGuest | null {
  const db = readDb()
  const g = (db.podcast_guests ?? []).find(x => x.id === id); if (!g) return null
  g.kit ??= {}; fn(g.kit, g); g.updated_at = new Date().toISOString()
  writeDb(db); return g
}

export function setStep(id: string, step: string, done: boolean) {
  return patchKit(id, k => { k.checklist ??= {}; if (done) k.checklist[step] = new Date().toISOString(); else delete k.checklist[step] })
}
export function updateKit(id: string, patch: { handles?: GuestKit['handles']; collab_idea?: string; collab_date?: string; followup?: Partial<NonNullable<GuestKit['followup']>>; email?: string; name?: string }) {
  return patchKit(id, (k, g) => {
    if (patch.handles) k.handles = { ...k.handles, ...patch.handles }
    if (typeof patch.collab_idea === 'string') k.collab_idea = patch.collab_idea
    if (typeof patch.collab_date === 'string') k.collab_date = patch.collab_date || undefined
    if (patch.followup) k.followup = { ...k.followup, ...patch.followup }
    if (typeof patch.email === 'string') g.email = patch.email.trim()
    if (typeof patch.name === 'string' && patch.name.trim()) g.name = patch.name.trim()
  })
}

// ── email templates (her words to edit, never sent without her click except the questionnaire switch) ──
const first = (name: string) => name.trim().split(/\s+/)[0] || 'there'
export function inviteTemplate(kind: 'podcast' | 'collab', name: string, idea = ''): { subject: string; body: string } {
  if (kind === 'collab') return {
    subject: `A collab idea for the two of us`,
    body: `Hi ${first(name)},\n\nI love what you make, and I have an idea I think your people and mine would both get something from${idea ? `: ${idea}` : '.'}\n\nWant to make it together? I'll handle the planning, and we each post it to our own audience.\n\nIf you're in, reply with a yes and a couple of dates that work, and I'll send a short questionnaire so I can shape it around you.\n\nMandi`,
  }
  return {
    subject: `Be my guest on the AI Mom Podcast?`,
    body: `Hi ${first(name)},\n\nI host the AI Mom Podcast: not what to think about AI, but how to think about it. Real, clear-eyed conversations with women, no fear and no hype.\n\nI'd love to have you on${idea ? ` to talk about ${idea}` : ''}. It's about 45 minutes, recorded remotely.\n\nPick a time that works here: https://www.aiworksforher.com/book\n\nOnce you're booked, I'll send a short questionnaire so I can prep around you.\n\nMandi`,
  }
}
export function questionnaireTemplate(name: string, link: string): { subject: string; body: string } {
  return {
    subject: `A few quick questions before we record`,
    body: `Hi ${first(name)},\n\nSo glad we're doing this. To make our time count, please answer a few quick questions (about 5 minutes):\n\n${link}\n\nIt's where I'll grab your bio, your handles and the links you'd like me to share.\n\nMandi`,
  }
}
export function followupTemplate(name: string, f: NonNullable<GuestKit['followup']>): { subject: string; body: string } {
  const assets = (f.assets ?? []).map(a => `• ${a.label}: ${a.url}`).join('\n')
  return {
    subject: `Our episode is live 🎉 (links + assets inside)`,
    body: `Hi ${first(name)},\n\nThank you again. Our episode is out!\n\n${f.episode_url ? `Listen: ${f.episode_url}\n` : ''}${f.replay_url ? `Replay: ${f.replay_url}\n` : ''}${assets ? `\nAssets for your own posts (use any of them):\n${assets}\n` : ''}${f.caption ? `\nA caption you can use or change:\n${f.caption}\n` : ''}\nPlease tag me when you share it so I can reshare.\n\nMandi`,
  }
}

// ── sending ──
export type SendKind = 'invite' | 'questionnaire' | 'followup' | 'other'
export async function sendGuestEmail(id: string, kind: SendKind, subject: string, body: string, origin: string): Promise<{ ok: boolean; error?: string }> {
  const db = readDb()
  const g = (db.podcast_guests ?? []).find(x => x.id === id)
  if (!g) return { ok: false, error: 'Guest not found.' }
  if (!g.email) return { ok: false, error: `No email on file for ${g.name}.` }
  if (kind === 'questionnaire') ensureToken(id)   // the link in the body was built from this token
  const r = await sendEmail({ to: g.email, subject, html: basicEmailHtml(body), text: body, replyTo: 'hi@aimomeducation.com' })
  addGuestComm(id, { channel: 'email', direction: 'out', subject, body, status: r.ok ? 'sent' : 'failed', ...(r.ok ? {} : { error: r.error }) })
  if (!r.ok) return { ok: false, error: r.error }
  const now = new Date().toISOString()
  patchKit(id, k => {
    if (kind === 'invite') k.invite = { sent_at: now, subject }
    if (kind === 'questionnaire') k.questionnaire = { ...(k.questionnaire ?? { token: newToken() }), sent_at: now }
    if (kind === 'followup') k.followup = { ...k.followup, sent_at: now }
  })
  logActivity({ type: 'guest', title: `Emailed ${g.name}: ${subject}`, icon: '🎙', source: 'guest-kit' })
  return { ok: true }
}

const newToken = () => randomUUID().replace(/-/g, '')
export function ensureToken(id: string): string | null {
  const g = patchKit(id, k => { k.questionnaire ??= { token: newToken() } })
  return g?.kit?.questionnaire?.token ?? null
}

// Create a guest or collaborator from the invite composer (one record; reuses an existing card by email).
export function upsertInvitee(data: { name: string; email?: string; kind: 'podcast' | 'collab'; instagram?: string; idea?: string; collab_date?: string }): PodcastGuest {
  const db = readDb()
  const email = (data.email || '').trim().toLowerCase()
  const found = email ? (db.podcast_guests ?? []).find(g => (g.email || '').toLowerCase() === email) : undefined
  const g = found ?? createPodcastGuest({ name: data.name.trim(), email: data.email?.trim(), instagram: data.instagram, tier: data.kind === 'collab' ? 'Collab' : 'Invited', stages: {}, pitch: '' })
  return patchKit(g.id, k => {
    k.kind = data.kind
    if (data.instagram) k.handles = { ...k.handles, instagram: data.instagram.replace(/^@?/, '@') }
    if (data.idea) k.collab_idea = data.idea
    if (data.collab_date) k.collab_date = data.collab_date
  })!
}

// ── the automatic questionnaire ──
// Runs whenever the station asks for guest kits (opening the Plan tab / calendar), and can be hit
// by a scheduler later. Sends ONLY when the switch is on, the guest has an email, has a booking
// within N days, and has never been sent one. Each send is logged; failures stay visible.
export async function tickQuestionnaires(origin: string): Promise<{ sent: string[]; failed: string[]; skipped: boolean }> {
  const cfg = getGuestKitConfig()
  if (!cfg.auto_questionnaire) return { sent: [], failed: [], skipped: true }
  const t = today(), horizon = addDays(t, cfg.questionnaire_days_before)
  const db = readDb()
  const lastTry = (id: string) => db.podcast_guests?.find(g => g.id === id)?.kit?.questionnaire?.last_try
  const recent = (iso?: string) => !!iso && Date.now() - Date.parse(iso) < 6 * 3600000   // a failed auto-send waits 6 hours before retrying
  const due = getGuestKits(origin).filter(v => v.kind === 'podcast' && v.email && v.date && v.date >= t && v.date <= horizon && v.questionnaire.status === 'not_sent' && !recent(lastTry(v.id)))
  const sent: string[] = [], failed: string[] = []
  for (const v of due) {
    const token = ensureToken(v.id)
    patchKit(v.id, k => { if (k.questionnaire) k.questionnaire.last_try = new Date().toISOString() })
    const tpl = questionnaireTemplate(v.name, `${origin}/guest?t=${token}`)
    const r = await sendGuestEmail(v.id, 'questionnaire', tpl.subject, tpl.body, origin)
    ;(r.ok ? sent : failed).push(r.ok ? v.name : `${v.name}: ${r.error}`)
  }
  return { sent, failed, skipped: false }
}

// ── the public questionnaire ──
export const QUESTIONS: { id: string; label: string; hint?: string; long?: boolean; required?: boolean }[] = [
  { id: 'name', label: 'Your name, the way you want it said on air', hint: 'Add a pronunciation if it helps.', required: true },
  { id: 'bio', label: 'A two- or three-sentence bio I can read', long: true, required: true },
  { id: 'instagram', label: 'Instagram handle' },
  { id: 'tiktok', label: 'TikTok handle' },
  { id: 'youtube', label: 'YouTube channel' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'website', label: 'Website or the one link you want shared' },
  { id: 'topic', label: 'What do you most want to talk about?', long: true },
  { id: 'story', label: 'One story or example you love telling', long: true },
  { id: 'off_limits', label: 'Anything off-limits?', long: true },
  { id: 'headshot', label: 'A link to a headshot we can use', hint: 'Google Drive, Dropbox, or your site.' },
  { id: 'day_of', label: 'Best way to reach you on recording day', hint: 'Phone, text, DM…' },
]
export function questionnaireFor(token: string): { name: string; kind: string; answered: boolean; answers: Record<string, string> } | null {
  if (!token || token.length < 16) return null
  const g = (readDb().podcast_guests ?? []).find(x => x.kit?.questionnaire?.token === token)
  if (!g) return null
  return { name: first(g.name), kind: g.kit?.kind ?? 'podcast', answered: !!g.kit?.questionnaire?.answered_at, answers: g.kit?.questionnaire?.answers ?? {} }
}
export function saveQuestionnaire(token: string, raw: Record<string, unknown>): boolean {
  const db = readDb()
  const g = (db.podcast_guests ?? []).find(x => x.kit?.questionnaire?.token === token)
  if (!g || !g.kit?.questionnaire) return false
  const answers: Record<string, string> = {}
  for (const q of QUESTIONS) { const v = raw[q.id]; if (typeof v === 'string' && v.trim()) answers[q.id] = v.trim().slice(0, 4000) }
  const now = new Date().toISOString()
  g.kit.questionnaire = { ...g.kit.questionnaire, answers, answered_at: now }
  const h = g.kit.handles ?? {}
  for (const k of ['instagram', 'tiktok', 'youtube', 'linkedin', 'website'] as const) if (answers[k]) h[k] = answers[k]
  g.kit.handles = h
  g.updated_at = now
  writeDb(db)
  addGuestComm(g.id, { channel: 'note', direction: 'in', subject: 'Questionnaire answered', body: Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n'), status: 'logged' })
  logActivity({ type: 'guest', title: `${g.name} answered the guest questionnaire`, icon: '📝', source: 'guest-kit' })
  return true
}
