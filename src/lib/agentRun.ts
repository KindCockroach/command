// Runs (or retries) one handoff with the agent it belongs to. Used right after a handoff
// opens (from `after()` in the route, so Mandi isn't kept waiting) and by Retry in Activity.
// A run that throws becomes a FAILED handoff with the reason, never a silent stop.

import { getHandoff, failHandoff, AUTO_KINDS } from './handoffs'
import { runFootageIn, runWrite, runReview, runRewrite, runFilmNow } from './cap'
import { runCommanderPickup } from './her'
import { runWeighWinners } from './capWinners'
import { runEmailWrite, runEmailReview } from './resetSequence'
import { runSweep } from './sweep'
import { runStory, runFindStories } from './storyDesk'
import { runLongformWrite, runLongformCheck } from './longform'
import { runSeries, runOutline } from './substack'

const running = new Set<string>()

export async function runHandoff(id: string): Promise<{ ok: boolean; error?: string }> {
  const h = getHandoff(id)
  if (!h) return { ok: false, error: 'No such handoff.' }
  if (!AUTO_KINDS.includes(h.kind)) return { ok: false, error: `${h.to} picks this up in planning; there is nothing to run.` }
  if (h.status === 'done') return { ok: false, error: 'This one is already done.' }
  if (running.has(id)) return { ok: false, error: 'It is running right now.' }
  running.add(id)
  try {
    switch (h.kind) {
      case 'footage_in': await runFootageIn(h); break
      case 'write': await runWrite(h); break
      case 'review': case 'ed_check': await runReview(h); break   // ed_check = old records, now Cap's review
      case 'film_now': await runFilmNow(h); break
      case 'rewrite': await runRewrite(h); break
      case 'her_note': await runCommanderPickup(h); break
      case 'winners_in': await runWeighWinners(h); break
      case 'email_write': case 'email_rewrite': await runEmailWrite(h); break
      case 'email_review': await runEmailReview(h); break
      case 'sweep': await runSweep(h); break
      case 'story': await runStory(h); break
      case 'story_find': await runFindStories(h); break
      case 'interview_prep': await (await import('./coraInterview')).runInterviewPrep(h); break
      case 'interview_shape': await (await import('./coraInterview')).runInterviewShape(h); break
      case 'longform_write': await runLongformWrite(h); break
      case 'longform_check': await runLongformCheck(h); break
      case 'substack_series': await runSeries(h); break
      case 'substack_outline': await runOutline(h); break
    }
    const after = getHandoff(id)
    return after?.status === 'failed' ? { ok: false, error: after.error ?? 'failed' } : { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    failHandoff(id, `It broke partway: ${msg}`)
    return { ok: false, error: msg }
  } finally {
    running.delete(id)
  }
}
