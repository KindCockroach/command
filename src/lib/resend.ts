// Minimal Resend client (REST): send one email, add a contact to an audience.
// Env: RESEND_API_KEY (required), EMAIL_FROM (verified sender), RESEND_AUDIENCE_ID (newsletter list).
// Every call is best effort and returns false when Resend isn't configured.
const API = 'https://api.resend.com'
const FROM = () => process.env.EMAIL_FROM || '"Mandi \\"AI Mom\\" Beck" <hi@aimomeducation.com>'

async function call(path: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' }
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    })
    return res.ok ? { ok: true } : { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 200)}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

export function resendSend(to: string, subject: string, html: string, replyTo = 'hi@aimomeducation.com') {
  return call('/emails', { from: FROM(), to: [to], subject, html, reply_to: replyTo })
}

export function resendAddContact(email: string, firstName?: string) {
  const audience = process.env.RESEND_AUDIENCE_ID
  if (!audience) return Promise.resolve({ ok: false, error: 'RESEND_AUDIENCE_ID not set' })
  return call(`/audiences/${audience}/contacts`, { email, first_name: firstName || undefined, unsubscribed: false })
}
