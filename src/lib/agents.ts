// Client-safe agent metadata — no server imports here.
// Every agent has a 3-letter name tied to its job. `group` splits the chat PERSONAS
// (you talk to them) from the SYSTEM agents (they do work inside RISE). `hands` says
// what each one can actually DO in the station today — honest about who can act vs. advise.
export type GPTRole =
  | 'anchor' | 'ceo' | 'strategist' | 'cfo' | 'operator' | 'contrarian' | 'content_director' | 'future_her' | 'healing' | 'client_offer' | 'research'
  | 'pod' | 'tan' | 'cap' | 'sis' | 'hat'

export type AgentMeta = { name: string; label: string; emoji: string; desc: string; route_when: string; group: 'persona' | 'system'; hands: string }

export const AGENT_META: Record<GPTRole, AgentMeta> = {
  // ── Personas (you talk to them) ──
  anchor:           { name: 'Anc', label: 'Anchor',           emoji: '🎙️', desc: 'Your news editor. Headlines, story separation, which desk each story belongs to.', route_when: 'I have stories tangled in my head and need to know what leads', group: 'persona', hands: 'Files clean stories into Story Studio.' },
  strategist:       { name: 'Str', label: 'Strategist',       emoji: '🗺️', desc: 'Big picture & sequencing', route_when: "I don't know what to do next", group: 'persona', hands: 'Reads goals + pipeline to propose the next move (advises).' },
  cfo:              { name: 'Fin', label: 'CFO',              emoji: '💰', desc: 'Money, ROI, cash flow', route_when: "About to spend or need to know if it's worth it", group: 'persona', hands: 'Reads revenue + goals to pressure-test spend (advises).' },
  operator:         { name: 'Ops', label: 'Operator',         emoji: '⚙️', desc: 'Tasks, timelines, execution', route_when: 'Have a plan and need steps', group: 'persona', hands: 'Breaks plans into tasks and timelines (advises).' },
  contrarian:       { name: 'Con', label: 'Contrarian',       emoji: '🔥', desc: 'Hard truth, blind spots', route_when: "I'm excited and need a reality check", group: 'persona', hands: 'Reality-checks — read-only.' },
  content_director: { name: 'Rex', label: 'Content Director', emoji: '✍️', desc: 'Social, hooks, copy', route_when: 'Have a story or idea that needs to become content', group: 'persona', hands: 'Drafts hooks, captions, and content cards.' },
  future_her:       { name: 'Fut', label: 'Future Her',       emoji: '🔮', desc: 'Legacy, perspective, long view', route_when: "I'm discouraged or playing small", group: 'persona', hands: 'Perspective — read-only.' },
  healing:          { name: 'Zen', label: 'Healing',          emoji: '🌿', desc: 'Reflection, emotional patterns, journaling', route_when: "I'm overwhelmed, reactive, or need to process something", group: 'persona', hands: 'Reflection + journaling — read-only.' },
  client_offer:     { name: 'Cli', label: 'Client & Offer',   emoji: '🎯', desc: 'Offer design, client delivery, messaging', route_when: "I'm building an offer or serving a client", group: 'persona', hands: 'Shapes offers and client messaging.' },
  research:         { name: 'Owl', label: 'Research',         emoji: '🔭', desc: 'Tools, trends, examples, summaries · live web + citations', route_when: "I need to know what's out there before I build or decide", group: 'persona', hands: 'Live web search with citations.' },
  // ── System agents (they do work inside RISE) ──
  ceo:              { name: 'Com', label: 'Commander',        emoji: '👑', desc: 'CEO of RISE. The whole business, one brain — decides, connects, and runs the station.', route_when: "I'm uncovering something big and it touches everything", group: 'system', hands: 'Runs RISE — drafts posts, moves cards, updates goals, logs activity.' },
  hat:              { name: 'Hat', label: 'Sorting Hat',      emoji: '🎩', desc: 'Sorts every drop and stream into the River and the right account.', route_when: 'I dropped something and it needs to find its home', group: 'system', hands: 'Reads drops/streams and files them into the River + accounts.' },
  pod:              { name: 'Pod', label: 'Podcast Writer',   emoji: '🎙️', desc: 'Writes and revises AI Mom episode scripts from your banked notes.', route_when: 'I need an episode drafted or tightened', group: 'system', hands: 'Drafts and revises podcast episode scripts.' },
  tan:              { name: 'Tan', label: 'Transcriber',      emoji: '📝', desc: 'Turns your audio and video drops into clean text.', route_when: 'I have a recording that needs words', group: 'system', hands: 'Transcribes audio/video drops into text.' },
  cap:              { name: 'Cap', label: 'Campaign Manager', emoji: '📣', desc: 'Composes and sends campaign emails to your lists and keeps the cadence clock.', route_when: 'I need to reach out to a list', group: 'system', hands: 'Composes emails (sending + cadence land in the composer build).' },
  sis:              { name: 'Sis', label: 'Systems',          emoji: '🛠️', desc: 'Keeps RISE healthy — watches the stores, flags what’s broken, handles setup.', route_when: 'Something in RISE seems off or needs configuring', group: 'system', hands: 'Reports RISE health and flags issues (read-only for now).' },
}
