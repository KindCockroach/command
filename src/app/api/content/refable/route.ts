import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getWatchContext, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Bulk re-write existing posts through Claude Fable 5 — a few per request so each
// call stays under the timeout. Posts already re-done get the 'fable' tag so we
// never touch them twice; loop this endpoint until { remaining } hits 0.
// In-place: it overwrites the caption/on-screen/hashtags of each post.
//
// Targeting (all optional):
//   ids: number[]     — rewrite exactly these posts (ignores the 'fable' tag; retries fable-failed)
//   account_id: string — only posts belonging to this account
//   effort: 'low'|'medium'|'high' — how hard Fable thinks (default 'low' for bulk; use 'medium'+ for priority passes)
//   limit: 1-5        — batch size per call (default 3)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const limit = Math.max(1, Math.min(5, Number(body.limit) || 3))
  const ids: number[] | null = Array.isArray(body.ids) ? body.ids.map(Number) : null
  const accountId: string | null = typeof body.account_id === 'string' ? body.account_id : null
  const effort = (['low', 'medium', 'high'] as const).includes(body.effort) ? body.effort : 'low'

  const all = getAllContent()
  let pending = ids
    ? all.filter(c => ids.includes(c.id))
    : all.filter(c => !(c.tags ?? []).includes('fable'))
  if (accountId) pending = pending.filter(c => c.account_id === accountId)
  const batch = pending.slice(0, limit)

  const done: number[] = []
  const failed: number[] = []

  for (const piece of batch) {
    const account = piece.account_id ? getBrandAccount(piece.account_id) : null
    const voice = account
      ? `ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}\n${account.notes ? `NON-NEGOTIABLE RULES (obey exactly): ${account.notes}` : ''}`
      : 'VOICE: Mandi Beck — warm, direct, no fluff.'

    const prompt = `${voice}
${getWatchContext()}

${craftFor(piece.account_id)}

${getAudienceContext(account?.audience_id)}

Re-write this existing post under the Craft Laws. Keep the same core idea, format, and intent, but make it land harder — obey the priority order: side-effect specificity first, then hook/headline/curiosity-gap alignment, then resume-the-conversation. Do NOT invent facts about Mandi's life.

ORIGINAL:
Title: ${piece.title}
On-screen: ${piece.onscreen_text ?? ''}
Caption: ${piece.description ?? ''}

Return ONLY valid JSON: { "title": "...", "onscreen_text": "...", "caption": "full ready-to-post caption (headline first line, curiosity gap last line)", "hashtags": "up to 5 hashtags space-separated" }`

    try {
      const output = await fableText({
        instructions: 'You are a master storyteller re-writing content to make people FEEL something. Show, never tell. Return only valid JSON.',
        input: prompt,
        maxTokens: 3000,
        effort,
      })
      const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)![0])
      const cleanTags = (piece.tags ?? []).filter(t => t !== 'fable' && t !== 'fable-failed')
      updateContent(piece.id, {
        title: parsed.title || piece.title,
        onscreen_text: parsed.onscreen_text ?? piece.onscreen_text,
        description: parsed.caption ?? piece.description,
        hashtags: parsed.hashtags ?? piece.hashtags,
        tags: [...cleanTags, 'fable'],
      })
      done.push(piece.id)
    } catch {
      // Targeted runs (ids) leave the post untagged-as-done so it can be retried;
      // bulk runs tag it so the loop moves on.
      const cleanTags = (piece.tags ?? []).filter(t => t !== 'fable' && t !== 'fable-failed')
      updateContent(piece.id, { tags: ids ? [...cleanTags, 'fable-failed'] : [...cleanTags, 'fable', 'fable-failed'] })
      failed.push(piece.id)
    }
  }

  const remaining = pending.length - batch.length
  return NextResponse.json({ processed: batch.length, done, failed, remaining, total: all.length, effort })
}
