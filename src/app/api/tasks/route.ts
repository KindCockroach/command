import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, createTask, updateTask, deleteTask } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const status = new URL(req.url).searchParams.get('status') ?? undefined
  return NextResponse.json(getAllTasks(status))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json(createTask(body))
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const result = updateTask(Number(id), updates)
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(result)
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteTask(Number(id))
  return NextResponse.json({ success: true })
}
