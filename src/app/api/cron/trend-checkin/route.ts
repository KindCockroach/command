import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandAccounts, createNote, logActivity } from '@/lib/db'
import { researchWithWeb } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// WEEKLY TREND CHECK-IN — once a week RISE scans the live web for what's trending
// in Mandi's niches (topics, formats, hashtags, hooks that are working right now),
// writes a compact digest to Notes, and logs a 'trend_checkin' event so the
// Commander (and the Activity feed) see it. Read-only + propose: it never posts.
// Tagged 'trends-source' so the daily drafter doesn't treat it as an idea to draft.
//
// Trigger:  /api/cron/trend-checkin?key=YOUR_CRON_SECRET
// (instrumentation.ts fires it weekly; CRON_SECRET optional, same as the daily job.)
export async function POST(req: NextRequest) { return run(req) }
export async function GET(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const key = new URL(req.url).searchParams.get('key')
    if (key !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // No researcher available — record the miss quietly so the feed is honest.
    logActivity({ type: 'trend_checkin', title: 'Weekly trend check-in skipped', detail: 'ANTHROPIC_API_KEY not set', icon: '📡', source: 'cron' })
    return NextResponse.json({ ran: false, reason: 'ANTHROPIC_API_KEY not set' })
  }

  const accounts = getAllBrandAccounts().filter(a => a.status === 'active' || a.status === 'restricted' || a.status === 'planned')
  const niches = accounts.map(a => `${a.handle}: ${a.topic}`).join('\n') || 'AI for moms, women\'s success, motivation, meditation'

  const instructions = `You are RISE's trend desk. It's a weekly check-in. Search the LIVE web for what is trending RIGHT NOW (this week) that Mandi's accounts could ride — real, current signals only, not evergreen advice. For each niche below, find the strongest 1-2 of: a trending TOPIC/conversation, a FORMAT that's working (a reel/text style), a HOOK pattern, or a HASHTAG/sound gaining traction. Prefer things with a real source or a datable "this week" quality; mark anything shaky "VERIFY:".

MOST IMPORTANT — CAPTURE THE FORMAT SKELETON. The words/format ARE the show for Mandi: she mirrors a proven on-screen-text STRUCTURE and fills it with her own story. So for the strongest trending formats, write the reusable SKELETON as a fill-in-the-blank template with [SLOTS] — e.g. "For the woman who [pain], [pain], while [cost]. You've [behavior]. Now it's time to [turn]." Capture the exact rhythm and number of lines so RISE can mirror it line-for-line with her content. These skeletons are the point.`
  const input = `HER ACCOUNTS & NICHES:\n${niches}\n\nReturn a compact digest with TWO sections:\n\n1) "🔥 TRENDING THIS WEEK" — 5-8 short bullets grouped by niche: "[TOPIC/HOOK/HASHTAG] — what it is — why it fits [account] — the angle." Include real hashtags/buzzwords.\n\n2) "🧬 FORMATS TO MIRROR" — 3-5 reusable on-screen-text SKELETONS (fill-in-the-blank with [SLOTS]) that are winning right now, each with: the skeleton, one line on the rhythm/beats, and which account(s) it fits. These are templates RISE will fill with her stories.\n\nEnd with one line: "THIS WEEK'S BEST BET: <the single strongest move>".`

  try {
    const digest = await researchWithWeb({ instructions, input, maxTokens: 2500, maxSearches: 4 })
    const clean = (digest || '').trim()
    if (!clean) throw new Error('empty digest')

    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const bestBet = (clean.match(/THIS WEEK'S BEST BET:\s*(.+)$/im)?.[1] || '').trim()

    createNote({
      title: `📡 Weekly Trends — ${dateLabel}`,
      body: clean,
      category: 'idea',
      source: 'rise',
      // 'trends-source' keeps the daily drafter from treating this digest as an idea
      // to draft; it's a reference the Commander and Trends tab read.
      tags: ['trends', 'trends-source', 'weekly'],
    })

    logActivity({
      type: 'trend_checkin',
      title: `Weekly trend check-in — ${dateLabel}`,
      detail: bestBet ? `Best bet: ${bestBet.slice(0, 120)}` : 'Saved to Notes',
      icon: '📡', source: 'cron',
    })

    return NextResponse.json({ ran: true, bestBet, savedToNotes: true })
  } catch (e) {
    logActivity({ type: 'trend_checkin', title: 'Weekly trend check-in failed', detail: e instanceof Error ? e.message.slice(0, 120) : 'unknown', icon: '📡', source: 'cron' })
    return NextResponse.json({ ran: false, error: e instanceof Error ? e.message : 'failed' }, { status: 502 })
  }
}
