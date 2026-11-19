import { NextRequest, NextResponse } from 'next/server'
import { getGuestKits, getGuestKit, setStep, updateKit, sendGuestEmail, upsertInvitee, ensureToken, inviteTemplate, questionnaireTemplate, followupTemplate, tickQuestionnaires, getGuestKitConfig, setGuestKitConfig, type SendKind } from '@/lib/guestKit'
import { publicOrigin } from '@/lib/publicOrigin'

export const dynamic = 'force-dynamic'

// The guest kit (station-only; middleware gates it). GET lists guests (optionally those whose
// recording/collab falls in from..to) and runs the automatic questionnaire if it's switched on.
// POST actions: step · update · template · send · invite · config
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams
  const origin = publicOrigin(req)
  const auto = await tickQuestionnaires(origin).catch(e => ({ sent: [], failed: [String(e)], skipped: false }))
  const id = q.get('id')
  if (id) return NextResponse.json({ guest: getGuestKit(id, origin), config: getGuestKitConfig(), auto })
  const from = q.get('from') || undefined, to = q.get('to') || undefined
  return NextResponse.json({ guests: getGuestKits(origin, from, to), config: getGuestKitConfig(), auto })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const origin = publicOrigin(req)
  const id = String(b.id || '')
  switch (b.action) {
    case 'step': return setStep(id, String(b.step), !!b.done) ? NextResponse.json({ guest: getGuestKit(id, origin) }) : NextResponse.json({ error: 'Guest not found.' }, { status: 404 })
    case 'update': return updateKit(id, b.patch || {}) ? NextResponse.json({ guest: getGuestKit(id, origin) }) : NextResponse.json({ error: 'Guest not found.' }, { status: 404 })
    case 'template': {
      // The editable draft for an email; never sends.
      const g = id ? getGuestKit(id, origin) : null
      const name = g?.name || String(b.name || '')
      if (b.kind === 'questionnaire') { if (!g) return NextResponse.json({ error: 'Guest not found.' }, { status: 404 }); const t = ensureToken(id); return NextResponse.json(questionnaireTemplate(name, `${origin}/guest?t=${t}`)) }
      if (b.kind === 'followup') return g ? NextResponse.json(followupTemplate(name, g.followup)) : NextResponse.json({ error: 'Guest not found.' }, { status: 404 })
      return NextResponse.json(inviteTemplate(b.invite_kind === 'collab' ? 'collab' : 'podcast', name, String(b.idea || g?.collab_idea || '')))
    }
    case 'send': {
      const kinds: SendKind[] = ['invite', 'questionnaire', 'followup', 'other']
      const kind = kinds.includes(b.kind) ? b.kind as SendKind : 'other'
      if (!b.subject || !b.body) return NextResponse.json({ error: 'Subject and message are both needed.' }, { status: 400 })
      const r = await sendGuestEmail(id, kind, String(b.subject), String(b.body), origin)
      return r.ok ? NextResponse.json({ ok: true, guest: getGuestKit(id, origin) }) : NextResponse.json({ error: r.error, guest: getGuestKit(id, origin) }, { status: 502 })
    }
    case 'invite': {
      // Creates (or reuses, by email) the guest card. Sends only if send === true.
      if (!b.name || !String(b.name).trim()) return NextResponse.json({ error: 'A name is needed.' }, { status: 400 })
      const g = upsertInvitee({ name: String(b.name), email: b.email ? String(b.email) : undefined, kind: b.invite_kind === 'collab' ? 'collab' : 'podcast', instagram: b.instagram ? String(b.instagram) : undefined, idea: b.idea ? String(b.idea) : undefined, collab_date: b.collab_date ? String(b.collab_date) : undefined })
      if (b.send !== true) return NextResponse.json({ ok: true, sent: false, guest: getGuestKit(g.id, origin) })
      const r = await sendGuestEmail(g.id, 'invite', String(b.subject || ''), String(b.body || ''), origin)
      return NextResponse.json({ ok: r.ok, sent: r.ok, error: r.error, guest: getGuestKit(g.id, origin) }, { status: r.ok ? 200 : 502 })
    }
    case 'config': return NextResponse.json({ config: setGuestKitConfig(b.patch || {}) })
    default: return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }
}
