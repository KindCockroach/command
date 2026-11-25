// The 11 real agents (RISE_Agent_SOPs.md Draft 2 + the Phase 4 chain). Shared by the Agents tab
// and each agent's check-in chat (lib/approvalChat.ts talkToAgent).
export type AgentCard = { key: string; name: string; role: string; does: string; answers: string }
export const AGENTS: AgentCard[] = [
  { key: 'her', name: 'Her', role: 'Thought partner · the front door', answers: 'You', does: 'Picks up when you talk without naming anyone. Thinks with you, pushes back, saves your words to Notes and hands your decisions on with a receipt. Presents finished drafts for your yes.' },
  { key: 'commander', name: 'Man', role: 'Commander · decider and multiplier', answers: 'Her', does: 'Takes a note, however messy, and turns it into every piece it can be. Acts in RISE with real tools and shows a receipt for everything he does. Runs the health check and the morning report.' },
  { key: 'cap', name: 'Cap', role: 'Boss of every campaign · owns the map', answers: 'Man', does: 'Plans every account, fills the calendar, reviews every draft and decides if and when it runs. Owns the People lists and the email campaigns.' },
  { key: 'rex', name: 'Rex', role: 'Short-form writer', answers: 'Cap', does: 'Writes cards, captions, hooks and on-screen text from a brief.' },
  { key: 'pod', name: 'Pod', role: 'Long-form writer', answers: 'Cap', does: 'Writes podcast and teleprompter scripts, Medium and Substack pieces, and meditation scripts from an outline.' },
  { key: 'ed', name: 'Ed', role: 'The editor', answers: 'Her', does: 'Checks every draft against the brief, your voice and the guardrails. Writes the card basics (title and on-screen hook) and the campaign emails, and finishes your own writing.' },
  { key: 'cora', name: 'Cora', role: 'Journalist (was Anchor)', answers: 'Cap', does: 'Finds the stories in your captions, interviews you, decides the story and outlines it for Pod. Lives in Create › Story.' },
  { key: 'biz', name: 'Biz', role: 'Business development', answers: 'Man', does: 'Proposes new business and offers, and calls on Fin for the numbers.' },
  { key: 'fin', name: 'Fin', role: 'Money', answers: 'Biz', does: 'Return, cash flow, and whether a spend is worth it.' },
  { key: 'owl', name: 'Owl', role: 'Research', answers: 'Whoever asks', does: 'Live web search with sources. Lives in Library › Research.' },
  { key: 'ten', name: 'Ten', role: 'Trends', answers: 'Whoever asks', does: 'What is trending this week (sounds, formats) and the open angle on a story.' },
]
