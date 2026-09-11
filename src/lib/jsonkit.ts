// Defensive JSON parsing for LLM output. A big generated kit is one JSON object,
// and a single unescaped quote or raw newline inside a verbatim quote used to nuke
// the ENTIRE result (JSON.parse throws on char N). parseKit degrades gracefully:
// raw → fenced/outermost-object extraction → a loose local fix (trailing commas,
// stray control chars) → and only if all fail, ONE self-heal pass through gpt-4o's
// guaranteed-valid JSON mode. Returns null only when truly hopeless.
import { fableText } from './fable'

export function extractJsonObject(raw: string): string {
  let s = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const first = s.indexOf('{'); const last = s.lastIndexOf('}')
  if (first !== -1 && last > first) s = s.slice(first, last + 1)
  return s
}

export function looseJsonFix(s: string): string {
  return s
    .replace(/,\s*([}\]])/g, '$1')                                  // trailing commas
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')       // stray control chars
}

export async function parseKit(raw: string): Promise<Record<string, unknown> | null> {
  const candidate = extractJsonObject(raw)
  for (const attempt of [raw, candidate, looseJsonFix(candidate)]) {
    try { return JSON.parse(attempt) } catch { /* try the next repair */ }
  }
  // Last resort: gpt-4o JSON mode is syntactically guaranteed — hand it the broken
  // text and ask ONLY for a structural repair (content unchanged). Best-effort.
  try {
    const fixed = await fableText({
      instructions: 'You are a JSON repair tool. The input is a single invalid JSON object. Return ONLY a corrected, valid JSON object with the SAME content and keys — escape stray double-quotes and newlines inside string values, add any missing commas, drop trailing commas. No commentary, no code fences.',
      input: candidate, maxTokens: 16000, json: true, useClaude: false,
    })
    return JSON.parse(extractJsonObject(fixed))
  } catch { return null }
}
