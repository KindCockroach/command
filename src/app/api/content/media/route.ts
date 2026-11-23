import { NextRequest, NextResponse, after } from 'next/server'
import { openHandoff, listHandoffs } from '@/lib/handoffs'
import { runHandoff } from '@/lib/agentRun'
import { readDb, writeDb } from '@/lib/db'
import { cardMediaView, startUpload, progressUpload, failUpload, discardUpload, attachMedia, removeMedia, setPlatformPost } from '@/lib/cardMedia'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// One content card's media, upload state, Cap note and per-platform posts.
// GET ?id=  → the view.   POST { action, id, … } → one step:
//   start · progress · fail · discard   (the upload state, so a stopped upload shows "incomplete")
//   attach { url, calendar_item_id?, note? }   (only after storage confirms the file; signals Cap)
//   remove_media { url } · platform { platform, patch:{ caption?, status?, scheduled_at?, posted_url? } }
// Never creates a card: every action needs the id of one that exists.
export async function GET(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const v = cardMediaView(id)
  return v ? NextResponse.json(v) : NextResponse.json({ error: 'That card isn’t in RISE.' }, { status: 404 })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const id = Number(b.id)
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const nf = () => NextResponse.json({ error: 'That card isn’t in RISE.' }, { status: 404 })
  switch (b.action) {
    case 'start': {
      if (!b.filename || !Number(b.size)) return NextResponse.json({ error: 'filename and size required' }, { status: 400 })
      const u = startUpload(id, { filename: String(b.filename), size: Number(b.size), content_type: String(b.content_type || ''), last_modified: b.last_modified ? Number(b.last_modified) : null })
      return u ? NextResponse.json({ upload: u }) : nf()
    }
    case 'progress': {
      const u = progressUpload(id, { key: b.key, upload_id: b.upload_id, parts_done: b.parts_done, parts_total: b.parts_total })
      return u ? NextResponse.json({ upload: u }) : NextResponse.json({ error: 'No upload in progress on this card.' }, { status: 409 })
    }
    case 'fail': {
      const u = failUpload(id, String(b.error || ''), b.key && b.upload_id ? { key: b.key, uploadId: b.upload_id } : null)
      return u ? NextResponse.json({ upload: u }) : NextResponse.json({ error: 'No upload in progress on this card.' }, { status: 409 })
    }
    case 'discard': return (await discardUpload(id)) ? NextResponse.json({ ok: true, view: cardMediaView(id) }) : nf()
    case 'attach': {
      if (!b.url) return NextResponse.json({ error: 'url required' }, { status: 400 })
      const r = await attachMedia(id, String(b.url), { calendar_item_id: b.calendar_item_id ?? null, note: b.note ? String(b.note).slice(0, 1000) : undefined })
      if ('error' in r) return NextResponse.json(r, { status: 422 })
      // Phase 4: Cap picks the footage up right away (after the reply, so the upload isn't kept waiting).
      const hid = r.handoff.id
      after(async () => { await runHandoff(hid) })
      return NextResponse.json(r)
    }
    case 'cap_note': {
      // What changed from the plan (typed or spoken). Cap briefs the writers with it; her own captions stay.
      const note = String(b.note ?? '').trim().slice(0, 2000)
      if (!note) return NextResponse.json({ error: 'Say what changed first.' }, { status: 400 })
      const v = cardMediaView(id); if (!v) return nf()
      const db = readDb()
      for (const x of db.handoffs ?? []) if (x.content_id === id && x.kind === 'footage_in' && x.status !== 'done') { x.status = 'done'; x.done_by = 'cap'; x.receipt = 'Replaced by your newer note.'; x.updated_at = new Date().toISOString() }
      writeDb(db)
      const h = openHandoff({ kind: 'footage_in', from: 'mandi', to: 'cap', what: `Your note on “${v.title.slice(0, 60)}”: ${note.slice(0, 80)}`, content_id: id, account_id: v.account_id, note })
      await runHandoff(h.id)
      return NextResponse.json({ handoff: listHandoffs({ content_id: id })[0] ?? null, view: cardMediaView(id) })
    }
    case 'review': case 'ed_check': {
      // Mandi asks Cap to review the writers' drafts again (ed_check = the old name of this button).
      const v = cardMediaView(id); if (!v) return nf()
      const h = openHandoff({ kind: 'review', from: 'mandi', to: 'cap', what: `Review the captions on “${v.title.slice(0, 60)}”`, content_id: id, account_id: v.account_id })
      await runHandoff(h.id)
      return NextResponse.json({ handoffs: listHandoffs({ content_id: id }), view: cardMediaView(id) })
    }
    case 'remove_media': {
      const v = removeMedia(id, String(b.url || ''))
      return v ? NextResponse.json({ ok: true, view: v }) : nf()
    }
    case 'platform': {
      const r = setPlatformPost(id, String(b.platform || ''), b.patch ?? {})
      return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
    }
    case 'handoffs': return NextResponse.json({ handoffs: listHandoffs({ content_id: id }) })
    default: return NextResponse.json({ error: `unknown action "${b.action}"` }, { status: 400 })
  }
}
