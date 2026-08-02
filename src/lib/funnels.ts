// Audience funnels for the $27 Caption Writer product.
// Same deliverable (the GPT + Notion workspace) sold through three doors, each with
// its own sales headline. Everything else is shared: both order bumps (The Reset $33,
// The Cheat Code $55) on one checkout, and one coming-soon (the Caption Keeper).
//   /seen          → Invisible Annie
//   /queen         → Content-Chasing Camille
//   /captionwriter → Working moms

export type AudienceSlug = 'seen' | 'queen' | 'captionwriter'
export type Bump = 'reset' | 'uplevel'

// The delivered product is identical across audiences.
export const GPT_URL = 'https://chatgpt.com/g/g-6a4dc595ee408191b4b422fca6bd74de-the-river-lite'
export const TEMPLATE_URL =
  process.env.NEXT_PUBLIC_LITE_TEMPLATE_URL ||
  'https://app.notion.com/p/The-River-Your-Content-Workspace-dff31126df3a4797a1b6013a6ddd5ae6?source=copy_link'

// Optional soft-gate for delivery pages (unset = ungated, current behavior).
export const ACCESS_KEY = process.env.NEXT_PUBLIC_LITE_ACCESS_KEY || ''

// Fallback checkout = the current live FastPayDirect link. Each audience reads its
// own env var so you can point it at a GHL checkout carrying the right order bump;
// until those exist, all three fall back here so nothing breaks.
export const DEFAULT_CHECKOUT =
  'https://link.fastpaydirect.com/payment-link/6a67ba88a655fa0b802a6707'

export function checkoutUrl(slug: AudienceSlug): string {
  switch (slug) {
    case 'seen':
      return process.env.NEXT_PUBLIC_SEEN_CHECKOUT_URL || DEFAULT_CHECKOUT
    case 'queen':
      return process.env.NEXT_PUBLIC_QUEEN_CHECKOUT_URL || DEFAULT_CHECKOUT
    case 'captionwriter':
      return process.env.NEXT_PUBLIC_CAPTIONWRITER_CHECKOUT_URL || DEFAULT_CHECKOUT
  }
}

export type ComingSoon = {
  theme: 'journal' | 'command'   // picks the gradient/accent on the welcome block
  eyebrow: string
  headline: string
  body: string[]                 // one <p> per string
  cta: string
  source: string                 // waitlist tag → GET /api/journal-waitlist?source=
}

export type Audience = {
  slug: AudienceSlug
  label: string                  // internal name
  bump: Bump
  welcomeHeadline: string
  welcomeSub: string
  comingSoon: ComingSoon
}

// The one and only coming-soon product, shown identically to every audience.
// Caption Keeper = the journal that talks back + writes and keeps your captions.
// (The old "command center / RISE Lite" multi-account idea is deferred — someday, not now.)
const KEEPER_SOON: ComingSoon = {
  theme: 'journal',
  eyebrow: '✨ COMING SOON — BY AI MOM',
  headline: 'The Caption Keeper',
  body: [
    'Caption Writer helps you write it. The Caption Keeper keeps it — a journal that talks back, and a home for every caption.',
    'You write out the real, messy thing, and it reflects it back: it hears the feeling under your words and leads you toward a little peace. Then, when you want, it helps you shape what you wrote into a post — and keeps them all in one place.',
    'Want first access and founding pricing? Get on the list.',
  ],
  cta: 'Get on the waitlist',
  source: 'caption-keeper',
}

export const AUDIENCES: Record<AudienceSlug, Audience> = {
  seen: {
    slug: 'seen',
    label: 'Invisible Annie',
    bump: 'reset',
    welcomeHeadline: 'Welcome — you’re about to be seen',
    welcomeSub:
      'Everything you need is right here. Give it 10 minutes and you’ll walk away with 3 finished posts in your own voice. Do the steps in order.',
    comingSoon: KEEPER_SOON,
  },
  queen: {
    slug: 'queen',
    label: 'Content-Chasing Camille',
    bump: 'uplevel',
    welcomeHeadline: 'Welcome, Queen — nothing gets lost now',
    welcomeSub:
      'Everything you need is right here. Give it 10 minutes and you’ll turn one brain-dump into a week of posts. Do the steps in order.',
    comingSoon: KEEPER_SOON,
  },
  captionwriter: {
    slug: 'captionwriter',
    label: 'Working moms',
    bump: 'uplevel',
    welcomeHeadline: 'You’re in — let’s write your captions',
    welcomeSub:
      'Everything you need is right here. Give it 10 minutes and you’ll have 3 ready-to-post captions in your own voice. Do the steps in order.',
    comingSoon: KEEPER_SOON,
  },
}
