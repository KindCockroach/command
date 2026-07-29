// Learn from Mandi's hand-edits. Whenever she rewrites a post's on-screen text,
// script, or caption, distill the DEEP pattern behind her changes into durable
// craft rules and store them as voice lessons. Every future generation then
// obeys them automatically (craftFor → getVoiceLessonsContext).
//
// Used by both "Save Changes" (plain save) and "Save Changes & Adjust" (revise).
import { addVoiceLesson } from './db'
import { fableText } from './fable'

type Fields = { onscreen_text?: string | null; script?: string | null; description?: string | null }

// Learn from Mandi's plain-language FEEDBACK on a caption (not a hand-edit). Her
// feedback is the taste signal; distill it into durable voice lessons so every
// future generation obeys it. Used by /api/content/recaption.
export async function learnFromFeedback(opts: {
  title: string
  accountId?: string | null
  feedback: string
  before: string
  after: string
}): Promise<string[]> {
  const feedback = (opts.feedback ?? '').trim()
  if (!feedback) return []
  try {
    const out = await fableText({
      instructions: `Mandi gave feedback to redirect a caption's voice. Distill the DEEP, durable preference behind her feedback into 1-3 craft rules (each under 25 words, imperative voice) a content generator can obey FOREVER — capture the taste (her rhythm, what she rejects, the tone she wants), never a one-off fact. If the feedback is too vague or trivial to generalize, return an empty array. Return ONLY a JSON array of strings.`,
      input: `POST: ${opts.title}\n\nHER FEEDBACK: ${feedback}\n\nCAPTION BEFORE:\n${opts.before}\n\nCAPTION AFTER (following her feedback):\n${opts.after}`,
      maxTokens: 400,
      effort: 'low',
    })
    const arr = JSON.parse(out.match(/\[[\s\S]*\]/)?.[0] ?? '[]') as unknown[]
    const rules = arr.map(r => String(r).trim().replace(/^["']|["']$/g, '')).filter(Boolean).slice(0, 3)
    for (const r of rules) addVoiceLesson(r, opts.before, opts.after, opts.accountId)
    return rules
  } catch {
    return []
  }
}

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
