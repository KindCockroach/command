import { NextRequest, NextResponse } from 'next/server'
import { getWaitlist, logActivity } from '@/lib/db'
import { isOwner } from '@/lib/ownerAuth'
import * as wfhServer from '@/lib/wfhServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// "November magic: coffee-braised short ribs" — the monthly recipe email to everyone
// who has the cookbook (same audience as /api/kitchen/update), plus Emily. One link:
// Save my seat → The Reset. Sent via sendSiteEmail, which upserts each contact into
// GHL first (so everyone in RISE lands in GHL) and sends through Resend. Mandi only.
//
// POST { mode: 'dry' | 'test' | 'send' }
//   dry  → list recipients, no send
//   test → send only to the test address (TEST_TO)
//   send → send to the full cookbook list + Emily (deduped)
const TEST_TO = { name: 'Mandi', email: 'mandijoy.beck@gmail.com' }
const EMILY = { name: 'Emily', email: 'eabeckteam@gmail.com' }
const SOURCE = 'Be There For Her · November recipe'

type Send = (to: { name: string; email: string }, subject: string, html: string, source: string) => Promise<boolean>
// sendSiteEmail upserts the contact into GHL, then sends (Resend when configured).
const siteSend: Send = (wfhServer as Record<string, unknown>).sendSiteEmail as Send

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function cookbookList(): { name: string; email: string }[] {
  const seen = new Set<string>()
  return [...getWaitlist('kitchen'), ...getWaitlist('cookbook-funnel'), ...getWaitlist('podcast-listeners')]
    .filter(e => (e.note || '').includes('cookbook'))
    .map(e => ({ name: e.name || '', email: (e.email || '').trim().toLowerCase() }))
    .filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
    .filter(r => (seen.has(r.email) ? false : (seen.add(r.email), true)))
}

const SUBJECT = 'November magic: coffee-braised short ribs 🍂'

function recipeHtml(name: string): string {
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi love,'
  const li = (items: string[]) => items.map(i => `<li style="margin:2px 0">${i}</li>`).join('')
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3C2A37;max-width:560px">
<p>${hi}</p>
<p>It&rsquo;s November! The air is crisp, the candles are lit, and we&rsquo;re stepping into the season of gathering: Thanksgiving, holiday tables, and kitchens full of the people we love.</p>
<p>To welcome it in, here&rsquo;s a fresh recipe for you: Coffee-Braised Short Ribs. Rich and cozy, it&rsquo;s the kind of dish that fills the whole house with something warm while it simmers.</p>

<p style="margin:26px 0 2px;font-weight:bold;letter-spacing:.5px">🍂 BRAISE HER UP</p>
<p style="margin:0 0 18px;font-size:20px"><b>Coffee-Braised Short Ribs</b></p>

<p style="margin:18px 0 4px;font-weight:bold;letter-spacing:.5px">COLLECT</p>
<p style="margin:0 0 14px">Beef short ribs &bull; Strong brewed coffee or espresso &bull; Beef stock &bull; Apple juice &bull; Apple cider vinegar &bull; Brown sugar &bull; Honey &bull; Salt &bull; Black pepper</p>

<p style="margin:18px 0 4px;font-weight:bold;letter-spacing:.5px">MEASURE</p>
<ul style="margin:0 0 14px;padding-left:20px">${li([
  '3&ndash;4 lb beef short ribs',
  '&frac12; cup strong brewed coffee or espresso',
  '&frac12; cup beef stock',
  '&frac12; cup apple juice',
  '1 tbl apple cider vinegar',
  '1 tbl brown sugar',
  '1 tbl honey',
  'Salt + black pepper',
])}</ul>

<p style="margin:18px 0 4px;font-weight:bold;letter-spacing:.5px">THE MAKING</p>
<ol style="margin:0 0 14px;padding-left:20px">${li([
  'Heat the oven to 325&deg;F.',
  'Season the short ribs well with salt and black pepper and place them in a Dutch oven or deep covered baking dish.',
  'Whisk together the coffee, beef stock, apple juice, apple cider vinegar, brown sugar and honey. Pour the mixture around the ribs. You want enough liquid to come partway up the meat without completely covering it.',
  'Cover tightly and let her go low and slow for 4 hours, until the meat is deeply tender and beginning to pull away from the bone.',
  'Uncover. Either broil for a few minutes, watching closely, or raise the oven to 425&deg;F and cook uncovered for about 10 minutes until the edges darken and the braising liquid starts to get sticky.',
  'Let the ribs rest for a few minutes before serving. Spoon the dark, sweet braising liquid over the top.',
])}</ol>

<p style="margin:18px 0 4px;font-weight:bold;letter-spacing:.5px">MAKE IT MAGIC</p>
<p style="margin:0 0 20px">This is a gratitude meal. Make it for a woman who has been carrying too much, or make it for yourself without waiting for somebody else to notice. Put the good plate down. Pour the drink. Sit before the food gets cold. Braise her up.</p>

<hr style="border:none;border-top:1px solid #ecdccb;margin:26px 0">

<p>One more thing before the holidays sweep us up&hellip;</p>
<p>This Sunday, Nov 8 at 8 PM CT, I&rsquo;m hosting the very first Reset: one hour set aside just for you, live with me on Google Meet. Before the holiday rush begins, come press the reset button with me.</p>
<p>It&rsquo;s inaugural pricing for this Sunday only: <b>$33</b>.</p>
<p style="margin:22px 0"><a href="https://www.bethereforher.com/reset" style="display:inline-block;background:#D98C5F;color:#fff;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:bold">Save my seat &rarr;</a></p>

<p>With you,<br>Mandi</p>
<p style="font-size:13px;color:#8a7a84">Powered by Joyful Media</p></div>`
}

export async function POST(req: NextRequest) {
  if (!isOwner(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const mode = body.mode === 'test' ? 'test' : body.mode === 'send' ? 'send' : 'dry'

  // Full list = cookbook subscribers + Emily, deduped.
  const seen = new Set<string>()
  const full = [...cookbookList(), EMILY]
    .filter(r => (seen.has(r.email) ? false : (seen.add(r.email), true)))

  if (mode === 'dry') {
    return NextResponse.json({
      mode,
      count: full.length,
      recipients: full.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
      emilyIncluded: full.some(r => r.email === EMILY.email),
    })
  }

  if (typeof siteSend !== 'function') {
    return NextResponse.json({ error: 'sendSiteEmail unavailable' }, { status: 500 })
  }

  const recipients = mode === 'test' ? [TEST_TO] : full
  const results: { who: string; ok: boolean }[] = []
  for (const r of recipients) {
    const ok = await siteSend({ name: r.name || r.email, email: r.email }, SUBJECT, recipeHtml(r.name), SOURCE)
    results.push({ who: r.name || r.email, ok })
  }

  logActivity({
    type: 'note',
    title: mode === 'test'
      ? `🍂 Short-ribs TEST sent to ${TEST_TO.email}`
      : `🍂 November recipe emailed to ${results.filter(x => x.ok).length}/${results.length}`,
    detail: results.map(x => `${x.who} ${x.ok ? '✓' : '✗'}`).join(' · '),
    icon: '🍂',
    source: 'bethereforher',
  })

  return NextResponse.json({ mode, sent: results.filter(x => x.ok).length, failed: results.filter(x => !x.ok).length, results })
}
