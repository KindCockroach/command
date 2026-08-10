import { NextResponse } from 'next/server'
import { setBucketCors, isR2Configured } from '@/lib/r2'

export const dynamic = 'force-dynamic'

// One-time: enable CORS on the R2 bucket so the browser can upload big files
// (podcast episodes) directly to storage, bypassing the server's body limit.
export async function POST() {
  if (!isR2Configured()) return NextResponse.json({ error: 'R2 not configured' }, { status: 503 })
  try {
    await setBucketCors()
    return NextResponse.json({ ok: true, message: 'R2 CORS enabled for direct browser uploads.' })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 502 })
  }
}
