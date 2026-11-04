import { NextRequest, NextResponse } from 'next/server'
import { getProducts, getPeople, logSend, logActivity, CONTACT_LABELS, type ContactLabel, type ProductBrand } from '@/lib/db'
import { resendSend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

const BRAND_COLOR: Record<ProductBrand, string> = { btfh: '#C2693F', wfh: '#5A4FCF', joyful: '#E2508A' }
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Wrap Cap's plain-text copy in a clean, on-brand HTML email.
function campaignEmailHtml(brand: ProductBrand, body: string, cta_label?: string, cta_url?: string): string {
  const color = BRAND_COLOR[brand] || '#5A4FCF'
  const paras = body.split(/\n{2,}/).map(p => `<p style="margin:0 0 16px">${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('')
  const button = cta_label && cta_url
    ? `<p style="margin:26px 0 8px"><a href="${esc(cta_url)}" style="display:inline-block;background:${color};color:#fff;padding:13px 26px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(cta_label)}</a></p>`
    : ''
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.65;color:#3C2A37;max-width:560px;margin:0 auto">
${paras}${button}
<p style="margin:28px 0 0;font-size:13px;color:#9b8f93;border-top:1px solid #eee;padding-top:16px">With you — Mandi · Joyful Media</p>
</div>`
}

// Cap sends a drafted campaign to the selected audience and logs each send (cadence +
// per-person timeline). POST {product_id, subject, body, cta_label?, cta_url?, audience_labels[]}.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const product = getProducts().find(p => p.id === b.product_id)
  if (!product) return NextResponse.json({ error: 'Unknown product.' }, { status: 400 })
  const subject = typeof b.subject === 'string' ? b.subject.trim() : ''
  const body = typeof b.body === 'string' ? b.body.trim() : ''
  if (!subject || !body) return NextResponse.json({ error: 'Subject and body are required.' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Resend isn’t configured yet (RESEND_API_KEY). Add it in Railway → Variables to send.' }, { status: 400 })

  const labels: ContactLabel[] = Array.isArray(b.audience_labels) ? b.audience_labels.filter((l: string) => CONTACT_LABELS.includes(l as ContactLabel)) : []
  const recipients = getPeople().filter(p => p.email && (labels.length ? labels.every(l => p.labels.includes(l)) : true))
  if (!recipients.length) return NextResponse.json({ error: 'No one matches that audience.' }, { status: 400 })

  const html = campaignEmailHtml(product.brand, body, b.cta_label, b.cta_url)
  let sent = 0, failed = 0
  for (const r of recipients) {
    const res = await resendSend(r.email!, subject, html)
    if (res.ok) sent++; else failed++
    logSend({ email: r.email!, subject, product: product.id, status: res.ok ? 'sent' : 'failed', via: 'resend' })
  }
  logActivity({ type: 'note', title: `📣 Cap sent "${subject}"`, detail: `${product.name} → ${sent} sent${failed ? `, ${failed} failed` : ''}`, icon: '📣', source: 'campaigns' })
  return NextResponse.json({ sent, failed, total: recipients.length })
}
