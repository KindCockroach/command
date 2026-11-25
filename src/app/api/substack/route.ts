import { NextRequest, NextResponse, after } from 'next/server'
import { getSubstack, ensureSubstackAccount, loadHistory, setCadence, openSeries, approveSeries, editIssue, openOutline, approveIssue, markPublished, logResponse } from '@/lib/substack'
import { runHandoff } from '@/lib/agentRun'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Phase 6b · Loop 13: ONE Substack (WFH). No Substack API, no auto-publish.
// GET → the store. POST {action}:
//   ensure_account · load_history {text,label?} · cadence {cadence} · propose_series · approve_series
//   edit_issue {n,...} · outline {n} · approve_issue {n} · published {n,url} · response {n,kind:'reply'|'signup',text}
export async function GET() {
  return NextResponse.json(getSubstack())
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const n = Number(b.n)
  const run = (id: string) => after(async () => { await runHandoff(id) })
  let r: unknown
  switch (b.action) {
    case 'ensure_account': r = ensureSubstackAccount(); break
    case 'load_history': { const ids = loadHistory(String(b.text ?? ''), b.label ? String(b.label) : undefined); r = ids.length ? { note_ids: ids } : { error: 'Paste at least a few paragraphs of build history.' }; break }
    case 'cadence': r = setCadence(b.cadence ?? null); break
    case 'propose_series': { const h = openSeries(); if (!('error' in h)) run(h.id); r = 'error' in h ? h : { handoff: h }; break }
    case 'approve_series': r = approveSeries(); break
    case 'edit_issue': r = editIssue(n, b); break
    case 'outline': { const h = openOutline(n); if (!('error' in h)) run(h.id); r = 'error' in h ? h : { handoff: h }; break }
    case 'approve_issue': r = approveIssue(n); break
    case 'published': r = markPublished(n, String(b.url ?? '')); break
    case 'response': r = logResponse(n, b.kind === 'signup' ? 'signup' : 'reply', String(b.text ?? '')); break
    default: r = { error: 'Unknown action.' }
  }
  return r && typeof r === 'object' && 'error' in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r)
}
