import { NextRequest, NextResponse } from 'next/server'
import { getAllMemories, addFact, deleteMemory, seedCoreMemories } from '@/lib/memory'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!process.env.MEM0_API_KEY) return NextResponse.json({ error: 'MEM0_API_KEY not set' }, { status: 503 })
  const memories = await getAllMemories()
  return NextResponse.json(memories)
}

export async function POST(req: NextRequest) {
  if (!process.env.MEM0_API_KEY) return NextResponse.json({ error: 'MEM0_API_KEY not set' }, { status: 503 })
  const body = await req.json()

  if (body.action === 'seed') {
    await seedCoreMemories()
    return NextResponse.json({ success: true, message: 'Core memories seeded into mem0' })
  }

  if (body.fact) {
    await addFact(body.fact, body.category)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'provide fact or action:seed' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  if (!process.env.MEM0_API_KEY) return NextResponse.json({ error: 'MEM0_API_KEY not set' }, { status: 503 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await deleteMemory(id)
  return NextResponse.json({ success: true })
}
