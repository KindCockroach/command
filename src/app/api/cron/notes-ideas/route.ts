import { NextRequest, NextResponse } from 'next/server'
import { openNotesMine, unminedNotes } from '@/lib/noteIdeas'
import { runHandoff } from '@/lib/agentRun'
import { readDb } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Phase 8 A7 · daily: Cap reads new or edited notes for quotes, lines and skits (a few batches
// at most; a background job, so the spending cap's background rules apply).
// The full read waits for Mandi's Go, so this does nothing until she has run it once.
async function run(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('key')
  const secret = process.env.CRON_SECRET
  if (secret && key !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const s = readDb().note_ideas
  if (!s?.backfill || s.backfill.status === 'running') return NextResponse.json({ skipped: 'the first full read hasn’t run yet (or is running)' })
  if (!unminedNotes().length) return NextResponse.json({ skipped: 'no new notes' })
  const h = openNotesMine('daily')
  const r = await runHandoff(h.id)
  return NextResponse.json({ handoff: h.id, result: r })
}
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
