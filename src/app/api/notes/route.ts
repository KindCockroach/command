import { NextRequest, NextResponse } from 'next/server'
import { getAllNotes, createNote, updateNote, deleteNote } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const category = params.get('category') ?? undefined
  const search = params.get('search') ?? undefined
  return NextResponse.json(getAllNotes(category, search))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json(createNote(body))
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const result = updateNote(Number(id), updates)
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(result)
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteNote(Number(id))
  return NextResponse.json({ success: true })
}
