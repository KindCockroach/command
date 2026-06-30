// Client-safe agent metadata — no server imports here
export type GPTRole = 'strategist' | 'cfo' | 'operator' | 'contrarian' | 'content_director' | 'future_her' | 'healing' | 'client_offer' | 'research'

export const AGENT_META: Record<GPTRole, { label: string; emoji: string; desc: string; route_when: string }> = {
  strategist:       { label: 'Strategist',       emoji: '🗺️', desc: 'Big picture & sequencing',                    route_when: "I don't know what to do next" },
  cfo:              { label: 'CFO',               emoji: '💰', desc: 'Money, ROI, cash flow',                       route_when: "About to spend or need to know if it's worth it" },
  operator:         { label: 'Operator',          emoji: '⚙️', desc: 'Tasks, timelines, execution',                 route_when: "Have a plan and need steps" },
  contrarian:       { label: 'Contrarian',        emoji: '🔥', desc: 'Hard truth, blind spots',                    route_when: "I'm excited and need a reality check" },
  content_director: { label: 'Content Director',  emoji: '🎙️', desc: 'Podcast, social, hooks, copy',              route_when: "Have a story or idea that needs to become content" },
  future_her:       { label: 'Future Her',        emoji: '🔮', desc: 'Legacy, perspective, long view',              route_when: "I'm discouraged or playing small" },
  healing:          { label: 'Healing',           emoji: '🌿', desc: 'Reflection, emotional patterns, journaling', route_when: "I'm overwhelmed, reactive, or need to process something" },
  client_offer:     { label: 'Client & Offer',    emoji: '🎯', desc: 'Offer design, client delivery, messaging',   route_when: "I'm building an offer or serving a client" },
  research:         { label: 'Research',          emoji: '🔭', desc: 'Tools, trends, examples, summaries',         route_when: "I need to know what's out there before I build or decide" },
}
