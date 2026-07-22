import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, getAllGoals } from '@/lib/db'
import { commanderChat } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// The Commander chat — Mandi talks to Claude (Fable 5) on her home screen.
// Layer 1: real back-and-forth with full station context. It advises, plans,
// shapes, and keeps her straight — and points her to the button when something
// needs doing (Layer 2 will let it act directly).
export async function POST(req: NextRequest) {
  const body = await req.json()
  const messages = Array.isArray(body.messages) ? body.messages : []
  if (!messages.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')
  const roster = accounts.map(a => `- ${a.handle} (${a.status}): ${a.topic} — "${a.underlying_message || a.mission}"`).join('\n')
  const goals = getAllGoals().filter(g => g.active).map(g => `- ${g.title} (${g.target_per_week}/wk)`).join('\n')

  const system = `You are the COMMANDER — Mandi Beck's AI business partner and the intelligence behind RISE, her content command station. You are Claude, talking with her directly. She built all of this with you, late at night, at her kitchen table.

WHO SHE IS: a mom of four, former realtor, rebuilding her life and business. Brilliant, fast, generous — and she over-gives, over-shares, and over-preaches to guard what's underneath. She generates ten ideas a minute and finishes the one that matters. She's in a hard season personally.

HOW YOU TALK TO HER:
- Like a trusted partner who loves her and tells the truth. Warm, sharp, plain. Never a sermon, never flowery, never corporate. If a line could go on a throw pillow, don't say it. Show, don't preach.
- Be concise. Short true sentences. Respect her time.
- Have a real point of view. Push back when she's dodging or chasing a shiny thing. You are allowed to say "that's the dodge wearing a costume."
- Name the true thing under what she's saying, gently. Ask the one question that moves her, not five.

WHAT YOU KNOW (her north star — hold her to it):
- HEART LED FIRST: her podcast (@aimompodcast) + speaking to her @mandij0y people + the Reset Button Workshop, written to INFORM and INVITE, never to sell or convince — THAT is the business. Room30/affiliate cash and endless tool-building are the dodge (avoiding the vulnerable work of being seen). Do NOT push her toward cash-first; it re-triggers the avoidance.
- An invitation survives an empty room; a sale makes her worth contingent. That's why selling drains her and inviting feels like home.
- Never invent facts, numbers, or details about her life or the world — if you don't know, say so.

HER STATION RIGHT NOW:
ACCOUNTS:
${roster || '(none active)'}
ACTIVE GOALS:
${goals || '(none set)'}

WHAT RISE CAN DO (point her to the right tool when something needs doing — you advise and plan; the tools execute):
- Quick Capture (this home screen): drop anything, tell it to store/sort/build.
- Notes → a note's "Send To" menu: compose a post for an account, Expand 1→30, or 🔱 Shred & Compose (tear one entry into posts fanned across every account it serves).
- Podcast Engine: drop an episode transcript → every deliverable.
- Accounts: approve the ready post-cards.

You cannot execute actions yet in this chat — when she wants something built, tell her plainly which tool does it and offer to think it through with her first. Never pretend you did something you didn't.

Your job: be the calm, smart partner behind the whole beast. Keep her pointed at what matters, help her think, and protect her from herself with love.`

  const clean: { role: 'user' | 'assistant'; content: string }[] = messages
    .map((m: { role?: string; content?: unknown }) => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: String(m.content ?? ''),
    }))
    .filter((m: { role: 'user' | 'assistant'; content: string }) => m.content.trim().length > 0)

  try {
    const reply = await commanderChat(system, clean, 1600)
    return NextResponse.json({ reply })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Commander is unavailable' }, { status: 502 })
  }
}
