export const dynamic = 'force-dynamic'

import { getAllContent } from '@/lib/db'
import { effectiveStatus } from '@/lib/contentStatus'
import Dashboard from '@/components/Dashboard'

// Mandi's private Command Center (moved off "/" once that became the public
// homepage). Access is gated globally by middleware.ts (STATION_KEY).
export default function Station() {
  const content = getAllContent()
  const active = content.filter(c => !['published', 'archived'].includes(c.status))

  // Counts follow effectiveStatus: a "ready" post with no media still needs
  // image gen + Canva/CapCut, so it counts under Being Built (see lib/contentStatus).
  const stats = {
    ideas: active.filter(c => effectiveStatus(c) === 'idea').length,
    inProgress: active.filter(c => effectiveStatus(c) === 'in_progress').length,
    ready: active.filter(c => effectiveStatus(c) === 'ready').length,
    totalActive: active.length,
  }

  return <Dashboard initialContent={active} stats={stats} />
}
