// THE EMAIL LAYER — the one place all of RISE's email goes out through. Talks to
// Resend's REST API directly (no SDK dependency). The API key lives ONLY in
// process.env.RESEND_API_KEY (set in Railway) — never in the code. This is the
// foundation the newsletter + drip sequences + confirmations are built on.

const RESEND_URL = 'https://api.resend.com/emails'

// Default sender. Override per-send or via RESEND_FROM in Railway. The domain
// (aimomeducation.com) must be verified in Resend or sends are rejected.
export const DEFAULT_FROM = process.env.RESEND_FROM || 'Mandi Beck <hi@aimomeducation.com>'

export type SendResult = { ok: true; id: string } | { ok: false; error: string }

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY is not set — add it in Railway → Variables.' }

  const to = Array.isArray(opts.to) ? opts.to : [opts.to]
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: opts.from || DEFAULT_FROM,
        to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Resend returns { name, message, statusCode } on error — the message usually
      // names the real problem (unverified domain, invalid key, etc.).
      const msg = (data as { message?: string }).message || `Resend error ${res.status}`
      return { ok: false, error: msg }
    }
    return { ok: true, id: (data as { id?: string }).id || '' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' }
  }
}

// Minimal on-brand wrapper so plain-text sends still look intentional.
export function basicEmailHtml(body: string): string {
  const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2E241D;max-width:560px;margin:0 auto;padding:8px">${safe}</div>`
}
