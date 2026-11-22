// Cap, Phase 4: when footage lands, Cap writes the captions. Then Ed checks them.
//
// footage_in (Mandi → Cap)  → Cap writes one caption per platform, from her own words first
//                              (the Well), plus a cover note and a script if he can, or says
//                              plainly what he needs from her.
// ed_check  (Cap → Ed)      → Ed passes each draft, or sends it back with the reason.
// rewrite   (Ed → Cap)      → Cap fixes what Ed named. Ed checks again, up to MAX_ED_ROUNDS.
//                              The loop never stops on Mandi: on the last round Ed lets it
//                              through and leaves what he'd still change as notes.
// No per-caption approval from Mandi: the weekly plan is the approval. Nothing is posted.

import { readDb, writeDb, type ContentPiece, type EdVerdict, type Handoff, type PlatformPost } from './db'
import { ownPlatforms, setPlatformPost, normPlatform } from './cardMedia'
import { craftFor } from './craft'
import { fableText } from './fable'
import { wellLinesFor, wellStatus } from './well'
import { edCheck } from './ed'
import { openHandoff, startAttempt, completeHandoff, failHandoff, getHandoff } from './handoffs'

// Starting heuristics from the interview, not rules.
const PLATFORM_STYLE: Record<string, string> = {
  Instagram: 'Instagram: can be more poetic. A first line that stops the scroll, short lines, 3-5 hashtags at the end.',
  TikTok: 'TikTok: short. One to three lines, two or three hashtags.',
  YouTube: 'YouTube: explanatory and actionable. Say plainly what she gets from watching and what to do next. No hashtag wall.',
  Facebook: 'Facebook: fit the audience there, people who know her: warm, conversational, plain. Few or no hashtags.',
  LinkedIn: 'LinkedIn: plain-spoken with one clear takeaway. At most 3 hashtags.',
  Pinterest: 'Pinterest: a searchable title-like first line plus one helpful sentence.',
  Medium: 'Medium: a short teaser paragraph for the story.',
  Substack: 'Substack: a short teaser paragraph for the post.',
}

const isVideo = (u: string) => /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(u)

// The platforms Cap writes for: where the card goes, minus anything a mirrored account reposts.
export function writablePlatforms(c: ContentPiece): string[] {
  const db = readDb()
  return ownPlatforms(db, c, db.brand_accounts.find(a => a.id === c.account_id) ?? null)
}

export type CapWriteResult = {
  written: string[]; kept: string[]; needs: string[]; cover_note: string | null; script_filled: boolean; well_lines: number; well_loaded: boolean
} | { error: string }

export async function capWriteCaptions(id: number, opts: { note?: string; platforms?: string[]; rewrite?: boolean; edReasons?: Record<string, string[]> } = {}): Promise<CapWriteResult> {
  const db = readDb()
  const c = db.content.find(x => x.id === id)
  if (!c) return { error: 'That card isn’t in RISE any more.' }
  const acct = db.brand_accounts.find(a => a.id === c.account_id) ?? null
  const posts = c.platform_posts ?? []
  const all = writablePlatforms(c)
  if (!all.length) return { error: 'The card has no platform yet, so Cap has nothing to write for. Add one on the card.' }
  const post = (p: string): PlatformPost | undefined => posts.find(x => x.platform === p)

  // Never overwrite her words, or a caption already scheduled or posted.
  const kept: string[] = []
  const targets = (opts.platforms?.length ? opts.platforms.map(normPlatform) : all).filter(p => {
    const pp = post(p)
    if (pp && pp.status !== 'draft') { if (pp.caption.trim()) kept.push(p); return false }   // already scheduled or posted
    if (!pp?.caption.trim()) return true
    if (pp.written_by === 'mandi' || pp.status !== 'draft' || !opts.rewrite) { kept.push(p); return false }
    return true
  })

  // Script: her transcript IS her script (her words, verbatim). Otherwise ask.
  const needs: string[] = []
  let scriptFilled = false
  const note = (opts.note ?? '').trim()
  if (!(c.script ?? '').trim()) {
    if ((c.transcript ?? '').trim()) { scriptFilled = true }
    else if (!note && !(c.onscreen_text ?? '').trim()) needs.push('What you say in the video: transcribe it from Content Day, or add a line in “what changed from the plan.”')
  }
  const media = [c.media_url, ...(c.media_urls ?? [])].filter(Boolean) as string[]
  const wantsCover = media.some(isVideo) && !c.thumbnail_url && !c.cover_note

  if (!targets.length && !scriptFilled && !wantsCover) return { written: [], kept, needs, cover_note: c.cover_note ?? null, script_filled: false, well_lines: 0, well_loaded: wellStatus().loaded }

  const topic = [c.title, c.post_job, c.onscreen_text, c.script, c.transcript, note, c.source_context].filter(Boolean).join(' ').slice(0, 4000)
  const well = wellLinesFor(topic, 5)
  const cal = (db.calendar_items ?? []).find(i => i.content_id === id)
  // The newest live winner review for this account: its hypothesis and experiment steer the write.
  const lesson = (readDb().winner_reviews ?? []).filter(w => w.account_id === c.account_id && w.status !== 'dismissed').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const facts = [
    `Card: ${c.title}`,
    c.post_job && `The one job of this post: ${c.post_job}`,
    c.onscreen_text && `On-screen text in the video (the FIRST hook; the caption must open a different door): ${c.onscreen_text}`,
    (c.script || c.transcript) && `What she says:\n${(c.script || c.transcript).slice(0, 2500)}`,
    c.source_context && `HER OWN WORDS behind this post:\n${c.source_context.slice(0, 1500)}`,
    note && `MANDI'S NOTE ON THE FINISHED VIDEO (what changed from the plan; this wins over the plan):\n${note}`,
    well.length && `HER WORDS FROM THE WELL (her own past captions on this theme; pull and sharpen her phrasing first, never invent a voice):\n${well.map(w => `- (${w.date.slice(0, 10)}) ${w.cap}`).join('\n')}`,
    lesson && `WHAT CAP LEARNED FROM THIS ACCOUNT'S RESULTS (${lesson.period}; evidence beats the DEFAULTS):\nHypothesis: ${lesson.hypothesis}\nExperiment to run: ${lesson.experiment.what}${lesson.experiment.how ? ' (' + lesson.experiment.how + ')' : ''}`,
    cal && `Planned for ${cal.date}${cal.time ? ' at ' + cal.time : ''}.`,
    acct && `Account: ${acct.handle} on ${acct.platform}. ${acct.mission ?? ''}`,
    opts.edReasons && Object.keys(opts.edReasons).length && `ED SENT THESE BACK. Fix exactly this, keep the rest:\n${Object.entries(opts.edReasons).map(([p, r]) => `- ${p}: ${r.join(' ')}\n  Your last draft: ${(post(p)?.caption ?? '').slice(0, 600)}`).join('\n')}`,
  ].filter(Boolean).join('\n\n')

  const instructions = `${craftFor(c.account_id)}

You are Cap. Mandi uploaded the finished footage for this card. Write ONE caption per platform below, each adapted to its platform:
${targets.map(p => '- ' + (PLATFORM_STYLE[p] ?? p)).join('\n') || '- (no captions needed this time)'}
Write to the reader (you/your), in Mandi's voice, from her own words first. Exactly ONE call to action, inside this account's branch. The caption's first line is a SECOND hook: a different door from the on-screen text, never a repeat. Vary the call to action across posts. Never invent facts about her life or the video; if you know little about the video, stay honest and general.
${wantsCover ? 'Also write "cover_note": one line for the cover frame: which moment to grab and the few words to put on it.' : ''}
Reply ONLY with JSON: {"captions": {${targets.map(p => `"${p}": "..."`).join(', ')}}${wantsCover ? ', "cover_note": "..."' : ''}}`

  let parsed: { captions?: Record<string, string>; cover_note?: string } = {}
  if (targets.length || wantsCover) {
    try {
      parsed = JSON.parse(await fableText({ instructions, input: facts, json: true, maxTokens: 1600 }))
    } catch (e) {
      return { error: `Cap couldn’t write: ${e instanceof Error ? e.message : 'the writer didn’t answer'}` }
    }
  }
  const written: string[] = []
  for (const p of targets) {
    const text = String(parsed.captions?.[p] ?? '').trim()
    if (!text) continue
    const r = setPlatformPost(id, p, { caption: text, ed: null }, 'cap')
    if (!('error' in r)) written.push(p)
  }
  if (targets.length && !written.length) return { error: 'Cap came back empty. Retry, or add a note about the video.' }

  // Script, cover note and what he still needs go on the card itself.
  const db2 = readDb(); const c2 = db2.content.find(x => x.id === id)
  let cover: string | null = c2?.cover_note ?? null
  if (c2) {
    if (scriptFilled && !(c2.script ?? '').trim()) c2.script = c2.transcript
    if (wantsCover && parsed.cover_note?.trim()) { c2.cover_note = parsed.cover_note.trim().slice(0, 400); cover = c2.cover_note }
    c2.cap_needs = needs
    c2.updated_at = new Date().toISOString()
    writeDb(db2)
  }
  return { written, kept, needs, cover_note: cover, script_filled: scriptFilled, well_lines: well.length, well_loaded: wellStatus().loaded }
}

const list = (a: string[]) => a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`

// ── footage_in → Cap ──
export async function runFootageIn(h: Handoff) {
  if (!h.content_id) return failHandoff(h.id, 'This note isn’t tied to a card.')
  startAttempt(h.id)
  const r = await capWriteCaptions(h.content_id, { note: h.note, rewrite: !!h.note?.trim() })
  if ('error' in r) return failHandoff(h.id, r.error)
  const bits: string[] = []
  if (r.written.length) bits.push(`Wrote the ${list(r.written)} caption${r.written.length > 1 ? 's' : ''}${r.well_lines ? `, starting from ${r.well_lines} of your own past captions` : r.well_loaded ? '' : ' (the Well isn’t loaded yet, so from the card and your note only)'}.`)
  if (r.kept.length) bits.push(`Kept ${list(r.kept)} as ${r.kept.length > 1 ? 'they were' : 'it was'}.`)
  if (r.script_filled) bits.push('Used your transcript as the script.')
  if (r.cover_note) bits.push(`Cover: ${r.cover_note}`)
  if (r.needs.length) bits.push(`Needs from you: ${r.needs.join(' ')}`)
  const done = completeHandoff(h.id, 'cap', bits.join(' ') || 'Nothing to write: every platform already had a caption.', [{ type: 'card', id: h.content_id }])
  if (r.written.length) await sendToEd(h, 1)
  return done
}

// Ed's loop never stops on Mandi: he sends it back, Cap repairs it, and it proceeds.
// Up to MAX_ED_ROUNDS checks (so MAX_ED_ROUNDS - 1 rewrites). On the last check Ed lets it
// through and writes what he would still change as notes on the card, never a stop.
export const MAX_ED_ROUNDS = 4

async function sendToEd(parent: Handoff, round: number) {
  const ed = openHandoff({ kind: 'ed_check', from: 'cap', to: 'ed', what: `Check the captions on card #${parent.content_id}${round > 1 ? ' (second pass)' : ''}`, content_id: parent.content_id, account_id: parent.account_id, parent_id: parent.id, thread_id: parent.thread_id })
  const db = readDb(); const x = db.handoffs!.find(y => y.id === ed.id)!; x.round = round; writeDb(db)
  return runEdCheck({ ...ed, round })
}

// ── ed_check → Ed ──
export async function runEdCheck(h: Handoff) {
  if (!h.content_id) return failHandoff(h.id, 'This note isn’t tied to a card.')
  startAttempt(h.id)
  const round = h.round ?? 1
  const c = readDb().content.find(x => x.id === h.content_id)
  if (!c) return failHandoff(h.id, 'That card isn’t in RISE any more.')
  const passed: string[] = [], back: Record<string, string[]> = {}
  const now = new Date().toISOString()
  for (const pp of c.platform_posts ?? []) {
    if (!pp.caption.trim() || pp.written_by === 'mandi' || pp.status !== 'draft') continue
    // Later rounds check only what was sent back; a caption Cap rewrote has its old verdict cleared.
    if (round > 1 && pp.ed?.verdict === 'pass') continue
    const v = edCheck(c, { platform: pp.platform, caption: pp.caption })
    const last = v.verdict === 'sent_back' && round >= MAX_ED_ROUNDS
    // Last round: let it through. What Ed would still change rides along as notes.
    const verdict: EdVerdict = last
      ? { verdict: 'pass', reasons: [], notes: [...v.reasons.map(r => `Still: ${r}`), ...(v.notes ?? [])], round, checked_at: now, let_through: true }
      : { ...v, round, checked_at: now }
    setPlatformPost(c.id, pp.platform, { ed: verdict }, 'cap')
    if (verdict.verdict === 'pass') passed.push(pp.platform + (last ? ' (let through)' : '')); else back[pp.platform] = v.reasons
  }
  const backNames = Object.keys(back)
  if (!passed.length && !backNames.length) return completeHandoff(h.id, 'ed', round > 1 ? 'Nothing left to recheck.' : 'Nothing of Cap’s to check (your own captions stand as you wrote them).')
  const receipt = [
    passed.length && `Passed: ${list(passed)}.`,
    ...backNames.map(p => `Sent back ${p}: ${back[p].join(' ')}`),
    round >= MAX_ED_ROUNDS && passed.some(p => p.includes('let through')) && `After ${MAX_ED_ROUNDS - 1} rewrites Ed let the rest through; what he'd still change is noted on the card.`,
  ].filter(Boolean).join(' ')
  const done = completeHandoff(h.id, 'ed', receipt, [{ type: 'card', id: h.content_id }])
  if (backNames.length && round < MAX_ED_ROUNDS) {
    const rw = openHandoff({ kind: 'rewrite', from: 'ed', to: 'cap', what: `Fix ${list(backNames)} on card #${h.content_id}`, content_id: h.content_id, account_id: h.account_id, parent_id: h.id, thread_id: h.thread_id,
      note: backNames.map(p => `${p}: ${back[p].join(' ')}`).join('\n') })
    const db = readDb(); const x = db.handoffs!.find(y => y.id === rw.id)!; x.round = round; writeDb(db)
    await runRewrite({ ...rw, round })
  }
  return done
}

// ── rewrite → Cap (until Ed passes it or lets it through) ──
export async function runRewrite(h: Handoff) {
  if (!h.content_id) return failHandoff(h.id, 'This note isn’t tied to a card.')
  startAttempt(h.id)
  const c = readDb().content.find(x => x.id === h.content_id)
  if (!c) return failHandoff(h.id, 'That card isn’t in RISE any more.')
  const reasons: Record<string, string[]> = {}
  for (const pp of c.platform_posts ?? []) if (pp.ed?.verdict === 'sent_back' && pp.written_by !== 'mandi' && pp.status === 'draft') reasons[pp.platform] = pp.ed.reasons
  if (!Object.keys(reasons).length) return completeHandoff(h.id, 'cap', 'Nothing left to fix (it was edited or posted since).')
  const r = await capWriteCaptions(h.content_id, { platforms: Object.keys(reasons), rewrite: true, edReasons: reasons })
  if ('error' in r) return failHandoff(h.id, r.error)
  const done = completeHandoff(h.id, 'cap', `Rewrote ${list(r.written)} for Ed’s note.`, [{ type: 'card', id: h.content_id }])
  const parent = getHandoff(h.id)
  if (parent && r.written.length) await sendToEd(parent, (h.round ?? 1) + 1)
  return done
}
