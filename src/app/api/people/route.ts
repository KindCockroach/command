import { NextRequest, NextResponse } from 'next/server'
import { getPeople, createContact, updateContact, deleteContact, CONTACT_LABELS, type ContactLabel } from '@/lib/db'

export const dynamic = 'force-dynamic'

// The People tab's data. GET returns the merged CRM (signups + guests + manual
// contacts) with computed labels; POST adds a contact; PATCH edits one; DELETE removes.
export async function GET() {
  return NextResponse.json({ people: getPeople() })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.name && !b.email) return NextResponse.json({ error: 'Add a name or email.' }, { status: 400 })
  const labels = Array.isArray(b.labels) ? (b.labels as string[]).filter((l): l is ContactLabel => CONTACT_LABELS.includes(l as ContactLabel)) : []
  const c = createContact({ name: b.name, email: b.email, labels, instagram: b.instagram, website: b.website, phone: b.phone, why: b.why, notes: b.notes })
  return NextResponse.json({ contact: c })
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  for (const k of ['name', 'email', 'instagram', 'website', 'phone', 'why', 'notes'] as const) if (b[k] !== undefined) patch[k] = b[k]
  if (Array.isArray(b.labels)) patch.labels = (b.labels as string[]).filter(l => CONTACT_LABELS.includes(l as ContactLabel))
  const c = updateContact(b.id, patch)
  if (!c) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json({ contact: c })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  return NextResponse.json({ success: deleteContact(id) })
}
