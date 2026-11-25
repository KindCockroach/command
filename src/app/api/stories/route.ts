import { NextRequest, NextResponse, after } from 'next/server'
import { getStories, sendStory, approveStory, killStory } from '@/lib/storyDesk'
import { runHandoff } from '@/lib/agentRun'
import type { BranchId } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Phase 6b · Loop 11, the Story desk. GET → every story
// POST {text, goal, campaign?, branch, title?} → Cap sends it to Cora (Owl, Ten, Pod, Ed follow)
// PATCH {id, action:'approve'} | {id, action:'kill', reason}
export async function GET() {
  return NextResponse.json({ stories: getStories() })
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const branch: BranchId = b.branch === 'wfh' ? 'wfh' : 'joyful_media'
  const r = sendStory({ text: String(b.text ?? ''), goal: String(b.goal ?? ''), campaign: b.campaign ? String(b.campaign) : undefined, branch, title: b.title ? String(b.title) : undefined })
  if ('error' in r) return NextResponse.json(r, { status: 400 })
  after(async () => { await runHandoff(r.handoff.id) })
  return NextResponse.json(r)
}
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const r = b.action === 'approve' ? approveStory(String(b.id)) : b.action === 'kill' ? killStory(String(b.id), String(b.reason ?? '')) : { error: 'action must be approve or kill' }
  return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json({ story: r })
}
