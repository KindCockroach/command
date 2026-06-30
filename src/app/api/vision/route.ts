import { NextRequest, NextResponse } from 'next/server'
import { getAllVision, upsertVision } from '@/lib/db'
import type { VisionType } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getAllVision())
}

export async function POST(req: NextRequest) {
  const { type, content } = await req.json()
  if (!type || !content) return NextResponse.json({ error: 'type and content required' }, { status: 400 })
  return NextResponse.json(upsertVision(type as VisionType, content))
}
