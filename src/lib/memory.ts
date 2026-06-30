/**
 * mem0 integration — persistent, semantic AI memory for Mandi's Command Center.
 *
 * All agent calls automatically:
 *   1. Search mem0 for relevant memories before responding
 *   2. Add the conversation to mem0 so it learns over time
 *
 * User ID is fixed to 'mandi' so all memories belong to one profile.
 */

import { MemoryClient } from 'mem0ai'

const USER_ID = 'mandi'

let _client: MemoryClient | null = null
function client(): MemoryClient | null {
  if (!process.env.MEM0_API_KEY) return null
  if (!_client) _client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY })
  return _client
}

/** Add a conversation turn to mem0 — call after every agent response */
export async function rememberConversation(
  userMessage: string,
  agentResponse: string,
  agentRole: string
): Promise<void> {
  const c = client()
  if (!c) return
  try {
    await c.add(
      [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: agentResponse },
      ],
      {
        userId: USER_ID as string,
        metadata: { agent: agentRole, timestamp: new Date().toISOString() },
      }
    )
  } catch (e) {
    console.warn('mem0 add failed:', e)
  }
}

/** Search mem0 for memories relevant to a query — inject into agent context */
export async function recallMemories(query: string, topK = 8): Promise<string> {
  const c = client()
  if (!c) return ''
  try {
    const { results } = await c.search(query, { filters: { user_id: USER_ID }, topK })
    if (!results?.length) return ''
    const lines = results.map(m => `• ${m.memory ?? ''}`.trim()).filter(l => l.length > 2)
    return '\n\nRELEVANT MEMORIES FROM PAST CONVERSATIONS:\n' + lines.join('\n')
  } catch (e) {
    console.warn('mem0 search failed:', e)
    return ''
  }
}

/** Explicitly add a single fact to mem0 */
export async function addFact(fact: string, category?: string): Promise<void> {
  const c = client()
  if (!c) return
  try {
    await c.add(
      [{ role: 'user', content: fact }],
      {
        userId: USER_ID as string,
        metadata: { category: category ?? 'fact', source: 'manual', timestamp: new Date().toISOString() },
      }
    )
  } catch (e) {
    console.warn('mem0 addFact failed:', e)
  }
}

/** Get all memories (for the Brain page display) */
export async function getAllMemories(): Promise<{ id: string; memory: string; metadata?: Record<string, unknown> }[]> {
  const c = client()
  if (!c) return []
  try {
    const result = await c.getAll({ filters: { user_id: USER_ID }, pageSize: 100 } as Parameters<typeof c.getAll>[0])
    return (result.results ?? []).map(m => ({ id: m.id, memory: m.memory ?? '', metadata: m as unknown as Record<string, unknown> }))
  } catch (e) {
    console.warn('mem0 getAll failed:', e)
    return []
  }
}

/** Delete a specific memory by ID */
export async function deleteMemory(memoryId: string): Promise<void> {
  const c = client()
  if (!c) return
  try {
    await c.delete(memoryId)
  } catch (e) {
    console.warn('mem0 delete failed:', e)
  }
}

/** Seed mem0 with Mandi's core facts on first run */
export async function seedCoreMemories(): Promise<void> {
  const c = client()
  if (!c) return

  const facts = [
    "Mandi Beck is building an AI-powered content business during nap time and after bedtime. She has four kids: Preston (4), twins Jasmine and Max (2), Lillie (15 months). Her husband is the provider.",
    "Mandi's primary goal is $100k in 90 days. Current offer: Reset Button Workshop at $10. Main platform: Room30.ai. Podcast: AI Mom.",
    "Mandi's build windows: nap time ~1.5 hours midday, after bedtime 9-11pm. Kid time is sacred and protected.",
    "Mandi's Instagram AI Mom at Work account has restrictions. A new avatar account for Room30.ai is in planning.",
    "Mandi's content converts best when it opens with a scene, not a fact. Voice test: would her most honest best friend say this at a dinner table?",
    "Mandi's core message: Moms are not behind. They are unsupported. Lead with the wound, then give the tool.",
    "Mandi's business priority order: cash flow first, audience growth second, systems and scale third.",
    "Mandi tends to get excited about multiple ideas simultaneously. Shiny object risk is high. Always ask: is this a Level 1 or Level 3 priority?",
    "Mandi's ElevenLabs voice clone is 'Mandi at Kitchen Table Clone' (voice_id: 9Xd8gcxL1ovArhq9073l).",
    "Mandi's content pillars: (1) AI Made Simple for Moms (2) Giving Is a Strategy (3) Motherhood + Ambition (4) Behind the Build.",
    "Mandi's signature content series: Command Center Diaries, Ambitious Mom Truths, AI Saved My Brain This Week, Stop Doing This Manually, Build It With the Kids in the Background.",
  ]

  for (const fact of facts) {
    await addFact(fact, 'core')
    await new Promise(r => setTimeout(r, 200)) // gentle rate limiting
  }
}
