import { NextRequest, NextResponse } from 'next/server'
import { isOwner } from '@/lib/ownerAuth'
import { createNote, getAllNotes, createContent, getAllContent } from '@/lib/db'

export const dynamic = 'force-dynamic'

// One-time seed: spin up the Medium article draft note. Owner-only (station cookie),
// idempotent — if a note tagged 'medium-draft' already exists it returns that one
// instead of making a duplicate. Open in the browser:
//   /api/admin/seed-note?confirm=medium-draft

const DRAFT_TAG = 'medium-draft'
const SCAFFOLD = `Working titles (pick one, kill the rest):
-
-
-

Who this is for (one woman — picture Bridget):
-

The one idea (say it in a single sentence):
-

Hook (first two lines — open a curiosity gap, don't bury it):
-

The body (beats):
1.
2.
3.

The turn (the part most people miss):
-

Close + one CTA (podcast · the Reset · the newsletter):
-

Sources / links:
-
`

function run(req: NextRequest) {
  if (!isOwner(req)) {
    return NextResponse.json({ error: 'Owner only — open this while signed in to RISE.' }, { status: 401 })
  }
  if (new URL(req.url).searchParams.get('confirm') !== 'medium-draft') {
    return NextResponse.json({ ready: true, note: 'Adds a Medium article draft note. To run it, add ?confirm=medium-draft to the URL.' })
  }
  const existing = getAllNotes().find(n => (n.tags ?? []).includes(DRAFT_TAG))
  const note = existing ?? createNote({
    title: '📝 Medium draft — (working title)',
    body: SCAFFOLD,
    category: 'idea',
    source: 'mine',
    tags: ['medium', 'draft', 'longform', DRAFT_TAG],
  })
  // Also create a Medium content card linked to the note, so the Medium channel has
  // a card whose "Open draft note" link jumps straight to the full draft.
  const haveCard = getAllContent().some(c => c.note_id === note.id)
  if (!haveCard) {
    createContent({
      title: 'Medium article — (working title)',
      description: 'Long-form Medium piece. Full draft lives in the linked note.',
      status: 'in_progress',
      type: 'post',
      account_id: 'medium',
      note_id: note.id,
      tags: ['medium', 'article', 'longform'],
    })
  }
  return NextResponse.json({ ok: true, note_id: note.id, title: note.title, card_linked: !haveCard })
}

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }
