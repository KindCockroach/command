import { NextRequest, NextResponse } from 'next/server'
import { authUrl, canvaConfigured } from '@/lib/canva'

export const dynamic = 'force-dynamic'

// Kick off the Canva Connect OAuth — redirects Mandi to Canva to authorize.
export async function GET(req: NextRequest) {
  if (!canvaConfigured()) {
    return NextResponse.json({ error: 'Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET in Railway first.' }, { status: 503 })
  }
  const redirectUri = `${new URL(req.url).origin}/api/canva/oauth/callback`
  return NextResponse.redirect(authUrl(redirectUri))
}
