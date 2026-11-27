// What kind of thing a card is to MAKE: the filter in Content Day's "Make" view and the label Cap
// uses when she asks where a post is. Shared by client and server, so it reads only the card.
import type { ContentPiece } from './db'

export type MakeFormat = 'talking_head' | 'role_play' | 'broll' | 'carousel' | 'other'
export const MAKE_FORMATS: { key: MakeFormat; label: string }[] = [
  { key: 'talking_head', label: 'Talking head' },
  { key: 'role_play', label: 'Role play' },
  { key: 'broll', label: 'B-roll' },
  { key: 'carousel', label: 'Carousel' },
  { key: 'other', label: 'Other' },
]

/** The "Format: …" Cap wrote on a plan card, if any. */
export const planFormat = (p: Pick<ContentPiece, 'notes'>) => ((p.notes ?? '').match(/Format: ([^.\n]+)/)?.[1] ?? '').trim().toLowerCase()
/** "What to film: …" from the plan card's notes (Ed fills it in). */
export const whatToFilm = (p: Pick<ContentPiece, 'notes'>) => ((p.notes ?? '').match(/What to film:\s*([^\n]+)/)?.[1] ?? '').trim()

export function makeFormat(p: ContentPiece): MakeFormat {
  const f = planFormat(p)
  const blob = `${f} ${p.frame_plan ?? ''} ${p.script ?? ''}`.toLowerCase()
  if (p.type === 'carousel' || p.quote_format === 'carousel' || /carousel|slides?\b/.test(f)) return 'carousel'
  if (p.shoot_format === 'role_play' || (p.characters?.length ?? 0) > 1 || /role[- ]?play|skit|dialogue/.test(f)) return 'role_play'
  if (p.quote_format === 'broll_overlay' || /b[- ]?roll/.test(f) || /b[- ]?roll/.test(blob)) return 'broll'
  if (p.shoot_format === 'talking_head' || /talking head|to camera|episode clip/.test(f) || (p.type === 'video' && !p.quote_format)) return 'talking_head'
  return 'other'
}

/** A planned "post" that's really a video (a reel, a clip, to camera). */
export const isVideoFormat = (p: ContentPiece) => /reel|clip|talking head|b[- ]?roll|role[- ]?play|skit|video/.test(planFormat(p))

export function captionOf(p: ContentPiece): string {
  return ((p.platform_posts ?? []).find(x => x.caption.trim())?.caption ?? p.description ?? '').trim()
}

// Cap's job pick, said plainly.
const JOB_TEXT: Record<string, string> = {
  reach: 'Reach: get in front of new women who don’t follow you yet',
  authority: 'Authority: be the one to learn from, not a peer',
  dms: 'DMs: turn the ones already watching into messages',
}
export const objectiveOf = (p: Pick<ContentPiece, 'post_job'>) => (p.post_job ? JOB_TEXT[p.post_job] ?? p.post_job : '')
