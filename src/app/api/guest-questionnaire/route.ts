import { NextRequest, NextResponse } from 'next/server'
import { questionnaireFor, saveQuestionnaire, QUESTIONS } from '@/lib/guestKit'

export const dynamic = 'force-dynamic'

// PUBLIC: the guest questionnaire behind a private link (/guest?t=TOKEN). The token is the
// only key; it reveals the guest's first name and their own answers, nothing else.
export function GET(req: NextRequest) {
  const t = new URL(req.url).searchParams.get('t') || ''
  const q = questionnaireFor(t)
  return q ? NextResponse.json({ ...q, questions: QUESTIONS }) : NextResponse.json({ error: 'This link isn’t valid.' }, { status: 404 })
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const ok = typeof b.t === 'string' && b.answers && typeof b.answers === 'object' && saveQuestionnaire(b.t, b.answers)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Couldn’t save. The link may be wrong.' }, { status: 400 })
}
