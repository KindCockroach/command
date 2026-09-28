import type { ContentPiece } from './db'

// Single source of truth for "is this actually Ready to Publish?"
//
// A post isn't Ready until it has real media attached. A caption with no
// image/video still needs image generation + a pass through Canva/CapCut, so
// it belongs in "Being Built" no matter what status is stored on it. Every
// surface (Kanban, phone Dashboard counts, the Ready-to-Post scroller) reads
// this so they never disagree about what's approve-ready.

export function hasMedia(c: Pick<ContentPiece, 'media_url' | 'media_urls'>): boolean {
  return !!(c.media_url || (c.media_urls && c.media_urls.length))
}

// The lane a card should DISPLAY under, regardless of its stored status.
// Media-less "ready" cards fall back to "in_progress"; everything else is
// shown as stored.
export function effectiveStatus(c: ContentPiece): ContentPiece['status'] {
  if (c.status === 'ready' && !hasMedia(c)) return 'in_progress'
  return c.status
}

// ── PURPOSE — what a post is FOR, so she can sort by intent (follow / sell / trust).
// Derived from the post's chosen `post_job` first (reach new / convert-to-DMs /
// shift-from-peer), then a caption heuristic as a fallback for older posts.
export type Purpose = 'follower' | 'engage' | 'trust' | 'conversion'
export const PURPOSE_META: Record<Purpose, { label: string; emoji: string; color: string; bg: string }> = {
  follower:   { label: 'Follower',   emoji: '📈', color: '#5A4FCF', bg: 'rgba(90,79,207,0.12)' },
  engage:     { label: 'Engage',     emoji: '💬', color: '#2B9CC4', bg: 'rgba(43,156,196,0.14)' },
  trust:      { label: 'Trust',      emoji: '🤝', color: '#2E8B60', bg: 'rgba(46,139,96,0.12)' },
  conversion: { label: 'Conversion', emoji: '💸', color: '#B96A1E', bg: 'rgba(242,166,90,0.18)' },
}
export function postPurpose(c: Pick<ContentPiece, 'post_job' | 'title' | 'description' | 'hashtags'>): Purpose {
  const job = (c.post_job ?? '').toLowerCase()
  if (job) {
    if (/convert|dm|sell|sale|buy|offer|book|enroll|sign|waitlist|link|purchase/.test(job)) return 'conversion'
    if (/engage|comment|reply|conversation|community|poll|ask|question|debate/.test(job)) return 'engage'
    if (/reach|follow|grow|\bnew\b|discover|viral|trend|awareness/.test(job)) return 'follower'
    if (/trust|story|nurture|peer|shift|relat|connect|value/.test(job)) return 'trust'
  }
  const text = `${c.title ?? ''} ${c.description ?? ''} ${c.hashtags ?? ''}`.toLowerCase()
  if (/(comment \w+|dm me|link in bio|sign up|join |waitlist|workshop|enroll|book a|buy |checkout|\$\d|discount|\bsale\b|get the|grab the|download|apply)/.test(text)) return 'conversion'
  // Engage — posts built to pull a reply/DM/share out of the reader.
  if (/(comment (below|your|if)|tell me|what('s| is) your|drop a|which one|agree\?|am i (the only|wrong)|unpopular opinion|hot take|would you|poll|this or that|tag (a|someone)|let me know)/.test(text)) return 'engage'
  if (/(how to|\d+ ways|\d+ steps|\btips\b|save this|mistake|nobody tells|^stop |the truth|\bhack\b|trend|watch this|\blist\b)/.test(text)) return 'follower'
  return 'trust'
}
