import { NextRequest, NextResponse } from 'next/server'
import { createGoal, updateGoal, deleteGoal } from '@/lib/db'
import { getGoalProgress } from '@/lib/goalProgress'

export const dynamic = 'force-dynamic'

// GET returns goals with both scoreboards — posts (published+scheduled vs pace) and
// signups (GHL tag + manual count). Computed in lib/goalProgress so every brain agrees.
export async function GET() {
  return NextResponse.json(await getGoalProgress())
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  if (!data.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  return NextResponse.json(createGoal(data), { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updated = updateGoal(Number(id), updates)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteGoal(Number(id))
  return NextResponse.json({ success: true })
}
