import { NextRequest, NextResponse } from 'next/server'
import { createContent, createTask, getAllBrandAccounts, getWatchContext, getAudienceContext } from '@/lib/db'
import { CRAFT_RULES } from '@/lib/craft'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// One transcript → three distinct post types:
// 1. FACELESS: Greg-style direct hook, no avatar, points to the podcast for answers
// 2. AVATAR CLIP: a podcast moment recreated as an avatar-spoken script
// 3. TRENDING: humor/education riding current trends, with a personal film/Higgsfield to-do
export async function POST(req: NextRequest) {
  const { transcript, episodeTitle } = await req.json()
  if (!transcript?.trim()) return NextResponse.json({ error: 'transcript required' }, { status: 400 })

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted')
  const avatarAccounts = accounts.filter(a => a.avatar_id)
  const watch = getWatchContext()

  const raw = await fableText({
    useClaude: true, json: true, maxTokens: 6000, effort: 'medium',
    instructions: `⚑ READ THE ENTIRE TRANSCRIPT FIRST — beginning to END — before you write anything. The opening is throat-clearing; the STRONGEST idea (the golden thread) almost always lands in the middle or back half, after she's warmed up. Do NOT build from the intro. Find the single most valuable, most surprising, most quotable thing she says across the WHOLE episode, and build all three posts from THAT thread. If your hook could have been written from the first 2 minutes alone, you grabbed the wrong thing — go deeper into the episode and rewrite it.

From ONE podcast transcript, produce THREE distinct posts. Each is a different machine:

1. "faceless" — direct-response style (Greg's school: volume ads that look like content). A scroll-stopping hook in the first line, zero fluff, no face needed — the visual is a bold text-on-background or b-roll (Mandi will attach her own hook visual from her Media library). The CTA points to the PODCAST as the place the answers live ("Full breakdown on the AI Mom Podcast — episode in bio" style, comment-keyword CTA, never links in caption).
2. "avatar_clip" — pick the single most quotable 20-40 second MOMENT from the transcript and rewrite it as a spoken avatar script (first person, punchy, natural speech — this will be lip-synced by a HeyGen avatar). Include the exact spoken script.
3. "trending" — cross the transcript's strongest idea with what's CURRENTLY winning (trend intelligence below). Humor or education angle. This one requires Mandi to personally create the visual: give a concrete DIY to-do — either something to film on her phone (specific shots) or a Higgsfield generation prompt (cinematic AI video).

ACCOUNT ROSTER: ${accounts.map(a => `id:"${a.id}" ${a.handle} — ${a.topic}${a.avatar_id ? ' [HAS AVATAR]' : ''}${a.notes?.includes('BOUNDARY') ? ' ⚠ has content boundary' : ''}`).join(' | ')}
Pick the best account for each post (avatar_clip MUST go to an account with [HAS AVATAR]${avatarAccounts.length ? `: ${avatarAccounts.map(a => a.id).join(', ')}` : ' — none linked yet, pick the best fit anyway'}). Obey any account boundaries.
${watch}
${getAudienceContext(accounts.find(a => a.id === 'aimomatwork')?.audience_id)}
${CRAFT_RULES}

⛔ HARD RULE FOR EVERY "onscreen_text" AND "hook": it is a BOLD CLAIM, never a question. NO question hooks — no "Ever feel like…?", "Are you…?", "What if…?". You already know the answer, so state it straight (Law 2a). If your first line ends in a question mark, rewrite it as a declarative claim before returning.

Return ONLY valid JSON:
{
  "posts": [
    { "kind": "faceless", "account_id": "...", "title": "...", "hook": "the Greg-style opening line — a bold CLAIM, not a question", "caption": "full caption, CTA points to the podcast, comment-keyword", "hashtags": "15-20", "onscreen_text": "bold overlay line(s) — a CLAIM that stops the scroll, NEVER a question", "visual_note": "what the hook visual should be (she'll attach her own from Media)" },
    { "kind": "avatar_clip", "account_id": "...", "title": "...", "script": "the exact 20-40s spoken script for the avatar", "caption": "caption for the clip", "hashtags": "15-20", "onscreen_text": "overlay beats, newline-separated — claims, not questions" },
    { "kind": "trending", "account_id": "...", "title": "...", "caption": "full caption", "hashtags": "15-20", "onscreen_text": "overlay beats — claims, not questions", "trend_ref": "which winning pattern this rides", "diy_todo": "EXACTLY what Mandi films (shot list) OR the Higgsfield prompt to generate", "diy_kind": "film | higgsfield" }
  ]
}`,
    input: `EPISODE${episodeTitle ? `: ${episodeTitle}` : ''} — FULL TRANSCRIPT (read all of it; the golden thread is usually NOT in the opening):\n${String(transcript).slice(0, 120000)}`,
  })

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'The writer returned no usable posts — try again (a very short clip can confuse the 3-pack; for a short clip use "Quick Reel" instead).' }, { status: 502 })
    const parsed = JSON.parse(jsonMatch[0])
    const created: Array<{ kind: string; id: number; account: string }> = []
    for (const p of parsed.posts ?? []) {
      const acct = accounts.find(a => a.id === p.account_id)
      const piece = createContent({
        title: p.title,
        description: p.kind === 'avatar_clip' ? `${p.caption}\n\nScript: ${p.script}` : p.caption,
        status: 'ready',
        type: p.kind === 'faceless' ? 'image' : 'video',
        platforms: [acct?.platform.toLowerCase() ?? 'instagram'],
        tags: ['3pack', p.kind, 'podcast'],
        notes: p.kind === 'faceless' ? `Faceless — attach your Greg hook visual from Media. ${p.visual_note ?? ''}`
          : p.kind === 'trending' ? `Trending ride: ${p.trend_ref ?? ''}` : 'Avatar clip — hit 🎬 Make avatar video',
        account_id: p.account_id ?? null,
        onscreen_text: p.onscreen_text ?? '',
        hashtags: p.hashtags ?? '',
        image_prompt: p.kind === 'trending' && p.diy_kind === 'higgsfield' ? p.diy_todo : '',
        frame_plan: p.kind === 'trending' ? `TREND: ${p.trend_ref ?? ''}\n🎬 YOUR TO-DO (${p.diy_kind}): ${p.diy_todo}` : undefined,
        river_source: 'podcast-3pack',
      })
      created.push({ kind: p.kind, id: piece.id, account: acct?.handle ?? p.account_id })
      // The trending post's DIY becomes a real task on her list
      if (p.kind === 'trending' && p.diy_todo) {
        createTask({ title: `${p.diy_kind === 'higgsfield' ? 'Generate in Higgsfield' : 'Film'}: ${p.title}`, notes: p.diy_todo, priority: 'high', status: 'this_week' })
      }
    }
    return NextResponse.json({ created })
  } catch {
    return NextResponse.json({ error: 'Could not build the 3-pack' }, { status: 502 })
  }
}
