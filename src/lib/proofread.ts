// Cap's last sweep. When Mandi saves her own edits (an email, a card), Cap fixes only the
// mechanical slips: misspellings, typos, doubled words, missing or wrong punctuation,
// apostrophes, a lowercase sentence start. He never rewrites: her words, voice, slang,
// swearing, emphasis (ALL CAPS, lowercase on purpose), emojis, line breaks, links,
// placeholders and names stay exactly as she wrote them. If his version changes more than
// a slip would, or drops a link or placeholder, her version is kept for that field.
// If the sweep fails, her edit is saved untouched.

import { fableText } from './fable'
import { extractJsonObject } from './jsonkit'

type Fields = Record<string, string>

const tokens = (s: string) => [
  ...(s.match(/https?:\/\/[^\s)\]]+/g) ?? []),
  ...(s.match(/\{\{?[^{}\n]{1,40}\}?\}/g) ?? []),
  ...(s.match(/\[[^\]\n]{1,120}\]\(/g) ?? []),
]
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

// A fix is a slip-sized change: same links/placeholders, nearly the same length and word count.
function safe(before: string, after: string): boolean {
  if (!after.trim()) return false
  if (tokens(before).some(t => !after.includes(t))) return false
  const wb = words(before), wa = words(after)
  if (Math.abs(wb - wa) > Math.max(2, Math.ceil(wb * 0.05))) return false
  if (before.length > 40 && Math.abs(after.length - before.length) > Math.max(12, before.length * 0.08)) return false
  return true
}

export async function proofread<T extends Fields>(fields: T): Promise<{ fields: T; fixes: string[] }> {
  const todo = Object.fromEntries(Object.entries(fields).filter(([, v]) => typeof v === 'string' && v.trim()))
  if (!Object.keys(todo).length || JSON.stringify(todo).length > 16000) return { fields, fixes: [] }
  let out: { fields?: Fields; fixes?: string[] }
  try {
    out = JSON.parse(extractJsonObject(await fableText({ json: true, maxTokens: 4000,
      instructions: `You are Cap doing a final proofread of Mandi's own writing before it saves. Fix ONLY: misspellings, typos, doubled words, missing or wrong punctuation, apostrophes (its/it's, your/you're), and a lowercase letter starting a sentence. Do NOT change her wording, word choice, voice, slang, swearing, sentence fragments she wrote on purpose, emphasis (ALL CAPS or lowercase style), emojis, line breaks, spacing between paragraphs, links, [words](https://…) links, {placeholders}, names, @handles or #hashtags. If a field needs nothing, return it exactly as given. List each fix as "before → after" (short). Reply ONLY with JSON: {"fields":{same keys},"fixes":["teh → the"]}`,
      input: JSON.stringify(todo) })))
  } catch { return { fields, fixes: [] } }
  const result = { ...fields } as Fields
  const kept: string[] = []
  for (const [k, before] of Object.entries(todo)) {
    const after = out.fields?.[k]
    if (typeof after !== 'string' || after === before) continue
    if (safe(before, after)) result[k] = after
    else kept.push(k)
  }
  const changed = Object.keys(todo).some(k => result[k] !== fields[k])
  const fixes = changed ? (out.fixes ?? []).filter(f => typeof f === 'string' && (([a, b]) => a?.trim() !== b?.trim())(f.split('→'))).slice(0, 12) : []
  return { fields: result as T, fixes: kept.length && !changed ? [] : fixes }
}
