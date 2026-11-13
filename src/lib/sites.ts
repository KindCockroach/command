// The map of Mandi's web properties — one source of truth the Sites tab renders
// and the Commander can reference. Three owned domains, all served by this app
// (routing lives in middleware.ts). Pages marked `private` are the Command Center
// itself (gated by STATION_KEY) and are not status-checked.

export type SitePage = { label: string; path: string; group: string; private?: boolean }
export type SiteDomain = { domain: string; emoji: string; blurb: string; pages: SitePage[] }

export const SITE_MAP: SiteDomain[] = [
  {
    domain: 'bethereforher.com', emoji: '🌿', blurb: 'Wellness · meditation · the Reset',
    pages: [
      { label: 'Home', path: '/', group: 'Main' },
      { label: 'Reconnect To Your Intuition', path: '/intuition', group: 'Products' },
      { label: 'The Wellspring (membership)', path: '/wellspring', group: 'Products' },
      { label: 'Library', path: '/library', group: 'Products' },
      { label: 'Cookbook → Invitation to Reset', path: '/cookbook', group: 'Funnels' },
      { label: 'Love Yourself In The Kitchen', path: '/in-the-kitchen', group: 'Funnels' },
      { label: 'Reset Welcome + Gift', path: '/resetwelcome', group: 'Funnels' },
    ],
  },
  {
    domain: 'aimomeducation.com', emoji: '🎙', blurb: 'AI Mom Podcast landing',
    pages: [
      { label: 'Podcast Landing', path: '/', group: 'Main' },
    ],
  },
  {
    domain: 'aiworksforher.com', emoji: '💼', blurb: 'Works For Her · main domain + the private station',
    pages: [
      { label: 'Home', path: '/', group: 'Main' },
      { label: 'AI Mom (podcast · guest · speaking)', path: '/aimom', group: 'Podcast & Speaking' },
      { label: 'Listen', path: '/listen', group: 'Podcast & Speaking' },
      { label: 'Thesis (speaker)', path: '/thesis', group: 'Podcast & Speaking' },
      { label: 'Be a Guest (scheduler)', path: '/book', group: 'Podcast & Speaking' },
      { label: 'AI Assessment', path: '/assessment', group: 'Works For Her services' },
      { label: 'UGC', path: '/ugc', group: 'Works For Her services' },
      { label: 'Meet / Book a Call', path: '/meet', group: 'Works For Her services' },
      { label: 'Retire (questionnaire)', path: '/retire', group: 'Works For Her services' },
      { label: 'Speak (questionnaire)', path: '/speak', group: 'Works For Her services' },
      { label: 'The Reset', path: '/reset', group: 'The Reset' },
      { label: 'Reset ($10, unlisted)', path: '/insait', group: 'The Reset' },
      { label: 'Cheat Code', path: '/cheatcode', group: 'The Reset' },
      { label: 'Workshop', path: '/workshop', group: 'The Reset' },
      { label: 'Reset Survey (post-session feedback)', path: '/reset/survey', group: 'The Reset' },
      { label: 'Cookbook (podcast listener)', path: '/cookbook', group: 'Funnels' },
      { label: 'Joyful Media (agency)', path: '/joyful-media', group: 'Funnels' },
      { label: 'Intro to AI', path: '/intro-to-ai', group: 'Funnels' },
      { label: 'Golden Thread', path: '/goldenthread', group: 'Funnels' },
      { label: 'Welcome (thank-you)', path: '/welcome', group: 'Funnels' },
      { label: 'Unsubscribe (email opt-out)', path: '/unsubscribe', group: 'Funnels' },
      { label: 'Station (login)', path: '/station', group: 'The Command Center', private: true },
      { label: 'Admin', path: '/admin', group: 'The Command Center', private: true },
      { label: 'Brain', path: '/brain', group: 'The Command Center', private: true },
      { label: 'Studio', path: '/studio', group: 'The Command Center', private: true },
      { label: 'Brief', path: '/brief', group: 'The Command Center', private: true },
      { label: 'Repurpose', path: '/repurpose', group: 'The Command Center', private: true },
      { label: 'Archive', path: '/archive', group: 'The Command Center', private: true },
      { label: 'Sorting Hat', path: '/sortinghat', group: 'The Command Center', private: true },
      { label: 'Winners', path: '/winners', group: 'The Command Center', private: true },
      { label: 'Kitchen Send', path: '/kitchen-send', group: 'The Command Center', private: true },
      { label: 'This Shit', path: '/thisshit', group: 'The Command Center', private: true },
      { label: 'Guest Bookings (manage)', path: '/book/manage', group: 'The Command Center', private: true },
      { label: 'Meetings (manage)', path: '/meet/manage', group: 'The Command Center', private: true },
    ],
  },
]

export function siteUrl(domain: string, path: string): string {
  return `https://${domain}${path === '/' ? '' : path}`
}

export function pageKey(domain: string, path: string): string {
  return `${domain}${path}`
}

// Compact, public-only summary for the Commander's context.
export function siteMapSummary(): string {
  return SITE_MAP.map(d =>
    `${d.domain} — ${d.blurb}: ${d.pages.filter(p => !p.private).map(p => (p.path === '/' ? 'home' : p.path)).join(', ')}`
  ).join('\n')
}
