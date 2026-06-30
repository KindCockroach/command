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

type Db = {
  content: ContentPiece[]
  intake_log: { id: number; raw_input: string; created_at: string }[]
  memories: Memory[]
  next_id: number
  next_memory_id: number
}

function ensureDir() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
}

function defaultDb(): Db {
  const now = new Date().toISOString()
  return {
    next_id: 9,
    next_memory_id: 1,
    intake_log: [],
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
