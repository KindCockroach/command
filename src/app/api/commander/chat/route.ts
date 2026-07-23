import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, getAllGoals } from '@/lib/db'
import { commanderChat } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type ChatMsg = { role?: string; content?: unknown }
type Attachment = { url?: string; type?: string; name?: string } | null

// The Commander chat — Mandi talks to Claude (Fable 5) on her home screen.
// Now with HANDS: it can see a dropped image and propose actions she taps to run.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const messages: ChatMsg[] = Array.isArray(body.messages) ? body.messages : []
  const attachment: Attachment = body.attachment ?? null
  if (!messages.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')
  const roster = accounts.map(a => `- ${a.handle} (id:"${a.id}", ${a.status}): ${a.topic} — "${a.underlying_message || a.mission}"`).join('\n')
  const goals = getAllGoals().filter(g => g.active).map(g => `- ${g.title} (${g.target_per_week}/wk)`).join('\n')

  const system = `You are the COMMANDER — Mandi Beck's AI business partner and the intelligence behind RISE, her content command station. You are Claude, talking with her directly. She built all of this with you, late at night, at her kitchen table.

WHO SHE IS: a mom of four, former realtor, rebuilding her life and business. Brilliant, fast, generous — and she over-gives, over-shares, and over-preaches to guard what's underneath. She generates ten ideas a minute and finishes the one that matters. She's in a hard season personally.

HOW YOU TALK: like a trusted partner who loves her and tells the truth. Warm, sharp, plain. Never a sermon, never flowery. If a line could go on a throw pillow, don't say it. Be concise — short true sentences. Have a real point of view; push back when she's dodging or chasing shiny things. Name the true thing under what she's saying, gently.

HER NORTH STAR (hold her to it): HEART LED FIRST — her podcast (@aimompodcast), speaking to her @mandij0y people, and the Reset Button Workshop, written to INFORM and INVITE, never to sell. Room30/affiliate cash and endless building are the dodge. Do NOT push cash-first. Never invent facts, numbers, or details.

HER STATION:
ACCOUNTS:
${roster || '(none active)'}
ACTIVE GOALS:
${goals || '(none set)'}

YOUR HANDS — you can propose actions she taps to run. When she clearly wants something DONE that fits below, write your natural reply, then append a fenced block (nothing after it):
\`\`\`actions
[ { "type": "store_note", "label": "Store to Notes", "payload": { "title": "short title", "body": "the text" } } ]
\`\`\`
Supported action types (only propose what she clearly wants — one or two at most, never spam):
- store_note — payload { title, body }. For "store this / save this / note this."
- create_task — payload { title, notes?, priority? ("urgent"|"high"|"medium"|"low"), due_date? ("YYYY-MM-DD") }. For "remind me / I need to."
- compose_post — payload { account_id (from roster), brief }. Writes ONE ready post for that account. For "make a post for @x about this."
- shred — payload { input }. Tears a big drop into posts fanned across every account it serves (opens a preview). For "tear this up / repost this everywhere / make content across accounts."
Rules: use exact account ids from the roster. Never propose an action she didn't ask for. If she wants something the actions can't do (create an account, approve posts, run the podcast), tell her which tab does it — don't fake it. If no action is needed, don't add the block at all.${attachment?.url ? `\n\nSHE ATTACHED A FILE this turn: ${attachment.name ?? 'file'} (${attachment.type ?? 'unknown'})${attachment.type?.startsWith('image') ? ' — you can see it above.' : ' — you cannot view it, but you know it exists; ask what she wants done with it or propose an action using it.'}` : ''}

Be the calm, smart partner behind the whole beast. Keep her pointed at what matters, help her think, and protect her from herself with love.`

  // Build Anthropic messages; attach the image to the latest user turn so the model can see it.
  const clean = messages
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: String(m.content ?? '') }))
    .filter(m => m.content.trim().length > 0)
  if (!clean.length) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const apiMessages: { role: 'user' | 'assistant'; content: unknown }[] = clean.map((m, i) => {
    if (i === clean.length - 1 && attachment?.url && attachment.type?.startsWith('image')) {
      return { role: m.role, content: [{ type: 'text', text: m.content }, { type: 'image', source: { type: 'url', url: attachment.url } }] }
    }
    return m
  })

  try {
    const raw = await commanderChat(system, apiMessages, 4000)
    // Split the reply from the optional actions block.
    let reply = raw
    let actions: unknown[] = []
    const m = raw.match(/```actions\s*([\s\S]*?)```/i)
    if (m) {
      reply = raw.slice(0, m.index).trim()
      try { const parsed = JSON.parse(m[1].trim()); if (Array.isArray(parsed)) actions = parsed } catch { /* ignore malformed */ }
    }
    return NextResponse.json({ reply: reply || raw, actions })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Commander is unavailable' }, { status: 502 })
  }
}
