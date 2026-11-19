import { NextRequest, NextResponse } from 'next/server'
import { getHandoffs, closeHandoff } from '@/lib/cardMedia'

export const dynamic = 'force-dynamic'

// Notes between agents about a card. Phase 3 writes "footage in → Cap".
// GET ?to=cap&status=open&content_id=   ·   POST { action:'done', id, by? }
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams
  return NextResponse.json({ handoffs: getHandoffs({ to: q.get('to') ?? undefined, status: q.get('status') ?? undefined, content_id: q.get('content_id') ? Number(q.get('content_id')) : undefined }) })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.action !== 'done' || !b.id) return NextResponse.json({ error: 'Send { action:"done", id }' }, { status: 400 })
  const h = closeHandoff(String(b.id), String(b.by || 'cap'))
  return h ? NextResponse.json({ handoff: h }) : NextResponse.json({ error: 'No such handoff' }, { status: 404 })
}
