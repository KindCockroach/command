import { NextResponse } from 'next/server'
import { readDb, setBriefLine } from '@/lib/db'
import { getCalendar, getPlanConfig } from '@/lib/plan'
import { needsFilming } from '@/lib/shootList'

export const dynamic = 'force-dynamic'

// Her's Brief · "One line to film today" (Phase 8 A3). Reads Cap's calendar the way Content Day
// does: the top unfilmed, scripted card (earliest calendar date first), with an Open link. No AI
// call: the line is the card's own hook. If nothing needs filming, it says why. The last pick is
// still cached in brief_line so the Brief can show it if the data can't be read.
const todayCT = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)

export async function GET() {
  try {
    const db = readDb()
    const today = todayCT()
    const dates = new Map<number, string>()
    for (const i of getCalendar(today, addDays(today, 30))) {
      const id = (i as { content_id?: number }).content_id
      const date = (i as { date?: string }).date
      if (id && date && (!dates.has(id) || date < dates.get(id)!)) dates.set(id, date)
    }
    const shoot = db.content.filter(needsFilming)
    const onCalendar = shoot.filter(c => dates.has(c.id)).sort((a, b) => dates.get(a.id)!.localeCompare(dates.get(b.id)!) || a.id - b.id)
    const top = onCalendar[0]
    const thisWeek = onCalendar.filter(c => dates.get(c.id)! <= addDays(today, 6)).length
    const cap = getPlanConfig().day_capacity

    if (!top) {
      const why = shoot.length
        ? `${shoot.length} scripted card${shoot.length > 1 ? 's are' : ' is'} waiting to be filmed, but none is on Cap’s calendar yet. Cap places them; open Content Day to film one anyway.`
        : 'Nothing scripted is waiting to be filmed. Cap and Ed haven’t sent a new script yet; nothing for you to do here today.'
      return NextResponse.json({ line: null, why, card: null, left_this_week: 0 })
    }
    const acct = (db.brand_accounts ?? []).find(a => a.id === top.account_id)
    const firstScriptLine = (top.script ?? '').split('\n').map(l => l.replace(/^\s*(\[[^\]]*\]|[A-Z][\w ]{0,20}:)\s*/, '').trim()).find(Boolean) ?? ''
    const line = (top.onscreen_text ?? '').split('\n')[0].replace(/^slide \d+:\s*/i, '').trim() || firstScriptLine || top.title
    setBriefLine({ product_id: `card:${top.id}`, line })
    return NextResponse.json({
      line,
      card: { id: top.id, title: top.title, handle: acct?.handle ?? null, date: dates.get(top.id), open_url: '/station?view=contentday' },
      left_this_week: thisWeek,
      sized: thisWeek > cap * 7 ? `That’s more than a week’s capacity (${cap} a day). Cap will trim if you can’t fit it.` : null,
    })
  } catch (e) {
    const cached = readDb().brief_line
    return NextResponse.json({ line: cached?.line ?? null, why: `Couldn’t read the calendar (${e instanceof Error ? e.message : 'error'}).`, card: null, left_this_week: 0 })
  }
}
