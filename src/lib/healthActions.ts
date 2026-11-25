// The buttons a health-check finding gets, wherever it shows (Activity → System health, and the
// Approve window). A finding that says "say yes" or "press Retry" must have that button here.
// Client-safe (no server imports). After an action works, the caller resolves the finding
// (POST /api/health {action:'resolve', key}) so it drops off until the next check finds it again.

export type HealthAction = { label: string; url: string; method?: 'POST' | 'PATCH'; body: Record<string, unknown>; ask?: string; askField?: string; primary?: boolean }

export function healthActions(key: string): HealthAction[] {
  const [area, kind, ...rest] = key.split(':')
  const id = rest.join(':')
  if (area === 'dir' && kind === 'goal' && id) return [
    { label: 'Yes, retire it', url: '/api/goals', method: 'PATCH', body: { id: Number(id), active: false }, primary: true },
    { label: 'New date…', url: '/api/goals', method: 'PATCH', body: { id: Number(id) }, ask: 'New deadline (YYYY-MM-DD)', askField: 'deadline' },
  ]
  if (area === 'cards' && kind === 'gaps') return [
    { label: 'Fix them', url: '/api/cards', method: 'POST', body: { action: 'fix' }, primary: true },
  ]
  if (area === 'stuck' && (kind === 'failed' || kind === 'open') && id) return [
    { label: 'Retry', url: '/api/handoffs', method: 'POST', body: { action: 'retry', id }, primary: true },
  ]
  return []
}
