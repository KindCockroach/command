import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createContent } from '@/lib/db'

export const dynamic = 'force-dynamic'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { projectName, projectDescription, projectNotes, count = 20 } = await req.json()
  if (!projectName) return NextResponse.json({ error: 'projectName required' }, { status: 400 })

  const prompt = `You are Mandi Beck's Content Director at RISE Station. Mandi is an AI Mom educator who helps overwhelmed moms use AI to reclaim their time. Her brand voice: direct, warm, zero fluff, speaks to tired moms who've had it.

Project: ${projectName}
Description: ${projectDescription || ''}
Notes: ${projectNotes || ''}

Generate exactly ${count} ready-to-post social media captions for this project. Each should be scroll-stopping, platform-native, and speak directly to the exhausted, behind-the-scenes mom who is DONE doing it all manually.

Return a JSON array of objects. Each object must have:
- "title": short card label (under 60 chars, describes the angle)
- "caption": the full ready-to-post caption (with line breaks, emoji where natural, CTA at end)
- "platform": one of "instagram", "facebook", "tiktok", "threads", "email_subject"
- "angle": the hook angle used (e.g. "Come Cranky", "Permission slip", "Real talk", "Before/after", "Story", "Objection buster", "Trending audio hook")

Vary the angles heavily. Include a mix of:
- Short punchy hooks (1-3 sentences + CTA)
- Story-format (relatable scenario → solution → CTA)
- Permission slips ("You don't have to...")
- Direct sales (unapologetic "here's what you get")
- Objection busters ("But I don't have time to learn AI" → answer)
- Trending audio formats (POV:, Tell me you're a mom without telling me...)
- Behind the scenes
- Real results / proof

Return ONLY the JSON array, no markdown, no explanation.`

  try {
    const response = await client.responses.create({
      model: 'gpt-4o',
      instructions: 'You are a social media content expert. Return only valid JSON arrays.',
      input: prompt,
    })

    const raw = response.output_text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const posts: Array<{ title: string; caption: string; platform: string; angle: string }> = JSON.parse(raw)

    const created = posts.map(p =>
      createContent({
        title: p.title,
        description: p.caption,
        status: 'ready',
        type: 'caption',
        platforms: [p.platform],
        tags: ['generated', projectName.toLowerCase().replace(/\s+/g, '-'), p.angle.toLowerCase().replace(/\s+/g, '-')],
        notes: `Angle: ${p.angle} | Project: ${projectName}`,
      })
    )

    return NextResponse.json({ created: created.length, posts: created })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed' }, { status: 500 })
  }
}
