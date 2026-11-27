// Phase 6 · Loop 9: the health check. A TOOL, mostly plain code, so it is cheap to run often.
//
// Commander runs the quick check every time he reports to Her, and the full one once a week
// (Monday, from instrumentation.ts, or when the last full check is over 7 days old).
// Every problem gets ONE plain next fix and says who acts on it:
//   needs_you → Her shows it to Mandi · agents → an agent's next run picks it up
//   build     → it needs a build session, so it goes in the build log · fyi → nobody, just noted
// It reports and proposes. It never changes code or content, never sends, never blocks Mandi.
// (The only writes: the saved report, and build-log to-dos for 'build' findings, deduped.)

import fs from 'fs'
import path from 'path'
import { readDb, writeDb, addBuildLogEntry, getBuildLog, type HealthFinding, type HealthReportRecord, type Db, type SkillOwner } from './db'
import { STUCK_MS, AUTO_KINDS, AGENT_LABEL } from './handoffs'
import { wellStatus } from './well'
import { isR2Configured, listOpenMultipart } from './r2'
import { getPlanConfig, addDays } from './plan'
import { dryRun } from './resetSequence'
import { fableText } from './fable'
import { cut } from './jsonkit'
import { commanderCarriesIdeas, ideasForHer } from './ideas'
import { getSkills, noSkill } from './skills'
import { spendStatus } from './spendCap'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'db.json')
const DAY = 86400000
const todayCT = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)
const ago = (iso: string | null | undefined) => (iso ? Date.now() - Date.parse(iso) : Infinity)
const days = (ms: number) => Math.floor(ms / DAY)

// Words that mark a Brain rule as written for something RISE has retired (memory: avatars dead,
// off GHL, Caption Writer + Journal killed, no-CTA growth phase retired, Room30 gone).
export const RETIRED = [
  { re: /\b(go\s?high\s?level|GHL)\b/i, what: 'GoHighLevel (RISE is off GHL; People is the CRM)' },
  { re: /\b(heygen|avatar video|sage avatar|gator|luna)\b/i, what: 'the AI avatars (dead since the video pivot)' },
  { re: /\broom\s?30\b/i, what: 'Room30 (no longer an offer)' },
  { re: /\bcaption writer\b|\brise lite\b|\bcaption keeper\b/i, what: 'Caption Writer / RISE Lite (killed)' },
  { re: /\bno (direct )?CTAs?\b|growth phase/i, what: 'the no-CTA growth phase (retired Oct 15)' },
  { re: /\bweekly reset\b|every sunday/i, what: 'a weekly Reset (it runs every other Sunday now)' },
]

type Ctx = { db: Db; today: string; full: boolean }
type Check = (c: Ctx, f: HealthFinding[], ok: string[]) => Promise<void> | void

// ── Connections ──────────────────────────────────────────────────────────────
async function ping(url: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    return r.ok ? null : `answered ${r.status}`
  } catch (e) { return e instanceof Error ? e.message : 'no answer' }
}

const connections: Check = async ({ db, full }, f, ok) => {
  // The AI keys. Quick: present. Full: they answer (model lists are free calls).
  const keys = [
    { env: 'OPENAI_API_KEY', name: 'OpenAI (the writers)', url: 'https://api.openai.com/v1/models', h: (k: string) => ({ Authorization: `Bearer ${k}` }) },
    { env: 'ANTHROPIC_API_KEY', name: 'Anthropic (Commander, research)', url: 'https://api.anthropic.com/v1/models', h: (k: string) => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01' }) },
  ]
  for (const k of keys) {
    const v = process.env[k.env]
    if (!v) { f.push({ key: `conn:${k.env}`, area: 'connections', level: 'needs_you', title: `${k.name}: no key`, fix: `Add ${k.env} in Railway → Variables.` }); continue }
    if (full) {
      const err = await ping(k.url, k.h(v))
      if (err) { f.push({ key: `conn:${k.env}`, area: 'connections', level: 'needs_you', title: `${k.name} didn’t answer (${err})`, fix: `Check ${k.env} in Railway → Variables is current, and that the account has credit.` }); continue }
    }
    ok.push(`${k.name} ${full ? 'answers' : 'key is set'}`)
  }

  // Resend.
  const rk = process.env.RESEND_API_KEY
  if (!rk) f.push({ key: 'conn:resend', area: 'connections', level: 'fyi', title: 'Resend: no key, so no email can send', fix: 'Fine while nothing is live. Before the first real send, add RESEND_API_KEY in Railway → Variables.' })
  else if (full) {
    const err = await ping('https://api.resend.com/domains', { Authorization: `Bearer ${rk}` })
    if (err) f.push({ key: 'conn:resend', area: 'connections', level: 'needs_you', title: `Resend didn’t answer (${err})`, fix: 'Check RESEND_API_KEY in Railway → Variables.' })
    else ok.push('Resend answers')
  } else ok.push('Resend key is set')
  if (rk && !process.env.RESEND_WEBHOOK_SECRET) f.push({ key: 'conn:resend-webhook', area: 'connections', level: 'needs_you', title: 'Bounces aren’t reported back yet', fix: 'In Resend → Webhooks, add https://www.aiworksforher.com/api/email/resend-webhook for email.bounced + email.complained, then put its signing secret in Railway as RESEND_WEBHOOK_SECRET.' })

  // The self-scheduled jobs (daily drafts, project plans, weekly trends + this check) call the
  // app on 127.0.0.1 with ?key=CRON_SECRET. With the station locked and no secret, they're shut out.
  if (process.env.NODE_ENV === 'production' && process.env.STATION_KEY && !process.env.CRON_SECRET)
    f.push({ key: 'conn:cron', area: 'connections', level: 'needs_you', title: 'The daily and weekly jobs can’t get past the station lock', detail: 'Daily drafts, project plans, the weekly trend check-in and the weekly health check get turned away.', fix: 'Add CRON_SECRET in Railway → Variables (any long random string).' })

  // Storage.
  if (!isR2Configured()) f.push({ key: 'conn:r2', area: 'connections', level: 'needs_you', title: 'Media storage isn’t set up', fix: 'Add the R2_* variables in Railway; uploads fall back to the server until then.' })
  else if (full) {
    try {
      const open = await listOpenMultipart()
      const cardKeys = new Set(db.content.map(c => c.upload?.key).filter(Boolean) as string[])
      const orphans = open.filter(u => !cardKeys.has(u.key) && ago(u.initiated) > DAY)
      ok.push('Media storage answers')
      if (orphans.length) f.push({ key: 'store:orphan-multipart', area: 'store', level: 'agents', count: orphans.length, title: `${orphans.length} unfinished upload${orphans.length > 1 ? 's' : ''} in storage belong to no card`, fix: 'The upload sweep aborts these after 24 hours; nothing to do unless the count keeps growing.' })
    } catch (e) { f.push({ key: 'conn:r2', area: 'connections', level: 'needs_you', title: `Media storage didn’t answer (${e instanceof Error ? e.message : 'error'})`, fix: 'Check the R2_* variables in Railway.' }) }
  } else ok.push('Media storage is configured')

  // The Well and the station brain.
  const w = wellStatus()
  if (!w.loaded) f.push({ key: 'store:well', area: 'store', level: 'needs_you', title: 'The Well isn’t loaded here', detail: 'Writers fall back to generic phrasing without her own captions.', fix: 'Load the caption archive once (Accounts → the Well → upload VOICE_BANK).' })
  else ok.push(`The Well: ${w.lines} of her captions`)
  const core = db.memories.filter(m => (m.agent_tags ?? []).includes('core') && m.category === 'voice')
  const live = db.memories.filter(m => m.category !== 'voice_archive')
  if (!live.length) f.push({ key: 'store:brain', area: 'store', level: 'needs_you', title: 'The station brain is empty', fix: 'Restore the Brain (backups/2026-11-22_core_voice_lessons.json) before any writing runs.' })
  else if (!core.length) f.push({ key: 'store:brain-core', area: 'store', level: 'needs_you', title: 'The 15 core voice rules are missing from the Brain', fix: 'Re-add them from backups/2026-11-22_core_voice_lessons.json.' })
  else ok.push(`Station brain: ${live.length} rules (${core.length} core voice rules)`)
}

// ── Stuck work ───────────────────────────────────────────────────────────────
const stuck: Check = ({ db, today }, f) => {
  const titles = new Map(db.content.map(c => [c.id, c.title]))
  for (const h of db.handoffs ?? []) {
    const label = `${AGENT_LABEL[h.from] ?? h.from} → ${AGENT_LABEL[h.to] ?? h.to}: ${h.what ?? h.kind}`
    const ref = { type: 'handoff', id: h.id }
    if (h.status === 'failed') {
      f.push({ key: `stuck:failed:${h.id}`, area: 'stuck', level: 'needs_you', ref, title: `Failed: ${label}`, detail: h.error ?? undefined, fix: 'Press Retry. If it fails the same way twice, it needs a build: tell Her.' })
    } else if (h.status === 'open') {
      const auto = AUTO_KINDS.includes(h.kind)
      const age = ago(h.updated_at)
      if (auto && age > STUCK_MS) f.push({ key: `stuck:open:${h.id}`, area: 'stuck', level: 'needs_you', ref, title: `Stopped partway: ${label}`, detail: `Open ${Math.max(1, Math.round(age / 60000))} minutes with no result.`, fix: 'Open Activity → handoffs and press Retry.' })
      else if (!auto && age > 7 * DAY) {
        const owner = h.to as SkillOwner
        const canRun = getSkills().some(s => s.owner === owner && s.wired)
        if (!canRun) noSkill(owner, h.what ?? h.kind)   // so the build log really has it
        f.push(canRun
          ? { key: `stuck:waiting:${h.id}`, area: 'stuck', level: 'agents', ref, title: `Waiting ${days(age)} days: ${label}`, fix: `${AGENT_LABEL[h.to] ?? h.to} picks it up at the next plan fill; if it no longer fits, close it in Activity with a reason.` }
          : { key: `stuck:waiting:${h.id}`, area: 'stuck', level: 'needs_you', ref, title: `Waiting ${days(age)} days with nobody to pick it up: ${label}`, detail: `${AGENT_LABEL[h.to] ?? h.to} has no skill that runs in the app yet (it’s on the build log).`, fix: 'Decide it yourself, hand it to Cap instead, or close it in Activity with a reason.' })
      }
    }
  }

  // Approved / scheduled but never posted.
  for (const c of db.content) {
    if (c.status === 'archived' || c.status === 'published') continue
    const posts = c.platform_posts ?? []
    const overdue = posts.filter(p => p.status === 'scheduled' && p.scheduled_at && p.scheduled_at.slice(0, 10) < today)
    if (overdue.length) {
      f.push({ key: `stuck:not-posted:${c.id}`, area: 'stuck', level: 'needs_you', ref: { type: 'card', id: c.id }, title: `Scheduled but not marked posted: “${cut(c.title, 60)}” (${overdue.map(p => p.platform).join(', ')})`, fix: 'If it went out, mark it Posted with the link (that feeds the winners). If it didn’t, move it on the calendar.' })
    } else if (c.status === 'approved' && ago(c.updated_at) > 5 * DAY && !posts.some(p => p.status === 'posted')) {
      f.push({ key: `stuck:approved:${c.id}`, area: 'stuck', level: 'agents', ref: { type: 'card', id: c.id }, title: `Approved ${days(ago(c.updated_at))} days ago, never posted: “${cut(c.title, 60)}”`, fix: 'Cap gives it a date at the next plan fill, or you archive it.' })
    }
    // Uploads that stopped.
    const u = c.upload
    if (u && (u.state === 'incomplete' || ago(u.updated_at) > 10 * 60000)) {
      f.push({ key: `stuck:upload:${c.id}`, area: 'stuck', level: 'needs_you', ref: { type: 'card', id: c.id }, title: `Upload didn’t finish: ${cut(u.filename, 50)} on “${cut(c.title, 50)}”`, detail: u.parts_total ? `${u.parts_done ?? 0} of ${u.parts_total} parts.` : undefined, fix: 'Open the card and choose the same file again; it resumes where it stopped (within 24 hours).' })
    }
  }

  // Calendar items past their date with nothing made.
  const byId = new Map(db.content.map(c => [c.id, c]))
  const empty = (db.calendar_items ?? []).filter(i => {
    if (i.date >= today || ago(`${i.date}T23:59:00Z`) > 21 * DAY) return false
    const c = byId.get(i.content_id)
    if (!c) return true
    if (['published', 'archived'].includes(c.status) || (c.platform_posts ?? []).some(p => p.status === 'posted')) return false
    return !(c.media_url || (c.media_urls ?? []).length || c.filmed_at)
  })
  if (empty.length) f.push({ key: 'stuck:calendar-empty', area: 'stuck', level: 'agents', count: empty.length, title: `${empty.length} calendar item${empty.length > 1 ? 's passed their dates' : ' passed its date'} with no footage`, detail: empty.slice(0, 5).map(i => `${i.date}: ${titles.get(i.content_id) ?? `card ${i.content_id}`}`).join(' · '), fix: 'Cap re-dates or drops them at the next plan fill (his call). Film any you still want.' })

  // Questions Commander sent back that she never answered.
  const qs = (db.her_threads ?? []).flatMap(t => t.questions.filter(q => !q.answered).map(q => ({ q, t }))).filter(x => ago(x.t.updated_at) > 3 * DAY)
  if (qs.length) f.push({ key: 'stuck:questions', area: 'stuck', level: 'needs_you', count: qs.length, title: `${qs.length} question${qs.length > 1 ? 's' : ''} from Man still waiting on you`, detail: qs.slice(0, 3).map(x => cut(x.q.text, 80)).join(' · '), fix: 'Answer in Her (Home), or say “skip it” and she closes it.' })
}

// ── Stale direction: goals, promotions, plans, the Brain, the database ──────
const direction: Check = async ({ db, today, full }, f, ok) => {
  for (const g of db.goals ?? []) {
    if (g.active && g.deadline && g.deadline.slice(0, 10) < today)
      f.push({ key: `dir:goal:${g.id}`, area: 'direction', level: 'needs_you', ref: { type: 'goal', id: g.id }, title: `Goal past its deadline but still on: “${cut(g.title, 70)}” (${g.deadline.slice(0, 10)})`, fix: 'Cap proposes turning it off (Keep the map honest). Press “Yes, retire it”, or “New date…” to keep it.' })
  }
  // Cards missing what they need (title, on-screen hook, Cap's job pick, caption, account).
  {
    const { auditCards } = await import('./cardAudit')
    const a = auditCards()
    const auto = a.cards.filter(c => c.auto).length
    if (auto) f.push({ key: 'cards:gaps', area: 'direction', level: 'needs_you', count: auto, title: `${auto} card${auto > 1 ? 's are' : ' is'} missing basics (${Object.entries(a.counts).filter(([k]) => k !== 'account').map(([k, v]) => `${v} ${k}`).join(', ')})`, detail: a.cards.filter(c => c.auto).slice(0, 4).map(c => `#${c.id} ${cut(c.title, 40)}`).join(' · '), fix: 'Press “Fix them”: Ed writes only what’s missing (a backup is made first).' })
    const noAcct = a.cards.filter(c => c.missing.includes('account'))
    if (noAcct.length) f.push({ key: 'cards:no-account', area: 'direction', level: 'needs_you', count: noAcct.length, title: `${noAcct.length} card${noAcct.length > 1 ? 's have' : ' has'} no account`, detail: noAcct.slice(0, 6).map(c => `#${c.id} ${cut(c.title, 40)}`).join(' · '), fix: 'Open each card and pick its account (or archive it).' })
  }
  // A promotion that ended while cards about it are still waiting to go out.
  for (const ev of (db.events ?? []).filter(e => (e.kind === 'promo' || e.kind === 'launch') && e.date < today && ago(`${e.date}T00:00:00Z`) < 45 * DAY)) {
    const probe = ev.title.toLowerCase().slice(0, 24)
    const live = db.content.filter(c => !['published', 'archived'].includes(c.status) && `${c.title} ${(c.tags ?? []).join(' ')}`.toLowerCase().includes(probe))
    if (live.length) f.push({ key: `dir:promo:${ev.id}`, area: 'direction', level: 'needs_you', ref: { type: 'event', id: ev.id }, title: `“${cut(ev.title, 50)}” ended ${ev.date}, ${live.length} card${live.length > 1 ? 's' : ''} for it still waiting`, fix: 'Archive them, or tell Cap to re-angle them for what’s next.' })
  }
  // Plans: the newest approved weekly plan per account has run out.
  const weekly = (db.plans ?? []).filter(p => p.level === 'weekly' && p.status === 'approved')
  const latest = new Map<string, typeof weekly[number]>()
  for (const p of weekly) { const k = p.weekly?.account_id ?? p.id; const cur = latest.get(k); if (!cur || p.period_end > cur.period_end) latest.set(k, p) }
  const lapsed = [...latest.values()].filter(p => p.period_end < today)
  if (lapsed.length) f.push({ key: 'dir:plans-lapsed', area: 'direction', level: 'agents', count: lapsed.length, title: `${lapsed.length} account${lapsed.length > 1 ? 's' : ''} ran past the last approved weekly plan`, detail: lapsed.map(p => p.weekly?.handle ?? p.id).join(', '), fix: 'Cap drafts the next weekly plans; you approve them in Plan.' })

  // The Brain: rules written for retired things, and duplicate titles (likely conflicts).
  const rules = db.memories.filter(m => m.category !== 'voice_archive' && !m.retired_at)
  const stale = rules.map(m => ({ m, hit: RETIRED.find(r => r.re.test(`${m.title} ${m.body}`)) })).filter(x => x.hit)
  if (stale.length) f.push({ key: 'dir:brain-stale', area: 'direction', level: 'needs_you', count: stale.length, title: `${stale.length} Brain rule${stale.length > 1 ? 's' : ''} may be stale`, detail: stale.slice(0, 6).map(x => `#${x.m.id} “${cut(x.m.title, 50)}” mentions ${x.hit!.what}`).join(' · '), fix: 'Her brings these to the weekly review. Only you change a rule: keep, edit, or archive each one.' })
  const byTitle = new Map<string, number[]>()
  for (const m of rules) { const k = m.title.trim().toLowerCase(); byTitle.set(k, [...(byTitle.get(k) ?? []), m.id]) }
  const dupes = [...byTitle.entries()].filter(([, ids]) => ids.length > 1)
  if (dupes.length) f.push({ key: 'dir:brain-dupes', area: 'direction', level: 'needs_you', count: dupes.length, title: `${dupes.length} Brain rule title${dupes.length > 1 ? 's are' : ' is'} written more than once`, detail: dupes.slice(0, 4).map(([t, ids]) => `“${cut(t, 40)}” (#${ids.join(', #')})`).join(' · '), fix: 'Weekly review: keep the one that’s right, archive the others.' })
  if (full && rules.length >= 2 && process.env.OPENAI_API_KEY) {
    // One cheap pass a week for rules that contradict each other.
    try {
      const list = rules.slice(-60).map(m => `#${m.id} [${m.category}; ${(m.agent_tags ?? []).join(',')}] ${cut(m.title, 80)}: ${cut(m.body, 220)}`).join('\n')
      const out = JSON.parse(await fableText({ cheap: true, json: true, maxTokens: 500, instructions: 'You check a list of rules that AI agents follow. Find only real contradictions: two rules that cannot both be obeyed for the same agent. Ignore rules that are merely similar. Reply ONLY with JSON: {"conflicts":[{"ids":[1,2],"why":"one line"}]} (empty list if none).', input: list })) as { conflicts?: { ids: number[]; why: string }[] }
      const cs = (out.conflicts ?? []).filter(c => Array.isArray(c.ids) && c.ids.length >= 2).slice(0, 6)
      if (cs.length) f.push({ key: 'dir:brain-conflicts', area: 'direction', level: 'needs_you', count: cs.length, title: `${cs.length} pair${cs.length > 1 ? 's' : ''} of Brain rules may contradict each other`, detail: cs.map(c => `#${c.ids.join(' vs #')}: ${cut(c.why, 100)}`).join(' · '), fix: 'Weekly review: decide which one wins and archive or edit the other.' })
      else ok.push('No conflicting Brain rules found')
    } catch { /* the conflict read is a bonus; the plain checks above still stand */ }
  }

  // The database file and the newest backup.
  try {
    const mb = fs.statSync(DB_PATH).size / 1e6
    if (mb > 25) f.push({ key: 'store:db-size', area: 'store', level: 'build', title: `db.json is ${mb.toFixed(1)} MB`, fix: 'Needs a build session: move activity, sends and usage history out of the one-file database.' })
    else ok.push(`db.json is ${mb.toFixed(1)} MB`)
    const dir = path.dirname(DB_PATH)
    const backups = fs.readdirSync(dir).filter(n => /^db\.backup\..*\.json$/.test(n)).map(n => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.t - a.t)
    if (!backups.length) f.push({ key: 'store:backup', area: 'store', level: 'fyi', title: 'No database backup next to db.json yet', fix: 'One is made automatically before every migration or import; nothing to do now.' })
    else ok.push(`Newest backup: ${backups[0].n} (${days(Date.now() - backups[0].t)} days old)`)
  } catch (e) { f.push({ key: 'store:db', area: 'store', level: 'build', title: `Couldn’t read db.json (${e instanceof Error ? e.message : 'error'})`, fix: 'Needs a build session: check DB_PATH and the volume.' }) }
}

// ── The Reset sequence (Phase 5) ─────────────────────────────────────────────
const reset: Check = ({ db, today }, f, ok) => {
  const seq = db.reset_sequence
  if (!seq) { f.push({ key: 'reset:none', area: 'reset', level: 'agents', title: 'The Reset sequence has no drafts yet', fix: 'In Campaigns → Reset emails, press “Cap: brief Ed on the drafts”.' }); return }
  const s = seq.settings
  const blank = [
    !s.coupon_code && 'the $8 coupon code (touches 1, 4, 5)',
    !s.nine_url && 'the $9 Listen To Your Intuition link (touch 2)',
    !s.pass_url && 'the $44/month pass link (the pass paragraph)',
    (!s.gift_name || !s.gift_url) && 'touch 6’s free gift',
  ].filter(Boolean) as string[]
  if (blank.length) f.push({ key: 'reset:settings', area: 'reset', level: 'needs_you', count: blank.length, title: `Reset sequence settings still blank: ${blank.length}`, detail: blank.join(' · '), fix: 'Fill them in Campaigns → Reset emails → Settings. Until then those touches hold and say why.' })
  const waiting = seq.emails.filter(e => e.status === 'confirmed')
  if (waiting.length) f.push({ key: 'reset:approve', area: 'reset', level: 'needs_you', count: waiting.length, title: `${waiting.length} email draft${waiting.length > 1 ? 's' : ''} Cap confirmed, waiting for your Approve`, detail: waiting.map(e => e.title).join(' · '), fix: 'Read each one in Approve (or Campaigns → Reset emails) and press Approve (or edit it first).' })
  else if (seq.emails.length) ok.push('No email drafts waiting on approval')

  // The guest list comes in only AFTER a Reset happens (check-in done). So ask for the most
  // recent past Reset's list, never the upcoming one: the emails take its date from the calendar.
  const cfg = getPlanConfig()
  let past = cfg.reset_anchor
  if (/^\d{4}-\d{2}-\d{2}$/.test(past) && past < today) {
    while (addDays(past, 14) < today) past = addDays(past, 14)
  } else past = ''
  const events = db.reset_events ?? []
  if (past && !events.some(e => e.date === past)) f.push({ key: `reset:past:${past}`, area: 'reset', level: 'needs_you', title: `The ${past} Reset’s guest list isn’t uploaded yet`, fix: 'Export its guest list from Luma (Guests → Export CSV, after check-in) and drop it in People → Reset · Luma import. That starts the thank-you touches and the free-seat email for anyone who registered but didn’t come.' })
  else if (past) ok.push(`The ${past} Reset’s guest list is in`)

  // Touches due on the latest past Reset that are blocked.
  const last = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (last) {
    const dr = dryRun(last.id, { today })
    if (!('error' in dr)) {
      const blocked = dr.touches.filter(t => t.due && t.blockers.length && !seq.sends.some(x => x.event_id === last.id && x.key === t.key))
      if (blocked.length) f.push({ key: `reset:blocked:${last.id}`, area: 'reset', level: 'needs_you', count: blocked.length, title: `${blocked.length} touch${blocked.length > 1 ? 'es for the ' + last.date + ' Reset are' : ' for the ' + last.date + ' Reset is'} due but held`, detail: blocked.map(t => `${t.title}: ${t.blockers[0]}`).join(' · '), fix: 'Clear the first reason on each (usually an approval or a blank setting). Nothing sends until you also switch the sequence live.' })
    }
  }
  const unknown = (db.contacts ?? []).filter(c => (c.resets ?? []).length && (c.consent?.luma?.value ?? 'unknown') === 'unknown').length
  if (unknown) f.push({ key: 'reset:consent', area: 'reset', level: 'needs_you', count: unknown, title: `${unknown} Reset guest${unknown > 1 ? 's have' : ' has'} no email consent on record`, fix: 'Add a Luma registration question (“Can Mandi email you about future Resets?”); the import reads it. Whether attending counts as consent is your call.' })
}

// Phase 8 · A0: the monthly AI cap. At 80% Mandi hears about it; at 100% background jobs pause.
async function spend(_ctx: Ctx, f: HealthFinding[], ok: string[]) {
  const s = spendStatus()
  const usd = (n: number) => '$' + n.toFixed(2)
  if (s.over_month) f.push({ key: 'spend:over:' + s.month, area: 'store', level: 'needs_you', title: 'RISE hit its ' + usd(s.cap) + ' AI cap for ' + s.month + ' (' + usd(s.spent) + ' spent)', detail: 'Background jobs are paused until the 1st' + (s.paused.length ? ' (' + s.paused.length + ' paused so far)' : '') + '. Anything you start asks first.', fix: 'Nothing to do unless you want more room: raise the cap in /admin → AI spend.' })
  else if (s.warn80) f.push({ key: 'spend:80:' + s.month, area: 'store', level: 'needs_you', title: 'RISE has spent ' + usd(s.spent) + ' of ' + usd(s.cap) + ' this month', detail: 'On pace for about ' + usd(s.projection) + '. Top cost: ' + (s.top5[0]?.label ?? 'n/a') + ' (' + usd(s.top5[0]?.costUsd ?? 0) + ').', fix: 'Nothing to do. At the cap, background jobs pause and anything you start asks first. Raise it in /admin → AI spend if you want.' })
  else ok.push('AI spend ' + usd(s.spent) + ' of ' + usd(s.cap) + ' this month (on pace for ' + usd(s.projection) + ')')
}

// Phase 8 · A3: the Brief's inbox card only fills when an outside Gmail scan posts to /api/inbox.
// When that scan goes quiet, say so instead of letting "quiet" look like an empty inbox.
function inbox(ctx: Ctx, f: HealthFinding[], ok: string[]) {
  const at = ctx.db.inbox?.checked_at
  if (!at) { f.push({ key: 'inbox:never', area: 'store', level: 'fyi', title: 'The Gmail scan has never sent RISE an inbox triage', fix: 'Only matters if you want inbox triage in the Brief. Reconnecting the scan is a separate step.' }); return }
  const age = days(ago(at))
  if (age >= 2) f.push({ key: 'inbox:stale', area: 'store', level: 'needs_you', title: `The Gmail scan hasn’t run since ${at.slice(0, 10)} (${age} days)`, detail: 'The Brief shows that instead of an old pile.', fix: 'Reconnect the outside Gmail scan if you still want inbox triage (a separate step), or ignore this.' })
  else ok.push(`Inbox triage ran ${at.slice(0, 10)}`)
}

const CHECKS: Check[] = [connections, stuck, direction, reset, spend, inbox]
const ORDER = { needs_you: 0, agents: 1, build: 2, fyi: 3 } as const

export async function runHealthCheck(opts: { full?: boolean; save?: boolean; today?: string } = {}): Promise<HealthReportRecord> {
  const t0 = Date.now()
  const db = readDb()
  const ctx: Ctx = { db, today: opts.today ?? todayCT(), full: !!opts.full }
  const findings: HealthFinding[] = []
  const ok: string[] = []
  for (const c of CHECKS) {
    try { await c(ctx, findings, ok) }
    catch (e) { findings.push({ key: `check:${c.name}`, area: 'store', level: 'build', title: `The ${c.name} check itself broke`, detail: e instanceof Error ? e.message : String(e), fix: 'Needs a build session (lib/health.ts).' }) }
  }
  findings.sort((a, b) => ORDER[a.level] - ORDER[b.level])
  const report: HealthReportRecord = { mode: opts.full ? 'full' : 'quick', ran_at: new Date().toISOString(), ok, findings, ms: Date.now() - t0 }

  if (opts.save !== false) {
    // Anything that needs a build goes in the build log, once.
    const have = new Set(getBuildLog().filter(b => b.status !== 'done').map(b => b.title))
    report.build_logged = []
    for (const x of findings.filter(x => x.level === 'build')) {
      const title = cut(`Health check: ${x.title}`, 160)
      if (!have.has(title)) { addBuildLogEntry({ title, detail: `${x.detail ? x.detail + '\n' : ''}Next fix: ${x.fix}`, status: 'todo', source: 'rise' }); report.build_logged.push(title) }
    }
    const d = readDb()
    d.health ??= {}
    if (opts.full) d.health.last_full = report
    else d.health.last_quick = report
    writeDb(d)
  }
  return report
}

export function lastHealth() { return readDb().health ?? {} }

// Commander's report to Her (Commander 3): the quick check every time, the full one when the
// last full check is over 7 days old. Her shows Mandi only what needs her.
export async function healthForHer(): Promise<{ needs_you: HealthFinding[]; agents: number; build: number; ran_at: string; mode: 'quick' | 'full'; full_ran_at: string | null; ideas: ReturnType<typeof ideasForHer> }> {
  commanderCarriesIdeas()   // the agents' ideas ride up in the same report
  const last = lastHealth()
  const dueFull = ago(last.last_full?.ran_at) > 7 * DAY
  const r = await runHealthCheck({ full: dueFull })
  const full = dueFull ? r : last.last_full ?? null
  return {
    needs_you: r.findings.filter(x => x.level === 'needs_you'),
    agents: r.findings.filter(x => x.level === 'agents').length,
    build: r.findings.filter(x => x.level === 'build').length,
    ran_at: r.ran_at, mode: r.mode, full_ran_at: full?.ran_at ?? null,
    ideas: ideasForHer(),
  }
}

// Mandi acted on a finding (retired the goal, retried the handoff): take it off the saved reports
// so it stops showing until a later check finds it again.
export function resolveFinding(key: string): boolean {
  const d = readDb()
  if (!d.health) return false
  let hit = false
  for (const r of [d.health.last_quick, d.health.last_full]) {
    if (!r) continue
    const before = r.findings.length
    r.findings = r.findings.filter(f => f.key !== key)
    if (r.findings.length !== before) hit = true
  }
  if (hit) writeDb(d)
  return hit
}
