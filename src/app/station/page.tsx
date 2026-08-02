export const dynamic = 'force-dynamic'

import { getAllContent } from '@/lib/db'
import Dashboard from '@/components/Dashboard'

// Mandi's private Command Center (moved off "/" once that became the public
// homepage). Access is gated globally by middleware.ts (STATION_KEY).
export default function Station() {
  const content = getAllContent()
  const active = content.filter(c => !['published', 'archived'].includes(c.status))

  const stats = {
    ideas: active.filter(c => c.status === 'idea').length,
    inProgress: active.filter(c => c.status === 'in_progress').length,
    ready: active.filter(c => c.status === 'ready').length,
    totalActive: active.length,
  }

  return <Dashboard initialContent={active} stats={stats} />
}
