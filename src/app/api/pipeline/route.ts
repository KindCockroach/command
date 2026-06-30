import { NextRequest, NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { autoVideo = false, maxItems = 5 } = body

  try {
    const result = await runPipeline({ autoScript: true, autoVideo, autoRepurpose: true, maxItems })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Pipeline error' }, { status: 500 })
  }
}

export async function GET() {
  // Quick status — how many items are at each stage
  const { getAllContent } = await import('@/lib/db')
  const all = getAllContent()
  const stages = all.reduce<Record<string, number>>((acc, c) => {
    const stage = c.pipeline_stage ?? c.status
    acc[stage] = (acc[stage] ?? 0) + 1
    return acc
  }, {})
  return NextResponse.json({ total: all.length, stages })
}
