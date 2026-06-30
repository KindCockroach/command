import { NextRequest, NextResponse } from 'next/server'
import { createContent, logIntake } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { input } = await req.json()
  if (!input?.trim()) return NextResponse.json({ error: 'input required' }, { status: 400 })
  logIntake(input)
  const piece = createContent({ title: input.trim(), status: 'idea', type: 'other', notes: `Captured ${new Date().toLocaleString()}` })
  return NextResponse.json(piece, { status: 201 })
}
