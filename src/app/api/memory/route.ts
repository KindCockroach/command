import { NextRequest, NextResponse } from 'next/server'
import { getAllMemories, createMemory, updateMemory, deleteMemory } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? undefined
  return NextResponse.json(getAllMemories(category))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.title || !body.body) return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  return NextResponse.json(createMemory({
    category: body.category ?? 'note',
    title: body.title,
    body: body.body,
    agent_tags: body.agent_tags ?? [],
  }), { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updated = updateMemory(Number(id), updates)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteMemory(Number(id))
  return NextResponse.json({ success: true })
}
