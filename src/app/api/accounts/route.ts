import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, upsertBrandAccount } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getAllBrandAccounts())
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  if (!data.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json(upsertBrandAccount(data))
}
