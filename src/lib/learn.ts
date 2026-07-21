// Learn from Mandi's hand-edits. Whenever she rewrites a post's on-screen text,
// script, or caption, distill the DEEP pattern behind her changes into durable
// craft rules and store them as voice lessons. Every future generation then
// obeys them automatically (craftFor → getVoiceLessonsContext).
//
// Used by both "Save Changes" (plain save) and "Save Changes & Adjust" (revise).
import { addVoiceLesson } from './db'
import { fableText } from './fable'

type Fields = { onscreen_text?: string | null; script?: string | null; description?: string | null }

export async function learnFromEdits(opts: {
  title: string
  accountId?: string | null
  before: Fields
  after: Fields
}): Promise<string[]> {
  const norm = (s?: string | null) => (s ?? '').trim()
  const changed: { label: string; b: string; a: string }[] = []
  for (const [key, label] of [
    ['onscreen_text', 'ON-SCREEN'],
    ['script', 'SCRIPT'],
    ['description', 'CAPTION'],
  ] as const) {
    const b = norm(opts.before[key])
    const a = norm(opts.after[key])
    // only learn where she actually changed something meaningful
    if (a && b !== a) changed.push({ label, b, a })
  }
  if (!changed.length) return []

  const diff = changed
    .map(f => `### ${f.label}\nMACHINE WROTE:\n${f.b}\n\nMANDI CHANGED IT TO:\n${f.a}`)
    .join('\n\n')

  try {
    const out = await fableText({
      instructions: `Mandi hand-edited a post. Study what she changed across the fields below and distill the DEEP pattern behind her edits into 1-3 durable craft rules (each under 25 words, imperative voice) a content generator can obey forever. Look for TASTE — specificity over description, pain over pictures, her rhythm, the words she deletes, the tone she adds, what she made shorter — never surface wording or one-off facts. If the change is trivial (a typo, a single swapped word), return an empty array. Return ONLY a JSON array of strings.`,
      input: `POST: ${opts.title}\n\n${diff}`,
      maxTokens: 500,
      effort: 'low',
    })
    const arr = JSON.parse(out.match(/\[[\s\S]*\]/)?.[0] ?? '[]') as unknown[]
    const rules = arr.map(r => String(r).trim().replace(/^["']|["']$/g, '')).filter(Boolean).slice(0, 3)
    const bCombined = changed.map(f => `[${f.label}] ${f.b}`).join(' | ')
    const aCombined = changed.map(f => `[${f.label}] ${f.a}`).join(' | ')
    for (const r of rules) addVoiceLesson(r, bCombined, aCombined, opts.accountId)
    return rules
  } catch {
    return []
  }
}
