import { NextRequest, NextResponse } from 'next/server'
import { addWaitlistEntry, logActivity } from '@/lib/db'
import { resendSend, resendAddContact } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// LOVE YOURSELF IN THE KITCHEN (bethereforher.com/in-the-kitchen).
// POST {name?, email, cookbook, newsletter} → saved in RISE (waitlist, source "kitchen"),
// newsletter → Resend audience, cookbook → welcome email with the cookbook (COOKBOOK_URL)
// or a "your first one is on its way" note until the cookbook exists.
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 160) : ''
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 80) : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Please add a valid email.' }, { status: 400 })
  const cookbook = b.cookbook === true, newsletter = b.newsletter === true

  addWaitlistEntry({ email, name, source: 'kitchen', note: [cookbook && 'cookbook', newsletter && 'newsletter'].filter(Boolean).join(', ') || 'no boxes checked' })
  logActivity({ type: 'note', title: `🍳 In the Kitchen signup — ${name || email}`, detail: `${cookbook ? 'cookbook ✓' : 'cookbook ✗'} · ${newsletter ? 'newsletter ✓' : 'newsletter ✗'}`, icon: '🍳', source: 'bethereforher' })

  void (async () => {
    if (newsletter) {
      const r = await resendAddContact(email, name)
      if (!r.ok) logActivity({ type: 'note', title: '⚠ Newsletter add failed', detail: `${email}: ${r.error}`, icon: '⚠️', source: 'bethereforher' })
    }
    if (cookbook) {
      const r = await resendSend(email, 'Love yourself in the kitchen 🍋', cookbookHtml(name))
      if (!r.ok) logActivity({ type: 'note', title: '⚠ Cookbook email failed', detail: `${email}: ${r.error}`, icon: '⚠️', source: 'bethereforher' })
    }
  })()

  return NextResponse.json({ ok: true })
}

function cookbookHtml(name: string): string {
  const url = process.env.COOKBOOK_URL
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi love,'
  const body = url
    ? `<p>Here’s your seasonal cookbook, with notes in the margin to bring a little play, joy, and relief back to your kitchen.</p>
<p><a href="${url}" style="display:inline-block;background:#D98C5F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Open your cookbook</a></p>`
    : `<p>You’re on the list for our seasonal cookbooks, with notes in the margin to bring a little play, joy, and relief back to your kitchen. The first one is on its way to you soon.</p>`
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3C2A37;max-width:560px">
<p>${hi}</p>${body}
<p>Until then, here’s your first note in the margin: today, cook one thing just because you love it.</p>
<p>Be there for her,<br>Mandi<br><a href="https://www.bethereforher.com" style="color:#D98C5F">bethereforher.com</a></p></div>`
}
