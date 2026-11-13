// THE COMMANDER'S HANDS — one server-side registry of real tools.
//
// Every tool is { name, description, input_schema, handler }. The chat route hands
// the definitions to the model, the agent loop (lib/fable.ts → commanderAgent) runs
// the handlers, and every result goes BACK to the model so it can only report what
// actually happened. Handlers write through lib/db directly, validate their input,
// and return either { ok: true, summary, data } (the object as stored) or
// { ok: false, error } with a plain reason. Nothing is swallowed.
import {
  getAllContent, createContent, updateContent, deleteContent,
  getAllNotes, createNote, updateNote, deleteNote,
  getAllTasks, createTask, updateTask, deleteTask,
  getAllProjects, createProject, updateProject, deleteProject,
  getAllGoals, createGoal, updateGoal, deleteGoal,
  getAllEvents, createEvent, updateEvent, deleteEvent,
  getAllAudiences, upsertAudience,
  getAllBrandAccounts, getBrandAccount, upsertBrandAccount,
  type ContentPiece, type ContentStatus, type ContentType, type Note, type NoteCategory,
} from './db'

export type ToolResult =
  | { ok: true; summary: string; data?: unknown; openShred?: string }
  | { ok: false; error: string }

export type ToolContext = {
  // Where this app answers on the box it runs on, for tools that go through an
  // existing API route (River, meta, manifesto-story).
  baseUrl: string
  // The incoming request's cookie header, forwarded so the station lock lets the
  // internal call through.
  cookie?: string
  // A file she attached this turn, passed through to the tools that can carry it.
  media?: { url: string; type?: string } | null
  // Swappable for tests.
  fetchImpl?: typeof fetch
}

export type CommanderTool = {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult> | ToolResult
}

// ── input helpers ────────────────────────────────────────────────────────────
type In = Record<string, unknown>
const has = (i: In, k: string) => i[k] !== undefined && i[k] !== null
const text = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))
const fail = (error: string): ToolResult => ({ ok: false, error })

// "Placeholder" = text that stands in for content instead of being content.
const PLACEHOLDER_WHOLE = /^(tbd|todo|placeholder|untitled|n\/?a|none|null|undefined|lorem ipsum.*|\.{2,}|…+|-+|\[[^\]]*\]|<[^>]*>|\{[^}]*\})$/i
const PLACEHOLDER_INSIDE = /\[(insert|your|add|script|caption|hook|placeholder|text|title|tbd|todo)\b[^\]]*\]|\(script goes here\)|lorem ipsum/i
export function isEmptyOrPlaceholder(v: unknown): boolean {
  const s = text(v).trim()
  return !s || PLACEHOLDER_WHOLE.test(s) || PLACEHOLDER_INSIDE.test(s)
}

function intId(i: In, key = 'id'): number | null {
  const n = Number(i[key])
  return Number.isInteger(n) && n > 0 ? n : null
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null
}
function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map(x => text(x).trim()).filter(Boolean) : []
}
function knownAccountsLine(): string {
  return getAllBrandAccounts().map(a => `${a.id} (${a.handle})`).join(', ') || '(no accounts)'
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s)

// ── Cards (content pieces) ───────────────────────────────────────────────────
const CARD_STATUSES: readonly ContentStatus[] = ['idea', 'in_progress', 'ready', 'approved', 'scheduled', 'published', 'archived', 'held']
const CARD_TYPES: readonly ContentType[] = ['video', 'podcast', 'post', 'image', 'carousel', 'workshop', 'other']

// What the model (and the receipt) sees for a card: the content exactly as stored.
function cardView(c: ContentPiece) {
  return {
    id: c.id, title: c.title, account_id: c.account_id ?? null, status: c.status, type: c.type,
    caption: c.description ?? '', onscreen_text: c.onscreen_text ?? '', script: c.script ?? '',
    hashtags: c.hashtags ?? '', notes: c.notes ?? '', media_url: c.media_url ?? '',
    created_at: c.created_at, updated_at: c.updated_at,
  }
}
const findCard = (id: number) => getAllContent().find(c => c.id === id) ?? null

const cardFields = {
  title: { type: 'string', description: 'Short title for the card.' },
  account_id: { type: 'string', description: 'Account id from the roster (the id, not the @handle). Omit for an unassigned card.' },
  caption: { type: 'string', description: 'The caption that posts. Her exact words — saved as given.' },
  onscreen_text: { type: 'string', description: 'On-screen hook / slide lines.' },
  script: { type: 'string', description: 'The full spoken script, saved word for word.' },
  hashtags: { type: 'string', description: 'Hashtags as one string.' },
  type: { type: 'string', enum: [...CARD_TYPES] },
  status: { type: 'string', enum: [...CARD_STATUSES] },
}

// Validates the content fields a create/update carries. Returns an error string or null.
function checkCardContent(i: In, opts: { requireSome: boolean }): string | null {
  const contentKeys = ['caption', 'onscreen_text', 'script'] as const
  if (has(i, 'title') && isEmptyOrPlaceholder(i.title)) return 'title is empty or a placeholder — give the card a real title.'
  for (const k of contentKeys) {
    if (has(i, k) && isEmptyOrPlaceholder(i[k])) return `${k} is empty or a placeholder (${JSON.stringify(clip(text(i[k]), 60))}) — send the real text or leave the field out.`
  }
  if (has(i, 'hashtags') && typeof i.hashtags !== 'string') return 'hashtags must be one string.'
  if (opts.requireSome && !contentKeys.some(k => has(i, k))) return 'a card needs real content: send at least one of caption, onscreen_text, or script.'
  if (has(i, 'type') && !oneOf(i.type, CARD_TYPES)) return `type must be one of: ${CARD_TYPES.join(', ')}.`
  if (has(i, 'status') && !oneOf(i.status, CARD_STATUSES)) return `status must be one of: ${CARD_STATUSES.join(', ')}.`
  if (has(i, 'account_id') && text(i.account_id) && !getBrandAccount(text(i.account_id))) return `unknown account_id "${text(i.account_id)}". Valid ids: ${knownAccountsLine()}`
  return null
}

const cardTools: CommanderTool[] = [
  {
    name: 'create_card',
    description: 'Create a Card (a content piece in her queue) holding EXACTLY the words you pass — nothing is rewritten. Use this when she says "send it to Cards", "save this script as a card", or hands you finished copy. Needs a title and at least one of caption / onscreen_text / script. Returns the saved card with its id.',
    input_schema: { type: 'object', properties: cardFields, required: ['title'] },
    handler: (i, ctx) => {
      if (!has(i, 'title')) return fail('title is required.')
      const bad = checkCardContent(i, { requireSome: true })
      if (bad) return fail(bad)
      const hasScript = has(i, 'script')
      const piece = createContent({
        title: text(i.title).trim(),
        description: has(i, 'caption') ? text(i.caption) : '',
        onscreen_text: has(i, 'onscreen_text') ? text(i.onscreen_text) : '',
        script: hasScript ? text(i.script) : '',
        hashtags: has(i, 'hashtags') ? text(i.hashtags) : '',
        type: oneOf(i.type, CARD_TYPES) ?? (hasScript ? 'video' : 'post'),
        status: oneOf(i.status, CARD_STATUSES) ?? 'in_progress',
        account_id: text(i.account_id) || null,
        tags: ['commander'],
        river_source: 'commander',
        media_url: ctx.media?.url ?? '',
        media_urls: ctx.media?.url ? [ctx.media.url] : [],
      })
      // Read it back so the receipt reflects what is actually on disk.
      const saved = findCard(piece.id)
      if (!saved) return fail('the card was written but could not be read back — treat it as NOT saved.')
      if (hasScript && (saved.script ?? '') !== text(i.script)) return fail(`card ${saved.id} was created but the stored script does not match what was sent — check it in Cards.`)
      return { ok: true, summary: `Card created: "${saved.title}" (id ${saved.id}, ${saved.status}${saved.account_id ? `, ${saved.account_id}` : ', no account'})${ctx.media?.url ? ' with the attached media' : ''}`, data: cardView(saved) }
    },
  },
  {
    name: 'get_card',
    description: 'Read one Card in full (caption, on-screen text, script, hashtags, status) by its id.',
    input_schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    handler: i => {
      const id = intId(i)
      if (!id) return fail('id must be a positive whole number.')
      const c = findCard(id)
      return c ? { ok: true, summary: `Card ${c.id}: "${c.title}"`, data: cardView(c) } : fail(`no card with id ${id}.`)
    },
  },
  {
    name: 'list_cards',
    description: 'List Cards, newest first. Filter by account_id, status, and/or text (matches title, caption, on-screen text, script). Returns compact rows — use get_card for the full text of one.',
    input_schema: { type: 'object', properties: {
      account_id: { type: 'string' }, status: { type: 'string', enum: [...CARD_STATUSES] },
      text: { type: 'string', description: 'Words to search for.' },
      limit: { type: 'integer', description: 'Max rows (default 20, max 50).' },
    } },
    handler: i => {
      if (has(i, 'status') && !oneOf(i.status, CARD_STATUSES)) return fail(`status must be one of: ${CARD_STATUSES.join(', ')}.`)
      const q = text(i.text).trim().toLowerCase()
      const acct = text(i.account_id).trim()
      const limit = Math.min(50, Math.max(1, Number(i.limit) || 20))
      const all = getAllContent().filter(c =>
        (!acct || c.account_id === acct) &&
        (!has(i, 'status') || c.status === i.status) &&
        (!q || [c.title, c.description, c.onscreen_text, c.script].some(f => (f ?? '').toLowerCase().includes(q))))
      const rows = all.slice(0, limit).map(c => ({
        id: c.id, title: c.title, account_id: c.account_id ?? null, status: c.status, type: c.type,
        has_script: !!(c.script ?? '').trim(), caption_preview: clip((c.description ?? '').replace(/\s+/g, ' ').trim(), 120),
      }))
      return { ok: true, summary: `${all.length} card${all.length === 1 ? '' : 's'} matched${all.length > rows.length ? ` (showing ${rows.length})` : ''}`, data: rows }
    },
  },
  {
    name: 'update_card',
    description: 'Edit an existing Card by id. Send ONLY the fields that change; everything else is kept. Text fields replace the stored text exactly. Returns the card as stored after the edit.',
    input_schema: { type: 'object', properties: { id: { type: 'integer' }, ...cardFields }, required: ['id'] },
    handler: i => {
      const id = intId(i)
      if (!id) return fail('id must be a positive whole number.')
      const existing = findCard(id)
      if (!existing) return fail(`no card with id ${id}.`)
      const bad = checkCardContent(i, { requireSome: false })
      if (bad) return fail(bad)
      const updates: Partial<ContentPiece> = {}
      if (has(i, 'title')) updates.title = text(i.title).trim()
      if (has(i, 'caption')) updates.description = text(i.caption)
      if (has(i, 'onscreen_text')) updates.onscreen_text = text(i.onscreen_text)
      if (has(i, 'script')) updates.script = text(i.script)
      if (has(i, 'hashtags')) updates.hashtags = text(i.hashtags)
      if (has(i, 'type')) updates.type = oneOf(i.type, CARD_TYPES)!
      if (has(i, 'status')) updates.status = oneOf(i.status, CARD_STATUSES)!
      if (has(i, 'account_id')) updates.account_id = text(i.account_id) || null
      const changed = Object.keys(updates)
      if (!changed.length) return fail('nothing to change — send at least one field besides id.')
      const saved = updateContent(id, updates)
      if (!saved) return fail(`card ${id} could not be updated.`)
      return { ok: true, summary: `Card updated: "${saved.title}" (id ${saved.id}) — changed ${changed.map(k => (k === 'description' ? 'caption' : k)).join(', ')}`, data: cardView(saved) }
    },
  },
  {
    name: 'delete_card',
    description: 'Permanently delete a Card by id. Only when she explicitly asks to delete it.',
    input_schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    handler: i => {
      const id = intId(i)
      if (!id) return fail('id must be a positive whole number.')
      const c = findCard(id)
      if (!c) return fail(`no card with id ${id} — nothing was deleted.`)
      if (!deleteContent(id)) return fail(`card ${id} could not be deleted.`)
      return { ok: true, summary: `Card deleted: "${c.title}" (id ${id})`, data: { id, title: c.title, deleted: true } }
    },
  },
]

// ── Notes ────────────────────────────────────────────────────────────────────
const NOTE_CATEGORIES: readonly NoteCategory[] = ['idea', 'business', 'personal', 'client', 'script', 'framework', 'sop', 'prompt', 'decision', 'reflection']
const noteView = (n: Note) => ({ id: n.id, title: n.title, body: n.body, category: n.category, tags: n.tags, pinned: n.pinned, updated_at: n.updated_at })
const findNote = (id: number) => getAllNotes().find(n => n.id === id) ?? null

const noteTools: CommanderTool[] = [
  {
    name: 'create_note',
    description: 'Save text to her Notes exactly as given. For "store this / save this / note this".',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' }, body: { type: 'string', description: 'The full text, saved as given.' },
      category: { type: 'string', enum: [...NOTE_CATEGORIES] }, tags: { type: 'array', items: { type: 'string' } }, pinned: { type: 'boolean' },
    }, required: ['title', 'body'] },
    handler: i => {
      if (isEmptyOrPlaceholder(i.title)) return fail('title is empty or a placeholder.')
      if (isEmptyOrPlaceholder(i.body)) return fail('body is empty or a placeholder — send the real text.')
      if (has(i, 'category') && !oneOf(i.category, NOTE_CATEGORIES)) return fail(`category must be one of: ${NOTE_CATEGORIES.join(', ')}.`)
      const n = createNote({ title: text(i.title).trim(), body: text(i.body), category: oneOf(i.category, NOTE_CATEGORIES) ?? 'idea', tags: [...new Set([...strList(i.tags), 'commander'])], pinned: i.pinned === true })
      return { ok: true, summary: `Note saved: "${n.title}" (id ${n.id})`, data: noteView(n) }
    },
  },
  {
    name: 'search_notes',
    description: 'Search her Notes by words (title, body, tags) and/or category. Returns previews — use get_note for the full text.',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, category: { type: 'string', enum: [...NOTE_CATEGORIES] }, limit: { type: 'integer', description: 'Max rows (default 15, max 40).' } } },
    handler: i => {
      if (has(i, 'category') && !oneOf(i.category, NOTE_CATEGORIES)) return fail(`category must be one of: ${NOTE_CATEGORIES.join(', ')}.`)
      const limit = Math.min(40, Math.max(1, Number(i.limit) || 15))
      const all = getAllNotes(oneOf(i.category, NOTE_CATEGORIES) ?? undefined, text(i.query).trim() || undefined)
      const rows = all.slice(0, limit).map(n => ({ id: n.id, title: n.title, category: n.category, tags: n.tags, pinned: n.pinned, preview: clip(n.body.replace(/\s+/g, ' ').trim(), 200) }))
      return { ok: true, summary: `${all.length} note${all.length === 1 ? '' : 's'} matched${all.length > rows.length ? ` (showing ${rows.length})` : ''}`, data: rows }
    },
  },
  {
    name: 'get_note',
    description: 'Read one Note in full by id.',
    input_schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    handler: i => {
      const id = intId(i)
      if (!id) return fail('id must be a positive whole number.')
      const n = findNote(id)
      return n ? { ok: true, summary: `Note ${n.id}: "${n.title}"`, data: noteView(n) } : fail(`no note with id ${id}.`)
    },
  },
  {
    name: 'update_note',
    description: 'Edit a Note by id. Send only the fields that change.',
    input_schema: { type: 'object', properties: {
      id: { type: 'integer' }, title: { type: 'string' }, body: { type: 'string' },
      category: { type: 'string', enum: [...NOTE_CATEGORIES] }, tags: { type: 'array', items: { type: 'string' } }, pinned: { type: 'boolean' },
    }, required: ['id'] },
    handler: i => {
      const id = intId(i)
      if (!id) return fail('id must be a positive whole number.')
      if (!findNote(id)) return fail(`no note with id ${id}.`)
      if (has(i, 'title') && isEmptyOrPlaceholder(i.title)) return fail('title is empty or a placeholder.')
      if (has(i, 'body') && isEmptyOrPlaceholder(i.body)) return fail('body is empty or a placeholder.')
      if (has(i, 'category') && !oneOf(i.category, NOTE_CATEGORIES)) return fail(`category must be one of: ${NOTE_CATEGORIES.join(', ')}.`)
      const updates: Partial<Note> = {}
      if (has(i, 'title')) updates.title = text(i.title).trim()
      if (has(i, 'body')) updates.body = text(i.body)
      if (has(i, 'category')) updates.category = oneOf(i.category, NOTE_CATEGORIES)!
      if (has(i, 'tags')) updates.tags = strList(i.tags)
      if (has(i, 'pinned')) updates.pinned = i.pinned === true
      if (!Object.keys(updates).length) return fail('nothing to change — send at least one field besides id.')
      const n = updateNote(id, updates)
      return n ? { ok: true, summary: `Note updated: "${n.title}" (id ${n.id}) — changed ${Object.keys(updates).join(', ')}`, data: noteView(n) } : fail(`note ${id} could not be updated.`)
    },
  },
  {
    name: 'delete_note',
    description: 'Permanently delete a Note by id. Only when she explicitly asks to delete it.',
    input_schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    handler: i => {
      const id = intId(i)
      if (!id) return fail('id must be a positive whole number.')
      const n = findNote(id)
      if (!n) return fail(`no note with id ${id} — nothing was deleted.`)
      if (!deleteNote(id)) return fail(`note ${id} could not be deleted.`)
      return { ok: true, summary: `Note deleted: "${n.title}" (id ${id})`, data: { id, title: n.title, deleted: true } }
    },
  },
]

// ── Tasks, projects, goals, calendar events — same four verbs each ───────────
type FieldSpec = { type: 'string' | 'number' | 'boolean'; enum?: readonly string[]; description?: string; nullable?: boolean }
type Row = { id: number } & Record<string, unknown>
type CrudSpec = {
  noun: string            // "task"
  label: string           // "Task"
  plural: string          // "tasks"
  nameField: string       // the field that names it ("title" / "name")
  fields: Record<string, FieldSpec>
  createHint: string
  list: () => Row[]
  create: (data: Record<string, unknown>) => Row
  update: (id: number, data: Record<string, unknown>) => Row | null
  remove: (id: number) => boolean
  check?: (data: Record<string, unknown>) => string | null
}

// Coerces + validates the given fields against the spec. Unknown keys are ignored.
function readFields(spec: CrudSpec, i: In): { data: Record<string, unknown> } | { error: string } {
  const data: Record<string, unknown> = {}
  for (const [k, f] of Object.entries(spec.fields)) {
    if (i[k] === undefined) continue
    const v = i[k]
    if (v === null || v === '') {
      if (f.nullable) { data[k] = null; continue }
      if (k === spec.nameField) return { error: `${k} can't be empty.` }
      if (f.type === 'string') { data[k] = ''; continue }
      return { error: `${k} can't be empty.` }
    }
    if (f.type === 'number') {
      const n = Number(v)
      if (!Number.isFinite(n)) return { error: `${k} must be a number.` }
      data[k] = n
    } else if (f.type === 'boolean') {
      if (v !== true && v !== false && v !== 'true' && v !== 'false') return { error: `${k} must be true or false.` }
      data[k] = v === true || v === 'true'
    } else {
      const s = text(v)
      if (f.enum && !f.enum.includes(s)) return { error: `${k} must be one of: ${f.enum.join(', ')}.` }
      data[k] = s
    }
  }
  if (data[spec.nameField] !== undefined && isEmptyOrPlaceholder(data[spec.nameField])) return { error: `${spec.nameField} is empty or a placeholder.` }
  if (typeof data.account_id === 'string' && data.account_id && !getBrandAccount(data.account_id)) return { error: `unknown account_id "${data.account_id}". Valid ids: ${knownAccountsLine()}` }
  const extra = spec.check?.(data)
  return extra ? { error: extra } : { data }
}

function crudTools(spec: CrudSpec): CommanderTool[] {
  const props: Record<string, unknown> = {}
  for (const [k, f] of Object.entries(spec.fields)) props[k] = { type: f.type, ...(f.enum ? { enum: [...f.enum] } : {}), ...(f.description ? { description: f.description } : {}) }
  const nameOf = (r: Row) => text(r[spec.nameField])
  return [
    {
      name: `create_${spec.noun}`,
      description: `Create a ${spec.noun}. ${spec.createHint} Returns the saved ${spec.noun} with its id.`,
      input_schema: { type: 'object', properties: props, required: [spec.nameField] },
      handler: i => {
        if (i[spec.nameField] === undefined) return fail(`${spec.nameField} is required.`)
        const r = readFields(spec, i)
        if ('error' in r) return fail(r.error)
        const row = spec.create(r.data)
        return { ok: true, summary: `${spec.label} created: "${nameOf(row)}" (id ${row.id})`, data: row }
      },
    },
    {
      name: `list_${spec.plural}`,
      description: `List her ${spec.plural} with their ids and current fields. Optional text filter.`,
      input_schema: { type: 'object', properties: { text: { type: 'string', description: 'Words to search for.' } } },
      handler: i => {
        const q = text(i.text).trim().toLowerCase()
        const rows = spec.list().filter(r => !q || JSON.stringify(r).toLowerCase().includes(q))
        return { ok: true, summary: `${rows.length} ${rows.length === 1 ? spec.noun : spec.plural}`, data: rows.slice(0, 60) }
      },
    },
    {
      name: `update_${spec.noun}`,
      description: `Edit a ${spec.noun} by id. Send only the fields that change; the rest is kept.`,
      input_schema: { type: 'object', properties: { id: { type: 'integer' }, ...props }, required: ['id'] },
      handler: i => {
        const id = intId(i)
        if (!id) return fail('id must be a positive whole number.')
        if (!spec.list().some(r => r.id === id)) return fail(`no ${spec.noun} with id ${id}.`)
        const r = readFields(spec, i)
        if ('error' in r) return fail(r.error)
        const changed = Object.keys(r.data)
        if (!changed.length) return fail('nothing to change — send at least one field besides id.')
        const row = spec.update(id, r.data)
        return row ? { ok: true, summary: `${spec.label} updated: "${nameOf(row)}" (id ${id}) — changed ${changed.join(', ')}`, data: row } : fail(`${spec.noun} ${id} could not be updated.`)
      },
    },
    {
      name: `delete_${spec.noun}`,
      description: `Permanently delete a ${spec.noun} by id. Only when she explicitly asks to delete it.`,
      input_schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      handler: i => {
        const id = intId(i)
        if (!id) return fail('id must be a positive whole number.')
        const row = spec.list().find(r => r.id === id)
        if (!row) return fail(`no ${spec.noun} with id ${id} — nothing was deleted.`)
        if (!spec.remove(id)) return fail(`${spec.noun} ${id} could not be deleted.`)
        return { ok: true, summary: `${spec.label} deleted: "${nameOf(row)}" (id ${id})`, data: { id, [spec.nameField]: nameOf(row), deleted: true } }
      },
    },
  ]
}

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const dateCheck = (key: string) => (d: Record<string, unknown>) =>
  typeof d[key] === 'string' && d[key] && !DATE_RE.test(d[key] as string) ? `${key} must be YYYY-MM-DD.` : null

const taskTools = crudTools({
  noun: 'task', label: 'Task', plural: 'tasks', nameField: 'title',
  createHint: 'For "remind me / I need to".',
  fields: {
    title: { type: 'string' }, notes: { type: 'string' },
    status: { type: 'string', enum: ['today', 'this_week', 'waiting', 'someday', 'done'] },
    priority: { type: 'string', enum: PRIORITIES }, energy: { type: 'string', enum: ['high', 'medium', 'low'] },
    due_date: { type: 'string', description: 'YYYY-MM-DD', nullable: true },
  },
  list: () => getAllTasks() as unknown as Row[],
  create: d => createTask(d) as unknown as Row,
  update: (id, d) => updateTask(id, d) as unknown as Row | null,
  remove: deleteTask,
  check: dateCheck('due_date'),
})

const projectTools = crudTools({
  noun: 'project', label: 'Project', plural: 'projects', nameField: 'name',
  createHint: 'For "start a project for this / track this build".',
  fields: {
    name: { type: 'string' }, description: { type: 'string' },
    status: { type: 'string', enum: ['active', 'paused', 'complete', 'archived'] },
    priority: { type: 'string', enum: PRIORITIES },
    label: { type: 'string', enum: ['series', 'biz_dev', 'new_account', 'launch', 'general'] },
    deadline: { type: 'string', description: 'YYYY-MM-DD', nullable: true },
    next_action: { type: 'string' }, notes: { type: 'string' },
    progress: { type: 'number', description: '0-100' },
  },
  list: () => getAllProjects() as unknown as Row[],
  create: d => createProject(d) as unknown as Row,
  update: (id, d) => updateProject(id, d) as unknown as Row | null,
  remove: deleteProject,
  check: d => dateCheck('deadline')(d) ?? (typeof d.progress === 'number' && (d.progress < 0 || d.progress > 100) ? 'progress must be between 0 and 100.' : null),
})

const goalTools = crudTools({
  noun: 'goal', label: 'Goal', plural: 'goals', nameField: 'title',
  createHint: 'For "make that a goal / hold me to X posts a week". Signups are a manual count: set signups_manual to the new TOTAL, not the increment.',
  fields: {
    title: { type: 'string' },
    account_id: { type: 'string', description: 'Account id from the roster, or omit/null for station-wide.', nullable: true },
    target_per_week: { type: 'number', description: 'Posts per week.' },
    deadline: { type: 'string', description: 'YYYY-MM-DD', nullable: true },
    notes: { type: 'string' }, active: { type: 'boolean' },
    signup_target: { type: 'number', description: 'Signups wanted by the deadline.', nullable: true },
    signups_manual: { type: 'number', description: 'Running TOTAL of signups so far.', nullable: true },
  },
  list: () => getAllGoals() as unknown as Row[],
  create: d => createGoal(d) as unknown as Row,
  update: (id, d) => updateGoal(id, d) as unknown as Row | null,
  remove: deleteGoal,
  check: dateCheck('deadline'),
})

const eventTools = crudTools({
  noun: 'event', label: 'Calendar event', plural: 'events', nameField: 'title',
  createHint: 'For "put it on the calendar / mark launch day". date is required.',
  fields: {
    title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, time: { type: 'string', description: 'HH:MM' },
    kind: { type: 'string', enum: ['launch', 'promo', 'holiday', 'personal', 'trend', 'other'] },
    account_id: { type: 'string', nullable: true }, notes: { type: 'string' },
  },
  list: () => getAllEvents() as unknown as Row[],
  create: d => createEvent(d) as unknown as Row,
  update: (id, d) => updateEvent(id, d) as unknown as Row | null,
  remove: deleteEvent,
  check: dateCheck('date'),
})
// A new event must carry a date (the generic builder only requires the name field).
const createEventTool = eventTools.find(t => t.name === 'create_event')!
const createEventBase = createEventTool.handler
createEventTool.input_schema.required = ['title', 'date']
createEventTool.handler = (i, ctx) => (text(i.date).trim() ? createEventBase(i, ctx) : fail('date is required (YYYY-MM-DD).'))

// ── Tools that go through an existing API route ──────────────────────────────
async function callRoute(ctx: ToolContext, path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const f = ctx.fetchImpl ?? fetch
  const res = await f(`${ctx.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(ctx.cookie ? { cookie: ctx.cookie } : {}) },
    body: JSON.stringify(body),
  })
  const raw = await res.text()
  let data: Record<string, unknown> = {}
  try { data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {} } catch { data = { error: `non-JSON reply: ${clip(raw, 160)}` } }
  return { ok: res.ok, status: res.status, data }
}

type BriefOutcome = { brief: string; ok: boolean; outcome: string; card_id?: number; title?: string }

// One brief through the River, reported honestly: a finished post, a parked empty
// idea, a task/event the River made instead, or a failure.
async function composeOne(ctx: ToolContext, accountId: string, brief: string): Promise<BriefOutcome> {
  const short = clip(brief.replace(/\s+/g, ' ').trim(), 80)
  let r: Awaited<ReturnType<typeof callRoute>>
  try {
    r = await callRoute(ctx, '/api/river', { input: brief, accountId, source: 'commander-chat', mediaUrl: ctx.media?.url, mediaType: ctx.media?.type })
  } catch (e) {
    return { brief: short, ok: false, outcome: `River could not be reached: ${e instanceof Error ? e.message : 'network error'}` }
  }
  if (!r.ok) return { brief: short, ok: false, outcome: `River failed (${r.status}): ${text(r.data.error) || 'no reason given'}` }
  const kind = text(r.data.kind)
  if (kind === 'task') return { brief: short, ok: true, outcome: `NOT a post — the River read this as a to-do and made a TASK instead: "${text((r.data.task as Row | undefined)?.title)}"` }
  if (kind === 'event') return { brief: short, ok: true, outcome: `NOT a post — the River read this as a date and made a CALENDAR EVENT instead: "${text((r.data.event as Row | undefined)?.title)}"` }
  const piece = r.data.piece as (ContentPiece | undefined)
  if (!piece) return { brief: short, ok: false, outcome: 'River answered but returned no card — nothing was created.' }
  if (r.data.complete === false) {
    const qs = strList(r.data.open_questions)
    return { brief: short, ok: true, card_id: piece.id, title: piece.title, outcome: `PARKED, not written — card ${piece.id} "${piece.title}" was saved as an idea with an EMPTY caption${qs.length ? `; it is waiting on: ${qs.join(' | ')}` : ''}` }
  }
  return { brief: short, ok: true, card_id: piece.id, title: piece.title, outcome: `Drafted card ${piece.id} "${piece.title}" (${piece.status}) for ${piece.account_id ?? 'no account'} — a new post written by the River, not her exact words` }
}

const riverTools: CommanderTool[] = [
  {
    name: 'compose_post',
    description: 'Hand ONE brief to the River, where a SECOND writer drafts a NEW post for that account. It rewrites the brief — it does not save her words verbatim and it never fills the script field. Use create_card instead when she wants her exact text or a script saved. The River may also park the idea with an empty caption, or decide the brief is a task/event; the result says which happened.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string', description: 'Account id from the roster.' }, brief: { type: 'string', description: 'The idea or line to write a post from.' } }, required: ['account_id', 'brief'] },
    handler: async (i, ctx) => {
      const acct = text(i.account_id).trim()
      if (!acct || !getBrandAccount(acct)) return fail(`unknown account_id "${acct}". Valid ids: ${knownAccountsLine()}`)
      if (isEmptyOrPlaceholder(i.brief)) return fail('brief is empty or a placeholder.')
      const o = await composeOne(ctx, acct, text(i.brief))
      return o.ok ? { ok: true, summary: o.outcome, data: o } : fail(o.outcome)
    },
  },
  {
    name: 'compose_posts',
    description: 'Hand SEVERAL briefs to the River for one account — one new post per brief, each drafted by a second writer (same caveats as compose_post). Returns what happened to EACH brief: drafted, parked empty, turned into a task/event, or failed.',
    input_schema: { type: 'object', properties: { account_id: { type: 'string' }, briefs: { type: 'array', items: { type: 'string' }, description: 'One idea per entry.' } }, required: ['account_id', 'briefs'] },
    handler: async (i, ctx) => {
      const acct = text(i.account_id).trim()
      if (!acct || !getBrandAccount(acct)) return fail(`unknown account_id "${acct}". Valid ids: ${knownAccountsLine()}`)
      const briefs = strList(i.briefs).filter(b => !isEmptyOrPlaceholder(b))
      if (!briefs.length) return fail('briefs is empty — send at least one real idea.')
      if (briefs.length > 12) return fail(`that is ${briefs.length} briefs — send 12 or fewer per call.`)
      const outcomes: BriefOutcome[] = []
      for (const b of briefs) outcomes.push(await composeOne(ctx, acct, b))
      const good = outcomes.filter(o => o.ok).length
      const lines = outcomes.map((o, n) => `${n + 1}. ${o.ok ? '✓' : '✗'} "${o.brief}" → ${o.outcome}`).join('\n')
      if (!good) return fail(`none of the ${outcomes.length} briefs went through:\n${lines}`)
      return { ok: true, summary: `${good} of ${outcomes.length} briefs went through the River${good < outcomes.length ? ` (${outcomes.length - good} FAILED)` : ''}:\n${lines}`, data: outcomes }
    },
  },
  {
    name: 'meta_post',
    description: 'Draft a build-in-public post documenting something she asked RISE to do (the ask → the why → the how → the stealable prompt). A second writer drafts it; it lands in her content queue.',
    input_schema: { type: 'object', properties: { ask: { type: 'string', description: 'Plain sentence of what she asked for.' }, why: { type: 'string' }, how: { type: 'string' } }, required: ['ask'] },
    handler: async (i, ctx) => {
      if (isEmptyOrPlaceholder(i.ask)) return fail('ask is empty or a placeholder.')
      const r = await callRoute(ctx, '/api/meta', { ask: text(i.ask), why: text(i.why), how: text(i.how) })
      const piece = r.data.piece as ContentPiece | undefined
      if (!r.ok || !piece) return fail(`meta post was not drafted (${r.status}): ${text(r.data.error) || 'the route returned no card'}`)
      return { ok: true, summary: `Meta post drafted: card ${piece.id} "${piece.title}"`, data: cardView(piece) }
    },
  },
  {
    name: 'manifesto_story',
    description: 'Run her "Manifesto → Story" before/after teaching series on a line or topic (the flat version, the story rewrite, the one move). A second writer drafts it; it lands in her content queue.',
    input_schema: { type: 'object', properties: { input: { type: 'string', description: 'The line or topic.' }, account_id: { type: 'string' } }, required: ['input'] },
    handler: async (i, ctx) => {
      if (isEmptyOrPlaceholder(i.input)) return fail('input is empty or a placeholder.')
      const acct = text(i.account_id).trim()
      if (acct && !getBrandAccount(acct)) return fail(`unknown account_id "${acct}". Valid ids: ${knownAccountsLine()}`)
      const r = await callRoute(ctx, '/api/manifesto-story', { input: text(i.input), accountId: acct || undefined })
      const piece = r.data.piece as ContentPiece | undefined
      if (!r.ok || !piece) return fail(`before/after was not drafted (${r.status}): ${text(r.data.error) || 'the route returned no card'}`)
      return { ok: true, summary: `Before/after drafted: card ${piece.id} "${piece.title}"`, data: cardView(piece) }
    },
  },
]

// ── Shred, audiences, accounts ───────────────────────────────────────────────
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
const AUDIENCE_LISTS = ['pains', 'pain_side_effects', 'desires', 'exact_language', 'trending_phrases', 'objections', 'buying_triggers', 'watering_holes', 'tried_already'] as const
const ACCOUNT_FIELDS = ['handle', 'brand_name', 'topic', 'tone', 'mission', 'underlying_message', 'offer', 'keywords', 'notes', 'color', 'emoji', 'platform', 'content_format', 'status', 'priority'] as const

const otherTools: CommanderTool[] = [
  {
    name: 'shred',
    description: 'Open the cross-account preview that tears one big drop into posts across every account it serves. This tool CREATES NOTHING — it only opens the preview on her screen; posts exist only after she approves them there. Say that plainly.',
    input_schema: { type: 'object', properties: { input: { type: 'string', description: 'The full text to tear up.' } }, required: ['input'] },
    handler: i => {
      if (isEmptyOrPlaceholder(i.input)) return fail('input is empty or a placeholder.')
      return { ok: true, summary: 'Opened the cross-account preview on her screen. Nothing has been created yet — posts are made only when she approves them in that preview.', openShred: text(i.input), data: { created: 0 } }
    },
  },
  {
    name: 'create_audience',
    description: 'Save a new audience persona to the Audience tab. Only facts she gave you — never invent details about a real person. Will NOT overwrite an existing audience.',
    input_schema: { type: 'object', properties: {
      name: { type: 'string', description: 'e.g. "Overwhelmed Dana"' }, emoji: { type: 'string' }, snapshot: { type: 'string', description: 'One line.' },
      life_stage: { type: 'string' }, tuesday_reality: { type: 'string', description: 'A 9pm-Tuesday scene.' },
      ...Object.fromEntries(AUDIENCE_LISTS.map(k => [k, { type: 'array', items: { type: 'string' } }])),
      notes: { type: 'string' },
    }, required: ['name'] },
    handler: i => {
      if (isEmptyOrPlaceholder(i.name)) return fail('name is empty or a placeholder.')
      const name = text(i.name).trim()
      const id = slug(name)
      if (!id) return fail('name must contain letters or numbers.')
      const clash = getAllAudiences().find(a => a.id === id || a.name.toLowerCase() === name.toLowerCase())
      if (clash) return fail(`an audience named "${clash.name}" (id ${clash.id}) already exists — it was NOT overwritten. Pick a different name, or she can edit the existing one in the Audience tab.`)
      const lists = Object.fromEntries(AUDIENCE_LISTS.map(k => [k, strList(i[k])]))
      const a = upsertAudience({ id, name, emoji: text(i.emoji) || '🎯', snapshot: text(i.snapshot), life_stage: text(i.life_stage), tuesday_reality: text(i.tuesday_reality), notes: text(i.notes), ...lists })
      return { ok: true, summary: `Audience created: "${a.name}" (id ${a.id})`, data: a }
    },
  },
  {
    name: 'update_account',
    description: 'Edit an EXISTING brand account by its id (the id from the roster, NOT the @handle). Send only the fields that change; the rest is kept. Cannot create accounts — an unknown id is rejected.',
    input_schema: { type: 'object', properties: { id: { type: 'string' }, ...Object.fromEntries(ACCOUNT_FIELDS.map(k => [k, { type: 'string' }])) }, required: ['id'] },
    handler: i => {
      const id = text(i.id).trim()
      const existing = id ? getBrandAccount(id) : null
      if (!existing) return fail(`no account with id "${id}" — nothing was changed and no account was created. Valid ids: ${knownAccountsLine()}`)
      const fields: Record<string, string> = {}
      for (const k of ACCOUNT_FIELDS) if (has(i, k) && text(i[k]).trim()) fields[k] = text(i[k])
      const changed = Object.keys(fields)
      if (!changed.length) return fail('nothing to change — send at least one field besides id.')
      const saved = upsertBrandAccount({ id, ...fields } as Parameters<typeof upsertBrandAccount>[0])
      return { ok: true, summary: `Account updated: ${saved.handle} (id ${saved.id}) — changed ${changed.join(', ')}`, data: { id: saved.id, handle: saved.handle, ...Object.fromEntries(changed.map(k => [k, (saved as unknown as Record<string, unknown>)[k]])) } }
    },
  },
]

// ── The registry ─────────────────────────────────────────────────────────────
export const COMMANDER_TOOLS: CommanderTool[] = [
  ...cardTools, ...noteTools, ...taskTools, ...projectTools, ...goalTools, ...eventTools, ...riverTools, ...otherTools,
]

// What the model API receives.
export function commanderToolDefinitions(): { name: string; description: string; input_schema: CommanderTool['input_schema'] }[] {
  return COMMANDER_TOOLS.map(({ name, description, input_schema }) => ({ name, description, input_schema }))
}

// The tool list for the system prompt — generated, so it can never drift from the registry.
export function commanderToolList(): string {
  return COMMANDER_TOOLS.map(t => `- ${t.name} — ${t.description}`).join('\n')
}

// Runs one tool. A thrown error becomes a failed result with its message — never a silent pass.
export async function runCommanderTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const tool = COMMANDER_TOOLS.find(t => t.name === name)
  if (!tool) return fail(`there is no tool named "${name}".`)
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail(`${name} needs a JSON object of inputs.`)
  try {
    return await tool.handler(input as Record<string, unknown>, ctx)
  } catch (e) {
    console.error('[commander tool threw]', name, e)
    return fail(`${name} threw an error: ${e instanceof Error ? e.message : String(e)}`)
  }
}
