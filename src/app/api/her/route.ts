import { NextRequest, NextResponse, after } from 'next/server'
import { herSay, getThreads, getThread } from '@/lib/her'
import { runHandoff } from '@/lib/agentRun'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Her, the front door. GET → recent threads (with what happened to each).  GET ?id= → one.
// POST { text, thread_id?, spoken? } → Her reads it, saves her words, routes it with a receipt.
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (id) { const t = getThread(id); return t ? NextResponse.json({ thread: t }) : NextResponse.json({ error: 'No such conversation.' }, { status: 404 }) }
  return NextResponse.json({ threads: getThreads() })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const r = await herSay({ text: String(b.text ?? ''), thread_id: b.thread_id ? String(b.thread_id) : null, spoken: !!b.spoken })
  if ('error' in r) return NextResponse.json(r, { status: 400 })
  // Commander reads the note after Her answers, so she isn't kept waiting.
  if (r.handoff && r.handoff.kind === 'her_note') { const id = r.handoff.id; after(async () => { await runHandoff(id) }) }
  return NextResponse.json(r)
}
