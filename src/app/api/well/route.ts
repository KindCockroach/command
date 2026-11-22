import { NextRequest, NextResponse } from 'next/server'
import { saveWell, wellStatus, wellLinesFor } from '@/lib/well'

export const dynamic = 'force-dynamic'

// The Well: her caption archive. GET → { loaded, lines } (?q= to preview what Cap would pull).
// POST [{ date, cap }, …] or { captions: [...] } → replaces it (the archive's 00_captions_master.json works as is).
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')
  return NextResponse.json({ ...wellStatus(), ...(q ? { sample: wellLinesFor(q, 5) } : {}) })
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null)
  const arr = Array.isArray(b) ? b : Array.isArray(b?.captions) ? b.captions : null
  if (!arr) return NextResponse.json({ error: 'Send the captions as a list of { date, cap }.' }, { status: 400 })
  return NextResponse.json({ saved: saveWell(arr) })
}
