import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, createContent, getWatchContext } from '@/lib/db'
import type { BrandAccount, ContentType } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// THE COMMANDER — RISE's sorting hat + straightened arrow.
// Two passes:
//   mode:'plan'    → SHRED one raw drop into distinct points, ROUTE each to the
//                    account(s) it serves (named ones + any it reinforces). No DB writes.
//   mode:'compose' → for an (approved, possibly edited) plan, COMPOSE a finished
//                    post-card per placement, in each account's voice + format.

type Placement = { account_id: string; angle: string; format: string }
type Shred = { point: string; source_quote?: string; placements: Placement[] }

// Every account the user explicitly named ("for @handle / For Brandname / account X").
function detectNamedAccounts(input: string, accounts: BrandAccount[]): string[] {
  const text = ` ${input.toLowerCase()} `
  const hits = new Set<string>()
  for (const a of accounts) {
    const tokens = [a.handle.replace(/^@/, ''), a.id, a.brand_name ?? '']
      .map(t => t.toLowerCase().trim())
      .filter(t => t.length >= 3)
    for (const tok of tokens) {
      if (text.includes('@' + tok) || text.includes('for ' + tok) || text.includes('account ' + tok)) { hits.add(a.id); break }
    }
  }
  return [...hits]
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const mode: 'plan' | 'compose' = body.mode ?? 'plan'
  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')

  // ── PASS 1: SHRED & PLAN ────────────────────────────────────────────────────
  if (mode === 'plan') {
    const input = String(body.input ?? '')
    if (!input.trim()) return NextResponse.json({ error: 'input required' }, { status: 400 })
    const named = detectNamedAccounts(input, accounts)

    const roster = accounts.map(a =>
      `- id:"${a.id}" ${a.handle} — message: ${a.underlying_message || a.mission}. Reader: ${a.problem_message || a.topic}. Format: ${a.content_format || 'mixed'}.${a.notes ? ` ⚠ RULES: ${a.notes}` : ''}`
    ).join('\n')

    const out = await fableText({
      cheap: true, // shredding is classification — the cheap model is plenty
      maxTokens: 4000,
      instructions: `You are the COMMANDER — RISE's content sorting-hat. SHRED the raw drop into every DISTINCT point/story/hook it contains (one idea each — never merge two ideas into one point). For EACH point decide which accounts it should become a post for.

ROUTING LAW: place a point on (a) every account the user explicitly named that the point genuinely fits, AND (b) any OTHER account whose message it would REINFORCE. One point can serve multiple accounts with different angles. Never force a point onto an account it doesn't truly serve — a smaller true plan beats a padded one. Obey each account's ⚠ RULES.

For every placement give: account_id, a one-line ANGLE (how this point serves THIS account's reader/message), and the FORMAT to use (match the account's Format — video/reel, carousel, image, or post).

Keep a short source_quote — the exact words from her drop this point came from — so nothing gets invented later.

Return ONLY valid JSON:
{ "shreds": [ { "point": "short label of the distinct point", "source_quote": "her exact words this came from", "placements": [ { "account_id": "id from roster", "angle": "how it serves this account", "format": "video|carousel|image|post" } ] } ] }`,
      input: `ACCOUNTS:\n${roster}\n\n${named.length ? `USER EXPLICITLY NAMED: ${named.join(', ')} — place fitting points here, and ALSO wherever else a point reinforces an account.\n\n` : ''}RAW DROP:\n${input}`,
    })

    let shreds: Shred[] = []
    try { shreds = (JSON.parse(out.match(/\{[\s\S]*\}/)![0]).shreds ?? []) } catch {
      return NextResponse.json({ error: 'Could not shred this input', raw: out }, { status: 502 })
    }
    // annotate placements with handle/emoji/color for the preview UI
    const enriched = shreds.map(s => ({
      ...s,
      placements: (s.placements ?? []).map(p => {
        const a = accounts.find(x => x.id === p.account_id)
        return { ...p, handle: a?.handle ?? p.account_id, emoji: a?.emoji ?? '📱', color: a?.color ?? '#888', named: named.includes(p.account_id) }
      }).filter(p => accounts.some(a => a.id === p.account_id)),
    })).filter(s => s.placements.length > 0)

    const totalPosts = enriched.reduce((n, s) => n + s.placements.length, 0)
    return NextResponse.json({ mode: 'plan', named, shreds: enriched, summary: { points: enriched.length, posts: totalPosts } })
  }

  // ── PASS 2: COMPOSE the approved plan ───────────────────────────────────────
  const shreds: Shred[] = Array.isArray(body.shreds) ? body.shreds : []
  const created: { id: number; account_id: string; handle: string; title: string }[] = []
  const failed: string[] = []

  for (const s of shreds) {
    for (const p of s.placements ?? []) {
      const acct = accounts.find(a => a.id === p.account_id)
      if (!acct) continue
      try {
        const out = await fableText({
          maxTokens: 2000,
          instructions: `Write ONE complete, ready-to-post piece for ${acct.handle} (${acct.brand_name}) in ITS voice.
ACCOUNT: ${acct.topic}. Tone: ${acct.tone}. Message: ${acct.underlying_message}. Format: ${acct.content_format || 'mixed'}.${acct.notes ? ` ⚠ RULES (obey literally): ${acct.notes}` : ''}
THE FORMAT FOR THIS POST: ${p.format} — obey the SHAPE law for that format.
THE ANGLE (why this point serves this account): ${p.angle}
${craftFor(acct.id)}
${getWatchContext()}
Never invent facts beyond her words below — if a detail is missing, write around it, don't fabricate.
Return ONLY valid JSON: { "title": "short internal title", "onscreen_text": "the hook", "caption": "full post-ready caption", "hashtags": "8-20 space-separated", "image_prompt": "visual/video prompt for this format" }`,
          input: `POINT: ${s.point}\nHER WORDS: ${s.source_quote ?? s.point}`,
        })
        const parsed = JSON.parse(out.match(/\{[\s\S]*\}/)![0])
        const isVideo = /video|reel/i.test(p.format)
        const c = createContent({
          title: parsed.title || s.point.slice(0, 60),
          description: parsed.caption || '',
          status: 'ready',
          type: (isVideo ? 'video' : /carousel|image/i.test(p.format) ? 'image' : 'post') as ContentType,
          platforms: [acct.platform.toLowerCase()],
          tags: ['commander'],
          notes: `Commander · ${p.angle}`,
          account_id: acct.id,
          onscreen_text: parsed.onscreen_text || '',
          hashtags: parsed.hashtags || '',
          image_prompt: parsed.image_prompt || '',
          open_questions: [],
          river_source: 'commander',
        })
        created.push({ id: c.id, account_id: acct.id, handle: acct.handle, title: c.title })
      } catch {
        failed.push(`${acct.handle}: "${s.point.slice(0, 40)}"`)
      }
    }
  }

  return NextResponse.json({ mode: 'compose', created, failed })
}
