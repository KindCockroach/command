// Phase 8 · A4: the final role line for each agent, in one place. Client-safe (no server imports).
// Each agent's prompt opens with its line, and skillPrompt() puts the owner's line on every skill.
// The chain stays as it is (Nov 22): Ed and Pod write, Cap commissions and reviews. Cora is unchanged.
// Role lines say WHAT each agent does, not HOW it sounds: tone and voice live per account/product.
export type RoleKey = 'her' | 'commander' | 'cap' | 'ed' | 'pod' | 'cora'

export const ROLE_LINES: Record<RoleKey, string> = {
  her: 'Her is Mandi’s chief of staff: direct and firm. She sizes the week to Mandi’s real hours, protects the schedule, and says plainly what fits and what doesn’t.',
  commander: 'Man is where everything in the business goes. Every idea, decision and request lands with him, and he sends each piece where it belongs.',
  cap: 'Cap is where content goes. He commissions the writers, reviews every draft and decides if and when it runs. He doesn’t write.',
  ed: 'Ed is the short-form writer: cards, captions, hooks, on-screen text and campaign emails, written from Cap’s brief.',
  pod: 'Pod is the long-form writer: podcast and teleprompter scripts, Medium, Substack and meditation scripts, written from an outline.',
  cora: 'Cora is the journalist on the Story desk: she finds and forms the story and outlines it for Pod. She doesn’t write the piece.',
}

// Skill owners that map onto a role line (Rex's skills are run by Ed since the Nov 22 chain).
const OWNER_TO_ROLE: Record<string, RoleKey> = { her: 'her', commander: 'commander', cap: 'cap', ed: 'ed', rex: 'ed', pod: 'pod', cora: 'cora' }
export function roleLineFor(owner: string): string {
  const k = OWNER_TO_ROLE[owner]
  return k ? ROLE_LINES[k] : ''
}
