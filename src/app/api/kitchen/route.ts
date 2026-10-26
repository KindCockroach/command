import { NextRequest, NextResponse } from 'next/server'
import { addWaitlistEntry, logActivity } from '@/lib/db'
import { resendSend, resendAddContact } from '@/lib/resend'
import * as wfhServer from '@/lib/wfhServer'

export const dynamic = 'force-dynamic'

// LOVE YOURSELF IN THE KITCHEN (bethereforher.com/in-the-kitchen).
// POST {name?, email, cookbook, newsletter} → saved in RISE (waitlist, source "kitchen"),
// newsletter → Resend audience, cookbook → welcome email with the cookbook.
// Until Resend is configured (RESEND_API_KEY), GoHighLevel stands in: the contact is
// tagged btfh-cookbook / btfh-newsletter and the cookbook email goes out through GHL.
const COOKBOOK_URL = process.env.COOKBOOK_URL || 'https://www.bethereforher.com/bethereforher/magic-is-in-the-making.pdf'

type Send = (to: { name: string; email: string }, subject: string, html: string, source: string) => Promise<boolean>
// GHL sender is being renamed ghlEmail → sendSiteEmail by a parallel change; use whichever exists.
const ghlSend: Send = ((wfhServer as Record<string, unknown>).sendSiteEmail ?? (wfhServer as Record<string, unknown>).ghlEmail) as Send

const LISTS = {
  kitchen: { source: 'kitchen', label: 'In the Kitchen', icon: '🍳', newsletterTag: 'btfh-newsletter', audienceEnv: 'RESEND_AUDIENCE_ID', ghlSource: 'Be There For Her · In the Kitchen' },
  podcast: { source: 'podcast-listeners', label: 'Podcast listener', icon: '🎙', newsletterTag: 'wfh-newsletter', audienceEnv: 'RESEND_WFH_AUDIENCE_ID', ghlSource: 'AI Mom Podcast · listeners' },
} as const

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 160) : ''
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 80) : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Please add a valid email.' }, { status: 400 })
  const cookbook = b.cookbook === true, newsletter = b.newsletter === true
  // Two front doors: Be There For Her's /in-the-kitchen, and the unlisted podcast-listener
  // page (aiworksforher.com/listeners), whose newsletter is the AI Works For Her one.
  const L = b.list === 'podcast' ? LISTS.podcast : LISTS.kitchen

  addWaitlistEntry({ email, name, source: L.source, note: [cookbook && 'cookbook', newsletter && 'newsletter'].filter(Boolean).join(', ') || 'no boxes checked' })
  logActivity({ type: 'note', title: `${L.icon} ${L.label} signup — ${name || email}`, detail: `${cookbook ? 'cookbook ✓' : 'cookbook ✗'} · ${newsletter ? 'newsletter ✓' : 'newsletter ✗'}`, icon: L.icon, source: 'bethereforher' })

  void (async () => {
    const useResend = !!process.env.RESEND_API_KEY
    const fail = (what: string, err?: string) => logActivity({ type: 'note', title: `⚠ ${what} failed`, detail: `${email}${err ? `: ${err}` : ''}`, icon: '⚠️', source: 'bethereforher' })
    // GHL keeps the list either way (tags), so nobody is lost before Resend is live.
    if (newsletter) await wfhServer.ghlContact({ name: name || email, email, tag: L.newsletterTag, source: L.ghlSource })
    if (cookbook) await wfhServer.ghlContact({ name: name || email, email, tag: 'btfh-cookbook', source: L.ghlSource })
    if (newsletter && useResend && process.env[L.audienceEnv]) {
      const r = await resendAddContact(email, name, process.env[L.audienceEnv])
      if (!r.ok) fail('Newsletter add', r.error)
    }
    if (cookbook) {
      const subject = 'Your cookbook: The Magic Is in the Making 🍂'
      if (useResend) {
        const r = await resendSend(email, subject, cookbookHtml(name))
        if (!r.ok) fail('Cookbook email (Resend)', r.error)
      } else if (!(await ghlSend({ name: name || email, email }, subject, cookbookHtml(name), L.ghlSource))) {
        fail('Cookbook email (GHL)')
      }
    }
  })()

  return NextResponse.json({ ok: true })
}

function cookbookHtml(name: string): string {
  const url = COOKBOOK_URL
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi love,'
  const body = url
    ? `<p>Here’s your seasonal cookbook, <b>The Magic Is in the Making</b>: soups, potions, and little-witch treats, with notes in the margin to bring a little play, joy, and relief back to your kitchen.</p>
<p><a href="${url}" style="display:inline-block;background:#D98C5F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Open your cookbook</a></p>`
    : `<p>You’re on the list for our seasonal cookbooks, with notes in the margin to bring a little play, joy, and relief back to your kitchen. The first one is on its way to you soon.</p>`
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3C2A37;max-width:560px">
<p>${hi}</p>${body}
<p>Start anywhere. Light a candle, play a song, and let the kids make the mess. The magic is in the making.</p>
<p>Be there for her,<br>Mandi<br><a href="https://www.bethereforher.com" style="color:#D98C5F">bethereforher.com</a></p></div>`
}
