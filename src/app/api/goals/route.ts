import { NextRequest, NextResponse } from 'next/server'
import { getAllGoals, createGoal, updateGoal, deleteGoal, getAllContent } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET returns goals with computed pace: posted this week vs where we should be by today
export async function GET() {
  const goals = getAllGoals()
  const content = getAllContent()
  const now = new Date()
  // Week starts Monday
  const day = (now.getDay() + 6) % 7 // 0 = Monday
  const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(now.getDate() - day)

  const enriched = goals.map(g => {
    const pool = g.account_id ? content.filter(c => c.account_id === g.account_id) : content
    const postedThisWeek = pool.filter(c =>
      (c.status === 'published' || c.status === 'archived') &&
      c.published_at && new Date(c.published_at) >= weekStart
    ).length
    const scheduled = pool.filter(c => c.status === 'scheduled' || c.status === 'approved').length
    const queued = pool.filter(c => ['idea', 'in_progress', 'ready', 'held'].includes(c.status)).length
    // Expected by end of today, pro-rated across the week
    const expectedByToday = Math.floor((g.target_per_week * (day + 1)) / 7)
    const behind = g.active && postedThisWeek + scheduled < expectedByToday
    const deadlineSoon = g.deadline ? (new Date(g.deadline).getTime() - now.getTime()) < 7 * 86400000 : false
    return { ...g, postedThisWeek, scheduled, queued, expectedByToday, behind, deadlineSoon }
  })

  return NextResponse.json(enriched)
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
