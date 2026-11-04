import { NextRequest, NextResponse } from 'next/server'
import { getBuildLogMerged, addBuildLogEntry, updateBuildLogEntry, deleteBuildLogEntry } from '@/lib/db'

export const dynamic = 'force-dynamic'

// The Brief's build journal — what we've built, what's in progress, what's next —
// merged across Claude's work and Mandi's work inside RISE (station activity).
export async function GET() {
  return NextResponse.json({ entries: getBuildLogMerged() })
}

// RISE (or Mandi) can add an entry — source 'rise' for in-station work.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const entry = addBuildLogEntry({ date: b.date, title: String(b.title), status: b.status, detail: b.detail, source: b.source === 'rise' ? 'rise' : 'claude' })
  return NextResponse.json({ entry })
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  for (const k of ['title', 'detail', 'date'] as const) if (typeof b[k] === 'string') patch[k] = b[k]
  if (['done', 'doing', 'todo'].includes(b.status)) patch.status = b.status
  const entry = updateBuildLogEntry(b.id, patch)
  if (!entry) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ entry })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json({ success: deleteBuildLogEntry(id) })
}
