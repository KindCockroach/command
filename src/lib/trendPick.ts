// Phase 8 · A6: trends feed the plan.
// After the weekly trend check-in writes its digest to Notes, Ten hands it to Cap (`trend_pick`).
// Cap goes through each trend: keep or reject, one line why. For a keeper he picks the account and
// the format, and puts it on the calendar: into an empty planned slot for that account when one is
// free that week (no extra load), else a new slot on his date. Then Ed writes the card (title,
// on-screen hook, the job, what to film). At most 3 keepers a week.
// Rules: campaign week wins (a Reset week promotes the Reset on Joyful accounts; a podcast week the
// podcast on AI Mom accounts; never the other branch). Holidays/seasons from lib/seasons.ts.
// Nothing posts and nothing sends; a filmed slot that doesn't fit her saved hours is turned down.
import { readDb, writeDb, createContent, branchOfAccount, getAllNotes, type Handoff, type ContentPiece, type BranchId } from './db'
import { startAttempt, completeHandoff, failHandoff } from './handoffs'
import { fableText } from './fable'
import { extractJsonObject, cut } from './jsonkit'
import { ROLE_LINES } from './roles'
import { NO_CROSS_PROMOTION } from './craft'
import { upcomingMoments } from './seasons'
import { getPlanConfig, addDays } from './plan'
import { weekStart, filmBudget, formatMinutes } from './capacity'
import { isProtectedFormat } from './protectedFormats'

const MAX_KEEPERS = 3
const DAY = 86400000
const todayCT = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)
const ms = (d: string) => Date.parse(d + 'T00:00:00Z')

/** Which campaign each branch runs in the week starting `ws` (Reset week / podcast week). */
export function campaignWeek(ws: string): { joyful_media: string; wfh: string } {
  const cfg = getPlanConfig()
  const hits = (anchor: string) => !!anchor && Array.from({ length: 7 }, (_, k) => addDays(ws, k)).find(d => Math.round((ms(d) - ms(anchor)) / DAY) % 14 === 0) || null
  const reset = hits(cfg.reset_anchor), pod = hits(cfg.podcast_anchor)
  return {
    joyful_media: reset ? `RESET WEEK (Reset ${reset}, 8 PM CT): Joyful Media accounts point their CTA to the Reset.` : 'No Reset this week: Joyful Media CTAs point to a free practice or following.',
    wfh: pod ? `PODCAST WEEK (episode ${pod}): AI Mom accounts point their CTA to the episode.` : 'No new episode this week: AI Mom CTAs point to listening, following or sharing.',
  }
}

/** The latest weekly trend digest in Notes. */
export function latestTrendNote() {
  return getAllNotes().filter(n => (n.tags ?? []).includes('trends') && (n.tags ?? []).includes('weekly') && /Weekly Trends/i.test(n.title ?? ''))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] ?? null
}

type Pick = { trend?: string; keep?: boolean; reason?: string; account_id?: string; format?: string; date?: string; angle?: string }

const typeFor = (format: string): ContentPiece['type'] => /carousel/i.test(format) ? 'carousel' : /still|image|quote card|photo/i.test(format) ? 'image' : /article|newsletter/i.test(format) ? 'post' : 'video'
const isEmptySlot = (c: ContentPiece) => c.river_source === 'cap-plan' && c.status === 'idea' && !c.quote?.text
  && ![c.script, c.description, c.onscreen_text, c.transcript].some(x => (x ?? '').trim()) && !/TREND \(Cap/.test(c.notes ?? '')

export async function runTrendPick(h: Handoff): Promise<void> {
  startAttempt(h.id)
  const noteId = h.ref?.type === 'note' ? Number(h.ref.id) : null
  const note = noteId ? getAllNotes().find(n => n.id === noteId) : latestTrendNote()
  if (!note?.body?.trim()) { failHandoff(h.id, 'No trend digest to read. The weekly check-in didn’t save one.'); return }

  const db = readDb()
  const from = addDays(todayCT(), 1), to = addDays(from, 6)
  const ws = weekStart(from)
  const camp = campaignWeek(ws)
  const moments = upcomingMoments(from, 21)
  const weekly = (db.plans ?? []).filter(p => p.level === 'weekly' && p.status === 'approved' && p.weekly)
  const accounts = (db.brand_accounts ?? []).filter(a => a.status === 'active' && !a.mirrors_account_id)
    .map(a => ({ a, branch: branchOfAccount(a) as BranchId | null, plan: weekly.find(p => p.weekly!.account_id === a.id) }))
    .filter(x => x.branch && x.plan)
  if (!accounts.length) { failHandoff(h.id, 'No account has a live weekly plan, so there’s nowhere to put a trend yet.'); return }

  const instructions = `You are Cap. ${ROLE_LINES.cap}
Ten handed you this week's trend digest. Go through EVERY trend and format in it, one by one: keep it or reject it, with ONE plain line why.
Keep at most ${MAX_KEEPERS} for the whole week: only ones that truly fit an account below and its one reader. Reject anything off-brand, off-thesis, too generic, or that would need the other branch.
For each keeper pick: the account (by id, from the list), the format (prefer one already in that account's weekly plan), a date between ${from} and ${to}, and the angle in one line (how Mandi makes it hers).
CAMPAIGN WEEK WINS:
- ${camp.joyful_media}
- ${camp.wfh}
A trend that fights the campaign week loses to it.
${NO_CROSS_PROMOTION}
Holidays and seasons coming up (use one only if it fits naturally): ${moments.map(m => `${m.date} ${m.name}`).join('; ') || 'none'}.
Reply ONLY with JSON: {"picks":[{"trend":"","keep":true,"reason":"","account_id":"","format":"","date":"YYYY-MM-DD","angle":""}]}`
  const input = `ACCOUNTS WITH A LIVE WEEKLY PLAN:
${accounts.map(x => `- ${x.a.id} (${x.a.handle}, ${x.a.platform}, ${x.branch === 'wfh' ? 'AI Mom / WFH' : 'Joyful Media'}): ${cut(x.a.topic ?? '', 120)} · formats: ${x.plan!.weekly!.channels.filter(c => c.per_week > 0).map(c => c.format).join(', ')}`).join('\n')}

THIS WEEK'S TREND DIGEST (Note #${note.id}):
${cut(note.body, 6000)}`

  let picks: Pick[] = []
  try {
    const raw = await fableText({ useClaude: true, json: true, maxTokens: 3000, instructions, input })
    picks = (JSON.parse(extractJsonObject(raw)).picks ?? []) as Pick[]
  } catch (e) { failHandoff(h.id, `Cap couldn’t read the digest: ${e instanceof Error ? e.message : 'no answer'}`); return }
  if (!picks.length) { failHandoff(h.id, 'Cap came back with no verdicts. Retry.'); return }

  const lines: string[] = []
  const placed: number[] = []
  let kept = 0
  for (const p of picks) {
    const trend = cut((p.trend ?? '').trim(), 160) || 'a trend'
    const reason = (p.reason ?? '').trim()
    if (!p.keep) { lines.push(`✗ ${trend}: ${reason || 'doesn’t fit'}`); continue }
    if (kept >= MAX_KEEPERS) { lines.push(`✗ ${trend}: kept ${MAX_KEEPERS} already this week`); continue }
    const acct = accounts.find(x => x.a.id === p.account_id)
    if (!acct) { lines.push(`✗ ${trend}: no live plan for “${p.account_id ?? '?'}”`); continue }
    const date = p.date && p.date >= from && p.date <= to ? p.date : from
    const format = (p.format ?? '').trim() || acct.plan!.weekly!.channels[0]?.format || 'post'
    const stamp = `TREND (Cap’s pick, week of ${ws}, from Note #${note.id}): ${trend}. Angle: ${(p.angle ?? '').trim() || '(Ed picks)'}. Why it fits: ${reason}`

    // An empty planned slot for this account this week takes the trend first (no extra load).
    const d0 = readDb()
    const content = new Map(d0.content.map(c => [c.id, c]))
    const slot = (d0.calendar_items ?? []).filter(i => i.account_id === acct.a.id && i.slot === 'post' && i.date >= from && i.date <= to)
      .filter(i => { const c = content.get(i.content_id); return !!c && isEmptySlot(c) && !isProtectedFormat(acct.a.id, (c.notes ?? '').match(/Format: ([^.]+)\./)?.[1]) })
      .sort((a, b) => Math.abs(ms(a.date) - ms(date)) - Math.abs(ms(b.date) - ms(date)))[0]
    let cardId: number, when: string
    if (slot) {
      const c = d0.content.find(x => x.id === slot.content_id)!
      c.notes = `${c.notes ?? ''}\n${stamp}`.trim(); c.source_context = cut(stamp, 600); c.updated_at = new Date().toISOString()
      writeDb(d0)
      cardId = c.id; when = slot.date
    } else {
      const fm = formatMinutes(format), left = filmBudget(weekStart(date))
      if (fm && left !== null && left < fm) { lines.push(`✗ ${trend}: a good fit for ${acct.a.handle}, but filming doesn’t fit your hours that week and there’s no empty slot to use`); continue }
      const c = createContent({ title: `${acct.a.handle}: ${format}`, status: 'idea', type: typeFor(format), account_id: acct.a.id, river_source: 'cap-plan',
        notes: `Planned by Cap for ${date} (${acct.plan!.id}). Format: ${format}. ${stamp}`, source_context: cut(stamp, 600) })
      const d1 = readDb()
      d1.calendar_items ??= []; d1.next_calendar_id ??= 1
      d1.calendar_items.push({ id: `cal_${d1.next_calendar_id++}`, date, branch_id: acct.branch!, account_id: acct.a.id, content_id: c.id, plan_id: acct.plan!.id, slot: 'post', time: null, created_at: new Date().toISOString() })
      writeDb(d1)
      cardId = c.id; when = date
    }
    kept++; placed.push(cardId)
    lines.push(`✓ ${trend} → ${acct.a.handle}, ${format}, ${when}${slot ? ' (in an empty planned slot)' : ' (new slot)'}: ${reason}`)
  }

  // Ed writes each keeper's card (title, hook, the job, what to film), one at a time.
  const { fillCardBasics } = await import('./cardAudit')
  const wrote: string[] = []
  for (const id of placed) { const r = await fillCardBasics(id).catch(() => null); if (r?.filled.length) wrote.push(`#${id}`) }

  const head = kept ? `Kept ${kept} trend${kept === 1 ? '' : 's'} and put ${kept === 1 ? 'it' : 'them'} on the calendar.${wrote.length ? ` Ed wrote ${wrote.join(', ')}.` : ''}` : 'Kept none this week.'
  completeHandoff(h.id, 'cap', `${head}\n${lines.join('\n')}`, [{ type: 'note', id: note.id, label: 'trend digest' }, ...placed.map(id => ({ type: 'card' as const, id }))])
}
