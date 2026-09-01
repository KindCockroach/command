import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getAudienceContext } from '@/lib/db'
import { craftFor } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Purpose Commander Chat — a conversation about ONE post. The Commander holds the
// post's full context (her words, the current copy, its open questions, the account
// voice), talks to Mandi like a partner, and UPDATES the post live as she answers
// or gives direction. It both replies AND edits — it never just asks and waits.
export async function POST(req: NextRequest) {
  const { contentId, message, history } = await req.json().catch(() => ({}))
  if (!contentId || !message?.trim()) return NextResponse.json({ error: 'contentId and message required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const voice = account
    ? `ACCOUNT: ${account.handle} (${account.brand_name}) — ${account.topic}. Tone: ${account.tone}. ${account.offer ? `Offer: ${account.offer}.` : ''}\n${account.notes ? `NON-NEGOTIABLE RULES: ${account.notes}` : ''}`
    : 'VOICE: Mandi Beck — warm, plain, no fluff.'

  const isVideo = piece.type === 'video' || piece.type === 'podcast'
  const convo = Array.isArray(history)
    ? history.slice(-8).map((m: { role?: string; text?: string }) => `${m.role === 'user' ? 'MANDI' : 'YOU'}: ${m.text ?? ''}`).join('\n')
    : ''

  const prompt = `You are The Commander — Mandi's creative partner — working with her to FINISH one post. Talk to her directly, warm and brief, like a real collaborator (not a form). When her message gives you what you need, UPDATE the post to the craft bar in the account's voice; don't just ask and wait. If she only asks a question, answer it and leave the post as-is. Invent no new facts about her life.

${voice}

${craftFor(piece.account_id)}

${getAudienceContext(account?.audience_id)}

THE POST RIGHT NOW:
- Title: ${piece.title}
- Type: ${piece.type}${isVideo ? ' (talking/avatar video → on-screen text stays EMPTY)' : ''}
- Her original words: ${piece.source_context || '(none captured)'}
- On-screen: ${piece.onscreen_text || '(none)'}
- Caption: ${piece.description || '(none)'}
- Open questions still on it: ${(piece.open_questions ?? []).join(' | ') || '(none)'}

${convo ? `CONVERSATION SO FAR:\n${convo}\n` : ''}
MANDI JUST SAID: ${message.trim()}

Return ONLY valid JSON:
{
  "reply": "your short, warm reply to her — what you did or what you still need (1-3 sentences, her voice, no corporate tone)",
  "updates": {
    ${isVideo ? '"onscreen_text": "" (always empty for a talking video),' : '"onscreen_text": "only if it changed — for image=1-2 statement lines, carousel=numbered slides",'}
    "title": "only if it changed",
    "description": "the full cleaned caption if you changed it — real line breaks, headline first line, curiosity-gap last line, NO question hooks, NO CTA in growth phase",
    "hashtags": "only if changed",
    "open_questions": ["any questions that REMAIN unanswered — [] if she just answered them all"]
  }
}
Only include keys in "updates" that you actually changed. If you changed nothing, use "updates": {}.`

  try {
    const output = await fableText({
      instructions: 'You are a warm creative partner finishing one social post with the author. Reply briefly AND edit the post. Return only valid JSON.',
      input: prompt,
      // 8000 (was 2500): a full multi-slide carousel edit + the reply overran 2500,
      // truncating the JSON so `.match()` returned null → "Cannot read properties of
      // null (reading '0')". 8000 lets a whole carousel edit come back intact.
      maxTokens: 8000,
      useClaude: true,
      json: true,
    })
    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "I couldn't shape that into an edit — try one change at a time, or rephrase it." }, { status: 502 })
    }
    const parsed = JSON.parse(jsonMatch[0]) as { reply?: string; updates?: Record<string, unknown> }
    const u = parsed.updates ?? {}
    const patch: Record<string, unknown> = {}
    if (typeof u.title === 'string') patch.title = u.title
    if (typeof u.description === 'string') patch.description = u.description
    if (typeof u.hashtags === 'string') patch.hashtags = u.hashtags
    if (typeof u.onscreen_text === 'string') patch.onscreen_text = isVideo ? '' : u.onscreen_text
    if (Array.isArray(u.open_questions)) patch.open_questions = u.open_questions.filter(q => typeof q === 'string')
    const updated = Object.keys(patch).length ? updateContent(piece.id, patch) : piece
    return NextResponse.json({ reply: parsed.reply ?? 'Done.', content: updated, changed: Object.keys(patch) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'develop failed' }, { status: 502 })
  }
}
