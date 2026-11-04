import { NextRequest, NextResponse } from 'next/server'
import { saveSurveyResponse, getSurveyResponses, logActivity } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Native survey responses (post-Reset feedback, etc.). Public POST from the survey
// page; responses save to db.surveys and show on the People timeline by email.
export async function POST(req: NextRequest) {
  let b: { survey?: string; email?: string; name?: string; answers?: Record<string, string> }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }) }

  const survey = (b.survey || '').trim() || 'reset'
  const answers = (b.answers && typeof b.answers === 'object') ? b.answers : {}
  if (!Object.keys(answers).length) return NextResponse.json({ error: 'No answers submitted.' }, { status: 400 })

  const saved = saveSurveyResponse({ survey, email: b.email, name: b.name, answers })
  logActivity({
    type: 'note',
    title: `📝 Survey response · ${survey}`,
    detail: `${b.name || b.email || 'someone'} answered the ${survey} survey`,
    icon: '📝',
    source: 'survey',
  })
  return NextResponse.json({ ok: true, id: saved?.id })
}

// GET /api/survey?survey=reset — list responses (for Mandi to read).
export async function GET(req: NextRequest) {
  const survey = new URL(req.url).searchParams.get('survey') || undefined
  return NextResponse.json({ responses: getSurveyResponses(survey) })
}
