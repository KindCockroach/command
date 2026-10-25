// WFH (Works For Her) — shared by the public pages (/assessment, /ugc, /meet) and
// /api/wfh. No db import here so client pages can use it. The assessment is pure
// rules — zero AI tokens per lead — scored on the server so results are consistent.

// What someone is booking a meeting about. Keys travel as ?service= on /meet.
export const WFH_SERVICES: Record<string, string> = {
  'ai-integration': 'Small Business AI Integration',
  'speaking': 'Speaking inquiry',
  'ugc-single': 'UGC · Single Trending Video',
  'ugc-pack': 'UGC · Trend Test Pack',
  'ugc-location': 'UGC · On-Location Content Day',
  'ugc-monthly': 'UGC · Monthly Trending Content',
  'mkt-copy': 'Copy Assessment',
  'mkt-website': 'Website Marketing Assessment',
  'mkt-full': 'Full Marketing Assessment',
  'ugc-unsure': 'UGC & marketing — help me choose',
  'retire': 'RETIRE · Pass down the keys',
}
export const serviceLabel = (key?: string | null) => (key && WFH_SERVICES[key]) || 'A time with Mandi'

type Opt = { value: string; label: string }
export type Question = { id: string; q: string; hint?: string; multi?: boolean; options: Opt[] }

export const QUESTIONS: Question[] = [
  { id: 'role', q: 'Which sounds most like you?', options: [
    { value: 'owner', label: 'I own a business with customers or clients' },
    { value: 'solo', label: 'I’m a solo creator, coach, or service provider' },
    { value: 'starting', label: 'I’m starting something on the side' },
    { value: 'home', label: 'I run a busy household (that’s a business too)' },
  ] },
  { id: 'team', q: 'How many people work in it?', options: [
    { value: 'me', label: 'Just me' }, { value: 'small', label: '2–5' },
    { value: 'mid', label: '6–20' }, { value: 'large', label: 'More than 20' },
  ] },
  { id: 'timesinks', q: 'Where does your week disappear?', hint: 'Pick all that apply.', multi: true, options: [
    { value: 'email', label: 'Email & DMs' },
    { value: 'scheduling', label: 'Scheduling & appointments' },
    { value: 'content', label: 'Social media content' },
    { value: 'writing', label: 'Writing — copy, proposals, newsletters' },
    { value: 'followups', label: 'Following up with leads & customers' },
    { value: 'customers', label: 'Answering the same customer questions' },
    { value: 'money', label: 'Invoices, receipts & bookkeeping' },
    { value: 'research', label: 'Research & planning' },
    { value: 'data', label: 'Spreadsheets & data entry' },
    { value: 'home', label: 'Family logistics — meals, calendars, school' },
  ] },
  { id: 'bottleneck', q: 'If one thing changed tomorrow, what would it be?', options: [
    { value: 'leads', label: 'More customers coming in' },
    { value: 'time', label: 'Hours back in my week' },
    { value: 'content', label: 'Showing up online without it eating my day' },
    { value: 'slip', label: 'Nothing slipping through the cracks' },
    { value: 'tools', label: 'My tools actually talking to each other' },
  ] },
  { id: 'hours', q: 'How many hours a week go to repetitive tasks?', options: [
    { value: 'lt5', label: 'Under 5' }, { value: '5to10', label: '5–10' },
    { value: '10to20', label: '10–20' }, { value: 'gt20', label: 'More than 20' },
  ] },
  { id: 'ai_use', q: 'How are you using AI right now?', options: [
    { value: 'never', label: 'I’m not — it feels overwhelming' },
    { value: 'sometimes', label: 'ChatGPT here and there' },
    { value: 'weekly', label: 'Every week, but it’s not set up for me' },
    { value: 'automations', label: 'I have some automations already' },
  ] },
  { id: 'tools', q: 'Which tools do you already use?', hint: 'Pick all that apply.', multi: true, options: [
    { value: 'google', label: 'Google Workspace' }, { value: 'microsoft', label: 'Microsoft 365' },
    { value: 'canva', label: 'Canva' }, { value: 'meta', label: 'Instagram / Facebook' },
    { value: 'shop', label: 'Shopify / Etsy / Square' }, { value: 'books', label: 'QuickBooks / Wave' },
    { value: 'crm', label: 'A CRM (GoHighLevel, HubSpot…)' }, { value: 'notion', label: 'Notion' },
    { value: 'none', label: 'Mostly pen, paper & my phone' },
  ] },
  { id: 'want', q: 'What kind of help do you want?', options: [
    { value: 'explore', label: 'Show me what’s possible' },
    { value: 'setup', label: 'Set it up with me so I can run it' },
    { value: 'done', label: 'Build it for me' },
  ] },
]

const OPPS: Record<string, { title: string; build: string; hrs: number }> = {
  email: { title: 'Inbox & DM assistant', build: 'Drafts replies in your voice and sorts what actually needs you.', hrs: 3 },
  scheduling: { title: 'Booking on autopilot', build: 'Self-serve booking, reminders, and reschedules — no back-and-forth.', hrs: 2 },
  content: { title: 'Content engine', build: 'One idea in, a week of posts, captions, and scripts out.', hrs: 4 },
  writing: { title: 'A writing partner trained on your voice', build: 'Proposals, newsletters, and listings drafted in minutes.', hrs: 3 },
  followups: { title: 'Follow-up that never slips', build: 'Automatic follow-up for every lead and customer, on time, every time.', hrs: 3 },
  customers: { title: 'Customer questions, answered 24/7', build: 'An assistant trained on your FAQs for your site and DMs.', hrs: 3 },
  money: { title: 'Invoices & bookkeeping prep', build: 'Receipts sorted, invoices drafted, payment reminders sent.', hrs: 2 },
  research: { title: 'Research & planning in minutes', build: 'Market research, plans, and summaries you can act on.', hrs: 2 },
  data: { title: 'Tools that talk to each other', build: 'Forms flow into sheets, sheets into reports — no copy-paste.', hrs: 2 },
  home: { title: 'Family logistics, handled', build: 'Meal plans, shared calendars, and school emails sorted for you.', hrs: 3 },
}
const BOOST: Record<string, string[]> = {
  leads: ['followups', 'content'], time: ['email', 'scheduling'], content: ['content', 'writing'],
  slip: ['followups', 'scheduling'], tools: ['data', 'money'],
}

export type Answers = Record<string, string | string[]>
export type Opportunity = { key: string; title: string; build: string; hrs: number }
export type Assessment = { score: number; level: string; summary: string; hours_per_month: number; top: Opportunity[]; next_step: string; next_detail: string }

export function assess(a: Answers): Assessment {
  const one = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '')
  const many = (k: string) => (Array.isArray(a[k]) ? (a[k] as string[]) : [])
  const sinks = many('timesinks').filter(k => OPPS[k])

  const rank = new Map<string, number>()
  for (const k of Object.keys(OPPS)) rank.set(k, OPPS[k].hrs / 10)
  for (const k of sinks) rank.set(k, (rank.get(k) ?? 0) + 2)
  for (const k of BOOST[one('bottleneck')] ?? []) rank.set(k, (rank.get(k) ?? 0) + 1.5)
  if (one('role') !== 'home') rank.set('home', (rank.get('home') ?? 0) - (sinks.includes('home') ? 0 : 1))
  const top = [...rank.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([key]) => ({ key, ...OPPS[key] }))

  const hourFactor = ({ lt5: 0.5, '5to10': 0.8, '10to20': 1, gt20: 1.3 } as Record<string, number>)[one('hours')] ?? 0.8
  const teamFactor = ({ me: 1, small: 1.5, mid: 2, large: 2.5 } as Record<string, number>)[one('team')] ?? 1
  const hours_per_month = Math.round(top.reduce((s, o) => s + o.hrs, 0) * 4 * hourFactor * teamFactor)

  const base = ({ lt5: 25, '5to10': 45, '10to20': 62, gt20: 75 } as Record<string, number>)[one('hours')] ?? 40
  const aiRoom = ({ never: 12, sometimes: 9, weekly: 6, automations: 2 } as Record<string, number>)[one('ai_use')] ?? 6
  const score = Math.min(98, base + Math.min(12, sinks.length * 3) + aiRoom + (teamFactor > 1 ? 4 : 0))
  const level = score >= 75 ? 'Major time back' : score >= 50 ? 'Big opportunity' : 'Quick wins ahead'
  const summary = score >= 75
    ? 'You’re doing by hand what AI can carry. This is the kind of week that changes fastest.'
    : score >= 50
      ? 'There’s real time hiding in your week. A few well-built pieces will give it back.'
      : 'You’re already lean. A couple of smart setups will still buy you breathing room.'

  const want = one('want')
  const [next_step, next_detail] = want === 'done' || one('team') === 'mid' || one('team') === 'large'
    ? ['Done-for-you AI integration', 'I build your top opportunities inside the tools you already use, then hand them over working.']
    : want === 'setup' || one('ai_use') === 'never' || one('ai_use') === 'sometimes'
      ? ['AI setup, together', 'We set up your #1 opportunity side by side so you leave running it yourself.']
      : ['A custom automation plan', 'We map your top three into one build plan, priced up front.']

  return { score, level, summary, hours_per_month, top, next_step, next_detail }
}

// RISE — the features a personalized recommendation can pick from. Claude chooses
// 3–5 of these by exact name and explains each for THIS person; it can't invent new ones.
export const RISE_FEATURES: { name: string; does: string }[] = [
  { name: 'Commander', does: 'Your AI chief of staff — talk or type what you need and it drafts, plans, files the tasks and notes, and gets it moving.' },
  { name: 'Quick Capture', does: 'Voice notes, ideas, screenshots and links captured in one tap from your phone, then sorted for you automatically.' },
  { name: 'Sorting Hat', does: 'Turns one idea into ready-to-post drafts for each of your brands or accounts, matched to each one’s audience.' },
  { name: 'Content Engine', does: 'Hooks, captions, scripts, and hashtags written in your voice, per platform, from your real life and stories.' },
  { name: 'Content Day Planner', does: 'Plans a filming day — shot list, scripts, and on-screen text — so one session gives you weeks of content.' },
  { name: 'Trends Desk', does: 'Shows what’s trending in your niche each day and tweaks your drafts to ride it.' },
  { name: 'Media Library', does: 'Every photo, video, and audio file in one searchable place, ready to attach to any post.' },
  { name: 'Auto-Publishing', does: 'Approved posts scheduled and published to Instagram, Facebook and more on a steady daily rhythm.' },
  { name: 'Winner Loop', does: 'Scores every post against your own average and tells you what to make more of, rehook, or retire.' },
  { name: 'Goals & Pace', does: 'Set income and content goals; it shows whether you’re ahead or behind and the next move that closes the gap.' },
  { name: 'Daily Command', does: 'A morning brief — today’s priorities, new bookings, and what actually needs you.' },
  { name: 'Tasks & Projects', does: 'Every task and project in one board, with AI breaking big goals into next steps.' },
  { name: 'Story Bank', does: 'Your stories, notes, and ideas banked and searchable, so content and offers come from your real life.' },
  { name: 'Research Desk', does: 'Deep research with live web search, delivered as a clear brief you can act on.' },
  { name: 'Booking & Client Scheduler', does: 'A public booking page with automatic notices and reminders — no back-and-forth emails.' },
  { name: 'Podcast Studio', does: 'Episode planning, teleprompter scripts, guest pipeline and booking, and clip plans for every episode.' },
  { name: 'Repurpose Studio', does: 'One long piece — a video, episode, or post — turned into clips, posts, and emails.' },
  { name: 'Brand Voice & Accounts', does: 'Each brand or account keeps its own voice, audience, and keywords, so everything sounds like you.' },
  { name: 'Assistants & Workflows', does: 'Custom AI assistants for the jobs you repeat every week, built around your tools.' },
  { name: 'Activity Feed', does: 'Everything that happened across your business in one timeline, so nothing slips.' },
]

export type RiseRecommendation = {
  headline: string
  intro: string
  features: { name: string; why: string; first_step: string }[]
  closing: string
}
