import { NextRequest, NextResponse, after } from 'next/server'
import { getApprovals, SOURCE_LABEL } from '@/lib/approvals'
import { getChat, talkToCap } from '@/lib/approvalChat'
import { runHandoff } from '@/lib/agentRun'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Everything waiting on Mandi's yes, in one list. Read-only; each item's actions call its own route.
// GET ?chat=<item id> → the Talk-to-Cap thread for one item
// POST {id, text} → talk to Cap about that item (a change request goes to the writer)
export async function GET(req: NextRequest) {
  const chat = new URL(req.url).searchParams.get('chat')
  if (chat) return NextResponse.json({ turns: getChat(chat) })
  return NextResponse.json({ ...getApprovals(), labels: SOURCE_LABEL })
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const r = await talkToCap(String(b.id), String(b.text ?? ''))
  if ('error' in r) return NextResponse.json(r, { status: 400 })
  if (r.rewriting) { const id = r.rewriting; after(async () => { await runHandoff(id) }) }
  return NextResponse.json(r)
}
