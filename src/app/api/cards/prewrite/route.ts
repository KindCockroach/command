import { NextRequest, NextResponse, after } from 'next/server'
import { prewriteCard, halfFormedCards } from '@/lib/cap'
import { BUDGET_TAG, BUDGET_OK_HEADER } from '@/lib/spendCap'
import { logActivity } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Fill the half-formed cards: a hook but no caption. Ed (short-form) / Pod (long-form) write the
// captions with the one call to action from the plan, and a video gets its song. Marked pre-film,
// so the real footage rewrites them later.
// GET → { ids, count } · POST { ids?: number[] } → asks "Go?" with the cost, then runs in the background.
const PER_CARD_USD = 0.03
let running = false

export async function GET() {
  const ids = halfFormedCards()
  return NextResponse.json({ ids, count: ids.length, running })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const all = halfFormedCards()
  const ids: number[] = Array.isArray(b.ids) && b.ids.length ? b.ids.map(Number).filter((n: number) => all.includes(n)) : all
  if (!ids.length) return NextResponse.json({ error: 'No half-formed cards right now: every card with a hook has its caption.' }, { status: 400 })
  if (running) return NextResponse.json({ error: 'Ed is already writing those. Give it a few minutes.' }, { status: 409 })
  if (req.headers.get(BUDGET_OK_HEADER) !== '1') {
    return NextResponse.json({ error: `${BUDGET_TAG} Ed will write the captions (with the call to action) for ${ids.length} card${ids.length > 1 ? 's' : ''}, and pick a song for the videos. About $${Math.max(ids.length * PER_CARD_USD, 0.01).toFixed(2)}. Go?` }, { status: 402 })
  }
  running = true
  after(async () => {
    let done = 0, failed = 0
    try {
      for (const id of ids) {
        const r = await prewriteCard(id).catch(e => ({ error: e instanceof Error ? e.message : 'failed' }))
        if ('error' in r) failed++; else if (r.written.length) done++
      }
    } finally {
      running = false
      logActivity({ type: 'note', icon: '✍️', source: 'ed', title: `Ed wrote the missing captions on ${done} card${done === 1 ? '' : 's'}`, detail: `${ids.length} were half-formed (a hook, no caption)${failed ? `; ${failed} couldn’t be written (they stay as they were)` : ''}. Pre-film drafts: your footage rewrites them.` })
    }
  })
  return NextResponse.json({ started: ids.length })
}
