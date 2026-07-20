import { NextRequest, NextResponse } from 'next/server'
import { fableText } from '@/lib/fable'
import {
  upsertBrandAccount, upsertAudience, createTask,
  getAllBrandAccounts, getAllAudiences, audienceLine,
} from '@/lib/db'
import type { BrandAccount, Audience } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ── The CEO's hands: actions Quick Capture is allowed to execute ──────────────
type PlannedAction =
  | { action: 'create_account'; payload: Partial<BrandAccount> & { id: string } }
  | { action: 'create_audience'; payload: Partial<Audience> & { id: string } }
  | { action: 'create_task'; payload: { title: string; notes?: string; priority?: 'urgent' | 'high' | 'medium' | 'low'; due_date?: string | null } }

function executeActions(actions: PlannedAction[]) {
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
      } else if (a.action === 'create_account') {
        if (getAllBrandAccounts().some(x => x.id === a.payload.id)) {
          results.push(`⚠ Skipped account "${a.payload.id}" — one with that id already exists (nothing overwritten)`)
          continue
        }
        const acc = upsertBrandAccount({ status: 'planned', ...a.payload })
        createdAccounts++
        results.push(`📱 Account created: ${acc.handle} — ${acc.topic} (status: planned)`)
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
      notes: 'Quick Capture created these from your brief. Check voice, rules, colors, and audience. New accounts are status:planned until you flip them active. Create the actual social accounts wherever they live (IG/TikTok/YouTube per each account\'s content_format note).',
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
    const results = executeActions(body.executeActions as PlannedAction[])
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
- create_account: full BrandAccount spec — { "action": "create_account", "payload": { id (slug), handle (@...), platform, status: "planned", priority, color (hex — fits the brand feel), emoji, brand_name, topic, bio, mission, content_format ("static carousels" | "avatar video + static mix" | etc — INCLUDE whether it goes to YouTube), underlying_message, problem_message, solution_message, transformation ("from X to Y"), the_how, tone, beliefs[], hooks[] (5+ scroll-stopping, specific), notes (THE ACCOUNT RULES — non-negotiables the generators obey), audience_id (link the audience you created) } }
- create_task: { "action": "create_task", "payload": { title, notes, priority, due_date (YYYY-MM-DD or null) } }
Order actions so audiences come before the accounts that reference them. If understood is false, still sketch draft actions from what you have — they'll improve after her answers.

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
