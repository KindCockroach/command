import { proofread } from '@/lib/proofread'
import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, createContent, updateContent, deleteContent } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const projectId = searchParams.get('project_id')
  const accountId = searchParams.get('account_id')
  let results = getAllContent(status)
  if (projectId) {
    const pid = parseInt(projectId)
    results = results.filter(c => c.project_id === pid)
  }
  if (accountId) {
    results = results.filter(c => c.account_id === accountId)
  }
  // Exclude held content from the default (no-status-filter) Kanban feed
  if (!status && !projectId && !accountId) {
    results = results.filter(c => c.status !== 'held')
  }
  return NextResponse.json(results)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  return NextResponse.json(createContent(body), { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, proofread: sweep, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  // Her own edits (Save on a card): Cap sweeps spelling + punctuation first, her words kept.
  let fixes: string[] = []
  if (sweep === true) {
    const text: Record<string, string> = {}
    for (const k of ['title', 'description', 'script', 'onscreen_text']) if (typeof updates[k] === 'string') text[k] = updates[k]
    const swept = await proofread(text)
    Object.assign(updates, swept.fields); fixes = swept.fixes
  }
  const updated = updateContent(Number(id), updates)
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(sweep === true ? { ...updated, fixes } : updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteContent(Number(id))
  return NextResponse.json({ success: true })
}
