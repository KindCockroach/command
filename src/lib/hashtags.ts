// Hashtag helpers — shared by compose (Add Post), the file step, GHL publish, and
// the batch generator so every post ships with hashtags, capped at 5.

// Normalize a hashtag string to at most `max` clean #tags (deduped, order kept).
export function capHashtags(raw: string, max = 5): string {
  const parts = String(raw || '').split(/\s+/).filter(Boolean)
  const tags = parts.filter(t => t.startsWith('#'))
  const src = tags.length ? tags : parts.map(t => `#${t.replace(/[^A-Za-z0-9]/g, '')}`).filter(t => t.length > 1)
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of src) {
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= max) break
  }
  return out.join(' ')
}

// Return the caption with up to `max` hashtags appended. If the caption already
// carries hashtags, it's left as-is (assume it was curated). Guarantees a post's
// visible caption includes hashtags, never more than `max`.
export function withHashtags(caption: string, hashtags: string, max = 5): string {
  const cap = String(caption || '').trim()
  if (/#\w/.test(cap)) return cap
  const tags = capHashtags(hashtags, max)
  return tags ? `${cap}\n\n${tags}` : cap
}
