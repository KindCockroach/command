import fs from 'fs'
import path from 'path'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'db.json')

export type ContentStatus = 'idea' | 'in_progress' | 'ready' | 'published' | 'archived'
export type ContentType = 'video' | 'podcast' | 'post' | 'image' | 'workshop' | 'other'

export type ContentPiece = {
  id: number
  title: string
  description: string
  status: ContentStatus
  type: ContentType
  platforms: string[]
  tags: string[]
  transcript: string
  notes: string
  script?: string
  file_path: string
  thumbnail_url: string
  sort_order: number
  created_at: string
  updated_at: string
  published_at: string | null
  // AI pipeline fields
  pipeline_stage?: string
  ai_enrichment?: Record<string, unknown>
  repurpose_output?: Record<string, unknown>
  heygen_video_id?: string
  heygen_video_url?: string
}

export type ContentPieceRow = ContentPiece

export type Memory = {
  id: number
  category: 'decision' | 'pattern' | 'voice' | 'lesson' | 'goal' | 'fact' | 'note'
  title: string
  body: string
  agent_tags: string[]   // which agents should see this
  created_at: string
  updated_at: string
}

export type ProjectStatus = 'active' | 'paused' | 'complete' | 'archived'
export type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low'

export type Project = {
  id: number
  name: string
  description: string
  status: ProjectStatus
  priority: ProjectPriority
  deadline: string | null
  next_action: string
  notes: string
  assistant: string
  progress: number  // 0-100
  created_at: string
  updated_at: string
}

export type TaskStatus = 'today' | 'this_week' | 'waiting' | 'someday' | 'done'
export type TaskEnergy = 'high' | 'medium' | 'low'

export type Task = {
  id: number
  title: string
  notes: string
  status: TaskStatus
  priority: 'urgent' | 'high' | 'medium' | 'low'
  energy: TaskEnergy
  project_id: number | null
  recurring: boolean
  due_date: string | null
  created_at: string
  updated_at: string
}

export type NoteCategory = 'idea' | 'business' | 'personal' | 'client' | 'script' | 'framework' | 'sop' | 'prompt' | 'decision' | 'reflection'

export type Note = {
  id: number
  title: string
  body: string
  category: NoteCategory
  tags: string[]
  pinned: boolean
  created_at: string
  updated_at: string
}

export type VisionType = 'future_self' | 'identity' | 'season' | 'why' | 'no_longer_available' | 'evidence'

export type VisionEntry = {
  id: number
  type: VisionType
  content: string
  created_at: string
  updated_at: string
}

export type DailyCommand = {
  date: string       // YYYY-MM-DD
  top3: string[]
  energy: 'low' | 'medium' | 'high' | ''
  notes: string
  updated_at: string
}

type Db = {
  content: ContentPiece[]
  intake_log: { id: number; raw_input: string; created_at: string }[]
  memories: Memory[]
  projects: Project[]
  tasks: Task[]
  notes: Note[]
  vision: VisionEntry[]
  daily_commands: DailyCommand[]
  next_id: number
  next_memory_id: number
  next_project_id: number
  next_task_id: number
  next_note_id: number
  next_vision_id: number
}

function ensureDir() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
}

function defaultDb(): Db {
  const now = new Date().toISOString()
  return {
    next_id: 9,
    next_memory_id: 6,
    next_project_id: 4,
    next_task_id: 6,
    next_note_id: 4,
    next_vision_id: 7,
    intake_log: [],
    projects: [
      { id: 1, name: 'Reset Button Workshop', description: '$10 workshop — 60 guided minutes for moms. Drive sales daily.', status: 'active', priority: 'urgent', deadline: null, next_action: 'Post 3 promo pieces this week (Come Cranky angle)', notes: 'Luma event page live. Need caption strategy + daily promo.', assistant: 'content_director', progress: 40, created_at: now, updated_at: now },
      { id: 2, name: 'Room30.ai Launch', description: 'Main offer. New avatar Instagram account + content strategy.', status: 'active', priority: 'high', deadline: null, next_action: 'Set up new Instagram account + first 5 posts', notes: 'AI Mom at Work restricted. New avatar account in planning.', assistant: 'strategist', progress: 15, created_at: now, updated_at: now },
      { id: 3, name: 'AI Mom Podcast', description: '3 episodes queued and ready. Need publish workflow.', status: 'active', priority: 'medium', deadline: null, next_action: 'Set up Riverside + publish Ep 1', notes: 'Episodes recorded. Using Riverside for distribution.', assistant: 'operator', progress: 60, created_at: now, updated_at: now },
    ],
    tasks: [
      { id: 1, title: 'Write 3 captions for Reset Button Workshop', notes: 'Come Cranky / Come Tired / Come Done angles', status: 'today', priority: 'urgent', energy: 'medium', project_id: 1, recurring: false, due_date: null, created_at: now, updated_at: now },
      { id: 2, title: 'Seed mem0 core memories', notes: 'POST /api/mem0 with action:seed', status: 'today', priority: 'high', energy: 'low', project_id: null, recurring: false, due_date: null, created_at: now, updated_at: now },
      { id: 3, title: 'Push Command Center to GitHub + deploy Railway', notes: 'Create GitHub repo, push, connect Railway, add env vars', status: 'today', priority: 'urgent', energy: 'high', project_id: null, recurring: false, due_date: null, created_at: now, updated_at: now },
      { id: 4, title: 'Connect Instagram to Not Your Mom\'s Advice FB Page', notes: 'Required for Meta API access. Instagram → Settings → Linked Accounts', status: 'this_week', priority: 'high', energy: 'medium', project_id: 2, recurring: false, due_date: null, created_at: now, updated_at: now },
      { id: 5, title: 'Publish AI Mom Podcast Ep 1', notes: 'Upload to Riverside, write show notes, share on social', status: 'this_week', priority: 'medium', energy: 'high', project_id: 3, recurring: false, due_date: null, created_at: now, updated_at: now },
    ],
    notes: [
      { id: 1, title: 'Content converts when it opens with a scene', body: 'Never open with a fact. Open with a scene. "She\'s reheating the same coffee for the third time while..." beats "AI can save you 3 hours a day." every time. Lead with the wound, then give the tool.', category: 'framework', tags: ['content', 'hooks', 'voice'], pinned: true, created_at: now, updated_at: now },
      { id: 2, title: 'Business priority order', body: 'Cash flow FIRST. Audience growth SECOND. Systems and scale THIRD. When unsure what to do, ask: does this bring in cash this week? If not, it\'s not a Level 1 priority.', category: 'decision', tags: ['strategy', 'priorities'], pinned: true, created_at: now, updated_at: now },
      { id: 3, title: 'The anchor story', body: '5 months postpartum: addicted to social media, angry, sad, overwhelmed, zero income, coffee and fast food. 90 days later: adaptogens, swimming, yoga, buddha bowls, calm with kids, $3k/month extra. The transformation is the proof. Moms are not behind — they are unsupported.', category: 'personal', tags: ['story', 'brand', 'anchor'], pinned: true, created_at: now, updated_at: now },
    ],
    vision: [
      { id: 1, type: 'future_self', content: 'It\'s 2027. The kids are a little older. The business is built. You\'re waking up without an alarm. You built this during nap times and after bedtime. It was worth every moment you doubted yourself.', created_at: now, updated_at: now },
      { id: 2, type: 'identity', content: 'I am a woman who builds in public, gives generously, and doesn\'t wait until it\'s perfect. I am the proof that moms can do this — not despite their kids, but alongside them.', created_at: now, updated_at: now },
      { id: 3, type: 'season', content: 'This is the season of building the foundation. Every piece of content, every system, every hour of nap time is compounding. I am not behind. I am right on time.', created_at: now, updated_at: now },
      { id: 4, type: 'why', content: 'My kids will grow up watching their mother refuse to shrink. That is the inheritance that matters most. The money is real. The mission is bigger.', created_at: now, updated_at: now },
      { id: 5, type: 'no_longer_available', content: 'I am no longer available for: second-guessing my value, building other people\'s dreams on their timeline, waiting for permission, or choosing busy over intentional.', created_at: now, updated_at: now },
      { id: 6, type: 'evidence', content: 'I built an AI-powered command center during nap times. I have a voice clone. I have a podcast. I have a $10 offer live. I have a team of AI agents working for me while I sleep. The evidence is stacking.', created_at: now, updated_at: now },
    ],
    daily_commands: [],
    memories: [
      { id: 1, category: 'goal', title: '$100k in 90 days', body: 'Primary financial goal. Reset Button Workshop at $10/sale is the current revenue driver. Room30.ai is the main offer. Cash flow first, audience second, systems third.', agent_tags: ['strategist', 'cfo', 'operator'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 2, category: 'voice', title: 'Best hooks start with a scene', body: 'Mandi\'s content converts best when it opens with a visual scene, not a fact. Example: "She\'s reheating the same coffee for the third time..." beats "AI can save you 3 hours a day."', agent_tags: ['content_director'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 3, category: 'fact', title: 'Build windows', body: 'Nap time: ~1.5 hours midday. After bedtime: 9pm-11pm. Never during kid time except 2-minute voice memos. Preston (4), twins Jasmine & Max (2), Lillie (15 months).', agent_tags: ['operator', 'strategist'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 4, category: 'pattern', title: 'Shiny object tendency', body: 'Mandi naturally generates many ideas and feels excited about all of them simultaneously. The Contrarian and Strategist should flag when new ideas are pulling focus from the current revenue priority.', agent_tags: ['contrarian', 'strategist', 'operator'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 5, category: 'decision', title: 'Instagram AI Mom at Work is restricted', body: 'The original AI Mom at Work Instagram account has restrictions. New avatar account for Room30.ai is in planning. This is a Level 1 priority for the sales funnel.', agent_tags: ['strategist', 'content_director', 'operator'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
    content: [
      { id: 1, title: 'The Reset Button Workshop — "Come Cranky"', description: '$10 · 60 glorious guided minutes to yourself. Luma event page live. Instagram + email promo needed.', status: 'ready', type: 'workshop', platforms: ['instagram', 'email', 'tiktok'], tags: ['workshop', 'reset', 'revenue'], transcript: '', notes: 'Luma event page exists. Call to action: click-through to buy. Promo images created (Come Cranky, Come Tired, Come Done). Need caption strategy.', file_path: '', thumbnail_url: '', sort_order: 0, created_at: now, updated_at: now, published_at: null },
      { id: 2, title: 'AI Mom Podcast – Ep 1 (queued)', description: 'Recorded. Waiting for editing and publish approval.', status: 'ready', type: 'podcast', platforms: ['beehiiv', 'youtube'], tags: ['podcast', 'ai', 'education'], transcript: '', notes: 'One of 3 queued episodes. Add transcript when available.', file_path: '', thumbnail_url: '', sort_order: 1, created_at: now, updated_at: now, published_at: null },
      { id: 3, title: 'AI Mom Podcast – Ep 2 (queued)', description: 'Recorded. Waiting for editing and publish approval.', status: 'ready', type: 'podcast', platforms: ['beehiiv', 'youtube'], tags: ['podcast', 'ai'], transcript: '', notes: '', file_path: '', thumbnail_url: '', sort_order: 2, created_at: now, updated_at: now, published_at: null },
      { id: 4, title: 'AI Mom Podcast – Ep 3 (queued)', description: 'Recorded. Waiting for editing and publish approval.', status: 'ready', type: 'podcast', platforms: ['beehiiv', 'youtube'], tags: ['podcast', 'ai'], transcript: '', notes: '', file_path: '', thumbnail_url: '', sort_order: 3, created_at: now, updated_at: now, published_at: null },
      { id: 5, title: 'YouTube Video – AI for Moms (raw)', description: 'Shot and finalized in CapCut. Upload + SEO title + description needed.', status: 'in_progress', type: 'video', platforms: ['youtube'], tags: ['video', 'ai', 'moms'], transcript: '', notes: 'Will also generate: 3 Shorts clips, Instagram Reel, TikTok version', file_path: '', thumbnail_url: '', sort_order: 0, created_at: now, updated_at: now, published_at: null },
      { id: 6, title: 'Wizard of Oz Visual Storyboard Series', description: 'AI-generated Pixar-meets-Oz visual storyboard for AI Mom Instagram. Tornado = AI disruption. Dorothy = every mom.', status: 'idea', type: 'image', platforms: ['instagram'], tags: ['storyboard', 'wizardofoz', 'aiart', 'visual'], transcript: '', notes: 'Separate account needed: @mommystoryboard or similar. Assets will be AI-generated. Use brand symbols: tornado, hot air balloon, willow, golden retriever.', file_path: '', thumbnail_url: '', sort_order: 0, created_at: now, updated_at: now, published_at: null },
      { id: 7, title: '"Moms Are Carrying Too Much" — Post Series', description: 'Trust content. Show the scene before the sell. Piece 1 of 3 completed drafts.', status: 'in_progress', type: 'post', platforms: ['instagram', 'tiktok', 'linkedin'], tags: ['trust', 'authority', 'moms', 'attention'], transcript: '', notes: 'Drafts exist in Downloads. PIECE 1, 2, 3 docs. NOTICE→OBSERVE→UNDERSTAND→SHARE→INVITE framework.', file_path: '', thumbnail_url: '', sort_order: 1, created_at: now, updated_at: now, published_at: null },
      { id: 8, title: 'Room30.ai Launch Content — New Avatar Account', description: 'Content strategy for the replacement Instagram account for Room30 sales. Less salesy, more value-give.', status: 'idea', type: 'video', platforms: ['instagram', 'tiktok'], tags: ['room30', 'avatar', 'sales', 'revenue'], transcript: '', notes: 'AI Mom at Work facing restrictions. New avatar account in planning. Mix: 1 trust + 1 authority + 2 revenue/day.', file_path: '', thumbnail_url: '', sort_order: 1, created_at: now, updated_at: now, published_at: null },
    ],
  }
}

export function readDb(): Db {
  ensureDir()
  if (!fs.existsSync(DB_PATH)) {
    const db = defaultDb()
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
    return db
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as Db
}

export function writeDb(db: Db) {
  ensureDir()
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

export function getAllContent(statusFilter?: string): ContentPiece[] {
  const db = readDb()
  const items = statusFilter ? db.content.filter(c => c.status === statusFilter) : db.content
  return items.sort((a, b) => a.sort_order - b.sort_order || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function createContent(data: Partial<ContentPiece>): ContentPiece {
  const db = readDb()
  const now = new Date().toISOString()
  const piece: ContentPiece = {
    id: db.next_id++,
    title: data.title ?? 'Untitled',
    description: data.description ?? '',
    status: data.status ?? 'idea',
    type: data.type ?? 'other',
    platforms: data.platforms ?? [],
    tags: data.tags ?? [],
    transcript: data.transcript ?? '',
    notes: data.notes ?? '',
    file_path: data.file_path ?? '',
    thumbnail_url: data.thumbnail_url ?? '',
    sort_order: data.sort_order ?? 0,
    created_at: now,
    updated_at: now,
    published_at: null,
  }
  db.content.unshift(piece)
  writeDb(db)
  return piece
}

export function updateContent(id: number, updates: Partial<ContentPiece>): ContentPiece | null {
  const db = readDb()
  const idx = db.content.findIndex(c => c.id === id)
  if (idx === -1) return null
  const now = new Date().toISOString()
  const updated = { ...db.content[idx], ...updates, id, updated_at: now }
  if (updates.status === 'published' && !db.content[idx].published_at) {
    updated.published_at = now
  }
  db.content[idx] = updated
  writeDb(db)
  return updated
}

export function deleteContent(id: number): boolean {
  const db = readDb()
  const before = db.content.length
  db.content = db.content.filter(c => c.id !== id)
  writeDb(db)
  return db.content.length < before
}

export function logIntake(raw_input: string): void {
  const db = readDb()
  db.intake_log.push({ id: Date.now(), raw_input, created_at: new Date().toISOString() })
  writeDb(db)
}

// ── Memory CRUD ───────────────────────────────────────────────────────────────

export function getAllMemories(category?: string): Memory[] {
  const db = readDb()
  const mems = db.memories ?? []
  return category ? mems.filter(m => m.category === category) : mems
}

export function createMemory(data: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Memory {
  const db = readDb()
  if (!db.memories) db.memories = []
  if (!db.next_memory_id) db.next_memory_id = db.memories.length + 1
  const now = new Date().toISOString()
  const mem: Memory = { ...data, id: db.next_memory_id++, created_at: now, updated_at: now }
  db.memories.push(mem)
  writeDb(db)
  return mem
}

export function updateMemory(id: number, updates: Partial<Memory>): Memory | null {
  const db = readDb()
  if (!db.memories) return null
  const idx = db.memories.findIndex(m => m.id === id)
  if (idx === -1) return null
  db.memories[idx] = { ...db.memories[idx], ...updates, id, updated_at: new Date().toISOString() }
  writeDb(db)
  return db.memories[idx]
}

export function deleteMemory(id: number): boolean {
  const db = readDb()
  if (!db.memories) return false
  const before = db.memories.length
  db.memories = db.memories.filter(m => m.id !== id)
  writeDb(db)
  return db.memories.length < before
}

/** Returns memories relevant to a given agent role as an injectable string */
export function getMemoryContext(agentRole?: string): string {
  const db = readDb()
  const mems = (db.memories ?? []).filter(m =>
    !agentRole || m.agent_tags.length === 0 || m.agent_tags.includes(agentRole)
  )
  if (!mems.length) return ''
  return '\n\nMANDI\'S MEMORY (facts, decisions, patterns you must know):\n' +
    mems.map(m => `[${m.category.toUpperCase()}] ${m.title}: ${m.body}`).join('\n')
}

// Keep parseRow as a no-op for API compatibility
export function parseRow(row: ContentPiece): ContentPiece { return row }
export type ContentPieceRowType = ContentPiece

// ── Projects CRUD ─────────────────────────────────────────────────────────────

export function getAllProjects(status?: string): Project[] {
  const db = readDb()
  const items = (db.projects ?? [])
  return status ? items.filter(p => p.status === status) : items
}

export function createProject(data: Partial<Project>): Project {
  const db = readDb()
  if (!db.projects) db.projects = []
  if (!db.next_project_id) db.next_project_id = (db.projects.length || 0) + 1
  const now = new Date().toISOString()
  const p: Project = {
    id: db.next_project_id++,
    name: data.name ?? 'Untitled Project',
    description: data.description ?? '',
    status: data.status ?? 'active',
    priority: data.priority ?? 'medium',
    deadline: data.deadline ?? null,
    next_action: data.next_action ?? '',
    notes: data.notes ?? '',
    assistant: data.assistant ?? 'strategist',
    progress: data.progress ?? 0,
    created_at: now,
    updated_at: now,
  }
  db.projects.push(p)
  writeDb(db)
  return p
}

export function updateProject(id: number, updates: Partial<Project>): Project | null {
  const db = readDb()
  if (!db.projects) return null
  const idx = db.projects.findIndex(p => p.id === id)
  if (idx === -1) return null
  db.projects[idx] = { ...db.projects[idx], ...updates, id, updated_at: new Date().toISOString() }
  writeDb(db)
  return db.projects[idx]
}

export function deleteProject(id: number): boolean {
  const db = readDb()
  if (!db.projects) return false
  const before = db.projects.length
  db.projects = db.projects.filter(p => p.id !== id)
  writeDb(db)
  return db.projects.length < before
}

// ── Tasks CRUD ────────────────────────────────────────────────────────────────

export function getAllTasks(status?: string): Task[] {
  const db = readDb()
  const items = (db.tasks ?? [])
  return status ? items.filter(t => t.status === status) : items
}

export function createTask(data: Partial<Task>): Task {
  const db = readDb()
  if (!db.tasks) db.tasks = []
  if (!db.next_task_id) db.next_task_id = (db.tasks.length || 0) + 1
  const now = new Date().toISOString()
  const t: Task = {
    id: db.next_task_id++,
    title: data.title ?? 'Untitled Task',
    notes: data.notes ?? '',
    status: data.status ?? 'today',
    priority: data.priority ?? 'medium',
    energy: data.energy ?? 'medium',
    project_id: data.project_id ?? null,
    recurring: data.recurring ?? false,
    due_date: data.due_date ?? null,
    created_at: now,
    updated_at: now,
  }
  db.tasks.push(t)
  writeDb(db)
  return t
}

export function updateTask(id: number, updates: Partial<Task>): Task | null {
  const db = readDb()
  if (!db.tasks) return null
  const idx = db.tasks.findIndex(t => t.id === id)
  if (idx === -1) return null
  db.tasks[idx] = { ...db.tasks[idx], ...updates, id, updated_at: new Date().toISOString() }
  writeDb(db)
  return db.tasks[idx]
}

export function deleteTask(id: number): boolean {
  const db = readDb()
  if (!db.tasks) return false
  const before = db.tasks.length
  db.tasks = db.tasks.filter(t => t.id !== id)
  writeDb(db)
  return db.tasks.length < before
}

// ── Notes CRUD ────────────────────────────────────────────────────────────────

export function getAllNotes(category?: string, search?: string): Note[] {
  const db = readDb()
  let items = (db.notes ?? [])
  if (category) items = items.filter(n => n.category === category)
  if (search) {
    const q = search.toLowerCase()
    items = items.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)))
  }
  return items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function createNote(data: Partial<Note>): Note {
  const db = readDb()
  if (!db.notes) db.notes = []
  if (!db.next_note_id) db.next_note_id = (db.notes.length || 0) + 1
  const now = new Date().toISOString()
  const n: Note = {
    id: db.next_note_id++,
    title: data.title ?? 'Untitled',
    body: data.body ?? '',
    category: data.category ?? 'idea',
    tags: data.tags ?? [],
    pinned: data.pinned ?? false,
    created_at: now,
    updated_at: now,
  }
  db.notes.push(n)
  writeDb(db)
  return n
}

export function updateNote(id: number, updates: Partial<Note>): Note | null {
  const db = readDb()
  if (!db.notes) return null
  const idx = db.notes.findIndex(n => n.id === id)
  if (idx === -1) return null
  db.notes[idx] = { ...db.notes[idx], ...updates, id, updated_at: new Date().toISOString() }
  writeDb(db)
  return db.notes[idx]
}

export function deleteNote(id: number): boolean {
  const db = readDb()
  if (!db.notes) return false
  const before = db.notes.length
  db.notes = db.notes.filter(n => n.id !== id)
  writeDb(db)
  return db.notes.length < before
}

// ── Vision CRUD ───────────────────────────────────────────────────────────────

export function getAllVision(): VisionEntry[] {
  const db = readDb()
  return (db.vision ?? []).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function upsertVision(type: VisionType, content: string): VisionEntry {
  const db = readDb()
  if (!db.vision) db.vision = []
  if (!db.next_vision_id) db.next_vision_id = (db.vision.length || 0) + 1
  const now = new Date().toISOString()
  const existing = db.vision.find(v => v.type === type)
  if (existing) {
    existing.content = content
    existing.updated_at = now
    writeDb(db)
    return existing
  }
  const v: VisionEntry = { id: db.next_vision_id++, type, content, created_at: now, updated_at: now }
  db.vision.push(v)
  writeDb(db)
  return v
}

// ── Daily Command ─────────────────────────────────────────────────────────────

export function getDailyCommand(date: string): DailyCommand {
  const db = readDb()
  if (!db.daily_commands) db.daily_commands = []
  const existing = db.daily_commands.find(d => d.date === date)
  return existing ?? { date, top3: ['', '', ''], energy: '', notes: '', updated_at: new Date().toISOString() }
}

export function saveDailyCommand(data: DailyCommand): DailyCommand {
  const db = readDb()
  if (!db.daily_commands) db.daily_commands = []
  const idx = db.daily_commands.findIndex(d => d.date === data.date)
  const updated = { ...data, updated_at: new Date().toISOString() }
  if (idx === -1) db.daily_commands.push(updated)
  else db.daily_commands[idx] = updated
  writeDb(db)
  return updated
}
