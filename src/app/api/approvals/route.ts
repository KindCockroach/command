import { NextResponse } from 'next/server'
import { getApprovals, SOURCE_LABEL } from '@/lib/approvals'

export const dynamic = 'force-dynamic'

// Everything waiting on Mandi's yes, in one list. Read-only; each item's actions call its own route.
export async function GET() {
  return NextResponse.json({ ...getApprovals(), labels: SOURCE_LABEL })
}
