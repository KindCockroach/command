import { NextRequest, NextResponse } from 'next/server'
import { getAllEvents, createEvent, updateEvent, deleteEvent } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getAllEvents())
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  if (!data.title || !data.date) return NextResponse.json({ error: 'title and date required' }, { status: 400 })
  return NextResponse.json(createEvent(data), { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updated = updateEvent(Number(id), updates)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteEvent(Number(id))
  return NextResponse.json({ success: true })
}
