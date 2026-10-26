import { NextRequest, NextResponse } from 'next/server'
import { addWfhLead, logActivity } from '@/lib/db'
import { INTAKES, type Answers, type IntakeKind, type Question } from '@/lib/wfh'
import * as wfhServer from '@/lib/wfhServer'

export const dynamic = 'force-dynamic'

// WFH questionnaires that Mandi reads before a call — RETIRE (/retire) and speaking (/speak).
// POST {kind, name, email, phone, business, website, answers}
// → saves the lead, tags the contact in GHL, and emails Mandi every answer. No AI call.

type Send = (to: { name: string; email: string }, subject: string, html: string, source: string) => Promise<boolean>
// The site's email sender is being renamed ghlEmail → sendSiteEmail (Resend support);
// use whichever this build has so the two changes can land in either order.
const send: Send = ((wfhServer as Record<string, unknown>).sendSiteEmail ?? (wfhServer as Record<string, unknown>).ghlEmail) as Send

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const kind = b.kind as IntakeKind
  const cfg = INTAKES[kind]
  if (!cfg) return NextResponse.json({ error: 'unknown questionnaire' }, { status: 400 })
  const name = str(b.name, 120), email = str(b.email, 160).toLowerCase()
  if (!name || !validEmail(email)) return NextResponse.json({ error: 'Please add your name and a valid email.' }, { status: 400 })

  // Keep only known questions (+ their "Other" boxes); text answers can be long.
  const answers: Answers = {}
  const raw = (b.answers ?? {}) as Record<string, unknown>
  for (const q of cfg.questions as readonly Question[]) {
    const v = raw[q.id]
    if (q.text) { const t = str(v, 3000); if (t) answers[q.id] = t }
    else if (typeof v === 'string') answers[q.id] = v.slice(0, 40)
    else if (Array.isArray(v)) answers[q.id] = v.filter(x => typeof x === 'string').slice(0, 12).map(x => (x as string).slice(0, 40))
    if (q.other) { const o = str(raw[`${q.id}_other`], 200); if (o) answers[`${q.id}_other`] = o }
  }

  const business = str(b.business, 160), website = str(b.website, 300), phone = str(b.phone, 40)
  const lead = addWfhLead({ kind, name, email, business, website, answers, service: cfg.service })
  const qs = cfg.questions as readonly Question[]
  logActivity({ type: 'note', title: `${cfg.icon} ${cfg.title} — ${name}${business ? ` (${business})` : ''}`, detail: cfg.summary.map(id => labels(qs, id, answers).join(', ')).filter(Boolean).join(' · '), icon: cfg.icon, source: 'wfh' })

  void (async () => {
    await wfhServer.ghlContact({ name, email, phone, tag: cfg.tag, source: `WFH ${cfg.title}` })
    await send({ name: 'Mandi Beck', email: wfhServer.NOTIFY_EMAIL }, `New ${cfg.title}: ${name}${business ? ` (${business})` : ''}`, mandiHtml(cfg.title, qs, { name, email, phone, business, website }, answers), 'WFH notices')
  })()

  return NextResponse.json({ ok: true, lead_id: lead.id })
}

function labels(qs: readonly Question[], id: string, a: Answers): string[] {
  const q = qs.find(x => x.id === id)
  const v = a[id]
  const vals = Array.isArray(v) ? v : v ? [v] : []
  const out = q?.text ? vals : vals.map(x => q?.options.find(o => o.value === x)?.label ?? x)
  const other = a[`${id}_other`]
  return typeof other === 'string' ? [...out, `Other: ${other}`] : out
}

function mandiHtml(title: string, qs: readonly Question[], c: { name: string; email: string; phone: string; business: string; website: string }, a: Answers): string {
  const esc = wfhServer.esc
  const rows = qs
    .filter(q => !q.showIf || (typeof a[q.showIf.id] === 'string' && q.showIf.in.includes(a[q.showIf.id] as string)))
    .map(q => `<p style="margin:0 0 12px"><b>${esc(q.q)}</b><br>${labels(qs, q.id, a).map(esc).join('<br>') || '—'}</p>`).join('')
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#171C3A;max-width:620px">
<h2 style="font-family:Georgia,serif;margin:0 0 6px">New ${esc(title)}: ${esc(c.name)}</h2>
<p><b>Email:</b> ${esc(c.email)}<br><b>Phone:</b> ${esc(c.phone || '—')}<br><b>Business / organization:</b> ${esc(c.business || '—')}<br><b>Website:</b> ${esc(c.website || '—')}</p>
<hr style="border:0;border-top:1px solid #e7e0d3;margin:16px 0">${rows}
<p style="color:#6b6585">If they book a call, you'll get a separate booking email.</p></div>`
}
