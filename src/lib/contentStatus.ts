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
