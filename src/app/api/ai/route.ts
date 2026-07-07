import { NextRequest, NextResponse } from 'next/server'
import { repurposeContent, callGPT, callGPTWithImage, generateScript, enrichIdea, generateDailyBriefing, routeToAgent, listVoices, GPTRole } from '@/lib/ai'

export const dynamic = 'force-dynamic'

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
