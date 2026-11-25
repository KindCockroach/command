// Cap's review of a writer's draft. Consistent, visible, not clever.
//
// Nov 22 reversal (intentional): Ed and Pod WRITE, Cap REVIEWS. Before that, Cap wrote and Ed
// checked, which is why these checks started life as "Ed's". Don't swap it back.
//
// Cap reads each platform's draft against the rules that can be checked the same way every
// time: two different hooks, one call to action, no cross-promotion between branches, no
// "Beck Team, Inc.", a sane hashtag count, and the voice lessons that name a phrase to avoid.
// Pass (Cap confirms and schedules), or send it back to the writer with the reason.
// Cap never rewrites the piece himself.

import { readDb, branchOfAccount, getAllMemories, type ContentPiece, type EdVerdict } from './db'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
const wordSet = (s: string) => new Set(norm(s).split(' ').filter(w => w.length > 2))

function similar(a: string, b: string): boolean {
  const na = norm(a), nb = norm(b)
  if (!na || !nb) return false
  if (na === nb || (nb.length > 12 && na.includes(nb)) || (na.length > 12 && nb.includes(na))) return true
  const A = wordSet(a), B = wordSet(b)
  if (A.size < 3 || B.size < 3) return false
  let hit = 0
  A.forEach(w => { if (B.has(w)) hit++ })
  return hit / Math.min(A.size, B.size) >= 0.7
}

// Calls to action, by kind. Two different kinds in one caption = two CTAs.
const CTAS: [string, RegExp][] = [
  ['comment', /\bcomment\s+["“']?[A-Z]{2,}|\bcomment (below|the word|with)\b|\bdrop (a|an|the) .{1,20} (below|in the comments)/i],
  ['link', /\blink in (my )?bio\b|\btap the link\b|\bclick the link\b|\bbio link\b/i],
  ['dm', /\b(dm|message) me\b|\bsend me a (dm|message)\b/i],
  ['follow', /\bfollow (me|along|for|@)/i],
  ['save', /\bsave this\b|\bsave it for\b|\bbookmark this\b/i],
  ['share', /\bshare (this|it) with\b|\bsend this to\b|\btag (a|someone|your)\b/i],
  ['register', /\bregister\b|\bsign up\b|\bgrab (your|a) (seat|spot)\b|\bjoin (me|us) (on|this|for|sunday)\b|\bsave your (seat|spot)\b|\brsvp\b/i],
  ['watch', /\bwatch (now|to the end|this)\b/i],
  ['listen', /\blisten (now|to the|on)\b|\bnew episode\b|\bsubscribe\b|\bleave a review\b/i],
  ['book', /\bbook (a|your) (call|session)\b|\bapply to be a guest\b/i],
  ['download', /\bdownload\b|\bget (the|your) free\b/i],
]

export const JOYFUL_BAD = /\bpodcast\b|\bepisode\b|\bai mom\b|\baiworksforher\b|\bworks for her\b|\bai (tools?|services?)\b|\bchatgpt\b/i
export const WFH_BAD = /\bthe reset\b|\breset (on|this|sunday)\b|\bmeditations?\b|\$9\b|\bwellspring\b|\bbethereforher\b|\bjoyful media\b|\bbe there for her\b/i
export const WFH_SERVICES = /\bcheat code\b|\bai (assessment|setup|onboarding)\b|\bwork with me on ai\b|\blocal support\b|\b\/assessment\b/i

// A voice lesson Ed can check consistently: one that quotes a phrase to avoid.
function avoidPhrases(): { phrase: string; rule: string }[] {
  const out: { phrase: string; rule: string }[] = []
  for (const m of getAllMemories('voice').slice(-40)) {
    if (!/\b(never|avoid|don[’']?t|do not|no|stop|cut|drop)\b/i.test(m.title)) continue
    for (const q of m.title.matchAll(/["“']([^"”']{3,40})["”']/g)) out.push({ phrase: q[1].toLowerCase(), rule: m.title })
  }
  return out
}

export type ReviewInput = { platform: string; caption: string }

export function capReview(c: ContentPiece, d: ReviewInput): Omit<EdVerdict, 'round' | 'checked_at'> {
  const reasons: string[] = []
  const notes: string[] = []
  const text = d.caption.trim()
  if (!text) return { verdict: 'sent_back', reasons: ['The caption is empty.'] }
  const first = text.split('\n').map(l => l.trim()).find(Boolean) ?? ''
  const hook = (c.onscreen_text ?? '').split('\n').map(l => l.trim()).find(Boolean) ?? ''

  // Two hooks: the caption opens a different door than the on-screen line.
  if (hook && similar(first, hook)) reasons.push(`Two hooks: the caption opens with the on-screen line ("${hook.slice(0, 60)}"). Open a different door.`)
  // Question openings are no longer a send-back (Nov 22): statements are a DEFAULT Cap may test.

  // One call to action.
  const kinds = CTAS.filter(([, re]) => re.test(text)).map(([k]) => k)
  if (kinds.length > 1) reasons.push(`More than one call to action (${kinds.join(' + ')}). Keep one.`)
  // Not finding one is a note, not a send-back: a practice ("take one breath") is a fine CTA that no pattern can see.
  if (kinds.length === 0 && !['Pinterest', 'Medium', 'Substack'].includes(d.platform)) notes.push('Cap found no call to action he recognizes. Make sure there is one clear next step.')

  // No cross-promotion between branches.
  const db = readDb()
  const acct = db.brand_accounts.find(a => a.id === c.account_id)
  const branch = acct ? branchOfAccount(acct) : null
  if (/beck team/i.test(text)) reasons.push('Says "Beck Team, Inc." It never appears in public copy.')
  if (branch === 'joyful_media' && JOYFUL_BAD.test(text)) reasons.push(`Cross-promotion: this is a Joyful Media account, and the caption points at the podcast or AI ("${text.match(JOYFUL_BAD)![0]}").`)
  if (branch === 'wfh' && WFH_BAD.test(text)) reasons.push(`Cross-promotion: this is a WFH account, and the caption points at a Joyful Media offer ("${text.match(WFH_BAD)![0]}").`)
  if (WFH_SERVICES.test(text)) reasons.push('Promotes the AI services, which are paused until you say go.')

  // Hashtags: at most 5 on Instagram and TikTok (craft rule).
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) ?? []
  if (['Instagram', 'TikTok'].includes(d.platform) && tags.length > 5) reasons.push(`${tags.length} hashtags. Keep it to 5 or fewer.`)
  if (['YouTube', 'Facebook'].includes(d.platform) && tags.length > 5) reasons.push(`${tags.length} hashtags is a wall on ${d.platform}. Keep a few, or none.`)

  // Voice lessons that name a phrase to avoid.
  const low = text.toLowerCase()
  for (const a of avoidPhrases()) if (low.includes(a.phrase)) { reasons.push(`Voice lesson: "${a.rule}"`); break }

  return { verdict: reasons.length ? 'sent_back' : 'pass', reasons, ...(notes.length ? { notes } : {}) }
}
