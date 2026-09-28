// Hashtag helpers — shared by compose (Add Post), the file step, GHL publish, and
// the batch generator so every post ships with hashtags, capped at 5.

// NEVER-USE hashtags (researched 2026-09-27). Enforced in code, not just the
// prompt: stripped on every save (db.ts) and again at GHL publish.
// • #innerchild* / age-regression tags share posts with the age-regression /
//   littlespace community — wrong crowd for Be There For Her, and sensitive.
// • #trustyourgut is half #guthealth. #captionideas & co. are quote pages.
// • Spam-signal and 30M+ vanity tags bury a post in seconds.
const NEVER_PREFIXES = ['innerchild', 'ageregress', 'agere', 'littlespace', 'sfwlittle']
const NEVER_TAGS = new Set([
  'trustyourgut', 'captionideas', 'captions', 'caption', 'captionthis', 'captionsforinsta', 'instagramcaptions',
  'explorepage', 'explore', 'followback', 'followforfollow', 'f4f', 'lfl', 'like4like', 'likeforlikes', 'instagood',
  'meme', 'memes', 'viral', 'fyp', 'foryou', 'foryoupage',
  'selflove', 'selfcare', 'meditation', 'mentalhealth', 'love', 'inspiration', 'life', 'motivation',
  'narcissisticabuse', 'narcissist',
])
// Per-account extras: tags that describe Mandi (or AI) instead of the buyer.
const ACCOUNT_NEVER: Record<string, string[]> = {
  onetangledmind: ['bossbabe', 'girlboss', 'ladyboss', 'ai', 'chatgpt', 'aitools', 'artificialintelligence'],
  mandijoy: ['bossbabe', 'girlboss', 'ladyboss', 'ai', 'chatgpt', 'aitools', 'artificialintelligence'],
  mandijoybeck: ['mompreneur', 'creativemom', 'bossbabe', 'girlboss', 'ai', 'chatgpt', 'aitools', 'artificialintelligence'],
}

export function isBannedHashtag(tag: string, accountId?: string | null): boolean {
  const key = tag.replace(/^#+/, '').toLowerCase()
  if (!key) return false
  if (NEVER_TAGS.has(key)) return true
  if (NEVER_PREFIXES.some(p => key.startsWith(p))) return true
  return !!(accountId && ACCOUNT_NEVER[accountId]?.includes(key))
}

// Remove never-use #tags from any text (a caption or a hashtag string), leaving
// the words around them alone. Tidies the gaps a removed tag leaves behind.
export function stripBannedHashtags(text: string, accountId?: string | null): string {
  if (!text) return text
  if (!/#[\p{L}\p{N}_]/u.test(text)) return text
  return text
    .replace(/#[\p{L}\p{N}_]+/gu, t => (isBannedHashtag(t, accountId) ? '' : t))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .trimEnd()
}

// Normalize a hashtag string to at most `max` clean #tags (deduped, order kept).
export function capHashtags(raw: string, max = 5, accountId?: string | null): string {
  const parts = String(raw || '').split(/\s+/).filter(Boolean)
  const tags = parts.filter(t => t.startsWith('#'))
  const src = tags.length ? tags : parts.map(t => `#${t.replace(/[^A-Za-z0-9]/g, '')}`).filter(t => t.length > 1)
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of src) {
    const key = t.toLowerCase()
    if (seen.has(key) || isBannedHashtag(t, accountId)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= max) break
  }
  return out.join(' ')
}

// Return the caption with up to `max` hashtags appended. If the caption already
// carries hashtags, it's left as-is (assume it was curated). Guarantees a post's
// visible caption includes hashtags, never more than `max`.
export function withHashtags(caption: string, hashtags: string, max = 5, accountId?: string | null): string {
  const cap = stripBannedHashtags(String(caption || '').trim(), accountId)
  if (/#\w/.test(cap)) return cap
  const tags = capHashtags(hashtags, max, accountId)
  return tags ? `${cap}\n\n${tags}` : cap
}
