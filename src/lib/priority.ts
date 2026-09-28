import type { ContentPiece, BrandAccount } from './db'
import { hasMedia, postPurpose } from './contentStatus'

// PRIORITY ENGINE — the full assessment Mandi struggles to make day to day:
// what to shoot/ship FIRST. A transparent, deterministic score (0-100) so
// "Ship This Next" is explainable, not a black box. Weighting (her default):
//   Goal-fit 30 · Impact 25 · Ease of production 20 · Readiness 15 · Cash 10
// (When winner-loop performance data lands, it becomes the heaviest factor.)

export type Scored = { score: number; reasons: string[]; ease: string }

export function priorityScore(
  p: ContentPiece,
  account?: BrandAccount | null,
  opts?: { behindPace?: boolean },
): Scored {
  const reasons: string[] = []

  // ── Goal-fit (0-30): how much this account matters + is it behind pace ──
  const prMap: Record<string, number> = { high: 30, medium: 20, low: 10, planned: 14, paused: 4 }
  let goal = prMap[account?.priority ?? 'low'] ?? 10
  if (opts?.behindPace) { goal = Math.min(30, goal + 8); reasons.push('account behind pace') }
  else if ((account?.priority ?? '') === 'high') reasons.push('top-priority account')

  // ── Impact (0-25): the reach read ──
  const firstHook = (p.onscreen_text || p.description || '').split('\n')[0]?.trim() || ''
  let impact = 8
  if (p.type === 'carousel') impact += 8
  else if (p.type === 'video' || p.type === 'podcast') impact += 6
  else if (p.type === 'image') impact += 3
  if (firstHook) impact += firstHook.endsWith('?') ? -3 : 6   // statement hook beats a question
  const text = `${firstHook} ${p.description ?? ''}`
  if (/\d/.test(text)) impact += 3            // a real number
  if (/["“”]/.test(text)) impact += 2          // a real quote
  if ((p.source_context ?? '').trim()) impact += 3  // her own words
  impact = Math.max(0, Math.min(25, impact))
  if (impact >= 18) reasons.push('high reach potential')

  // ── Ease of production (0-20): the "what am I actually filming" axis ──
  let ease = 8
  let easeLabel = 'needs building'
  const media = hasMedia(p)
  const isVideo = p.type === 'video' || p.type === 'podcast'
  if (media && (p.description ?? '').trim()) { ease = 20; easeLabel = 'ready to approve' }
  else if (media) { ease = 16; easeLabel = 'has media' }
  else if ((p.onscreen_text ?? '').trim() && !isVideo) { ease = 14; easeLabel = 'on-screen text only' }
  else if ((p.frame_plan ?? '').trim() && !(p.script ?? '').trim()) { ease = 12; easeLabel = 'b-roll to grab' }
  else if ((p.script ?? '').trim()) { ease = 6; easeLabel = 'talking-head to film' }
  reasons.push(easeLabel)

  // ── Readiness (0-15): closest to done wins; blocked sinks ──
  let ready = 5
  if (p.status === 'ready') ready = 15
  else if (p.status === 'approved') ready = 12
  else if (p.status === 'in_progress') ready = 9
  else if (p.status === 'idea') ready = 5
  if (p.open_questions?.length) { ready = Math.max(0, ready - 8); reasons.push('blocked on questions') }

  // ── Cash (0-10): conversion posts tied to the money ──
  const purpose = postPurpose(p)
  const cash = purpose === 'conversion' ? 10 : purpose === 'follower' ? 4 : purpose === 'engage' ? 3 : 2
  if (purpose === 'conversion') reasons.push('conversion — tied to cash')

  const score = Math.max(0, Math.min(100, goal + impact + ease + ready + cash))
  // Keep the 2-3 most useful reasons, dedup, ease label always included.
  const top = Array.from(new Set(reasons)).slice(0, 3)
  return { score, reasons: top, ease: easeLabel }
}
