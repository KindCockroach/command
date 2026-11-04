import { NextRequest, NextResponse } from 'next/server'
import { getProducts, getPeople, getPodcastEpisodes, CONTACT_LABELS, type ContactLabel } from '@/lib/db'
import { fableText } from '@/lib/fable'
import { SYSTEM_PROMPTS } from '@/lib/ai'

export const dynamic = 'force-dynamic'

// Cap drafts a campaign. POST {product_id, goal, audience_labels[], count?, feedback?, previous?}.
// For a podcast product, Cap pulls the latest episode from Pod as source material.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const product = getProducts().find(p => p.id === b.product_id)
  if (!product) return NextResponse.json({ error: 'Unknown product.' }, { status: 400 })

  const labels: ContactLabel[] = Array.isArray(b.audience_labels) ? b.audience_labels.filter((l: string) => CONTACT_LABELS.includes(l as ContactLabel)) : []
  const audience = getPeople().filter(p => p.email && (labels.length ? labels.every(l => p.labels.includes(l)) : true))
  const count = Math.min(Math.max(1, Number(b.count) || 1), 5)
  const feedback = typeof b.feedback === 'string' ? b.feedback.slice(0, 2000) : ''
  const previous = typeof b.previous === 'string' ? b.previous.slice(0, 6000) : ''

  // Pod feeds episode content for podcast campaigns (handoff of substance, not a writer seat).
  let episodeCtx = ''
  if (product.kind === 'podcast') {
    const eps = getPodcastEpisodes().filter(e => e.status !== 'planned')
    const latest = eps[eps.length - 1]
    if (latest) episodeCtx = `\nLATEST EPISODE (source from Pod) — Ep ${latest.number ?? ''} "${latest.title}": ${latest.topic}${latest.thread ? ` · thread: ${latest.thread}` : ''}${latest.news ? ` · news: ${latest.news}` : ''}`.slice(0, 1200)
  }

  const instructions = `${SYSTEM_PROMPTS.cap}

PRODUCT: ${product.name} (${product.brand}${product.price ? `, ${product.price}` : ''})
MISSION: ${product.mission}
BIG PICTURE: ${product.fits}
LINKS: ${product.links.map(l => `${l.label}: ${l.url}`).join(' · ') || 'none'}${episodeCtx}
AUDIENCE: ${audience.length} people on this list.

Write ${count === 1 ? 'ONE email' : `a ${count}-email series (each building on the last)`} to this audience toward Mandi's goal.
Return ONLY JSON: {"emails":[{"subject":"","preview":"","body":"plain paragraphs separated by blank lines — NO HTML","cta_label":"","cta_url":"","send_offset_days":0}]}
Rules: the subject stops the scroll; the first line opens a curiosity gap; ONE clear CTA; warm and directive; speak to one woman, not a crowd; never promise financial results; never name a real person. Use a real product link for cta_url when one fits; otherwise leave cta_url "".`

  const input = `GOAL: ${typeof b.goal === 'string' && b.goal.trim() ? b.goal.trim() : '(reconnect warmly and invite them to the next step)'}${feedback ? `\n\nMANDI'S FEEDBACK ON THE LAST DRAFT — revise accordingly: ${feedback}\n\nPREVIOUS DRAFT:\n${previous}` : ''}`

  const raw = await fableText({ instructions, input, json: true, maxTokens: 2800 })
  let emails: unknown[] = []
  try { const j = JSON.parse(raw); emails = Array.isArray(j.emails) ? j.emails : [] } catch { emails = [] }
  if (!emails.length) return NextResponse.json({ error: 'Cap came back empty — try again or add a clearer goal.' }, { status: 502 })
  return NextResponse.json({ emails, audience_count: audience.length })
}
