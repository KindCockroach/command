import { NextRequest, NextResponse } from 'next/server'
import { isOwner } from '@/lib/ownerAuth'
import { upsertBrandAccount, getAllBrandAccounts, createProduct, getProducts, type BrandAccount, type Product } from '@/lib/db'

export const dynamic = 'force-dynamic'

// One-time seed: add the Medium + Substack long-form channel cards to the live db.
// Owner-only (station cookie), and idempotent — click it again and it just refreshes
// the two cards without duplicating. Open in the browser:
//   /api/admin/add-channels?confirm=add-channels
// These are LONG-FORM homes, deliberately NOT tuned to the reel/carousel pipeline;
// drafts live in Notes/Story and get published here. Edit anything (handle, URL,
// colors) in the Accounts tab afterward.

const CHANNELS: BrandAccount[] = [
  {
    id: 'medium',
    handle: 'Medium',
    platform: 'Medium',
    status: 'active',
    priority: 'medium',
    color: '#1A1A1A',
    emoji: '📝',
    brand_name: 'Medium — Mandi Beck',
    topic: 'Long-form essays on AI, motherhood, and intuition',
    bio: 'Essays from the front line of mothering, building, and staying human as AI goes exponential.',
    mission: 'Turn the podcast’s ideas and Mandi’s real moments into searchable long-form essays that bring new readers into Joyful Media.',
    content_format: 'Long-form essays / articles (800–2,000 words)',
    underlying_message: 'Peace + action + intuition is our edge — even now.',
    problem_message: 'The noise tells you to panic about AI or numb out.',
    solution_message: 'Think it through in long form — slow, honest, human.',
    transformation: 'From doom-scrolling the AI panic to thinking clearly about your own life',
    the_how: 'One essay at a time',
    tone: 'Warm, bold, plain-English — a smart friend thinking out loud',
    beliefs: [],
    hooks: [],
    url: '',
    notes: 'LONG-FORM home — not the reel/carousel pipeline. Draft essays in Notes or the Story tab, publish here. Drop your real Medium profile URL + handle into this card.',
  },
  {
    id: 'substack',
    handle: 'Substack',
    platform: 'Substack',
    status: 'active',
    priority: 'medium',
    color: '#FF6719',
    emoji: '📬',
    brand_name: 'Substack — Joyful Media',
    topic: 'The weekly letter — essays + the thinking behind the podcast',
    bio: 'What I’m seeing in AI, motherhood, and the practice of staying present — straight to your inbox.',
    mission: 'Own the reader relationship directly (not the algorithm): a weekly essay that deepens trust and feeds every other channel.',
    content_format: 'Email newsletter essays to subscribers',
    underlying_message: 'You don’t need another feed — you need one voice you trust in your inbox.',
    problem_message: 'Social keeps you renting your audience.',
    solution_message: 'A newsletter you own puts you back in the room with them.',
    transformation: 'From chasing the algorithm to a list that’s actually yours',
    the_how: 'One letter a week',
    tone: 'Intimate, direct, a little daring',
    beliefs: [],
    hooks: [],
    url: '',
    notes: 'LONG-FORM / newsletter home — not the reel pipeline. (RISE sends transactional + campaign email via Resend/Cap; Substack is a separate publishing home you write in.) Drop your real Substack URL + handle into this card.',
  },
  {
    id: 'pinterest',
    handle: 'Pinterest',
    platform: 'Pinterest',
    status: 'active',
    priority: 'medium',
    color: '#E60023',
    emoji: '📌',
    brand_name: 'Pinterest — Joyful Media',
    topic: 'Pins that drive evergreen search traffic to the podcast, essays, and offers',
    bio: 'Calm, searchable inspiration for tired moms — intuition, reparenting, and AI that actually helps.',
    mission: 'Use Pinterest as evergreen search: pin quotes, carousels, and covers that link back to the podcast, Substack, and bethereforher.com.',
    content_format: 'Vertical pins + idea pins (image/video + title + description + destination LINK + board)',
    underlying_message: 'The quiet, searchable door into your world.',
    problem_message: 'Reels vanish in a day.',
    solution_message: 'A pin keeps working for months and keeps sending people to your site.',
    transformation: 'From content that disappears to evergreen traffic',
    the_how: 'One pin at a time',
    tone: 'Calm, clear, inspiring — plain English',
    beliefs: [],
    hooks: [],
    url: '',
    notes: 'SEARCH / traffic channel — every pin needs a destination LINK (podcast, Substack, bethereforher.com) and a board. Posting is manual for now; Pinterest API auto-publish is a separate build. Drop your real Pinterest profile URL + handle into this card.',
  },
]

// The matching Campaigns-tab entries (products) for the two new channels.
const CAMPAIGNS: (Partial<Product> & { name: string; id: string })[] = [
  {
    id: 'substack', name: 'Substack', brand: 'joyful', kind: 'newsletter', status: 'live', cadence_days: 7,
    mission: 'The weekly letter — essays and the thinking behind the podcast, straight to subscribers.',
    fits: 'Owns the reader relationship directly (not the algorithm); deepens trust and feeds every channel.',
    send_match: ['substack'],
  },
  {
    id: 'newsletter', name: 'Newsletter', brand: 'joyful', kind: 'newsletter', status: 'live', cadence_days: 7,
    mission: 'The general Joyful Media newsletter — sent natively to your list via Resend (Cap).',
    fits: 'Your owned list: the direct line to everyone, independent of any platform.',
    send_match: ['newsletter'],
  },
]

function run(req: NextRequest) {
  if (!isOwner(req)) {
    return NextResponse.json({ error: 'Owner only — open this while signed in to RISE.' }, { status: 401 })
  }
  if (new URL(req.url).searchParams.get('confirm') !== 'add-channels') {
    return NextResponse.json({
      ready: true,
      note: 'This will add/refresh the Medium + Substack + Pinterest account cards and the Substack + Newsletter campaigns. To run it, add ?confirm=add-channels to the URL.',
      will_add: [...CHANNELS.map(c => `${c.emoji} ${c.brand_name}`), ...CAMPAIGNS.map(c => `📣 ${c.name} campaign`)],
    })
  }
  const before = new Set(getAllBrandAccounts().map(a => a.id))
  const results = CHANNELS.map(c => ({ id: c.id, action: before.has(c.id) ? 'updated' : 'added', account: upsertBrandAccount(c) }))
  // Campaigns: create each only if it isn't already there (idempotent).
  const haveProducts = new Set(getProducts().map(p => p.id))
  const campaignResults = CAMPAIGNS.map(c => {
    if (haveProducts.has(c.id)) return { id: c.id, action: 'exists' }
    createProduct(c)
    return { id: c.id, action: 'added' }
  })
  return NextResponse.json({
    ok: true,
    accounts: results.map(r => ({ id: r.id, action: r.action })),
    campaigns: campaignResults,
    total_accounts: getAllBrandAccounts().length,
  })
}

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
