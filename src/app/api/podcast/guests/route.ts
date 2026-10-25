import { NextRequest, NextResponse } from 'next/server'
import { getPodcastGuests, createPodcastGuest, updatePodcastGuest, deletePodcastGuest } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PODCAST GUESTS — prospects, their contact info, the drafted pitch, and the outreach
// pipeline. GET lists; POST creates; PATCH updates; DELETE removes.
export function GET() {
  return NextResponse.json({ guests: getPodcastGuests() })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return NextResponse.json({ ok: true, guest: createPodcastGuest(body) })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const guest = updatePodcastGuest(String(body.id), body)
  if (!guest) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true, guest })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json({ ok: deletePodcastGuest(id) })
}
