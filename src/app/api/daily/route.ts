import { NextRequest, NextResponse } from 'next/server'
import { getDailyCommand, saveDailyCommand } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  return NextResponse.json(getDailyCommand(date))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.date) body.date = new Date().toISOString().split('T')[0]
  return NextResponse.json(saveDailyCommand(body))
}
