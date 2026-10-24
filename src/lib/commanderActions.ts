// SHARED COMMANDER ACTION RUNNER — the single place the Commander's hands actually
// fire. Both chat surfaces (the full Commander on the Home screen AND the "Ask RISE
// about its feed" chat in the Activity station) run their actions through here, so
// they can never drift apart again. The bug this fixes: the Activity chat parsed the
// model's reply but ignored `actions` entirely — no buttons, nothing executed.
//
// executeCommanderAction does the network call and returns a human status string
// (the "toast"). shred is the one action it can't finish on its own — it needs the
// component to open the cross-account preview modal — so it returns { openShred }.

export type CommanderAction = { type: string; label?: string; payload?: Record<string, unknown> }
export type CommanderMedia = { url: string; type: string } | null | undefined
export type ActionResult = { status: string; openShred?: string }

// The action types that fire the moment the Commander proposes them — no tap.
// Posts (she's worn out on being asked) PLUS notes/tasks (auto-commit, per her ask:
// keep a toast, not a pre-confirm gate). Everything else renders a tappable button.
export const AUTO_RUN_TYPES = new Set(['compose_post', 'compose_posts', 'store_note', 'create_task'])

// The model sometimes omits `label`, which rendered an empty bubble. Always have text.
export function commanderActionLabel(a: CommanderAction): string {
  if (a.label && a.label.trim()) return a.label
  const briefs = a.payload?.briefs
  const n = Array.isArray(briefs) ? briefs.length : 0
  switch (a.type) {
    case 'compose_post': return 'Compose post'
    case 'compose_posts': return n ? `Compose ${n} posts` : 'Compose posts'
    case 'store_note': return 'Save to Notes'
    case 'create_task': return 'Add task'
    case 'create_audience': return 'Add audience'
    case 'create_goal': return 'Add goal'
    case 'create_project': return 'Start project'
    case 'create_event': return 'Add to calendar'
    case 'update_account': return 'Update account'
    case 'meta_post': return 'Make it meta'
    case 'manifesto_story': return 'Before / after'
    case 'shred': return 'Tear it up across accounts'
    default: return 'Run'
  }
}

export async function executeCommanderAction(a: CommanderAction, media?: CommanderMedia): Promise<ActionResult> {
  // The action comes from an LLM, so the shape isn't guaranteed. Normally fields live
  // under `payload`, but the model sometimes drops them at the top level (or emits
  // payload:null). Merge both so p.title etc. resolve either way.
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'
  const p: Record<string, unknown> = { ...(isObj(a) ? (a as Record<string, unknown>) : {}), ...(isObj(a.payload) ? a.payload : {}) }
  const str = (v: unknown, d = '') => (typeof v === 'string' ? v : v == null ? d : String(v))
  const arr = (v: unknown) => (Array.isArray(v) ? v : [])
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || `a${Date.now()}`
  const post = (url: string, body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  // shred can't finish here — it opens the cross-account preview modal in the UI.
  if (a.type === 'shred') return { status: '🔱 opened', openShred: str(p.input) }

  try {
    let status = 'unknown action'
    if (a.type === 'store_note') {
      const r = await post('/api/notes', { title: str(p.title, 'Note'), body: str(p.body), category: 'idea', tags: ['commander'] })
      status = r.ok ? '✓ Saved to Notes' : 'failed'
    } else if (a.type === 'create_task') {
      const r = await post('/api/tasks', { title: str(p.title), notes: str(p.notes), priority: str(p.priority, 'medium'), due_date: p.due_date || null })
      status = r.ok ? '✓ Task added' : 'failed'
    } else if (a.type === 'compose_post') {
      const r = await post('/api/river', { input: str(p.brief), accountId: str(p.account_id), source: 'commander-chat', mediaUrl: media?.url, mediaType: media?.type })
      const d = await r.json().catch(() => ({}))
      status = r.ok && d.piece ? `✓ Composed for ${d.account?.handle ?? str(p.account_id)}${media ? ' (media attached)' : ''} — approve in Accounts` : 'couldn\'t compose'
    } else if (a.type === 'compose_posts') {
      // SEVERAL lines → SEVERAL posts. One post per brief (or per line if she pasted lines).
      const briefs = (arr(p.briefs).length ? arr(p.briefs) : str(p.brief || p.input).split(/\r?\n+/))
        .map(b => str(b).trim()).filter(Boolean)
      const accountId = str(p.account_id)
      let ok = 0
      for (let i = 0; i < briefs.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        const r = await post('/api/river', { input: briefs[i], accountId, source: 'commander-chat', mediaUrl: media?.url, mediaType: media?.type })
        // eslint-disable-next-line no-await-in-loop
        const d = await r.json().catch(() => ({}))
        if (r.ok && d.piece) ok++
      }
      status = ok ? `✓ ${ok} post${ok > 1 ? 's' : ''} composed — approve in Accounts` : 'couldn\'t compose these'
    } else if (a.type === 'create_audience') {
      const name = str(p.name, 'New Audience')
      const r = await post('/api/audiences', {
        id: str(p.id) || slug(name), name, emoji: str(p.emoji, '🎯'),
        snapshot: str(p.snapshot), life_stage: str(p.life_stage), tuesday_reality: str(p.tuesday_reality),
        pains: arr(p.pains), pain_side_effects: arr(p.pain_side_effects), desires: arr(p.desires),
        exact_language: arr(p.exact_language), trending_phrases: arr(p.trending_phrases),
        objections: arr(p.objections), buying_triggers: arr(p.buying_triggers),
        watering_holes: arr(p.watering_holes), tried_already: arr(p.tried_already), notes: str(p.notes),
      })
      status = r.ok ? `✓ ${name} added to Audiences` : 'failed'
    } else if (a.type === 'create_goal') {
      const r = await post('/api/goals', { title: str(p.title), account_id: p.account_id ? str(p.account_id) : null, target_per_week: Number(p.target_per_week) || 3, deadline: p.deadline || null, notes: str(p.notes) })
      status = r.ok ? '✓ Goal added' : 'failed'
    } else if (a.type === 'create_project') {
      const r = await post('/api/projects', { name: str(p.name), description: str(p.description), priority: str(p.priority, 'medium'), label: str(p.label, 'general'), next_action: str(p.next_action), notes: str(p.notes) })
      status = r.ok ? '✓ Project started' : 'failed'
    } else if (a.type === 'create_event') {
      const r = await post('/api/events', { title: str(p.title), date: str(p.date), time: str(p.time), kind: str(p.kind, 'other'), account_id: p.account_id ? str(p.account_id) : null, notes: str(p.notes) })
      status = r.ok ? '✓ On the calendar' : 'failed'
    } else if (a.type === 'meta_post') {
      const r = await post('/api/meta', { ask: str(p.ask), why: str(p.why), how: str(p.how) })
      const d = await r.json().catch(() => ({}))
      status = r.ok && d.piece ? '✓ Meta post drafted — in Content' : 'couldn\'t draft'
    } else if (a.type === 'manifesto_story') {
      const r = await post('/api/manifesto-story', { input: str(p.input), accountId: p.account_id ? str(p.account_id) : undefined })
      const d = await r.json().catch(() => ({}))
      status = r.ok && d.piece ? '✓ Before/after drafted — in Content' : 'couldn\'t draft'
    } else if (a.type === 'update_account') {
      const id = str(p.id)
      const allow = ['handle', 'brand_name', 'topic', 'tone', 'mission', 'underlying_message', 'offer', 'keywords', 'notes', 'color', 'platform', 'content_format', 'status', 'priority', 'emoji']
      if (!id) return { status: 'need the account id' }
      const fields: Record<string, unknown> = { id }
      for (const k of allow) if (p[k] !== undefined && p[k] !== null && p[k] !== '') fields[k] = p[k]
      const r = await post('/api/accounts', fields)
      const d = await r.json().catch(() => ({}))
      status = r.ok && d.id ? `✓ Updated ${d.handle ?? d.id}` : 'couldn\'t update'
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('rise-data-changed', { detail: { type: a.type } }))
    return { status }
  } catch (e) {
    console.error('[commander action failed]', a.type, e)
    return { status: 'failed — try again' }
  }
}
