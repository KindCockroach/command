import { NextRequest, NextResponse } from 'next/server'
import { getAllNotes, updateNote } from '@/lib/db'
import type { Note } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// DAILY AUTO-DRAFT — reads Mandi's RECENT own notes/ideas and runs each through the
// River (the sorting-hat: picks the best account, obeys the craft laws, writes a
// ready-for-approval post). Nothing publishes — everything lands as a card to
// approve in Accounts. Each note it drafts gets tagged 'auto-drafted' so it's never
// drafted twice.
//
// Trigger it daily by hitting:  /api/cron/draft-from-notes?key=YOUR_CRON_SECRET
// (set CRON_SECRET in Railway; if it's unset the endpoint still runs, unprotected.)

// Draft from BOTH Mandi's own notes AND RISE-generated IDEAS (research briefs, media
// stories, trend finds). Only skip things that aren't postable ideas: raw episode
// transcripts, finished episode kits, and already-finished drafts awaiting approval.
const SKIP_TAGS = ['transcript', 'episode-kit', 'deliverables', 'needs-approval', 'medium', 'newsletter', 'substack', 'auto-drafted']
const WINDOW_DAYS = 3   // "recent" = notes created in the last N days
const MAX_PER_RUN = 6   // cap posts per run (cost + volume guard)

// Is this a note worth drafting a post from? Includes her ideas, Commander-saved
// notes, AND RISE's own idea fodder (🔬 research, 📎 media stories, 📡 trends).
// Excludes only non-ideas: raw transcripts (📄), episode kits (🎙), finished deliverables.
function isDraftableIdea(n: Note): boolean {
  if (n.archived) return false
  const tags = n.tags ?? []
  if (SKIP_TAGS.some(t => tags.includes(t))) return false
  if (/transcript|deliverables|ep kit|episode kit/i.test(n.title || '')) return false
  if (/^\s*[📄🎙]/u.test(n.title || '')) return false   // skip raw transcript / episode kit only
  return (n.body || '').trim().length >= 40  // enough substance to build a post from
}

async function run(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('key')
  const secret = process.env.CRON_SECRET
  if (secret && key !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Call the River on the internal loopback, NOT the public URL — Railway's edge
  // refuses a container looping back through its own public hostname ("fetch failed").
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`
  // Optional ?limit=N override (for a small/cheap test run); capped at MAX_PER_RUN.
  const limitParam = Number(new URL(req.url).searchParams.get('limit'))
  const cap = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_PER_RUN) : MAX_PER_RUN
  const cutoff = Date.now() - WINDOW_DAYS * 86400000
  const candidates = getAllNotes()
    .filter(isDraftableIdea)
    .filter(n => new Date(n.created_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, cap)

  const drafted: Array<{ note: string; account?: string; postId?: number; status?: string }> = []
  const skipped: Array<{ note: string; why: string }> = []

  // Sequentially — one River call at a time (no stampede, gentle on cost/rate).
  for (const n of candidates) {
    try {
      const res = await fetch(`${base}/api/river`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `${n.title}\n\n${n.body}`, source: 'daily-notes' }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.kind === 'content' && d.piece) {
        drafted.push({ note: n.title, account: d.account?.handle ?? d.piece.account_id, postId: d.piece.id, status: d.piece.status })
        // Mark it so tomorrow's run never re-drafts the same note.
        updateNote(n.id, { tags: [...(n.tags ?? []), 'auto-drafted'] })
      } else if (res.ok && d.kind && d.kind !== 'content') {
        // River decided it was a task/event/note, not a post — tag it done anyway.
        skipped.push({ note: n.title, why: `River filed it as a ${d.kind}, not a post` })
        updateNote(n.id, { tags: [...(n.tags ?? []), 'auto-drafted'] })
      } else {
        skipped.push({ note: n.title, why: d.error || 'River returned nothing' })
      }
    } catch (e) {
      skipped.push({ note: n.title, why: e instanceof Error ? e.message : 'compose failed' })
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    considered: candidates.length,
    drafted_count: drafted.length,
    drafted,
    skipped,
    note: drafted.length ? 'Drafts are in Accounts, ready to approve.' : 'No new notes to draft today.',
  })
}

// GET (for simple cron pings) and POST both work.
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
