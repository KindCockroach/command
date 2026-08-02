import { NextRequest, NextResponse } from 'next/server'

// Gate for the private Command Center. Everything is private EXCEPT the public
// funnel (homepage, sales pages, welcome pages, the Caption Keeper waitlist) and
// the one API the waitlist form posts to.
//
// Fail-open by design: if STATION_KEY is unset, nothing is locked — so you can
// never lock yourself out, and local dev stays open. Set STATION_KEY in Railway
// to turn the lock on. Enter once at /station?k=YOURKEY and a cookie keeps you in.
const KEY = process.env.STATION_KEY || ''
const COOKIE = 'station_auth'

function isPublic(path: string): boolean {
  if (path === '/') return true
  if (path === '/seen' || path === '/queen' || path === '/captionwriter') return true
  if (path === '/journal') return true
  if (path === '/reset' || path === '/cheatcode' || path === '/workshop') return true // public session pages (+ /workshop redirect)
  if (path === '/insait') return true // private $10 Reset (unlisted, no-index)
  if (path === '/lite' || path === '/lite/welcome') return true
  if (/^\/(seen|queen|captionwriter)\/welcome$/.test(path)) return true
  if (path === '/api/journal-waitlist') return true // public waitlist form
  return false
}

export function middleware(req: NextRequest) {
  // Lock is off until you set a key.
  if (!KEY) return NextResponse.next()

  const { pathname, searchParams } = req.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  // Already unlocked via cookie?
  if (req.cookies.get(COOKIE)?.value === KEY) return NextResponse.next()

  // Unlocking now via ?k=KEY — set the cookie and let them in.
  if (searchParams.get('k') === KEY) {
    const res = NextResponse.next()
    res.cookies.set(COOKIE, KEY, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return res
  }

  // Blocked.
  if (pathname.startsWith('/api/')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Private</title><body style="font-family:system-ui;background:#171C3A;color:#F5EFE6;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><p style="font-size:44px;margin:0">🔒</p><p style="opacity:.85">This is a private area. Add <b>?k=YOUR-KEY</b> to the URL to enter.</p></div></body>`,
    { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } }
  )
}

// Run on everything except Next internals and static asset files.
export const config = {
  matcher: [
    '/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|map)).*)',
  ],
}
