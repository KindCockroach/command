import { NextRequest, NextResponse } from 'next/server'
import { getReviews, setReviewStatus } from '@/lib/capWinners'
import { openHandoff, listHandoffs } from '@/lib/handoffs'
import { runHandoff } from '@/lib/agentRun'
import { getBrandAccount } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

// Winners → Cap (Cap 4 · Weigh the winners). GET ?account_id= → Cap's reads, newest first.
// POST { account_id, platform? } → hand the imported results to Cap and let him weigh them.
// POST { action:'dismiss', id } → set a proposal aside (it stays on record).
export async function GET(req: NextRequest) {
  return NextResponse.json({ reviews: getReviews(new URL(req.url).searchParams.get('account_id')) })
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.action === 'dismiss') { const w = setReviewStatus(String(b.id), 'dismissed'); return w ? NextResponse.json({ review: w }) : NextResponse.json({ error: 'No such review.' }, { status: 404 }) }
  const accountId = String(b.account_id ?? '').trim()
  const platform = b.platform === 'facebook' ? 'facebook' : 'instagram'
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })
  const acct = getBrandAccount(accountId)
  const h = openHandoff({ kind: 'winners_in', from: 'mandi', to: 'cap', what: `Weigh the ${platform === 'facebook' ? 'Facebook' : 'Instagram'} results for ${acct?.handle ?? accountId}`, account_id: accountId, ref: { type: 'results', id: accountId, label: platform } })
  const r = await runHandoff(h.id)
  const view = listHandoffs().find(x => x.id === h.id)
  const review = getReviews(accountId).find(w => w.handoff_id === h.id) ?? null
  return r.ok ? NextResponse.json({ handoff: view, review }) : NextResponse.json({ error: r.error, handoff: view }, { status: 422 })
}
