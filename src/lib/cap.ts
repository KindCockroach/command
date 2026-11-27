// The writing chain, Nov 22. INTENTIONAL REVERSAL of Phase 4's first version: Ed and Pod are the
// WRITERS, Cap is the REVIEWER. Before Nov 22, Cap wrote and Ed checked. Don't "fix" it back.
//
// Idea → Her → Man (Commander) → Cap → Ed (short-form) / Pod (long-form) → back to Cap.
// Cap is the pivot: everything passes through him to reach a writer, and every draft comes back
// to him before scheduling. Writers only talk to Cap.
//
// footage_in (Mandi → Cap)    → Cap briefs the writers: what this post is, what she said, what
//                                she still owes him. Short-form platforms to Ed, long-form to Pod.
// write      (Cap → Ed / Pod) → the writer drafts one caption per platform, from her own words
//                                first (the Well), then hands it back to Cap.
// review     (Ed / Pod → Cap) → Cap confirms each draft and schedules it on its calendar date, or
//                                sends it back with the reason.
// rewrite    (Cap → Ed / Pod) → the writer fixes exactly what Cap named; Cap reviews again.
// The loop never stops on Mandi: after MAX_REVIEW_ROUNDS reviews Cap lets it through and leaves
// what he'd still change as notes. No per-caption approval from her: the weekly plan is the
// approval. Nothing is posted by RISE.

import { readDb, writeDb, createContent, type ContentPiece, type EdVerdict, type Handoff, type PlatformPost } from './db'
import { ownPlatforms, setPlatformPost, normPlatform } from './cardMedia'
import { craftFor } from './craft'
import { fableText } from './fable'
import { wellLinesFor, wellStatus } from './well'
import { capReview } from './review'
import { openHandoff, startAttempt, completeHandoff, failHandoff, getHandoff } from './handoffs'
import { ROLE_LINES } from './roles'
import { isVideoFormat, whatToFilm } from './cardFormat'

type Writer = 'ed' | 'pod'
const WRITER_NAME: Record<Writer, string> = { ed: 'Ed', pod: 'Pod' }

// Long-form homes go to Pod; everything else is short-form, Ed's.
const LONG_FORM = new Set(['Medium', 'Substack'])
export const writerFor = (platform: string): Writer => LONG_FORM.has(normPlatform(platform) || platform) ? 'pod' : 'ed'

// Starting heuristics from the interview, not rules.
const PLATFORM_STYLE: Record<string, string> = {
  Instagram: 'Instagram: can be more poetic. A first line that stops the scroll, short lines, 3-5 hashtags at the end.',
  TikTok: 'TikTok: short. One to three lines, two or three hashtags.',
  YouTube: 'YouTube: explanatory and actionable. Say plainly what she gets from watching and what to do next. No hashtag wall.',
  Facebook: 'Facebook: fit the audience there, people who know her: warm, conversational, plain. Few or no hashtags.',
  LinkedIn: 'LinkedIn: plain-spoken with one clear takeaway. At most 3 hashtags.',
  Pinterest: 'Pinterest: a searchable title-like first line plus one helpful sentence.',
  Medium: 'Medium: a short teaser paragraph for the story, written to make her want the whole piece.',
  Substack: 'Substack: a short teaser paragraph for the post, written to make her want the whole piece.',
}

const isVideo = (u: string) => /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(u)
const list = (a: string[]) => a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`

// The platforms that get a caption: where the card goes, minus anything a mirrored account reposts.
export function writablePlatforms(c: ContentPiece): string[] {
  const db = readDb()
  return ownPlatforms(db, c, db.brand_accounts.find(a => a.id === c.account_id) ?? null)
}

// Which platforms on this card still need a writer. Never her words, never one already
// scheduled or posted; a draft is rewritten only when asked to (her note, or Cap's send-back).
function openTargets(c: ContentPiece, opts: { platforms?: string[]; rewrite?: boolean }): { targets: string[]; kept: string[] } {
  const posts = c.platform_posts ?? []
  const kept: string[] = []
  const targets = (opts.platforms?.length ? opts.platforms.map(normPlatform).filter(Boolean) as string[] : writablePlatforms(c)).filter(p => {
    const pp = posts.find(x => x.platform === p)
    if (pp && pp.status !== 'draft') { if (pp.caption.trim()) kept.push(p); return false }
    if (!pp?.caption.trim()) return true
    // A pre-film draft (written from the plan) is always refreshed once there's footage.
    if (pp.written_by === 'mandi' || (!opts.rewrite && !pp.prefilm)) { kept.push(p); return false }
    return true
  })
  return { targets, kept }
}

// ── the writers: Ed (short-form) and Pod (long-form) ──
export type WriteResult = { written: string[]; cover_note: string | null; well_lines: number; well_loaded: boolean } | { error: string }

export async function writerDraft(writer: Writer, id: number, opts: { platforms: string[]; brief?: string; note?: string; reasons?: Record<string, string[]>; prefilm?: boolean }): Promise<WriteResult> {
  const db = readDb()
  const c = db.content.find(x => x.id === id)
  if (!c) return { error: 'That card isn’t in RISE any more.' }
  const acct = db.brand_accounts.find(a => a.id === c.account_id) ?? null
  const post = (p: string): PlatformPost | undefined => (c.platform_posts ?? []).find(x => x.platform === p)
  const targets = opts.platforms
  const media = [c.media_url, ...(c.media_urls ?? [])].filter(Boolean) as string[]
  const wantsCover = !opts.prefilm && writer === 'ed' && media.some(isVideo) && !c.thumbnail_url && !c.cover_note
  if (!targets.length && !wantsCover) return { written: [], cover_note: c.cover_note ?? null, well_lines: 0, well_loaded: wellStatus().loaded }

  const note = (opts.note ?? '').trim()
  const topic = [c.title, c.post_job, c.onscreen_text, c.script, c.transcript, note, c.source_context].filter(Boolean).join(' ').slice(0, 4000)
  const well = wellLinesFor(topic, 5)
  const cal = (db.calendar_items ?? []).find(i => i.content_id === id)
  // The newest live winner review for this account: its hypothesis and experiment steer the write.
  const lesson = (db.winner_reviews ?? []).filter(w => w.account_id === c.account_id && w.status !== 'dismissed').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const facts = [
    opts.brief && `CAP'S BRIEF:\n${opts.brief}`,
    `Card: ${c.title}`,
    c.post_job && `The one job of this post: ${c.post_job}`,
    c.onscreen_text && `On-screen text in the video (the FIRST hook; the caption must open a different door): ${c.onscreen_text}`,
    (c.script || c.transcript) && `What she says:\n${(c.script || c.transcript).slice(0, 2500)}`,
    c.quote?.text && `THIS IS A QUOTE CARD (${c.quote.label}). The words on it are fixed: ${c.quote.kind === 'written' ? 'written in her voice' : 'her exact words, never reword them'}:\n${c.quote.text.slice(0, 1200)}\nThe caption builds AROUND them and opens a different door; it never repeats or explains the quote.`,
    c.source_context && `HER OWN WORDS behind this post:\n${c.source_context.slice(0, 1500)}`,
    note && `MANDI'S NOTE ON THE FINISHED VIDEO (what changed from the plan; this wins over the plan):\n${note}`,
    well.length && `HER WORDS FROM THE WELL (her own past captions on this theme; pull and sharpen her phrasing first, never invent a voice):\n${well.map(w => `- (${w.date.slice(0, 10)}) ${w.cap}`).join('\n')}`,
    lesson && `WHAT CAP LEARNED FROM THIS ACCOUNT'S RESULTS (${lesson.period}; evidence beats the DEFAULTS):\nHypothesis: ${lesson.hypothesis}\nExperiment to run: ${lesson.experiment.what}${lesson.experiment.how ? ' (' + lesson.experiment.how + ')' : ''}`,
    cal && `Planned for ${cal.date}${cal.time ? ' at ' + cal.time : ''}.`,
    acct && `Account: ${acct.handle} on ${acct.platform}. ${acct.mission ?? ''}`,
    opts.reasons && Object.keys(opts.reasons).length && `CAP SENT THESE BACK. Fix exactly this, keep the rest:\n${Object.entries(opts.reasons).map(([p, r]) => `- ${p}: ${r.join(' ')}\n  Your last draft: ${(post(p)?.caption ?? '').slice(0, 600)}`).join('\n')}`,
  ].filter(Boolean).join('\n\n')

  const role = writer === 'pod'
    ? `You are Pod. ${ROLE_LINES.pod} Cap, the campaign manager, briefed you.`
    : `You are Ed. ${ROLE_LINES.ed} Cap, the campaign manager, briefed you.`
  const instructions = `${craftFor(c.account_id)}

${role} ${opts.prefilm ? 'Mandi has NOT filmed this card yet. Write from the plan (the hook, the one job, what to film) so she sees the whole post before she makes it; it gets refreshed once her footage lands. Never describe what happens in the video beyond the plan.' : 'Mandi has filmed this card.'} Write ONE caption per platform below, each adapted to its platform:
${targets.map(p => '- ' + (PLATFORM_STYLE[p] ?? p)).join('\n') || '- (no captions needed this time)'}
Write to the reader (you/your), in Mandi's voice, from her own words first. Exactly ONE call to action, inside this account's branch. The caption's first line is a SECOND hook: a different door from the on-screen text, never a repeat. Vary the call to action across posts. Never invent facts about her life or the video; if you know little about the video, stay honest and general. Cap reviews every draft before it is scheduled.
${wantsCover ? 'Also write "cover_note": one line for the cover frame: which moment to grab and the few words to put on it.' : ''}
Reply ONLY with JSON: {"captions": {${targets.map(p => `"${p}": "..."`).join(', ')}}${wantsCover ? ', "cover_note": "..."' : ''}}`

  let parsed: { captions?: Record<string, string>; cover_note?: string } = {}
  try {
    parsed = JSON.parse(await fableText({ instructions, input: facts, json: true, maxTokens: writer === 'pod' ? 2000 : 1600 }))
  } catch (e) {
    return { error: `${WRITER_NAME[writer]} couldn’t write: ${e instanceof Error ? e.message : 'the writer didn’t answer'}` }
  }
  const written: string[] = []
  for (const p of targets) {
    const text = String(parsed.captions?.[p] ?? '').trim()
    if (!text) continue
    const r = setPlatformPost(id, p, { caption: text, ed: null }, writer)
    if (!('error' in r)) written.push(p)
  }
  if (written.length) {
    const d = readDb(); const cc = d.content.find(x => x.id === id)
    for (const pp of cc?.platform_posts ?? []) if (written.includes(pp.platform)) { if (opts.prefilm) pp.prefilm = true; else delete pp.prefilm }
    writeDb(d)
  }
  if (targets.length && !written.length) return { error: `${WRITER_NAME[writer]} came back empty. Retry, or add a note about the video.` }
  let cover: string | null = c.cover_note ?? null
  if (wantsCover && parsed.cover_note?.trim()) {
    const db2 = readDb(); const c2 = db2.content.find(x => x.id === id)
    if (c2) { c2.cover_note = parsed.cover_note.trim().slice(0, 400); c2.updated_at = new Date().toISOString(); cover = c2.cover_note; writeDb(db2) }
  }
  return { written, cover_note: cover, well_lines: well.length, well_loaded: wellStatus().loaded }
}

// ── footage_in → Cap: brief the writers ──
export async function runFootageIn(h: Handoff) {
  if (!h.content_id) return failHandoff(h.id, 'This note isn’t tied to a card.')
  startAttempt(h.id)
  const db = readDb()
  const c = db.content.find(x => x.id === h.content_id)
  if (!c) return failHandoff(h.id, 'That card isn’t in RISE any more.')
  if (!writablePlatforms(c).length) return failHandoff(h.id, 'The card has no platform yet, so there is nothing to write for. Add one on the card.')
  const note = (h.note ?? '').trim()

  // Her transcript IS her script (her words, verbatim). Otherwise Cap says what he needs.
  const needs: string[] = []
  let scriptFilled = false
  if (!(c.script ?? '').trim()) {
    if ((c.transcript ?? '').trim()) { c.script = c.transcript; scriptFilled = true }
    else if (!note && !(c.onscreen_text ?? '').trim()) needs.push('What you say in the video: transcribe it from Content Day, or add a line in “what changed from the plan.”')
  }
  c.cap_needs = needs
  c.updated_at = new Date().toISOString()
  writeDb(db)

  const { targets, kept } = openTargets(c, { rewrite: !!note })
  const byWriter: Record<Writer, string[]> = { ed: [], pod: [] }
  for (const p of targets) byWriter[writerFor(p)].push(p)
  const media = [c.media_url, ...(c.media_urls ?? [])].filter(Boolean) as string[]
  const wantsCover = media.some(isVideo) && !c.thumbnail_url && !c.cover_note

  const brief = [
    c.post_job ? `The one job: ${c.post_job}` : `Card: ${c.title}`,
    note && `What changed from the plan (her note wins): ${note}`,
    scriptFilled && 'Her transcript is the script.',
  ].filter(Boolean).join('\n')

  const bits: string[] = []
  const briefed: Writer[] = []
  for (const w of ['ed', 'pod'] as Writer[]) if (byWriter[w].length || (w === 'ed' && wantsCover)) briefed.push(w)
  if (briefed.length) bits.push(`Briefed ${briefed.map(w => `${WRITER_NAME[w]}${byWriter[w].length ? ` (${list(byWriter[w])})` : ' (the cover note)'}`).join(' and ')}.`)
  if (kept.length) bits.push(`Kept ${list(kept)} as ${kept.length > 1 ? 'they were' : 'it was'}.`)
  if (scriptFilled) bits.push('Used your transcript as the script.')
  if (needs.length) bits.push(`Needs from you: ${needs.join(' ')}`)
  const done = completeHandoff(h.id, 'cap', bits.join(' ') || 'Nothing to write: every platform already has a caption.', [{ type: 'card', id: h.content_id }])

  for (const w of briefed) {
    const wh = openHandoff({ kind: 'write', from: 'cap', to: w, what: `Write ${byWriter[w].length ? list(byWriter[w]) : 'the cover note'} for card #${h.content_id}`, content_id: h.content_id, account_id: h.account_id, parent_id: h.id, thread_id: h.thread_id, note: [brief, note && `HER NOTE: ${note}`].filter(Boolean).join('\n') })
    await runWrite(wh)
  }
  return done
}

// ── write → Ed / Pod, then back to Cap ──
export async function runWrite(h: Handoff) {
  if (!h.content_id) return failHandoff(h.id, 'This note isn’t tied to a card.')
  const writer: Writer = h.to === 'pod' ? 'pod' : 'ed'
  startAttempt(h.id)
  const c = readDb().content.find(x => x.id === h.content_id)
  if (!c) return failHandoff(h.id, 'That card isn’t in RISE any more.')
  const parent = h.parent_id ? getHandoff(h.parent_id) : null
  const herNote = (parent?.note ?? '').trim()
  const { targets } = openTargets(c, { rewrite: !!herNote })
  const mine = targets.filter(p => writerFor(p) === writer)
  const r = await writerDraft(writer, h.content_id, { platforms: mine, brief: h.note, note: herNote })
  if ('error' in r) return failHandoff(h.id, r.error)
  const bits: string[] = []
  if (r.written.length) bits.push(`Wrote the ${list(r.written)} caption${r.written.length > 1 ? 's' : ''}${r.well_lines ? `, starting from ${r.well_lines} of your own past captions` : r.well_loaded ? '' : ' (the Well isn’t loaded yet, so from the card and your note only)'}.`)
  if (r.cover_note && writer === 'ed') bits.push(`Cover: ${r.cover_note}`)
  const done = completeHandoff(h.id, writer, bits.join(' ') || 'Nothing left to write.', [{ type: 'card', id: h.content_id }])
  if (r.written.length) await sendToCap(h, writer, 1)
  return done
}

// The loop never stops on Mandi: Cap sends it back, the writer repairs it, and it proceeds.
// Up to MAX_REVIEW_ROUNDS reviews (so MAX_REVIEW_ROUNDS - 1 rewrites). On the last review Cap
// lets it through and writes what he would still change as notes on the card, never a stop.
export const MAX_REVIEW_ROUNDS = 4
/** @deprecated old name, kept for anything still importing it */
export const MAX_ED_ROUNDS = MAX_REVIEW_ROUNDS

async function sendToCap(from: Handoff, writer: Writer, round: number) {
  const rv = openHandoff({ kind: 'review', from: writer, to: 'cap', what: `Review ${WRITER_NAME[writer]}’s captions on card #${from.content_id}${round > 1 ? ` (pass ${round})` : ''}`, content_id: from.content_id, account_id: from.account_id, parent_id: from.id, thread_id: from.thread_id })
  const db = readDb(); const x = db.handoffs!.find(y => y.id === rv.id)!; x.round = round; writeDb(db)
  return runReview({ ...rv, round })
}

// When the card has a calendar date, Cap's confirm schedules it there (RISE never posts it).
function scheduleSlot(contentId: number): string | null {
  const cal = (readDb().calendar_items ?? []).filter(i => i.content_id === contentId).sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!cal) return null
  return cal.time ? `${cal.date}T${cal.time}` : cal.date
}

// ── review → Cap: confirm + schedule, or send back ──
export async function runReview(h: Handoff) {
  if (!h.content_id) return failHandoff(h.id, 'This note isn’t tied to a card.')
  startAttempt(h.id)
  const round = h.round ?? 1
  // Every post has a title, an on-screen hook and Cap's job pick before Cap confirms anything.
  await (await import('./cardAudit')).fillCardBasics(h.content_id).catch(() => null)
  // A8: a video gets its song when Cap reviews it ("trending" only with the scout's source + date).
  const song = await (await import('./music')).fillMusic(h.content_id).catch(() => null)
  const c = readDb().content.find(x => x.id === h.content_id)
  if (!c) return failHandoff(h.id, 'That card isn’t in RISE any more.')
  // Which writer's drafts: the one who handed it over (an old ed_check or Mandi's "review again" = all).
  const only: Writer | null = h.from === 'ed' || h.from === 'pod' ? h.from : null
  const slot = scheduleSlot(c.id)
  const confirmed: string[] = [], back: Record<string, string[]> = {}
  const now = new Date().toISOString()
  for (const pp of c.platform_posts ?? []) {
    if (!pp.caption.trim() || pp.written_by === 'mandi' || pp.status !== 'draft') continue
    if (only && writerFor(pp.platform) !== only) continue
    // Later rounds review only what was sent back; a rewritten caption has its old verdict cleared.
    if (round > 1 && pp.ed?.verdict === 'pass') continue
    const v = capReview(c, { platform: pp.platform, caption: pp.caption })
    const last = v.verdict === 'sent_back' && round >= MAX_REVIEW_ROUNDS
    const verdict: EdVerdict = last
      ? { verdict: 'pass', reasons: [], notes: [...v.reasons.map(r => `Still: ${r}`), ...(v.notes ?? [])], round, checked_at: now, let_through: true }
      : { ...v, round, checked_at: now }
    if (verdict.verdict === 'pass') {
      setPlatformPost(c.id, pp.platform, { ed: verdict, ...(slot ? { status: 'scheduled' as const, scheduled_at: slot } : {}) }, 'cap')
      confirmed.push(pp.platform + (last ? ' (let through)' : ''))
    } else {
      setPlatformPost(c.id, pp.platform, { ed: verdict }, 'cap')
      back[pp.platform] = v.reasons
    }
  }
  const backNames = Object.keys(back)
  if (!confirmed.length && !backNames.length) return completeHandoff(h.id, 'cap', round > 1 ? 'Nothing left to review.' : 'Nothing to review (your own captions stand as you wrote them).')
  const receipt = [
    confirmed.length && `Confirmed ${list(confirmed)}${slot ? ` and scheduled for ${slot.replace('T', ' at ')}` : ' (no calendar date yet, so it isn’t scheduled)'}.`,
    ...backNames.map(p => `Sent ${p} back to ${WRITER_NAME[writerFor(p)]}: ${back[p].join(' ')}`),
    song && `Song: ${song.pick}${song.artist ? ` by ${song.artist}` : ''} (${song.source === 'verified-trend' ? `trending, checked ${song.checked_at.slice(0, 10)}` : 'suits the mood'}).`,
    round >= MAX_REVIEW_ROUNDS && confirmed.some(p => p.includes('let through')) && `After ${MAX_REVIEW_ROUNDS - 1} rewrites Cap let the rest through; what he'd still change is noted on the card.`,
  ].filter(Boolean).join(' ')
  const done = completeHandoff(h.id, 'cap', receipt, [{ type: 'card', id: h.content_id }])
  if (backNames.length && round < MAX_REVIEW_ROUNDS) {
    for (const w of ['ed', 'pod'] as Writer[]) {
      const mine = backNames.filter(p => writerFor(p) === w)
      if (!mine.length) continue
      const rw = openHandoff({ kind: 'rewrite', from: 'cap', to: w, what: `Fix ${list(mine)} on card #${h.content_id}`, content_id: h.content_id, account_id: h.account_id, parent_id: h.id, thread_id: h.thread_id,
        note: mine.map(p => `${p}: ${back[p].join(' ')}`).join('\n') })
      const db = readDb(); const x = db.handoffs!.find(y => y.id === rw.id)!; x.round = round; writeDb(db)
      await runRewrite({ ...rw, round })
    }
  }
  return done
}

// ── rewrite → Ed / Pod (until Cap confirms it or lets it through) ──
export async function runRewrite(h: Handoff) {
  if (!h.content_id) return failHandoff(h.id, 'This note isn’t tied to a card.')
  // Old rewrites (before Nov 22) went Ed → Cap; whoever it's addressed to now, a writer does it.
  const writer: Writer = h.to === 'pod' ? 'pod' : 'ed'
  startAttempt(h.id)
  const c = readDb().content.find(x => x.id === h.content_id)
  if (!c) return failHandoff(h.id, 'That card isn’t in RISE any more.')
  const reasons: Record<string, string[]> = {}
  for (const pp of c.platform_posts ?? []) if (pp.ed?.verdict === 'sent_back' && pp.written_by !== 'mandi' && pp.status === 'draft' && writerFor(pp.platform) === writer) reasons[pp.platform] = pp.ed.reasons
  if (!Object.keys(reasons).length) return completeHandoff(h.id, writer, 'Nothing left to fix (it was edited or posted since).')
  const r = await writerDraft(writer, h.content_id, { platforms: Object.keys(reasons), reasons })
  if ('error' in r) return failHandoff(h.id, r.error)
  const done = completeHandoff(h.id, writer, `Rewrote ${list(r.written)} for Cap’s note.`, [{ type: 'card', id: h.content_id }])
  if (r.written.length) await sendToCap(h, writer, (h.round ?? 1) + 1)
  return done
}

// ── film_now → Cap: Her let Mandi film an idea right now ──
// Cap puts it on Content Day as a card (her words are the script) and says how he'll fit it in.
// He doesn't move other posts by himself; the receipt names the plan adjustment for the next fill.
export async function runFilmNow(h: Handoff) {
  startAttempt(h.id)
  const words = (h.note ?? '').trim()
  if (!words) return failHandoff(h.id, 'Her handed over nothing to film.')
  const db = readDb()
  const acct = h.account_id ? db.brand_accounts.find(a => a.id === h.account_id) : null
  // Her words are the script, minus the "I want to film this now (for …):" lead-in.
  const script = words.replace(/^[^:\n]{0,90}\b(film|shoot|record)\b[^:\n]{0,90}:\s*/i, '').trim() || words
  const card = createContent({
    title: (h.what || words).replace(/^film now:\s*/i, '').slice(0, 90), status: 'in_progress', type: 'post',
    account_id: acct?.id ?? null, platforms: acct ? [acct.platform] : [],
    script: script.slice(0, 4000), source_context: words.slice(0, 4000), river_source: 'her-film-now',
    notes: 'Filmed on the spot (Her let it through). Not on the calendar yet: Cap fits it into the plan.',
  })
  const receipt = `Put “${card.title.slice(0, 60)}” on Content Day (card #${card.id}), your words as the script. ${acct ? `For ${acct.handle}.` : 'No account yet: pick one on the card.'} It isn’t on the calendar; Cap fits it into the next plan fill and moves the lowest-priority post that week if the day is full.`
  return completeHandoff(h.id, 'cap', receipt, [{ type: 'card', id: card.id }])
}


// ── pre-film copy: the whole post before she makes it ──
// Plan cards used to get only a title, a hook and a job; captions waited for footage, so most of
// the calendar sat half-formed. Now each one gets its captions (with its one call to action) and,
// for a video, its song, right after its hook. These drafts are marked prefilm: once footage lands
// the normal chain (footage_in → Ed/Pod → Cap) rewrites them from the real video.
const EVENT_CARD = new Set(['workshop', 'podcast'])
const plusDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10)

// Cap's plan: "roughly 1 in 3 Joyful Media posts points to the next Reset". Which ones: of the
// Joyful posts in the 7 days before a Reset, the one closest to it and every third going back.
// Returns that Reset's date for a promo post, else null.
export async function resetPromoFor(id: number): Promise<string | null> {
  const cal = readDb().calendar_items ?? []
  const mine = cal.filter(i => i.content_id === id && i.slot === 'post' && i.branch_id === 'joyful_media').sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!mine) return null
  const { nextResetDate } = await import('./resetSequence')
  const reset = nextResetDate(plusDays(mine.date, 1))
  if (!reset || reset > plusDays(mine.date, 7)) return null
  const week = cal.filter(i => i.slot === 'post' && i.branch_id === 'joyful_media' && i.date >= plusDays(reset, -7) && i.date < reset)
    .sort((a, b) => a.date.localeCompare(b.date) || a.content_id - b.content_id)
  const ix = week.findIndex(i => i.content_id === id)
  return ix >= 0 && (week.length - 1 - ix) % 3 === 0 ? reset : null
}
export async function prewriteCard(id: number): Promise<{ written: string[]; song?: boolean } | { error: string }> {
  const db = readDb()
  const c = db.content.find(x => x.id === id)
  if (!c) return { error: 'That card isn’t in RISE any more.' }
  if (EVENT_CARD.has(c.type) || ['published', 'archived'].includes(c.status)) return { written: [] }
  if (!c.account_id) return { error: 'No account on this card.' }
  // A planned "post" that's really a reel/clip is a video (so it gets a song and shows as one).
  if (c.type === 'post' && isVideoFormat(c) && !c.quote_format) { c.type = 'video'; c.updated_at = new Date().toISOString(); writeDb(db) }
  if (!(c.onscreen_text ?? '').trim() && !c.post_job) await (await import('./cardAudit')).fillCardBasics(id).catch(() => null)
  const promo = await resetPromoFor(id)
  if (promo) {
    const d = readDb(); const cc = d.content.find(x => x.id === id)
    if (cc && !(cc.tags ?? []).includes('reset-promo')) { cc.tags = [...(cc.tags ?? []), 'reset-promo']; cc.updated_at = new Date().toISOString(); writeDb(d) }
  }
  const nice = promo ? new Date(`${promo}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }) : ''
  const fresh = readDb().content.find(x => x.id === id)!
  const { targets } = openTargets(fresh, {})
  const written: string[] = []
  for (const w of ['ed', 'pod'] as Writer[]) {
    const mine = targets.filter(p => writerFor(p) === w)
    if (!mine.length) continue
    const plan = whatToFilm(fresh)
    const r = await writerDraft(w, id, { platforms: mine, prefilm: true, brief: ['Pre-film draft from the plan.', plan && `What she'll film: ${plan}`, promo && `RESET PROMO: this post's ONE call to action invites her to The Reset on ${nice} at 8 PM Central (a live guided hour, every other Sunday; register on Luma). Give value first; the invite is the call to action. Name no price.`].filter(Boolean).join('\n') })
    if ('error' in r) return written.length ? { written } : { error: r.error }
    written.push(...r.written)
  }
  const song = await (await import('./music')).fillMusic(id).catch(() => null)
  return { written, song: !!song }
}

/** Open cards with a hook but no caption anywhere: the half-formed ones. */
export function halfFormedCards(): number[] {
  return readDb().content.filter(c => !['published', 'archived'].includes(c.status) && !EVENT_CARD.has(c.type)
    && (c.onscreen_text ?? '').trim() && !(c.description ?? '').trim() && !(c.platform_posts ?? []).some(p => p.caption.trim()))
    .map(c => c.id)
}
