import { proofread } from '@/lib/proofread'
import { NextRequest, NextResponse, after } from 'next/server'
import { listHandoffs } from '@/lib/handoffs'
import { runHandoff } from '@/lib/agentRun'
import { listResetEvents } from '@/lib/luma'
import {
  getSequence, updateSettings, editEmail, approveEmail, briefEmails, recheckEmails, dryRun, welcomeDryRun,
  runSequence, testSend, previewEmail, capCheck, CAP_PLAN, nextResetDate, type Segment,
} from '@/lib/resetSequence'
import type { BranchId, SeqEmailKey } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Phase 5: the welcome emails + Cap's six-touch post-Reset sequence (owner-only via middleware).
// GET                         → settings, the 8 drafts with Cap's checks, the Resets, the handoffs
// GET ?dry=<event_id>         → who would get each touch and who is skipped (with the reason)
// GET ?welcome=joyful_media|wfh → who is on that list and would be welcomed
// GET ?preview=<key>&segment= → one email rendered as that segment sees it (HTML)
// POST {action}:
//   brief {keys?}             → Cap briefs Ed (email_write handoffs); runs Ed → Cap in the background
//   recheck                   → Cap rechecks confirmed drafts; any that fail go back to Ed
//   edit {key, ...fields}     → Mandi's own edit (her words; Cap shows his check, no send-back)
//   approve {key, on}         → Mandi approves (or un-approves) a confirmed draft
//   settings {...}            → coupon code, links, the gift, live switches
//   run {event_id, confirm:"SEND"} → REAL sends. Refuses unless live + confirmed + Resend + due + approved.
//   test {key, segment, confirm:"TEST"} → one test send to Mandi's own address only.
const KEYS = CAP_PLAN.map(p => p.key)
const SEGMENTS: Segment[] = ['returning', 'pass_eligible', 'pass_holder', 'list']

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const dry = sp.get('dry')
  if (dry) {
    const r = dryRun(dry, { today: sp.get('today') || undefined })
    return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
  }
  const w = sp.get('welcome')
  if (w === 'joyful_media' || w === 'wfh') return NextResponse.json(welcomeDryRun(w as BranchId))
  const pk = sp.get('preview') as SeqEmailKey | null
  if (pk) {
    const seg = (SEGMENTS.includes(sp.get('segment') as Segment) ? sp.get('segment') : 'returning') as Segment
    const r = previewEmail(pk, seg)
    if (!r) return NextResponse.json({ error: 'No such email.' }, { status: 404 })
    return sp.get('format') === 'json' ? NextResponse.json(r) : new NextResponse(r.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
  const seq = getSequence()
  const handoffs = listHandoffs({ limit: 200 }).filter(h => h.ref?.type === 'email')
  return NextResponse.json({
    settings: seq.settings,
    next_reset_date: nextResetDate(),
    emails: seq.emails.map(e => ({ ...e, check: e.body ? capCheck(e) : null })),
    events: listResetEvents(),
    sends: seq.sends.slice(-200),
    handoffs: handoffs.slice(0, 40),
  })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const key = b.key as SeqEmailKey
  switch (b.action) {
    case 'brief': {
      const keys = Array.isArray(b.keys) ? (b.keys as SeqEmailKey[]).filter(k => KEYS.includes(k)) : undefined
      const r = briefEmails(keys)
      if (r.opened.length) after(async () => { for (const id of r.opened) await runHandoff(id) })
      return NextResponse.json(r)
    }
    case 'recheck': {
      const r = recheckEmails()
      if (r.opened.length) after(async () => { for (const id of r.opened) await runHandoff(id) })
      return NextResponse.json(r)
    }
    case 'edit': {
      if (!KEYS.includes(key)) return NextResponse.json({ error: 'No such email.' }, { status: 400 })
      // Cap's last sweep: spelling + punctuation only, her words kept (lib/proofread.ts)
      const text: Record<string, string> = {}
      for (const k of ['subject', 'preheader', 'body', 'cta_label', 'ps']) if (typeof b[k] === 'string') text[k] = b[k] as string
      const swept = await proofread(text)
      const e = editEmail(key, { ...(b as object), ...swept.fields } as never)
      return e ? NextResponse.json({ email: e, fixes: swept.fixes }) : NextResponse.json({ error: 'No such email.' }, { status: 404 })
    }
    case 'approve': {
      if (!KEYS.includes(key)) return NextResponse.json({ error: 'No such email.' }, { status: 400 })
      const r = approveEmail(key, b.on !== false)
      return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json({ email: r })
    }
    case 'settings':
      return NextResponse.json({ settings: updateSettings((b.settings ?? {}) as never) })
    case 'run': {
      const r = await runSequence(String(b.event_id ?? ''), { confirm: typeof b.confirm === 'string' ? b.confirm : undefined })
      return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
    }
    case 'test': {
      if (!KEYS.includes(key)) return NextResponse.json({ error: 'No such email.' }, { status: 400 })
      const seg = (SEGMENTS.includes(b.segment as Segment) ? b.segment : 'returning') as Segment
      return NextResponse.json(await testSend(key, seg, typeof b.confirm === 'string' ? b.confirm : undefined))
    }
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
