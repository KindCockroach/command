import { NextResponse, after } from 'next/server'
import { openHandoff } from '@/lib/handoffs'
import { runHandoff } from '@/lib/agentRun'
import { latestTrendNote } from '@/lib/trendPick'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Phase 8 · A6: hand the LATEST weekly trend digest to Cap now (the Monday check-in does this on its own).
// GET → which digest Cap would read. POST → open the trend_pick handoff and run it in the background.
export async function GET() {
  const n = latestTrendNote()
  return NextResponse.json(n ? { note_id: n.id, title: n.title, created_at: n.created_at } : { note_id: null })
}

export async function POST() {
  const n = latestTrendNote()
  if (!n) return NextResponse.json({ error: 'No weekly trend digest in Notes yet.' }, { status: 404 })
  const h = openHandoff({ kind: 'trend_pick', from: 'ten', to: 'cap', what: `This week’s trends (${n.title}): keep or reject each; put the keepers on the calendar`, ref: { type: 'note', id: n.id, label: 'trend digest' } })
  after(async () => { await runHandoff(h.id) })
  return NextResponse.json({ handed_to_cap: h.id, note_id: n.id })
}
