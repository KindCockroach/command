import { NextRequest, NextResponse } from 'next/server'
import { getAllAvatars, upsertAvatar, deleteAvatar } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getAllAvatars())
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  if (!data.id || !data.name) return NextResponse.json({ error: 'id and name required' }, { status: 400 })
  return NextResponse.json(upsertAvatar(data))
}

export async function PATCH(req: NextRequest) {
  const data = await req.json()
  if (!data.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json(upsertAvatar(data))
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const ok = deleteAvatar(id)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 })
}
