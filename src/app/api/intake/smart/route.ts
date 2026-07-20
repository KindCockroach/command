import { NextRequest, NextResponse } from 'next/server'
import { fableText } from '@/lib/fable'
import {
  upsertBrandAccount, upsertAudience, createTask,
  getAllBrandAccounts, getAllAudiences, audienceLine,
  upsertAvatar, getAllAvatars, createGoal, createWatchAccount,
  createProject, createEvent, createNote,
} from '@/lib/db'
import type { BrandAccount, Audience, AvatarRecord, EventKind } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ── The CEO's hands: actions Quick Capture is allowed to execute ──────────────
// A new account isn't a row — it's a launch: audience, avatar (if video),
// account, posting goal, watch list, launch project, calendar date, research
// direction, and the brief archived as lore.
type PlannedAction =
  | { action: 'create_account'; payload: Partial<BrandAccount> & { id: string } }
  | { action: 'create_audience'; payload: Partial<Audience> & { id: string } }
  | { action: 'create_avatar'; payload: Partial<AvatarRecord> & { id: string } }
  | { action: 'create_goal'; payload: { title: string; account_id?: string | null; target_per_week?: number; deadline?: string | null; notes?: string } }
  | { action: 'create_watch'; payload: { handle: string; platform?: string; niche?: string; why_watching?: string } }
  | { action: 'create_project'; payload: { name: string; description?: string; label?: string } }
  | { action: 'create_event'; payload: { title: string; date: string; time?: string; kind?: string; account_id?: string | null } }
  | { action: 'create_note'; payload: { title: string; body: string; tags?: string[] } }
  | { action: 'research_dig'; payload: { topic: string; account_id?: string | null } }

function executeActions(actions: PlannedAction[], origin: string) {
  const results: string[] = []
  let createdAccounts = 0
  for (const a of actions) {
    try {
      if (a.action === 'create_audience') {
        if (getAllAudiences().some(x => x.id === a.payload.id)) {
          results.push(`⚠ Skipped audience "${a.payload.id}" — one with that id already exists (nothing overwritten)`)
          continue
        }
        const aud = upsertAudience(a.payload)
        results.push(`👤 Audience created: ${aud.name} (${aud.id})`)
      } else if (a.action === 'create_avatar') {
        if (getAllAvatars().some(x => x.id === a.payload.id)) {
          results.push(`⚠ Skipped avatar "${a.payload.id}" — one with that id already exists (nothing overwritten)`)
          continue
        }
        const av = upsertAvatar(a.payload)
        results.push(`🎭 Avatar created: ${av.name} — ${av.tagline || av.niche} (link a HeyGen photo + voice in the Avatars tab before video)`)
      } else if (a.action === 'create_account') {
        if (getAllBrandAccounts().some(x => x.id === a.payload.id)) {
          results.push(`⚠ Skipped account "${a.payload.id}" — one with that id already exists (nothing overwritten)`)
          continue
        }
        const acc = upsertBrandAccount({ status: 'planned', ...a.payload })
        createdAccounts++
        results.push(`📱 Account created: ${acc.handle} — ${acc.topic} (status: planned)`)
      } else if (a.action === 'create_goal') {
        const g = createGoal({ title: a.payload.title, account_id: a.payload.account_id ?? null, target_per_week: a.payload.target_per_week ?? 5, deadline: a.payload.deadline ?? null, notes: a.payload.notes ?? '', active: true })
        results.push(`🎯 Goal set: ${g.title} — ${g.target_per_week}/week`)
      } else if (a.action === 'create_watch') {
        const w = createWatchAccount({ handle: a.payload.handle, platform: a.payload.platform ?? 'instagram', niche: a.payload.niche ?? '', why_watching: a.payload.why_watching ?? '', formats: [], buzzwords: [], keywords: [], notes: '' })
        results.push(`📡 Watching: ${w.handle} — ${w.why_watching || w.niche}`)
      } else if (a.action === 'create_project') {
        const validLabels = ['series', 'biz_dev', 'new_account', 'launch', 'general']
        const label = validLabels.includes(String(a.payload.label)) ? a.payload.label : 'new_account'
        const p = createProject({ name: a.payload.name, description: a.payload.description ?? '', label: label as never })
        results.push(`📁 Project opened: ${p.name}`)
      } else if (a.action === 'create_event') {
        const ev = createEvent({ title: a.payload.title, date: a.payload.date, time: a.payload.time ?? '', kind: (a.payload.kind ?? 'launch') as EventKind, account_id: a.payload.account_id ?? null, notes: '' })
        results.push(`📅 On the calendar: ${ev.title} — ${ev.date}`)
      } else if (a.action === 'create_note') {
        const n = createNote({ title: a.payload.title, body: a.payload.body, category: 'idea', tags: a.payload.tags ?? ['brief'] })
        results.push(`📝 Brief archived to Notes: ${n.title}`)
      } else if (a.action === 'research_dig') {
        // Fire the research desk without blocking the build — findings land in the Research tab + Notes
        fetch(new URL('/api/research', origin), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'dig', topic: a.payload.topic, accountId: a.payload.account_id ?? undefined, save: true }),
        }).catch(() => {})
        results.push(`🔬 Research dig started: "${a.payload.topic}" — findings will land in the Research tab + Notes in a few minutes`)
      } else if (a.action === 'create_task') {
        const t = createTask({ title: a.payload.title, notes: a.payload.notes ?? '', priority: a.payload.priority ?? 'medium', due_date: a.payload.due_date ?? null })
        results.push(`✅ Task created: ${t.title}`)
      }
    } catch (e) {
      results.push(`⚠ Failed ${a.action}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }
  // The CEO always leaves a paper trail: review task after building accounts
  if (createdAccounts > 0) {
    const t = createTask({
      title: `Review the ${createdAccounts} new account${createdAccounts > 1 ? 's' : ''} RISE built — approve specs, then set them up on-platform`,
      notes: 'Quick Capture created these from your brief. Check voice, rules, colors, audience, and goals. New accounts are status:planned until you flip them active. Create the actual social accounts wherever they live (IG/TikTok/YouTube per each account\'s content_format note), and for avatar accounts link the HeyGen photo + voice in the Avatars tab.',
      priority: 'high',
    })
    results.push(`📋 Follow-up task: ${t.title}`)
  }
  return results
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // ── EXECUTE MODE: Mandi said "You do it" ────────────────────────────────────
  if (Array.isArray(body.executeActions)) {
    const results = executeActions(body.executeActions as PlannedAction[], new URL(req.url).origin)
    // Teach the station what was decided (best-effort)
    try {
      const { rememberConversation } = await import('@/lib/memory')
      rememberConversation(String(body.originalInput ?? 'Quick Capture execute'), results.join('\n'), 'ceo').catch(() => {})
    } catch { /* non-fatal */ }
    return NextResponse.json({ executed: true, results })
  }

  // ── PLAN MODE: classify, interview, and propose ─────────────────────────────
  const { input, fileUrl, fileType, fileName } = body
  const context = [
    input && `USER INPUT: ${input}`,
    fileUrl && `FILE: ${fileName} (${fileType}) at ${fileUrl}`,
  ].filter(Boolean).join('\n')

  const roster = getAllBrandAccounts().map(a => `- id:"${a.id}" ${a.handle} — ${a.topic} (${a.status})`).join('\n')
  const audiences = getAllAudiences().map(a => `- id:"${a.id}" ${a.name} — ${audienceLine(a.id)}`).join('\n')

  const raw = await fableText({
    maxTokens: 12000,
    effort: 'medium',
    imageUrl: fileType?.startsWith('image') ? fileUrl : undefined,
    instructions: `You are RISE Command Center — Mandi Beck's CEO-grade intake portal. Everything she drops here, you can act on: sort content, create tasks, AND build whole new brand accounts with audiences when she briefs you.

EXISTING ACCOUNTS:
${roster || 'none'}

EXISTING AUDIENCES:
${audiences || 'none'}

Return ONLY valid JSON — no explanation, no markdown.

Core fields (always):
1. "received" — one warm, specific line proving you read what she gave (echo a real detail, her voice). Her receipt.
2. "understood" — TRUE only if you can act confidently. FALSE if missing something that changes the outcome; then ask 1-3 SHARP "questions" (never filler).
   For NEW ACCOUNT briefs, the interview covers what's genuinely missing among: the feel/voice, the audience (who is she), the topic/mission, handle/name ideas, AND "where does this account live — mostly static images (carousels) or avatar video?" (static accounts skip YouTube; avatar-video accounts should also go to YouTube). If she already gave it, don't ask it.
3. Standard sort fields (type/title/summary/route/avatar/avatar_reason/suggested_action/tags/priority/content_angles) as below.

CEO POWERS — "actions": when the input calls for building things, propose a complete "actions" array. Mandi will either review it or say "You do it."
- create_audience: full Audience spec — { "action": "create_audience", "payload": { id (slug), name (e.g. "Overwhelmed Dana"), emoji, snapshot, life_stage, tuesday_reality (her 9pm Tuesday in scene detail), pains[], pain_side_effects[] (what the pain COSTS her), desires[], exact_language[] (words SHE uses), objections[], buying_triggers[], watering_holes[], tried_already[], notes } }
- create_avatar (ONLY for avatar-video accounts): { "action": "create_avatar", "payload": { id (slug), name, emoji, tagline, niche, personality, voiceStyle, targetAudience, instagramHandle, primaryPlatform, accentColor (hex), bgColor (hex, light), systemPrompt (full voice constitution for this avatar), hookFormulas[] (4+), ctaTemplate } }
- create_account: full BrandAccount spec — { "action": "create_account", "payload": { id (slug), handle (@...), platform, status: "planned", priority, color (hex — fits the brand feel), emoji, brand_name, topic, bio, mission, content_format ("static carousels" | "avatar video + static mix" | etc — INCLUDE whether it goes to YouTube), underlying_message, problem_message, solution_message, transformation ("from X to Y"), the_how, tone, beliefs[], hooks[] (5+ scroll-stopping, specific), notes (THE ACCOUNT RULES — non-negotiables the generators obey), audience_id (link the audience you created), avatar_id (link the avatar, if video) } }
- create_goal: { "action": "create_goal", "payload": { title, account_id, target_per_week (posting cadence — new accounts usually 5), deadline (YYYY-MM-DD or null), notes } }
- create_watch: 3-5 per new account — accounts winning in that niche worth studying — { "action": "create_watch", "payload": { handle (@...), platform, niche, why_watching (what they do well that we want to learn) } }
- create_project: { "action": "create_project", "payload": { name (e.g. "Launch @handle"), description (the launch checklist: bio live, profile visual, first 9 posts, ManyChat keyword if there's an offer), label: "new_account" } }
- create_event: { "action": "create_event", "payload": { title, date (YYYY-MM-DD), time, kind: "launch", account_id } } — only if a date was given or agreed.
- create_note: archive the ORIGINAL BRIEF as lore — { "action": "create_note", "payload": { title ("📋 Brief: ..."), body (her brief verbatim + your read of it), tags: ["brief", account id] } }
- research_dig: for fact-based accounts (history, science, news) — { "action": "research_dig", "payload": { topic (what to research first), account_id } } — runs the research desk so content starts from real sources.
- create_task: { "action": "create_task", "payload": { title, notes, priority, due_date (YYYY-MM-DD or null) } }

A NEW ACCOUNT IS A LAUNCH, NOT A ROW. For every new-account brief propose the full kit in this order: audience → avatar (only if video) → account → goal → 3-5 watches → launch project → event (if dated) → brief-archive note → research_dig (if fact-based). Skip what genuinely doesn't apply — never pad.
Order actions so referenced things exist first (audience/avatar before account). If understood is false, still sketch draft actions from what you have — they'll improve after her answers.

Return this JSON:
{
  "received": "...",
  "understood": true | false,
  "questions": ["..."],
  "type": "content_idea | podcast | social_post | task | project | note | media | research | question | account_brief",
  "title": "...",
  "summary": "...",
  "route": "pipeline | tasks | projects | notes | media | assistants | accounts",
  "avatar": "account/avatar id or null",
  "avatar_reason": "... or null",
  "suggested_action": "...",
  "tags": ["..."],
  "priority": "high | medium | low",
  "content_angles": ["..."],
  "actions": [ ...only when there is something to build... ]
}`,
    input: context,
  })

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : null
    if (parsed) {
      if (!Array.isArray(parsed.questions)) parsed.questions = []
      if (!Array.isArray(parsed.actions)) parsed.actions = []
    }
    // Quick Capture teaches the station too (best-effort, non-blocking)
    try {
      const { rememberConversation } = await import('@/lib/memory')
      if (parsed?.summary) rememberConversation(String(input ?? ''), `${parsed.received ?? ''}\n${parsed.summary}`, 'ceo').catch(() => {})
    } catch { /* non-fatal */ }
    return NextResponse.json({ classification: parsed, raw })
  } catch {
    return NextResponse.json({ error: 'Could not classify input', raw })
  }
}
