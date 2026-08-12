import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent } from '@/lib/db'
import { getAccessToken, canvaConfigured, canvaConnected } from '@/lib/canva'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CANVA_API = 'https://api.canva.com/rest/v1'

// CANVA AUTOFILL — push a post's slide text into Mandi's Canva Brand Template so
// the designs come back done for approval. Needs a Canva Connect token +
// the brand template id.
//   CANVA_ACCESS_TOKEN     — Connect API access token (from the OAuth flow)
//   CANVA_BRAND_TEMPLATE_ID — the template id (e.g. EAHSHJj9TdQ)
// POST { contentId }              → starts an autofill job, returns { jobId }
// POST { contentId, jobId }       → polls the job, returns status + design url when ready
export async function POST(req: NextRequest) {
  const templateId = process.env.CANVA_BRAND_TEMPLATE_ID
  if (!canvaConfigured() || !templateId) {
    return NextResponse.json({ error: 'Canva not set up.', setup: 'Set CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, and CANVA_BRAND_TEMPLATE_ID in Railway.' }, { status: 503 })
  }
  if (!canvaConnected()) {
    return NextResponse.json({ error: 'Canva not authorized yet.', setup: 'Open /api/canva/oauth/start once to connect your Canva account.' }, { status: 503 })
  }
  const token = await getAccessToken()
  if (!token) return NextResponse.json({ error: 'Canva token expired — reconnect at /api/canva/oauth/start.', setup: '/api/canva/oauth/start' }, { status: 503 })
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const { contentId, jobId } = await req.json().catch(() => ({}))

  // Poll an existing job
  if (jobId) {
    const res = await fetch(`${CANVA_API}/autofills/${jobId}`, { headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ error: `Canva: ${data?.message ?? res.status}` }, { status: 502 })
    const status = data?.job?.status
    const designUrl = data?.job?.result?.design?.url ?? data?.job?.result?.design?.urls?.edit_url
    if (status === 'success' && designUrl && contentId) {
      updateContent(Number(contentId), { canva_design_url: designUrl })
    }
    return NextResponse.json({ status, designUrl, raw: data })
  }

  // Start a new autofill
  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  // Read the template's data fields, then fill text fields in slide order.
  const dsRes = await fetch(`${CANVA_API}/brand-templates/${templateId}/dataset`, { headers })
  const ds = await dsRes.json().catch(() => ({}))
  if (!dsRes.ok) return NextResponse.json({ error: `Couldn't read the Canva template dataset: ${ds?.message ?? dsRes.status}. Check the template id + token scopes.` }, { status: 502 })
  const fields: Record<string, { type?: string }> = ds?.dataset ?? {}

  // Slide lines come from onscreen_text ("Slide 1: ...\nSlide 2: ..."), else split the caption.
  const slideLines = (piece.onscreen_text ?? '')
    .split(/\n?\s*Slide\s*\d+\s*[:.\-]?\s*/i).map(s => s.trim()).filter(Boolean)
  const textFields = Object.entries(fields).filter(([, v]) => (v.type ?? 'text') === 'text').map(([k]) => k)

  const data: Record<string, { type: 'text'; text: string }> = {}
  textFields.forEach((f, i) => { if (slideLines[i]) data[f] = { type: 'text', text: slideLines[i] } })
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: `No text to fill. Template text fields: [${textFields.join(', ') || 'none'}]; slide lines found: ${slideLines.length}. Put your slide lines in the on-screen text field as "Slide 1: ...".`, fields }, { status: 400 })
  }

  const res = await fetch(`${CANVA_API}/autofills`, {
    method: 'POST', headers,
    body: JSON.stringify({ brand_template_id: templateId, data }),
  })
  const created = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ error: `Canva autofill failed: ${created?.message ?? res.status}`, raw: created }, { status: 502 })
  return NextResponse.json({ jobId: created?.job?.id, status: created?.job?.status ?? 'in_progress', filled: Object.keys(data).length })
}
