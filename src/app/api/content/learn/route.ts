import { NextRequest, NextResponse } from 'next/server'
import { getAllContent } from '@/lib/db'
import { learnFromEdits } from '@/lib/learn'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// "Save Changes" fires this after saving Mandi's hand-edits: it learns from
// what she changed (on-screen / script / caption) WITHOUT touching the post —
// her exact words are already saved. Best-effort; returns the rules it learned.
export async function POST(req: NextRequest) {
  const { contentId, before, after } = await req.json().catch(() => ({}))
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const learned = await learnFromEdits({
    title: piece.title,
    accountId: piece.account_id,
    before: before ?? {},
    after: after ?? {},
  })
  return NextResponse.json({ learned })
}
