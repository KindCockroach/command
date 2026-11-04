import { NextResponse } from 'next/server'
import { getProducts, getFocusProductId, getBriefLine, setBriefLine, getBrandAccount } from '@/lib/db'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// The Brief's "one line to film today" — in Mandi Joy's (@mandijoybeck) voice and tied
// to RISE's current primary order (the focus product, default The Reset). Generated
// once a day and cached, so the Brief opens instant and the line stays relevant to
// what she's actually selling right now — not generic intuition lines.
const PROTECT = 'Never name or blame a real person. Speak to the reader (you/your), not about the host. No "stay or leave." Point her to her own knowing.'

export async function GET() {
  const today = new Date().toISOString().slice(0, 10)
  const focusId = getFocusProductId()
  const cached = getBriefLine()
  if (cached && cached.date === today && cached.product_id === focusId && cached.line) {
    return NextResponse.json({ line: cached.line, product_id: focusId, cached: true })
  }

  const product = getProducts().find(p => p.id === focusId) || getProducts()[0]
  const acct = getBrandAccount('mandijoybeck')
  const voice = acct ? `Account @${acct.handle} — ${acct.tone || ''}. ${acct.underlying_message || ''}`.slice(0, 400) : 'Warm, daring, strangely-specific, silly-serious; talks to one tired mom.'

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    // No model available — fall back to the last line rather than breaking the Brief.
    return NextResponse.json({ line: cached?.line || null, product_id: focusId, cached: false })
  }

  const instructions = `You are writing ONE on-screen reel line for Mandi Joy Beck (@mandijoybeck) to film today.
VOICE: ${voice}
Her real voice is strong, daring, a little funny and strangely-specific — never soft or salesy.
TODAY'S PRIORITY: ${product?.name}${product?.price ? ` (${product.price})` : ''} — ${product?.mission}
Write a single line (max ~18 words) that stops a tired mom's scroll and quietly leads toward this — a feeling or an invitation, NOT an ad. It should make her feel seen, then curious. ${PROTECT}
Return ONLY the line, no quotes, no preamble.`

  try {
    const raw = await fableText({ instructions, input: `Give me today's one line for ${product?.name}.`, useClaude: true, maxTokens: 400 })
    const line = (raw || '').trim().replace(/^["'“”]|["'“”]$/g, '').split('\n')[0].trim()
    if (line) { setBriefLine({ product_id: focusId, line }); return NextResponse.json({ line, product_id: focusId, cached: false }) }
  } catch { /* fall through to cache */ }
  return NextResponse.json({ line: cached?.line || null, product_id: focusId, cached: false })
}
