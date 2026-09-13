import { NextRequest, NextResponse } from 'next/server'
import { runSortingHat } from '@/lib/sortingHat'

export const dynamic = 'force-dynamic'

// Runs the Sorting Hat agent on a raw brain-dump and returns its full trace
// (every decision + tool call) plus the drafts it proposed. Internal route —
// gated by middleware (STATION_KEY) like the rest of the Command Center.
export async function POST(req: NextRequest) {
  let body: { input?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const input = (body.input || '').trim()
  if (!input) return NextResponse.json({ error: 'Give me something to sort.' }, { status: 400 })
  try {
    const result = await runSortingHat(input)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Sorting Hat failed' }, { status: 500 })
  }
}
