// THE BRANDED EMAIL TEMPLATE — one layout, three brand skins. Cap (or any sender)
// supplies WORDS in named slots; this file supplies the shape: header, colors,
// button, signature, footer, unsubscribe. Table-based with inline styles because
// Gmail/Outlook ignore modern CSS. Self-contained (no imports) so it can be
// rendered anywhere — server routes, a preview, a test script.
//
// NOT WIRED IN YET: /api/campaigns/send still uses its own bare wrapper. Wiring
// this in goes together with the unsubscribe page + opt-out record.

export type EmailBrand = 'btfh' | 'wfh' | 'joyful'

export type EmailContent = {
  preheader?: string   // the grey preview line inboxes show after the subject
  heading?: string
  body: string         // plain paragraphs separated by blank lines — exactly what Cap writes today
  quote?: string       // optional pull quote, shown between body and button
  image_url?: string   // optional full-width image above the heading (absolute URL)
  image_alt?: string
  cta_label?: string
  cta_url?: string
  ps?: string
  reason?: string      // footer line: why she's getting this ("You downloaded the cookbook.")
}

export type EmailOptions = {
  unsubscribeUrl?: string   // per-recipient link; the footer shows it only when provided
  postalAddress?: string    // defaults to EMAIL_POSTAL_ADDRESS
  photoUrl?: string         // signature photo override (absolute URL or data: URI)
  siteUrl?: string          // where /mandi-signature.jpg is served from
}

type BrandSkin = {
  name: string          // wordmark in the header — rename the brand here, nowhere else
  company: string       // legal sender line in the footer
  header: string        // header band color
  headerText: string
  accent: string        // button + links
  rule: string          // thin line under the header, quote bar
  ink: string           // body text
  page: string          // background behind the card
  role: string          // line under her name in the signature
  links: { label: string; url: string }[]
}

export const EMAIL_BRANDS: Record<EmailBrand, BrandSkin> = {
  btfh: {
    name: 'Be There For Her', company: 'Joyful Media',
    header: '#3B2A3A', headerText: '#FFFFFF', accent: '#C94E86', rule: '#E0A458', ink: '#3B2A3A', page: '#F7F1EC',
    role: 'Be There For Her',
    links: [
      { label: 'Website', url: 'https://www.bethereforher.com' },
      { label: 'The Reset', url: 'https://www.bethereforher.com/reset' },
      { label: 'Instagram', url: 'https://www.instagram.com/mandijoybeck' },
    ],
  },
  wfh: {
    name: 'AI Works For Her', company: 'Joyful Media',
    header: '#5A4FCF', headerText: '#FFFFFF', accent: '#5A4FCF', rule: '#CFCBF5', ink: '#26233F', page: '#F3F2FB',
    role: 'AI Mom Podcast · AI Works For Her',
    links: [
      { label: 'Website', url: 'https://www.aiworksforher.com' },
      { label: 'Listen', url: 'https://www.aiworksforher.com/listen' },
    ],
  },
  joyful: {
    name: 'Joyful Media', company: 'Joyful Media',
    header: '#E2508A', headerText: '#FFFFFF', accent: '#E2508A', rule: '#F6C6D9', ink: '#3C2A37', page: '#FCF3F6',
    role: 'Joyful Media',
    links: [
      { label: 'Website', url: 'https://www.aiworksforher.com/joyful-media' },
      { label: 'Podcast', url: 'https://www.aiworksforher.com/listen' },
    ],
  },
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const SERIF = "Georgia,'Times New Roman',serif"
const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

// Blank-line-separated text → email-safe paragraphs. Single newlines become <br>.
function paragraphs(text: string, ink: string): string {
  return text.trim().split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p style="margin:0 0 16px;font-family:${SERIF};font-size:16px;line-height:1.65;color:${ink}">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function renderBrandEmail(brand: EmailBrand, content: EmailContent, opts: EmailOptions = {}): string {
  const b = EMAIL_BRANDS[brand] ?? EMAIL_BRANDS.joyful
  const site = (opts.siteUrl || process.env.SITE_URL || 'https://www.aiworksforher.com').replace(/\/$/, '')
  const photo = opts.photoUrl || `${site}/mandi-signature.jpg`
  const address = (opts.postalAddress ?? process.env.EMAIL_POSTAL_ADDRESS ?? '').trim()
  const muted = '#8C7B80'

  const preheader = content.preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(content.preheader.trim())}</div>`
    : ''
  const image = content.image_url
    ? `<tr><td style="padding:0"><img src="${esc(content.image_url)}" alt="${esc(content.image_alt || '')}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>`
    : ''
  const heading = content.heading?.trim()
    ? `<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:normal;color:${b.ink}">${esc(content.heading.trim())}</h1>`
    : ''
  const quote = content.quote?.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr><td style="border-left:3px solid ${b.rule};padding:4px 0 4px 16px;font-family:${SERIF};font-size:17px;line-height:1.55;font-style:italic;color:${b.ink}">${esc(content.quote.trim())}</td></tr></table>`
    : ''
  const button = content.cta_label?.trim() && content.cta_url?.trim()
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px"><tr><td style="background:${b.accent};border-radius:999px"><a href="${esc(content.cta_url.trim())}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none">${esc(content.cta_label.trim())}</a></td></tr></table>`
    : ''
  const ps = content.ps?.trim()
    ? `<p style="margin:20px 0 0;font-family:${SERIF};font-size:15px;line-height:1.6;color:${b.ink}"><strong>P.S.</strong> ${esc(content.ps.trim())}</p>`
    : ''
  const links = b.links
    .map(l => `<a href="${esc(l.url)}" style="color:${b.accent};text-decoration:none">${esc(l.label)}</a>`)
    .join(' &nbsp;·&nbsp; ')
  const unsubscribe = opts.unsubscribeUrl
    ? ` &nbsp;·&nbsp; <a href="${esc(opts.unsubscribeUrl)}" style="color:${muted};text-decoration:underline">Unsubscribe</a>`
    : ''
  const footerLines = [
    content.reason?.trim() ? esc(content.reason.trim()) : '',
    `${esc(b.company)}${address ? ` &nbsp;·&nbsp; ${esc(address)}` : ''}${unsubscribe}`,
  ].filter(Boolean).join('<br>')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${b.page}">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.page}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:10px;overflow:hidden">
<tr><td align="center" style="background:${b.header};padding:22px 24px;border-bottom:3px solid ${b.rule};font-family:${SERIF};font-size:20px;letter-spacing:0.04em;color:${b.headerText}">${esc(b.name)}</td></tr>
${image}
<tr><td style="padding:32px 32px 8px">
${heading}
${paragraphs(content.body, b.ink)}
${quote}
${button}
${ps}
</td></tr>
<tr><td style="padding:16px 32px 28px">
<table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #EFE6E0;width:100%"><tr>
<td width="76" style="padding-top:18px;vertical-align:middle"><img src="${esc(photo)}" alt="Mandi Beck" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:50%;border:0"></td>
<td style="padding-top:18px;vertical-align:middle">
<p style="margin:0 0 2px;font-family:${SERIF};font-size:15px;font-style:italic;color:${b.ink}">With you,</p>
<p style="margin:0 0 2px;font-family:${SERIF};font-size:17px;color:${b.ink}">Mandi Beck</p>
<p style="margin:0 0 6px;font-family:${SANS};font-size:12px;color:${muted}">${esc(b.role)}</p>
<p style="margin:0;font-family:${SANS};font-size:12px">${links}</p>
</td></tr></table>
</td></tr>
<tr><td align="center" style="background:${b.page};padding:16px 24px;font-family:${SANS};font-size:11px;line-height:1.7;color:${muted}">${footerLines}</td></tr>
</table>
</td></tr></table>
</body></html>`
}
