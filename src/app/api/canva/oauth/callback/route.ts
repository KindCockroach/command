import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/canva'

export const dynamic = 'force-dynamic'

// Canva redirects here after Mandi authorizes. Exchange the code for tokens.
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const err = url.searchParams.get('error')
  if (err) return html(`Canva returned an error: ${err}. Close this and try Connect again.`)
  if (!code || !state) return html('Missing code/state from Canva. Close this and try Connect again.')

  const redirectUri = `${url.origin}/api/canva/oauth/callback`
  const r = await exchangeCode(code, state, redirectUri)
  if (!r.ok) return html(`Couldn't finish connecting Canva: ${r.error}`)
  return html('✅ Canva connected! You can close this tab and hit "Send to Canva template" on a post.')
}

function html(msg: string) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;background:#F5EFE6;color:#171C3A;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="max-width:420px;text-align:center;padding:24px"><h2 style="font-family:Georgia,serif">${msg}</h2></div></body>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}
