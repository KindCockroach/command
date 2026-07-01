import fs from 'fs'
import path from 'path'

// DB_PATH env var lets Railway Volume override the default local path
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'db.json')
const DB_DIR = path.dirname(DB_PATH)

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

export type BrandAccount = {
  id: string
  handle: string
  platform: string
  status: 'active' | 'restricted' | 'planned' | 'paused'
  priority: 'high' | 'medium' | 'low'
  color: string
  emoji: string
  // Brand DNA from Excel
  brand_name: string
  topic: string
  bio: string
  mission: string
  content_format: string
  underlying_message: string
  problem_message: string
  solution_message: string
  transformation: string   // "from X to Y"
  the_how: string
  tone: string
  beliefs: string[]
  hooks: string[]          // pre-written hooks from Hook Workbook
  offer?: string           // low-ticket offer tied to this account
  offer_price?: string
  url?: string
  notes?: string
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
  brand_accounts: BrandAccount[]
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
    brand_accounts: [
      { id: 'aimomatwork', handle: '@aimomatwork', platform: 'Instagram', status: 'restricted', priority: 'high', color: '#E1306C', emoji: '🤖', brand_name: 'AI Mom at Work', topic: 'AI tools for moms', bio: 'Helping moms use AI to get their time back. Room30.ai founder.', mission: 'Sell Room30.ai. Show moms that AI works for them, not against them.', content_format: 'Reels, carousels, direct offers', underlying_message: 'You deserve help. AI is that help.', problem_message: 'You\'re doing everything manually and it\'s costing you your life.', solution_message: 'AI can run the backend while you show up for the front.', transformation: 'From buried in busywork to running a business with AI', the_how: 'One system at a time', tone: 'Direct, confident, zero fluff', beliefs: ['AI is not the future. It\'s the now.', 'Moms are the most underestimated operators on earth.', 'Your time is worth protecting.'], hooks: ['POV: You let AI write your captions while you napped', 'Tell me you\'re a mom without telling me you\'re a mom', 'The $10 tool that gave me my mornings back'], offer: 'Room30.ai membership', offer_price: '$10/day', notes: 'Restricted — rebuilding value ratio. Prioritize give > ask.' },
      { id: 'mandijoy', handle: '@mandij0y', platform: 'Instagram', status: 'active', priority: 'high', color: '#F2A65A', emoji: '✨', brand_name: 'Mandi Joy', topic: 'Inner child, confidence, parts work', bio: '✨Embrace your extraordinary✨\nAnd your inner child\nYour daily reminder to play more, laugh louder, and overcome your discomfort around people', mission: 'Spread joy, confidence, and self-esteem. Invite strangers to dance in public.', content_format: 'Dancing in public, inner child parts work, personal shares', underlying_message: 'You have what it takes to enjoy your days no matter what is going on.', problem_message: 'I was super sad for a long time', solution_message: 'Gratitude changed everything.', transformation: 'From down and out to up and about — one story at a time', the_how: 'One story at a time', tone: 'Light, fresh, joyful', beliefs: ['Inner Child healing is real', 'HEB (Human Emotional Behavior) drives everything', 'The journey IS the destination'], hooks: ['5 Signs she\'s confident, not crazy', '5 red flags that actually mean she\'s worth it', 'You say unhinged, I say deprogrammed', 'Why is no one talking about your pleasure threshold?!', 'I used to hate that version of me until I did this', 'Loving your cringy self is the poor man\'s ayahuasca'] },
      { id: 'empoweredsupermom', handle: '@empoweredsupermom', platform: 'Instagram', status: 'active', priority: 'high', color: '#3DAA7C', emoji: '💪', brand_name: 'Empowered Super Mom', topic: 'Nervous system, safe kids, sane moms', bio: 'Empowering safe kids and sane moms\nFollow her on the go 💃🏽 with 4 under 4\n🌎 All parenting styles welcome', mission: 'Empower moms to soothe their overstimulated nervous system, giving greater safety to their kids.', content_format: 'Voiceover videos of me talking my babies through steps — kids making safe choices while exploring', underlying_message: 'Restore your nervous system.', problem_message: 'You are the problem. (Start with yourself.)', solution_message: 'Start with yourself — your nervous system is contagious.', transformation: 'From your wits end to expanded — one minute at a time', the_how: 'One minute at a time', tone: 'Empathetic peer — "I\'m listening"', beliefs: ['Most kids are overtired, undernourished, and dehydrated. Same goes for moms.', 'Kids are safer when encouraged to explore with curious, focused questions.'], hooks: ['How I talk to my babies about hurt feelings... when I\'m the one who is hurting', 'Mom of 4 under 4 coming through', 'Every time my heart leaps, I don\'t yell — I ask questions', 'The moment you\'re yelling "be careful" is the moment you need to try this', 'My twins don\'t need a referee. They need a pause button.', '"Be careful" won\'t raise strong kids. But falling and recovering will.'] },
      { id: 'youradhdnature', handle: '@youradhdnature', platform: 'Instagram', status: 'active', priority: 'high', color: '#9B8FA6', emoji: '🌿', brand_name: 'Your ADHD Nature', topic: 'ADHD in women, nature, presence', bio: 'No quiz, no personality profile, no app, no games\nJust a $10 ebook that opens your eyes\nFor the undiagnosed, the exhausted, and the determined', mission: 'Support women with ADHD via simple reminders — present pause, daily intention, next simplest step toward highest purpose.', content_format: '8-second nature videos with text overlays', underlying_message: 'Breathe. You can grow through this like the trees, with ADHD like the mushrooms that connect the forest floor.', problem_message: 'Undiagnosed and not enough tools', solution_message: 'This $10 ebook — built with AI from the latest research — shows you how to spot it, what to do with it, and where to install systems.', transformation: 'From cancelling plans to leading communities — one habit at a time', the_how: 'One habit at a time', tone: 'Gentle, inviting', beliefs: ['ADHD is supported by nature, visuals of nature, imagining you\'re in nature, accepting your nature.'], hooks: [], offer: 'ADHD Ebook', offer_price: '$10' },
      { id: 'theadderalleffect', handle: '@theadder.alleffect', platform: 'Instagram', status: 'active', priority: 'medium', color: '#C0A87E', emoji: '⚡', brand_name: 'The Adder All Effect', topic: 'ADHD hacking, mindset, goal systems', bio: 'ADHD Hacker | Mindset Aficionado | Goal Getter\nSharing a system based on the latest science. Adderall doesn\'t manage goals. Here\'s Your Cheat Sheet', mission: 'Drive traffic to sell ADHD ebooks via 5-second luxury content.', content_format: '5-second luxury footage — fancy nature, cars, women — claiming you can have it all with ADHD if you buy the ebook', underlying_message: 'Get a system. Buy the ebook.', problem_message: 'Drugs don\'t manage goals.', solution_message: 'This is the system to use.', transformation: 'From losing to winning — one win at a time', the_how: 'One win at a time', tone: 'Authoritative', beliefs: ['Men chase money, cars, and women — I can drive them toward progress by leading with beauty and power.'], hooks: [], offer: 'ADHD Goals Ebook', offer_price: '$10' },
      { id: 'content4queens', handle: '@content4queens', platform: 'Instagram', status: 'active', priority: 'medium', color: '#E8448A', emoji: '👑', brand_name: 'Content 4 Queens', topic: 'Women making money online, content systems', bio: 'Give other women the playbook to financial freedom with the internet', mission: 'Give women the playbook to financial freedom online.', content_format: 'Videos with Em, Liz, and Mandi — sisterhood memes', underlying_message: 'You have everything you need.', problem_message: 'You lack clarity.', solution_message: 'Clarity (and a system) gives you consistency.', transformation: 'From drowning in social media to swimming in a sea of money — one message at a time', the_how: 'One message at a time', tone: 'Laughing, sister energy', beliefs: [], hooks: [] },
      { id: 'homeschool4humans', handle: '@homeschool4humans', platform: 'Instagram', status: 'active', priority: 'medium', color: '#5A9E6F', emoji: '📚', brand_name: 'Homeschool 4 Humans', topic: 'Homeschooling, unschooling, world schooling', bio: 'Learning about our home\nBodies, land, seas, space\nCultures, food, music, art\nThe Beatles meets Shakespeare with a side of science. Math is inevitable.', mission: 'Enlighten the movement of unschoolers, homeschoolers, and world schoolers on topics that matter.', content_format: 'My kids on the go and learning', underlying_message: 'Kids need guidance.', problem_message: 'Kids are not gurus.', solution_message: 'Be the guidance they deserve.', transformation: 'From feeling like something is missing to discovering the age of information together — one interest at a time', the_how: 'One interest at a time', tone: 'Light & bright', beliefs: ['Unschooling is a disservice to society.', 'Public school serves the lowest common denominator — my kids are more a root than a bottom number.', 'Social norms are worth questioning — I want control over what influences my kids.'], hooks: [] },
      { id: 'art4thefeminine', handle: '@art4thefeminine', platform: 'Instagram', status: 'active', priority: 'medium', color: '#C77DFF', emoji: '🎨', brand_name: 'Art 4 the Feminine', topic: 'Art, feminine power, women rising', bio: 'Speaking up for the feminine in a man\'s world', mission: 'Speak up for the feminine in a man\'s world.', content_format: 'Making art', underlying_message: 'You are free.', problem_message: 'Women are a target.', solution_message: 'Rise up anyway.', transformation: 'From fearful to free — one project at a time', the_how: 'One project at a time', tone: 'Empowering — "I see you."', beliefs: [], hooks: [] },
      { id: 'philosophicalmom', handle: '@philosophicalmom', platform: 'Instagram', status: 'active', priority: 'medium', color: '#748CAB', emoji: '🧠', brand_name: 'Philosophical Mom', topic: 'Philosophy, stoicism, motherhood', bio: 'detangling concepts and content from my mind in real time', mission: 'Detangle concepts from mind in real time.', content_format: 'Carousels of writing — stories, stoicism, philosophy', underlying_message: 'Seek clarity.', problem_message: 'Life is complex.', solution_message: 'Philosophy gives you a frame.', transformation: 'From confusion to clarity', the_how: 'One concept at a time', tone: 'Thoughtful, curious', beliefs: [], hooks: [] },
      { id: 'aimompodcast', handle: '@aimompodcast', platform: 'Instagram', status: 'active', priority: 'high', color: '#FF6B35', emoji: '🎙', brand_name: 'AI Mom Podcast', topic: 'AI for moms — education, interviews, tools', bio: 'The podcast for moms who want to use AI without the overwhelm', mission: 'Educate moms on AI through stories, interviews, and real demos. No sales. Pure give.', content_format: 'Podcast clips, audiograms, episode promos', underlying_message: 'AI is for you.', problem_message: 'AI feels overwhelming and like it\'s not for regular people.', solution_message: 'One episode at a time, we make AI simple.', transformation: 'From intimidated to empowered', the_how: 'One episode at a time', tone: 'Educational, warm, conversational', beliefs: ['Moms are the most creative problem solvers on earth.'], hooks: [] },
      { id: 'airevealsus', handle: '@airevealsus', platform: 'Instagram', status: 'active', priority: 'medium', color: '#4CC9F0', emoji: '🔍', brand_name: 'AI Reveals Us', topic: 'AI self-discovery, what AI reveals about humanity', bio: 'What AI reveals about who we are', mission: 'Explore what AI reveals about human nature, connection, and meaning.', content_format: 'Thought experiments, AI-generated images with meaning', underlying_message: 'AI reveals us to ourselves.', problem_message: 'We fear what AI says about us.', solution_message: 'Let it. The mirror is the medicine.', transformation: 'From fear to fascination', the_how: 'One revelation at a time', tone: 'Curious, philosophical', beliefs: ['The AI age is a spiritual event, not just a tech event.'], hooks: [] },
      { id: 'youradhdhusband', handle: '@youradhdhusband', platform: 'Instagram', status: 'planned', priority: 'medium', color: '#F77F00', emoji: '🤪', brand_name: 'Your ADHD Husband', topic: 'Wives of men with ADHD — humor, relief, education', bio: 'Make wives of ADHD men laugh and relate', mission: 'Make wives of ADHD men laugh and feel seen.', content_format: 'Humor, relatable moments, ADHD education from partner perspective', underlying_message: 'You\'re not crazy.', problem_message: 'Your husband is absurd.', solution_message: 'Learn about ADHD — it explains everything.', transformation: 'From lonely to held — one angle at a time', the_how: 'One angle at a time', tone: 'Funny', beliefs: [], hooks: [] },
      { id: 'survivethedome', handle: '@survivethedome', platform: 'Instagram', status: 'active', priority: 'medium', color: '#2D6A4F', emoji: '🌍', brand_name: 'Survive the Dome', topic: 'Preparedness, resilience, sovereign living', bio: 'For the woman who knows something is coming and wants to be ready', mission: 'Equip families with practical survival skills, mindset, and community.', content_format: 'Practical tips, family preparedness, community building', underlying_message: 'Being prepared is an act of love.', problem_message: 'Most people are one crisis away from chaos.', solution_message: 'Preparedness is a practice, not a panic.', transformation: 'From anxious to equipped', the_how: 'One skill at a time', tone: 'Calm authority, practical', beliefs: ['Sovereignty begins at home.'], hooks: [] },
      { id: 'gettriggered', handle: '@gettriggered', platform: 'Instagram', status: 'planned', priority: 'low', color: '#E07A5F', emoji: '⚡', brand_name: 'Get Triggered', topic: 'Triggers as doorways to healing', bio: 'The benefits of getting triggered', mission: 'Reframe triggers as activation, not attack.', content_format: 'Short philosophy, personal shares, breath work prompts', underlying_message: 'Triggers are a doorway to healing.', problem_message: 'Being triggered is bad.', solution_message: 'Let it activate you.', transformation: 'From angry to curious — one breath at a time', the_how: 'One breath at a time', tone: 'Compassionate — "Sucks, but you can do this."', beliefs: [], hooks: [] },
    ],
    projects: [
      { id: 1, name: 'Reset Button Workshop', description: '$10 workshop — 60 guided minutes for moms. Drive sales daily.', status: 'active', priority: 'urgent', deadline: null, next_action: 'Post 3 promo pieces this week (Come Cranky angle)', notes: 'Luma event page live. Need caption strategy + daily promo.', assistant: 'content_director', progress: 40, created_at: now, updated_at: now },
      { id: 2, name: 'Room30.ai Launch', description: 'Main offer. New avatar Instagram account + content strategy.', status: 'active', priority: 'high', deadline: null, next_action: 'Set up new Instagram account + first 5 posts', notes: 'AI Mom at Work restricted. New avatar account in planning.', assistant: 'strategist', progress: 15, created_at: now, updated_at: now },
      { id: 3, name: 'AI Mom Podcast', description: '3 episodes queued and ready. Need publish workflow.', status: 'active', priority: 'medium', deadline: null, next_action: 'Set up Riverside + publish Ep 1', notes: 'Episodes recorded. Using Riverside for distribution.', assistant: 'operator', progress: 60, created_at: now, updated_at: now },
    ],
    tasks: [
      { id: 1, title: 'Generate Reset Button Workshop posts in Projects tab', notes: 'Projects → Reset Button Workshop → open card → Generate Posts → 20 posts → check Content Pipeline', status: 'today', priority: 'urgent', energy: 'low', project_id: 1, recurring: false, due_date: null, created_at: now, updated_at: now },
      { id: 2, title: 'Connect Instagram in GoHighLevel Social Planner', notes: 'GHL → Social Planner → Connect accounts → Instagram + Facebook Page', status: 'this_week', priority: 'high', energy: 'medium', project_id: null, recurring: false, due_date: null, created_at: now, updated_at: now },
      { id: 3, title: 'Upload Podcast Ep 1 to Riverside for distribution', notes: 'Upload audio to Riverside → auto-distributes to Spotify, Apple Podcasts, YouTube', status: 'this_week', priority: 'urgent', energy: 'high', project_id: 3, recurring: false, due_date: null, created_at: now, updated_at: now },
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
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as Db
  // Migrate: add brand_accounts if missing
  if (!db.brand_accounts || db.brand_accounts.length === 0) {
    db.brand_accounts = defaultDb().brand_accounts
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
  }
  return db
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

// ── Brand Accounts ─────────────────────────────────────────────────────────────

export function getAllBrandAccounts(): BrandAccount[] {
  const db = readDb()
  if (!db.brand_accounts) db.brand_accounts = defaultDb().brand_accounts
  return db.brand_accounts
}

export function getBrandAccount(id: string): BrandAccount | null {
  return getAllBrandAccounts().find(a => a.id === id) ?? null
}

export function upsertBrandAccount(data: Partial<BrandAccount> & { id: string }): BrandAccount {
  const db = readDb()
  if (!db.brand_accounts) db.brand_accounts = defaultDb().brand_accounts
  const idx = db.brand_accounts.findIndex(a => a.id === data.id)
  if (idx !== -1) {
    db.brand_accounts[idx] = { ...db.brand_accounts[idx], ...data }
    writeDb(db)
    return db.brand_accounts[idx]
  }
  const newAccount = { ...data } as BrandAccount
  db.brand_accounts.push(newAccount)
  writeDb(db)
  return newAccount
}
