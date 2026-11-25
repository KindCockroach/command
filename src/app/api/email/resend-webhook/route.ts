import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { readDb, writeDb, logActivity } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Phase 6 (carry-over from Phase 5): Resend tells us when an email bounced or was marked spam.
// The contact is marked bounced (every later send skips her) and it goes on her history.
// PUBLIC route (middleware lets exactly this path through), so the Svix signature Resend
// signs with is REQUIRED: no RESEND_WEBHOOK_SECRET, or a bad / old signature → 401, nothing written.
const TOLERANCE_S = 5 * 60

function verify(body: string, id: string, ts: string, sigHeader: string, secret: string): boolean {
  if (!id || !ts || !sigHeader) return false
  const t = Number(ts)
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest()
  // The header can carry several signatures: "v1,<b64> v1,<b64>".
  return sigHeader.split(' ').some(part => {
    const [ver, sig] = part.split(',')
    if (ver !== 'v1' || !sig) return false
    const got = Buffer.from(sig, 'base64')
    return got.length === expected.length && crypto.timingSafeEqual(got, expected)
  })
}

type ResendEvent = { type?: string; created_at?: string; data?: { email_id?: string; to?: string[] | string; subject?: string; bounce?: { message?: string; type?: string } } }

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const body = await req.text()
  if (!secret || !verify(body, req.headers.get('svix-id') ?? '', req.headers.get('svix-timestamp') ?? '', req.headers.get('svix-signature') ?? '', secret))
    return NextResponse.json({ error: 'bad signature' }, { status: 401 })

  let ev: ResendEvent
  try { ev = JSON.parse(body) } catch { return NextResponse.json({ error: 'bad body' }, { status: 400 }) }
  const kind = ev.type === 'email.bounced' ? 'bounced' : ev.type === 'email.complained' ? 'complained' : null
  if (!kind) return NextResponse.json({ ok: true, ignored: ev.type ?? 'unknown' })

  const to = (Array.isArray(ev.data?.to) ? ev.data!.to : [ev.data?.to]).filter(Boolean).map(e => String(e).trim().toLowerCase())
  const db = readDb()
  db.contacts ??= []
  const now = new Date().toISOString()
  const marked: string[] = []
  for (const email of to) {
    let c = db.contacts.find(x => (x.email ?? '').toLowerCase() === email)
    if (!c) { c = { id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, email, name: '', labels: [], created_at: now, updated_at: now }; db.contacts.push(c) }
    c.history ??= []
    const why = kind === 'bounced' ? `bounced${ev.data?.bounce?.type ? ` (${ev.data.bounce.type})` : ''}${ev.data?.bounce?.message ? `: ${ev.data.bounce.message}` : ''}` : 'was marked as spam by her'
    const line = `Resend: “${ev.data?.subject ?? 'an email'}” ${why}. Marked bounced; later sends skip her.`
    if (!c.history.some(h => h.text === line)) c.history.push({ at: now, kind: 'note', status: 'failed', text: line.slice(0, 400) })
    c.bounced = true
    c.updated_at = now
    marked.push(email)
  }
  if (kind === 'complained') {
    // A spam complaint is also an opt-out.
    db.unsubscribes ??= []
    for (const e of marked) if (!db.unsubscribes.some(u => u.email === e)) db.unsubscribes.push({ email: e, at: now })
  }
  writeDb(db)
  if (marked.length) logActivity({ type: 'email_bounce', icon: '↩️', source: 'resend', title: `${marked.length} contact${marked.length > 1 ? 's' : ''} ${kind === 'bounced' ? 'bounced' : 'complained'}: marked bounced`, detail: marked.join(', ').slice(0, 300) })
  return NextResponse.json({ ok: true, marked })
}
