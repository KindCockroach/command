import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Is RISE ready to send email? Reports configuration only — never exposes the key.
export async function GET() {
  const resend_configured = !!process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || '"Mandi \\"AI Mom\\" Beck" <hi@aimomeducation.com>'
  const audience_configured = !!process.env.RESEND_AUDIENCE_ID
  return NextResponse.json({
    ready: resend_configured,
    resend_configured,
    audience_configured,
    from,
    note: resend_configured
      ? 'Resend key is set. Sends will go through once the from-domain is verified in Resend.'
      : 'RESEND_API_KEY is not set in this environment — Cap can draft but cannot send yet.',
  })
}
