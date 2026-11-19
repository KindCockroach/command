import { NextRequest, NextResponse } from 'next/server'
import { cardMediaView, startUpload, progressUpload, failUpload, discardUpload, attachMedia, removeMedia, setPlatformPost } from '@/lib/cardMedia'

export const dynamic = 'force-dynamic'

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
      return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r)
    }
    case 'remove_media': {
      const v = removeMedia(id, String(b.url || ''))
      return v ? NextResponse.json({ ok: true, view: v }) : nf()
    }
    case 'platform': {
      const r = setPlatformPost(id, String(b.platform || ''), b.patch ?? {})
      return 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
    }
    default: return NextResponse.json({ error: `unknown action "${b.action}"` }, { status: 400 })
  }
}
