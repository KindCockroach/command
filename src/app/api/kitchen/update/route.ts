import { NextRequest, NextResponse } from 'next/server'
import { getWaitlist, logActivity } from '@/lib/db'
import { isOwner } from '@/lib/ownerAuth'
import { resendSend } from '@/lib/resend'
import * as wfhServer from '@/lib/wfhServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// "Your cookbook just got better" — emails everyone who asked for the cookbook (on
// /in-the-kitchen or /cookbook) that a new version is at the same link. Mandi only.
// POST {dryRun?: true} → { recipients, sent? }
const COOKBOOK_URL = process.env.COOKBOOK_URL || 'https://www.bethereforher.com/bethereforher/magic-is-in-the-making.pdf'
type Send = (to: { name: string; email: string }, subject: string, html: string, source: string) => Promise<boolean>
const ghlSend: Send = ((wfhServer as Record<string, unknown>).sendSiteEmail ?? (wfhServer as Record<string, unknown>).ghlEmail) as Send
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function POST(req: NextRequest) {
  if (!isOwner(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const seen = new Set<string>()
  const recipients = [...getWaitlist('kitchen'), ...getWaitlist('cookbook-funnel'), ...getWaitlist('podcast-listeners')]
    .filter(e => (e.note || '').includes('cookbook'))
    .filter(e => !seen.has(e.email) && !!seen.add(e.email))
    .map(e => ({ name: e.name || '', email: e.email }))
  if (body.dryRun) return NextResponse.json({ recipients: recipients.map(r => r.name || r.email) })

  const subject = 'Your cookbook just got better 🍂'
  const results: { who: string; ok: boolean }[] = []
  for (const r of recipients) {
    const hi = r.name ? `Hi ${esc(r.name.split(' ')[0])},` : 'Hi love,'
    const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3C2A37;max-width:560px">
<p>${hi}</p>
<p>We updated <b>The Magic Is in the Making</b>: clearer leek instructions for the White Witch soup, plus a tip for using AI when you want more help with any recipe.</p>
<p>Same link, new pages:</p>
<p><a href="${COOKBOOK_URL}" style="display:inline-block;background:#D98C5F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Open your cookbook</a></p>
<p>With you,<br>Mandi</p>
<p style="font-size:13px;color:#8a7a84">Powered by Joyful Media</p></div>`
    let ok: boolean
    if (process.env.RESEND_API_KEY) ok = (await resendSend(r.email, subject, html)).ok
    else ok = await ghlSend({ name: r.name || r.email, email: r.email }, subject, html, 'Be There For Her · cookbook update')
    results.push({ who: r.name || r.email, ok })
  }
  logActivity({ type: 'note', title: `🍂 Cookbook update emailed to ${results.filter(x => x.ok).length}/${results.length}`, detail: results.map(x => `${x.who} ${x.ok ? '✓' : '✗'}`).join(' · '), icon: '🍂', source: 'bethereforher' })
  return NextResponse.json({ results })
}
