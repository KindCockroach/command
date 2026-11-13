import { NextRequest, NextResponse } from 'next/server'
import { setUnsubscribed, logActivity } from '@/lib/db'
import { verifyUnsubscribe } from '@/lib/unsubscribe'

export const dynamic = 'force-dynamic'

// PUBLIC — the opt-out endpoint. Two callers:
//   • the /unsubscribe page's confirm button (a form post) → records it, sends her back to the page
//   • a mail app's own Unsubscribe button (one-click POST, body "List-Unsubscribe=One-Click")
// Only a POST changes anything. A GET never unsubscribes — mail scanners pre-open links,
// and that must not opt people out by accident.
export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const e = url.searchParams.get('e')
  const t = url.searchParams.get('t')
  const email = verifyUnsubscribe(e, t)
  if (!email) return NextResponse.json({ error: 'This unsubscribe link is not valid.' }, { status: 400 })

  let action = 'unsubscribe'
  let fromPage = false
  try {
    const form = await req.formData()
    if (form.get('action') === 'resubscribe') action = 'resubscribe'
    fromPage = form.get('from') === 'page'
  } catch { /* no form body — treat as a plain one-click unsubscribe */ }

  const state = setUnsubscribed(email, action !== 'resubscribe')
  logActivity({
    type: 'note',
    title: state.unsubscribed ? `Unsubscribed from email: ${email}` : `Resubscribed to email: ${email}`,
    icon: state.unsubscribed ? '🚪' : '💌',
    source: 'campaigns',
  })

  if (fromPage) {
    const q = `e=${encodeURIComponent(e!)}&t=${encodeURIComponent(t!)}&done=${state.unsubscribed ? '1' : 're'}`
    return new NextResponse(null, { status: 303, headers: { Location: `/unsubscribe?${q}` } })
  }
  return NextResponse.json({ ok: true, email: state.email, unsubscribed: state.unsubscribed })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  return new NextResponse(null, { status: 303, headers: { Location: `/unsubscribe${url.search}` } })
}
