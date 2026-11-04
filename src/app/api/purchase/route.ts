import { NextRequest, NextResponse } from 'next/server'
import { addContactLabelByEmail, getProducts, logActivity } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Purchase webhook — point any checkout (FastPayDirect, Luma, Stripe, a Zap) here and
// the buyer is auto-labeled Paid Customer in People. Provider-agnostic: it just needs
// an email. POST { email, name?, product?, amount?, source? } — product is a RISE
// product id (e.g. "reset") or a free-text name; it's recorded on the contact.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  // Tolerate common provider field names.
  const email = String(b.email || b.customer_email || b.buyer_email || b.email_address || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  const name = String(b.name || b.customer_name || b.full_name || '').trim().slice(0, 120)
  const rawProduct = String(b.product || b.product_id || b.item || '').trim().slice(0, 80)
  // Map to a known product id when it matches, else keep the label they sent.
  const known = getProducts().find(p => p.id === rawProduct.toLowerCase() || p.name.toLowerCase() === rawProduct.toLowerCase())
  const product = known?.id || rawProduct || undefined

  const contact = addContactLabelByEmail(email, 'paid_customer', { name, product })
  logActivity({ type: 'note', title: `💳 Paid customer — ${name || email}`, detail: `${known?.name || rawProduct || 'purchase'}${b.amount ? ` · ${b.amount}` : ''}${b.source ? ` · ${b.source}` : ''}`, icon: '💳', source: 'purchase' })
  return NextResponse.json({ ok: true, contact_id: contact.id, labeled: 'paid_customer', product: product || null })
}
