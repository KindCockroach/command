import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, upsertBrandAccount, deleteBrandAccount } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getAllBrandAccounts())
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  if (!data.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json(upsertBrandAccount(data))
}

export async function PATCH(req: NextRequest) {
  const data = await req.json()
  if (!data.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  return NextResponse.json(upsertBrandAccount(data))
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteBrandAccount(id)
  return NextResponse.json({ success: true })
}
