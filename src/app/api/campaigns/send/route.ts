import { NextRequest, NextResponse } from 'next/server'
import { getProducts, getPeople, logSend, logActivity } from '@/lib/db'
import { resendSend } from '@/lib/resend'
import { renderBrandEmail } from '@/lib/emailTemplate'
import { unsubscribeUrl, unsubscribeApiUrl } from '@/lib/unsubscribe'

export const dynamic = 'force-dynamic'

// Cap sends a drafted campaign to the selected audience and logs each send (cadence +
// per-person timeline). POST {product_id, subject, body, preview?, cta_label?, cta_url?, recipient_emails[]}.
// Every email goes out in the brand template with that person's own unsubscribe link,
// and anyone who has opted out is skipped.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const product = getProducts().find(p => p.id === b.product_id)
  if (!product) return NextResponse.json({ error: 'Unknown product.' }, { status: 400 })
  const subject = typeof b.subject === 'string' ? b.subject.trim() : ''
  const body = typeof b.body === 'string' ? b.body.trim() : ''
  if (!subject || !body) return NextResponse.json({ error: 'Subject and body are required.' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Resend isn’t configured yet (RESEND_API_KEY). Add it in Railway → Variables to send.' }, { status: 400 })

  // Only the people Mandi checked in the composer get it. No list = no send: Campaigns never
  // emails a whole label group blind (11-25: a follow-up reached non-attendees that way).
  if (!Array.isArray(b.recipient_emails)) return NextResponse.json({ error: 'Pick who gets it first (step 3 checklist).' }, { status: 400 })
  const picked = new Set<string>((b.recipient_emails as unknown[]).filter((e): e is string => typeof e === 'string').map(e => e.trim().toLowerCase()).filter(Boolean))
  if (!picked.size) return NextResponse.json({ error: 'Nobody is checked. Check at least one person.' }, { status: 400 })
  const matched = getPeople().filter(p => p.email && picked.has(p.email.trim().toLowerCase()))
  const recipients = matched.filter(p => !p.unsubscribed)
  const skipped = matched.length - recipients.length
  if (!recipients.length) {
    return NextResponse.json({ error: skipped ? `Everyone you checked (${skipped}) has unsubscribed.` : 'None of the checked people are in People.' }, { status: 400 })
  }

  const content = {
    preheader: typeof b.preview === 'string' ? b.preview : undefined,
    body,
    cta_label: typeof b.cta_label === 'string' ? b.cta_label : undefined,
    cta_url: typeof b.cta_url === 'string' ? b.cta_url : undefined,
    reason: 'You’re getting this because you joined one of Mandi Beck’s lists.',
  }

  let sent = 0, failed = 0
  let firstError = ''
  for (const r of recipients) {
    const link = unsubscribeUrl(r.email!)
    const oneClick = unsubscribeApiUrl(r.email!)
    // No link = no send. An email without a working unsubscribe never leaves.
    if (!link || !oneClick) { failed++; firstError ||= 'Could not sign an unsubscribe link.'; continue }
    const html = renderBrandEmail(product.brand, content, { unsubscribeUrl: link })
    const res = await resendSend(r.email!, subject, html, undefined, undefined, {
      'List-Unsubscribe': `<${oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
    if (res.ok) sent++; else { failed++; firstError ||= res.error || 'send failed' }
    logSend({ email: r.email!, subject, product: product.id, status: res.ok ? 'sent' : 'failed', via: 'resend' })
  }
  logActivity({ type: 'note', title: `📣 Cap sent "${subject}"`, detail: `${product.name} → ${sent} sent${failed ? `, ${failed} failed` : ''}${skipped ? `, ${skipped} skipped (unsubscribed)` : ''}`, icon: '📣', source: 'campaigns' })
  return NextResponse.json({ sent, failed, skipped, total: matched.length, ...(firstError ? { error_detail: firstError } : {}) })
}
