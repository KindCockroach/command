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
  kitchen: { key: 'kitchen', source: 'kitchen', label: 'In the Kitchen', icon: '🍳', newsletterTag: 'btfh-newsletter', audienceEnv: 'RESEND_AUDIENCE_ID', ghlSource: 'Be There For Her · In the Kitchen' },
  podcast: { key: 'podcast', source: 'podcast-listeners', label: 'Podcast listener', icon: '🎙', newsletterTag: 'wfh-newsletter', audienceEnv: 'RESEND_WFH_AUDIENCE_ID', ghlSource: 'AI Mom Podcast · listeners' },
  // bethereforher.com/cookbook — the cookbook funnel that leads into The Reset invitation.
  funnel: { key: 'kitchen', source: 'cookbook-funnel', label: 'Cookbook funnel', icon: '🍂', newsletterTag: 'btfh-newsletter', audienceEnv: 'RESEND_AUDIENCE_ID', ghlSource: 'Be There For Her · cookbook funnel' },
  // The /welcome page's "updates from Mandi and Joyful Media" signup (newsletter only).
  joyful: { key: 'joyful', source: 'joyful-media', label: 'Joyful Media updates', icon: '🎈', newsletterTag: 'joyful-newsletter', audienceEnv: 'RESEND_JOYFUL_AUDIENCE_ID', ghlSource: 'Joyful Media · welcome page' },
} as const

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 160) : ''
  const lastName = typeof b.lastName === 'string' ? b.lastName.trim().slice(0, 80) : ''
  const name = [typeof b.name === 'string' ? b.name.trim().slice(0, 80) : '', lastName].filter(Boolean).join(' ')
  const location = typeof b.location === 'string' ? b.location.trim().slice(0, 120) : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Please add a valid email.' }, { status: 400 })
  const cookbook = b.cookbook === true, newsletter = b.newsletter === true
  // Two front doors: Be There For Her's /in-the-kitchen, and the unlisted podcast-listener
  // page (aiworksforher.com/listeners), whose newsletter is the AI Works For Her one.
  const L = b.list === 'podcast' ? LISTS.podcast : b.list === 'joyful' ? LISTS.joyful : b.list === 'funnel' ? LISTS.funnel : LISTS.kitchen

  addWaitlistEntry({ email, name, source: L.source, note: [cookbook && 'cookbook', newsletter && 'newsletter', location && `from ${location}`].filter(Boolean).join(', ') || 'no boxes checked' })
  logActivity({ type: 'note', title: `${L.icon} ${L.label} signup — ${name || email}`, detail: `${cookbook ? 'cookbook ✓' : 'cookbook ✗'} · ${newsletter ? 'newsletter ✓' : 'newsletter ✗'}${location ? ` · ${location}` : ''}`, icon: L.icon, source: 'bethereforher' })

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
    // One email per signup: the cookbook (which also confirms the subscription when both
    // boxes are checked), or a subscription welcome when it's newsletter-only.
    const send = async (subject: string, html: string, what: string) => {
      if (useResend) {
        const r = await resendSend(email, subject, html)
        if (!r.ok) fail(`${what} (Resend)`, r.error)
      } else if (!(await ghlSend({ name: name || email, email }, subject, html, L.ghlSource))) {
        fail(`${what} (GHL)`)
      }
    }
    if (cookbook) await send('Your cookbook: The Magic Is in the Making 🍂', cookbookHtml(name, newsletter ? L.key : null, L.source === 'cookbook-funnel'), 'Cookbook email')
    else if (newsletter) await send(WELCOME[L.key].subject, welcomeHtml(name, L.key), 'Welcome email')
  })()

  return NextResponse.json({ ok: true })
}

function cookbookHtml(name: string, subscribedTo: ListKey | null = null, resetInvite = false): string {
  const url = COOKBOOK_URL
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi love,'
  const body = url
    ? `<p>Here’s your seasonal cookbook, <b>The Magic Is in the Making</b>: soups, potions, and little-witch treats, with notes in the margin to bring a little play, joy, and relief back to your kitchen.</p>
<p><a href="${url}" style="display:inline-block;background:#D98C5F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Open your cookbook</a></p>`
    : `<p>You’re on the list for our seasonal cookbooks, with notes in the margin to bring a little play, joy, and relief back to your kitchen. The first one is on its way to you soon.</p>`
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3C2A37;max-width:560px">
<p>${hi}</p>${body}
<p>Start anywhere. Light a candle, play a song, and let the kids make the mess. The magic is in the making.</p>
${resetInvite ? `<p>P.S. Every Sunday at 8 PM CT I host <a href="https://www.bethereforher.com/reset" style="color:#D98C5F;font-weight:bold">The Reset</a>: 60 minutes of guided time to yourself, live on Google Meet. You’re invited.</p>` : ''}
${subscribedTo ? `<p>You’re also subscribed to ${WELCOME[subscribedTo].listName}, so you’ll hear from us when there’s something new.</p>` : ''}
<p>Be there for her,<br>Mandi<br><a href="https://www.bethereforher.com" style="color:#D98C5F">bethereforher.com</a></p></div>`
}

// Newsletter-only welcome emails, one per list.
type ListKey = 'kitchen' | 'podcast' | 'joyful'
const A = (href: string, label: string) => `<a href="${href}" style="color:#D98C5F;font-weight:bold">${label}</a>`
const WELCOME: Record<ListKey, { subject: string; listName: string; body: string }> = {
  kitchen: {
    subject: 'You’re subscribed to Be There For Her 🌙',
    listName: 'Be There For Her',
    body: `<p>You’re on the list. You’ll hear from us when a new series is released.</p>
<p>Until then, two ways to come back to yourself this week:<br>
• ${A('https://www.bethereforher.com/intuition', 'Listen To Your Intuition')}: guided meditations recorded by Mandi in her studio<br>
• ${A('https://www.bethereforher.com/reset', 'The Reset')}: a live hour to yourself, every Sunday at 8 PM CT</p>`,
  },
  podcast: {
    subject: 'You’re on the AI Works For Her list 🎙',
    listName: 'the AI Works For Her newsletter',
    body: `<p>Thanks for listening, and for signing up. You’ll get new AI Mom episodes, AI tools worth your time, and updates from Mandi.</p>
<p>${A('https://www.aiworksforher.com/listen', 'Catch up on the AI Mom Podcast')} · ${A('https://www.aiworksforher.com', 'aiworksforher.com')}</p>`,
  },
  joyful: {
    subject: 'Welcome to Joyful Media 🎈',
    listName: 'Joyful Media updates',
    body: `<p>You’re subscribed. You’ll get updates from Mandi and Joyful Media on all things, including the AI Mom Podcast and her Seasonal Creations.</p>
<p>Two worlds built to support one another:<br>
• ${A('https://www.bethereforher.com', 'Be There For Her')}: mindful products that bring women back to themselves<br>
• ${A('https://www.aiworksforher.com', 'AI Works For Her')}: the AI Mom Podcast and AI that works for you</p>`,
  },
}

function welcomeHtml(name: string, key: ListKey): string {
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi love,'
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3C2A37;max-width:560px">
<p>${hi}</p>${WELCOME[key].body}
<p>With you,<br>Mandi</p>
<p style="font-size:13px;color:#8a7a84">Powered by Joyful Media</p></div>`
}
