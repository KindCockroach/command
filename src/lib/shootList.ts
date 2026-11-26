// The shoot list rule, shared by Content Day and Her's Brief ("one line to film today").
// A card is on the shoot list when it's scripted, not faceless, has no video yet and isn't filmed.
import type { ContentPiece } from './db'

export const isVideoUrl = (u?: string | null) => !!u && /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(u)
export const hasVideo = (p: ContentPiece) => isVideoUrl(p.media_url) || (p.media_urls ?? []).some(isVideoUrl)

// Accounts Mandi never films for (Mandi, 2026-11-26): @sageaiworks (id 'sage') is retired from Content Day;
// if it continues it will be a faceless account that educates on AI for mindful brands.
// @aimomatwork is retired outright (Phase 8 A1).
export const NO_FILM_ACCOUNTS = new Set(['sage', 'aimomatwork'])

// Faceless posts (trend clips, text on screen, b-roll, voiceover only) aren't filmed by Mandi.
export function isFaceless(p: ContentPiece): boolean {
  if (p.account_id && NO_FILM_ACCOUNTS.has(p.account_id)) return true
  const blob = `${p.script ?? ''} ${p.frame_plan ?? ''} ${p.notes ?? ''} ${p.post_job ?? ''}`.toLowerCase()
  return /no[- ]?face|faceless|trend(ing)? clip|text[- ]on[- ]screen|b[- ]?roll only|voice[- ]?over only|no talking|don'?t show your face|do not show your face|on[- ]screen only|stock (clip|footage)|\bcapcut\b/.test(blob)
}

/** On the shoot list (ignoring "filmed just now" UI state). */
export function needsFilming(p: ContentPiece): boolean {
  return !['published', 'archived'].includes(p.status) && !!(p.script ?? '').trim() && !isFaceless(p) && !hasVideo(p) && !p.filmed_at
}
