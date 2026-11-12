import { NextRequest, NextResponse } from 'next/server'
import { createContent, getBrandAccount, logActivity } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// CLOSE THE WINNER LOOP. A reel the Winner Loop flagged as `make_more` or `rehook`
// doesn't just sit on the /winners page — this turns it into the NEXT batch of cards,
// drafted straight into the pipeline (status 'idea' → Content Day). That's the loop:
// post natively → import results → winner → re-angle into new posts → post again.
//
// make_more: it beat the account's typical reel. Re-angle the SAME pain/insight with
//            a NEW hook and NEW footage (Greg's "clone the winner" — same energy,
//            different angle). Keep what worked, change the words and the visual.
// rehook:    people saved/shared it but few saw it. KEEP the core line; write a NEW
//            opening hook and suggest fresh footage.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const accountId: string | null = body?.account_id ? String(body.account_id) : null
  const onscreen = String(body?.onscreen_text ?? '').trim()
  const visual = String(body?.visual ?? '').trim()
  const verdict = body?.verdict === 'rehook' ? 'rehook' : 'make_more'
  const n = Math.max(1, Math.min(6, Number(body?.count) || 3))
  if (!onscreen) return NextResponse.json({ error: 'onscreen_text required' }, { status: 400 })

  const account = accountId ? getBrandAccount(accountId) : null

  const brief = verdict === 'rehook'
    ? `This reel's IDEA landed — people saved and shared it — but few people saw it, so the opening hook was the weak link. Write ${n} NEW versions that KEEP the core line/insight intact and change ONLY the opening hook (the first on-screen line) + suggest fresh footage. Do not drift from the idea that already worked.`
    : `This reel BEAT this account's typical reel. Re-angle the SAME pain point / insight with a NEW hook and NEW footage. Keep WHAT WORKED (the emotional truth, the pain, the promise), change the words and the visual so it reads as a fresh post, not a re-post. Write ${n} distinct re-angles.`

  let drafts: Array<{ onscreen_text?: string; description?: string; visual?: string }> = []
  try {
    const out = await fableText({
      maxTokens: 6000,
      effort: 'medium',
      json: true,
      instructions: `${craftFor(accountId)}

${brief}

Return ONLY a JSON array of exactly ${n} objects, each: { "onscreen_text": "the text overlay — the hook is the first line", "description": "the caption", "visual": "one line describing the footage to shoot/use (no kids on camera, ever)" }. No preamble, no commentary.`,
      input: `THE WINNING REEL (${verdict})${account ? ` — account ${account.handle}` : ''}:\nON-SCREEN TEXT: ${onscreen}\nVISUAL THAT RAN: ${visual || '(not recorded)'}`,
    })
    drafts = JSON.parse(out.match(/\[[\s\S]*\]/)?.[0] ?? '[]')
  } catch {
    return NextResponse.json({ error: 'draft failed' }, { status: 502 })
  }

  const created = drafts.slice(0, n).map(d => {
    const ost = String(d.onscreen_text ?? '').trim()
    const title = (ost.split('\n')[0] || onscreen.split('\n')[0] || 'Winner re-angle').slice(0, 80)
    return createContent({
      title,
      account_id: accountId,
      status: 'idea',
      type: 'video',
      onscreen_text: ost,
      description: String(d.description ?? '').trim(),
      image_prompt: String(d.visual ?? '').trim(),
      tags: ['from-winner', verdict],
      post_job: 'reach-new',
      source_context: `Born from a ${verdict === 'rehook' ? 'strong-idea / weak-hook' : 'winning'} reel. Original on-screen text: "${onscreen}".`,
    })
  })

  logActivity({
    type: 'content',
    icon: '🏆',
    source: 'winner-loop',
    account_id: accountId,
    title: `Winner loop → drafted ${created.length} re-angle${created.length === 1 ? '' : 's'}`,
    detail: `From ${verdict} reel: "${onscreen.slice(0, 60)}${onscreen.length > 60 ? '…' : ''}" → Content Day`,
  })

  return NextResponse.json({ created: created.length, ids: created.map(c => c.id) })
}
