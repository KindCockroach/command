import { NextRequest, NextResponse } from 'next/server'
import { getProductsWithCadence, updateProduct } from '@/lib/db'

export const dynamic = 'force-dynamic'

// The Campaigns tab's data. GET returns every product with its cadence clock computed
// from the send-log; PATCH edits a product's mission, fit, links, or cadence in place.
export async function GET() {
  return NextResponse.json({ products: getProductsWithCadence() })
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  for (const k of ['name', 'mission', 'fits', 'price', 'status'] as const) if (typeof b[k] === 'string') patch[k] = b[k]
  if (typeof b.cadence_days === 'number' && b.cadence_days >= 0) patch.cadence_days = Math.floor(b.cadence_days)
  if (Array.isArray(b.links)) patch.links = b.links.filter((l: unknown): l is { label: string; url: string } => !!l && typeof (l as { url?: unknown }).url === 'string').map((l: { label?: string; url: string }) => ({ label: (l.label || '').slice(0, 80), url: l.url.slice(0, 500) }))
  const prod = updateProduct(b.id, patch)
  if (!prod) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json({ product: prod })
}
