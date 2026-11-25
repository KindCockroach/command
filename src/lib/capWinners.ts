// Cap 4 · Weigh the winners (acceptance scenario 4). Phase 4.
//
// A Meta export lands → Mandi hands it to Cap (winners_in). Cap compares the results with
// what actually shipped (hook, on-screen text, caption, call to action, format, timing),
// separates what the numbers show from what he is guessing, names what the data can't tell,
// records ONE hypothesis and proposes ONE experiment. The experiment rides onto that
// account's next weekly plan draft, which Mandi approves. He never clones winners into cards.

import { readDb, writeDb, createMemory, type Handoff, type WinnerReview } from './db'
import { scoreResults, type ScoredResult } from './results'
import { fableText } from './fable'
import { startAttempt, completeHandoff, failHandoff } from './handoffs'
import { addIdeas, ideaAsk } from './ideas'

const nowIso = () => new Date().toISOString()

function shipped(r: ScoredResult) {
  const db = readDb()
  const c = r.content_id ? db.content.find(x => x.id === r.content_id) : undefined
  if (!c) return null
  const target = r.platform === 'facebook' ? 'Facebook' : 'Instagram'
  const cap = (c.platform_posts ?? []).find(p => p.platform === target)?.caption || c.description || ''
  return { card: c.id, title: c.title, onscreen: c.onscreen_text ?? '', caption_first_line: cap.split('\n').find(l => l.trim()) ?? '', type: c.type, format: c.shoot_format ?? '', job: c.post_job ?? '' }
}

const when = (s: string | null) => {
  if (!s) return 'unknown time'
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getHours()}:00`
}

// The model sometimes answers a list with objects ({ point, support }); keep them as plain lines.
const lines = (a: unknown): string[] => (Array.isArray(a) ? a : []).map(x => typeof x === 'string' ? x : x && typeof x === 'object' ? Object.values(x as Record<string, unknown>).filter(v => typeof v === 'string' || typeof v === 'number').join(' · ') : String(x)).filter(Boolean).slice(0, 8)

export async function weighWinners(accountId: string, platform: string): Promise<WinnerReview | { error: string }> {
  const all = scoreResults(accountId).filter(r => (r.platform || 'instagram') === platform)
  if (all.length < 3) return { error: `Only ${all.length} ${platform} result${all.length === 1 ? '' : 's'} for this account. Cap needs at least 3 to compare.` }
  const top = all.filter(r => r.verdict === 'make_more' || r.verdict === 'rehook').sort((a, b) => b.views_vs_median - a.views_vs_median).slice(0, 6)
  const low = all.filter(r => r.verdict === 'retire').sort((a, b) => a.views_vs_median - b.views_vs_median).slice(0, 4)
  const sample = [...top, ...low]
  if (!sample.length) return { error: 'Nothing stood out from typical yet, so there is nothing to weigh.' }
  const dates = all.map(r => Date.parse(r.posted_at ?? '')).filter(n => !isNaN(n)).sort((x, y) => x - y)
  const day = (n: number) => new Date(n).toISOString().slice(0, 10)
  const period = dates.length ? `${day(dates[0])} to ${day(dates[dates.length - 1])}` : 'unknown dates'
  const matched = sample.filter(r => r.content_id).length

  const rows = sample.map(r => {
    const s = shipped(r)
    return `- [${r.verdict}] ${r.views_vs_median.toFixed(1)}× typical · ${r.ig_views} views · ${(r.engagement_rate * 100).toFixed(1)}% engaged · ${r.keep_per_1k.toFixed(1)} saves+shares/1K · ${r.follows} follows · posted ${when(r.posted_at)}
  caption/text in export: "${r.onscreen_text.replace(/\s+/g, ' ').slice(0, 220)}"
  ${s ? `SHIPPED CARD #${s.card}: on-screen "${s.onscreen.slice(0, 120)}" · caption opens "${s.caption_first_line.slice(0, 120)}" · ${s.type}${s.format ? '/' + s.format : ''}${s.job ? ' · job: ' + s.job : ''}` : 'no RISE card matched (only the export text is known)'}`
  }).join('\n')

  const db = readDb()
  const acct = db.brand_accounts.find(a => a.id === accountId)
  const prior = (db.winner_reviews ?? []).filter(w => w.account_id === accountId && w.platform === platform).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

  const instructions = `You are Cap, weighing a week of results for ${acct?.handle ?? accountId} on ${platform}. Reason like an analyst, not a cheerleader.
- "evidence": what the numbers in the table actually show (metrics and patterns across posts). Quote numbers. No causes here.
- "guesses": plausible reasons (hook, on-screen text, visuals, call to action, pacing, timing, format), each labeled with how strong the support is. Never state a cause as fact; one post is an anecdote.
- "missing": what this data cannot tell us (for example: the export has no on-screen text, no retention curve, few posts matched to a RISE card, small sample).
- "hypothesis": ONE testable sentence.
- "experiment": ONE test for next week that changes EXACTLY ONE variable (say which) and holds everything else the same: what, how (which posts, how many, against what control), measure (which number, compared with what). Keep it inside her real cadence (1 to 2 posts a day).
Every list item is a plain string.
Do not propose copying or reposting a winner. Do not invent data. ${prior ? `Last time you hypothesized: "${prior.hypothesis}". Say in evidence whether this week supports it, contradicts it, or can't tell.` : ''}
${ideaAsk('cap')}
Reply ONLY with JSON: {"evidence":[],"guesses":[],"missing":[],"hypothesis":"","experiment":{"what":"","how":"","measure":""},"ideas":[{"text":"","why":""}]}`
  let out: Partial<WinnerReview> & { ideas?: { text?: string; why?: string }[] }
  try {
    out = JSON.parse(await fableText({ instructions, input: `${all.length} posts scored, ${period}. ${matched} of the ${sample.length} below matched a RISE card.\n\n${rows}`, json: true, maxTokens: 1400 }))
  } catch (e) {
    return { error: `Cap couldn’t weigh them: ${e instanceof Error ? e.message : 'no answer'}` }
  }
  if (!out.hypothesis || !out.experiment?.what) return { error: 'Cap came back without a hypothesis or an experiment. Retry.' }
  const review: WinnerReview = {
    id: `wr_${Date.now().toString(36)}`, account_id: accountId, platform, created_at: nowIso(), posts: all.length, period,
    evidence: lines(out.evidence), guesses: lines(out.guesses), missing: lines(out.missing),
    hypothesis: String(out.hypothesis).slice(0, 400),
    experiment: { what: String(out.experiment.what).slice(0, 300), how: String(out.experiment.how ?? '').slice(0, 400), measure: String(out.experiment.measure ?? '').slice(0, 300) },
    compared: sample.map(r => ({ media_id: r.media_id, content_id: r.content_id, verdict: r.verdict, views: r.ig_views, line: r.onscreen_text.slice(0, 90) })),
    status: 'proposed',
  }
  const d2 = readDb()
  d2.winner_reviews ??= []
  // One open proposal per account+platform: the newest replaces an older unplanned one.
  for (const w of d2.winner_reviews) if (w.account_id === accountId && w.platform === platform && w.status === 'proposed') w.status = 'dismissed'
  d2.winner_reviews.push(review)
  writeDb(d2)
  // Loop 14: Cap's own ideas (campaigns and series) ride up to Commander with this report.
  addIdeas('cap', out.ideas, `Cap’s winners review for ${acct?.handle ?? accountId} (${platform})`)
  // Cap's memory: the hypothesis, so the next read can test it.
  createMemory({ category: 'pattern', title: `Cap hypothesis (${acct?.handle ?? accountId}, ${platform}): ${review.hypothesis}`.slice(0, 200), body: `Evidence: ${review.evidence.join(' | ')}\nExperiment: ${review.experiment.what}`, agent_tags: ['cap'] })
  return review
}

export async function runWeighWinners(h: Handoff) {
  startAttempt(h.id)
  const accountId = h.account_id
  const platform = h.ref?.label || 'instagram'
  if (!accountId) return failHandoff(h.id, 'Which account? The export wasn’t tied to one.')
  const r = await weighWinners(accountId, platform)
  if ('error' in r) return failHandoff(h.id, r.error)
  const d = readDb(); const w = d.winner_reviews!.find(x => x.id === r.id)!; w.handoff_id = h.id; writeDb(d)
  return completeHandoff(h.id, 'cap', `Weighed ${r.posts} posts (${r.period}). Hypothesis: ${r.hypothesis} Experiment for the next weekly plan: ${r.experiment.what}`, [{ type: 'review', id: r.id }])
}

export function getReviews(accountId?: string | null) {
  return (readDb().winner_reviews ?? []).filter(w => !accountId || w.account_id === accountId).sort((a, b) => b.created_at.localeCompare(a.created_at))
}
export function setReviewStatus(id: string, status: WinnerReview['status']) {
  const d = readDb(); const w = (d.winner_reviews ?? []).find(x => x.id === id); if (!w) return null
  w.status = status; writeDb(d); return w
}
