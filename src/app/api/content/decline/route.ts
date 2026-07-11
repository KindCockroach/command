import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllContent, deleteContent, getBrandAccount, upsertBrandAccount, audienceLine } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Decline a post idea + teach the account why. The reason becomes a durable
// rule appended to the account's DNA (which every generator already obeys).
export async function POST(req: NextRequest) {
  const { contentId, reason } = await req.json()
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  let learnedRule = ''
  const account = piece.account_id ? getBrandAccount(piece.account_id) : null

  if (account && reason?.trim()) {
    // Distill the reason into one crisp, reusable rule for this account
    try {
      const res = await client.responses.create({
        model: 'gpt-4o',
        instructions: `Mandi declined a post for the account "${account.handle}" (${account.brand_name}, ${account.topic}). ${audienceLine(account.audience_id) ? `This account serves — ${audienceLine(account.audience_id)}. Frame the rule in terms of what works for HER when relevant.` : ''} Turn her reason into ONE short, durable rule (start with "AVOID" or "ALWAYS") that a content generator can follow to never make this mistake again for THIS account. Return just the rule, no quotes, under 20 words.`,
        input: `Declined post: "${piece.title}" — ${piece.onscreen_text || piece.description?.slice(0, 120)}\n\nHer reason: ${reason}`,
      })
      learnedRule = (res.output_text ?? '').trim().replace(/^["']|["']$/g, '')
    } catch {
      learnedRule = `AVOID: ${reason.trim()}`
    }

    // Append to the account's learned rules (deduped-ish), capped so notes don't balloon
    const marker = 'LEARNED RULES:'
    const existing = account.notes ?? ''
    let notes: string
    if (existing.includes(marker)) {
      const [before, rulesPart] = existing.split(marker)
      const rules = rulesPart.split(' • ').map(s => s.trim()).filter(Boolean)
      if (!rules.some(r => r.toLowerCase() === learnedRule.toLowerCase())) rules.push(learnedRule)
      notes = `${before.trim()} ${marker} ${rules.slice(-25).join(' • ')}`.trim()
    } else {
      notes = `${existing.trim()} ${marker} ${learnedRule}`.trim()
    }
    upsertBrandAccount({ id: account.id, notes })
  }

  deleteContent(piece.id)
  return NextResponse.json({ declined: true, learnedRule, account: account?.id ?? null })
}
