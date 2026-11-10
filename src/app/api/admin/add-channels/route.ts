import { NextRequest, NextResponse } from 'next/server'
import { isOwner } from '@/lib/ownerAuth'
import { upsertBrandAccount, getAllBrandAccounts, type BrandAccount } from '@/lib/db'

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
]

function run(req: NextRequest) {
  if (!isOwner(req)) {
    return NextResponse.json({ error: 'Owner only — open this while signed in to RISE.' }, { status: 401 })
  }
  if (new URL(req.url).searchParams.get('confirm') !== 'add-channels') {
    return NextResponse.json({
      ready: true,
      note: 'This will add/refresh the Medium + Substack account cards. To run it, add ?confirm=add-channels to the URL.',
      will_add: CHANNELS.map(c => `${c.emoji} ${c.brand_name}`),
    })
  }
  const before = new Set(getAllBrandAccounts().map(a => a.id))
  const results = CHANNELS.map(c => ({ id: c.id, action: before.has(c.id) ? 'updated' : 'added', account: upsertBrandAccount(c) }))
  return NextResponse.json({ ok: true, results: results.map(r => ({ id: r.id, action: r.action })), total_accounts: getAllBrandAccounts().length })
}

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
