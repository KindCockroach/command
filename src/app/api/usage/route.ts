import { NextResponse } from 'next/server'
import { getUsageSummary } from '@/lib/usage'

export const dynamic = 'force-dynamic'

// Admin-only usage/cost dashboard data. Internal route — gated by middleware
// (STATION_KEY) like the rest of the Command Center. Also reports which API keys
// are configured (presence only, never the values).
export async function GET() {
  const summary = getUsageSummary()
  const keys = {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
    META_PIXEL: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
    DB_PATH: !!process.env.DB_PATH,
  }
  return NextResponse.json({ summary, keys })
}
