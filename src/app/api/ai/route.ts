import { NextRequest, NextResponse } from 'next/server'
import { repurposeContent, callGPT, callGPTWithImage, generateScript, enrichIdea, generateDailyBriefing, routeToAgent, listVoices, GPTRole } from '@/lib/ai'
import type { RepurposeOutput } from '@/lib/ai'

export const dynamic = 'force-dynamic'

// The 1→30 expansion, rendered as a readable note body (the Notes card saves
// this string straight into a new note).
function formatRepurpose(r: RepurposeOutput): string {
  const s: string[] = []
  if (r.summary) s.push(`## Core message\n${r.summary}`)
  if (r.reels_hooks?.length) s.push(`## 🎬 Reels hooks\n${r.reels_hooks.map(h => `- ${h}`).join('\n')}`)
  if (r.tiktok_angles?.length) s.push(`## 📱 TikTok angles\n${r.tiktok_angles.map(t => `- **${t.hook}** — ${t.angle}`).join('\n')}`)
  if (r.youtube?.length) s.push(`## ▶️ YouTube\n${r.youtube.map(y => `- **${y.title}**\n  ${y.description}`).join('\n')}`)
  if (r.captions) s.push(`## ✍️ Captions\n**Short:** ${r.captions.short}\n\n**Medium:** ${r.captions.medium}\n\n**Long:** ${r.captions.long}`)
  if (r.email_subjects?.length) s.push(`## 📧 Email subjects\n${r.email_subjects.map(e => `- ${e}`).join('\n')}`)
  if (r.newsletter_angle) s.push(`## 📰 Newsletter angle\n${r.newsletter_angle}`)
  if (r.pinterest_pins?.length) s.push(`## 📌 Pinterest pins\n${r.pinterest_pins.map(p => `- ${p}`).join('\n')}`)
  if (r.linkedin_posts?.length) s.push(`## 💼 LinkedIn\n${r.linkedin_posts.map(p => `- ${p}`).join('\n')}`)
  if (r.story_ideas?.length) s.push(`## ⭕ Story ideas\n${r.story_ideas.map(i => `- ${i}`).join('\n')}`)
  if (r.thread_tweet?.length) s.push(`## 🧵 Thread\n${r.thread_tweet.map((t, i) => `${i + 1}. ${t}`).join('\n')}`)
  if (r.offer_bridge) s.push(`## 🌉 Offer bridge\n${r.offer_bridge}`)
  return s.join('\n\n')
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, role, message, image, title, description, notes, transcript, platforms, topic, duration, pipeline_summary, systemOverride, history } = body

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-key-here') {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set in .env.local' }, { status: 503 })
  }

  try {
    switch (action) {
      case 'repurpose':
        return NextResponse.json({ result: await repurposeContent(title ?? '', description ?? '', notes ?? '', transcript ?? '', platforms ?? []) })

      case 'expand': {
        // Notes → "Expand 1→30 stream": full repurpose, rendered as a readable note body
        const out = await repurposeContent(title ?? '', description ?? '', notes ?? '', transcript ?? '', platforms ?? [])
        return NextResponse.json({ result: formatRepurpose(out) })
      }

      case 'chat':
        return NextResponse.json({ result: image
          ? await callGPTWithImage(role as GPTRole, message ?? '', image, systemOverride, history)
          : await callGPT(role as GPTRole, message, systemOverride, history) })

      case 'route':
        return NextResponse.json({ result: await routeToAgent(message) })

      case 'script':
        return NextResponse.json({ result: await generateScript(topic, duration) })

      case 'enrich':
        return NextResponse.json({ result: await enrichIdea(title ?? '', description ?? '') })

      case 'briefing':
        return NextResponse.json({ result: await generateDailyBriefing(pipeline_summary ?? '') })

      case 'voices':
        return NextResponse.json({ result: await listVoices() })

      default:
        // Allow role+message without explicit action (used by Assistants panel + StationChat)
        if (role && (message || image)) {
          if (image) {
            return NextResponse.json({ result: await callGPTWithImage(role as GPTRole, message ?? '', image, systemOverride, history) })
          }
          return NextResponse.json({ result: await callGPT(role as GPTRole, message, systemOverride, history) })
        }
        return NextResponse.json({ error: 'unknown action' }, { status: 400 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
