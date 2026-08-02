export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Welcome from '@/components/funnel/Welcome'
import { AUDIENCES } from '@/lib/funnels'

export const metadata: Metadata = {
  title: 'Welcome, Queen',
  description: 'Your Caption Writer delivery: the GPT, the workspace, and your 10-minute first win.',
  robots: { index: false },
}

export default function QueenWelcome({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  return <Welcome audience={AUDIENCES.queen} searchParams={searchParams} />
}
