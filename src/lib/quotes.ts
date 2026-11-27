// Phase 8 A7: quotes are a card format Cap plans (still image, carousel, b-roll with the words
// over it) and Ed writes under the craft rules. Gratitudes count as quotes.
//
// Every quote card says where its words came from, and the three kinds are never mixed up:
//   REAL quote      (kind 'well')    her exact words from an old caption, with the date
//   HER NOTE        (kind 'note')    her exact words from a note she dropped, with Note #N
//   WRITTEN         (kind 'written') written in her voice by Ed, labeled as written
// Ed may only call something 'well' or 'note' when the words really are in that source; RISE
// checks it and relabels it 'written' otherwise.

import { readDb, writeDb, updateContent, getBrandAccount, branchOfAccount, type ContentPiece, type QuoteFormat, type QuoteSource, type NoteIdea } from './db'
import { craftFor, HOOK_RULES, PROTECT_PEOPLE } from './craft'
import { fableText } from './fable'
import { wellLinesFor } from './well'
import { cut, extractJsonObject } from './jsonkit'
import { ROLE_LINES } from './roles'

// The bar for every quote, real or written (Mandi, Phase 7 step 6).
export const QUOTE_RULES = `QUOTE CARDS (still image, carousel, or b-roll with the words over it). Gratitudes count as quotes.
THE BAR: the reader reads it and says "BITCH, ME TOO!" Funny-true, specific, original. No filler, no greeting-card wisdom, no "you are enough", nothing she has read a hundred times.
- A specific moment or detail beats a general truth. Say the thing she thinks and never says out loud.
- Short: one quote fits on one image (about 8–30 words). A carousel is 3–7 slides, one thought per slide; slide 1 opens the gap (the hook rules apply to it).
- A gratitude names a weirdly specific thing she's thankful for, with the turn that makes it true.
- Speak to the reader (you/your) or in Mandi's own first person when it's her exact words. Never name or blame a real person.
- Keep REAL and WRITTEN apart. Her exact words stay exactly hers: you may cut to the sentence that lands, never reword it. If you change the words, it is WRITTEN.`

const SLOT = {
  carousel: /carousel|slides?/i,
  quote: /quote|gratitude/i,
  overlay: /on-screen line|b-?roll/i,
}

/** Which quote format a calendar slot asks for, or null when the slot is not a quote slot. */
export function quoteFormatFor(slotFormat: string | null | undefined): QuoteFormat | null {
  const f = slotFormat ?? ''
  if (SLOT.quote.test(f) && SLOT.carousel.test(f)) return 'carousel'
  if (SLOT.quote.test(f)) return 'still'
  if (SLOT.overlay.test(f)) return 'broll_overlay'
  return null
}

export const FORMAT_LABEL: Record<QuoteFormat, string> = {
  still: 'still image (your photo + the words)',
  carousel: 'carousel',
  broll_overlay: 'b-roll with the words over it',
  film: 'film it (a skit)',
}

export function quoteLabel(q: Pick<QuoteSource, 'kind' | 'note_id' | 'date' | 'softened'>): string {
  if (q.kind === 'well') return `REAL quote · your caption${q.date ? `, ${q.date.trim()}` : ''}`
  if (q.kind === 'note') return `Your idea · Note #${q.note_id}${q.softened ? ' (softened so no real person is named)' : ''}`
  return 'Written in your voice (not a quote of yours)'
}

// ── "Is this really her words?" ────────────────────────────────────────────────
export const normWords = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
/**
 * True only when every piece of `text` (each sentence, line or slide) appears word for word in
 * `source`, punctuation and case aside. Cutting is fine; rewording is not.
 */
export function isHerWords(text: string, source: string): boolean {
  const s = normWords(source)
  const pieces = text.split(/(?<=[.!?…])\s+|\n+|\s+\/\s+|\s*(?:\.\.\.|…)\s*/).map(normWords).filter(p => p.split(' ').length >= 2)
  if (!pieces.length) return false
  return pieces.every(p => s.includes(p))
}

// A cheap net under the guardrail: lines that point at a real person in her life.
const REAL_PERSON = /\b(my|her|our) (mom|mother|mama|dad|father|husband|ex|partner|boyfriend|sister|brother|mother-in-law|in-laws?|son|daughter|kids?' dad)\b|\bpreston\b/i
export const pointsAtRealPerson = (s: string) => REAL_PERSON.test(s)

/** Ed softens a line so no real person is named or blamed, keeping as much of her wording as he can. */
export async function softenLine(text: string, accountId: string | null): Promise<string | null> {
  try {
    const raw = await fableText({ json: true, useClaude: true, maxTokens: 800,
      instructions: `You are Ed. ${PROTECT_PEOPLE}\nRewrite the line below so it passes that test. Keep her wording, rhythm and joke wherever you can; change only what names, blames or exposes a real person. Same length or shorter. Reply ONLY with JSON: {"line":""}`,
      input: `${accountId ? `Account: ${accountId}\n` : ''}THE LINE:\n${text}` })
    const out = JSON.parse(extractJsonObject(raw)) as { line?: string }
    const line = (out.line ?? '').trim()
    return line && !pointsAtRealPerson(line) ? line : null
  } catch { return null }
}

/**
 * Ed fills ONE quote card: he picks her real words first (her ideas from Notes, then the Well),
 * and writes one in her voice only when nothing real fits. The card ends up with the words on
 * it, the label saying where they came from, a title and the post's job.
 */
export async function fillQuoteCard(id: number, format: QuoteFormat): Promise<{ filled: boolean; kind?: QuoteSource['kind']; error?: string }> {
  const db = readDb()
  const c = db.content.find(x => x.id === id)
  if (!c) return { filled: false, error: 'No such card.' }
  if (c.quote?.text) return { filled: false }
  if (!c.account_id) return { filled: false, error: 'No account on this card.' }
  const acct = getBrandAccount(c.account_id)
  const branch = branchOfAccount(acct)

  // Her ideas from Notes first: this account's, then anything banked in the same branch.
  const bank = (db.note_ideas?.ideas ?? []).filter(i => i.status === 'banked' && !i.careful && (i.kind === 'quote' || i.kind === 'line') && (i.account_id === c.account_id || (!i.account_id && i.branch === branch) || (i.branch === branch && i.account_id !== c.account_id)))
    .sort((a, b) => Number(b.account_id === c.account_id) - Number(a.account_id === c.account_id)).slice(0, 6)
  const topic = [acct?.topic, acct?.underlying_message, acct?.mission, c.title, c.notes].filter(Boolean).join(' ')
  // A caption already quoted on another card isn't offered again.
  const usedWell = new Set((db.content ?? []).filter(x => x.quote?.kind === 'well' && x.quote.date).map(x => x.quote!.date!))
  const well = wellLinesFor(topic, 12).filter(w => !pointsAtRealPerson(w.cap) && !usedWell.has(w.date)).slice(0, 5)
  const used = new Set((db.content ?? []).map(x => x.quote?.text && normWords(x.quote.text)).filter(Boolean) as string[])

  const sources = [
    ...bank.map((i, k) => ({ ref: `N${k + 1}`, kind: 'note' as const, text: i.text, idea: i, date: null as string | null })),
    ...well.map((w, k) => ({ ref: `W${k + 1}`, kind: 'well' as const, text: w.cap, idea: null as NoteIdea | null, date: w.date })),
  ]
  const isCarousel = format === 'carousel'
  let out: { ref?: string; kind?: string; text?: string; slides?: string[]; title?: string; job?: string } = {}
  try {
    out = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 1800,
      instructions: `You are Ed, writing a quote card for Mandi Beck. ${ROLE_LINES.ed} Cap planned it as: ${FORMAT_LABEL[format]}.
${craftFor(c.account_id)}
${QUOTE_RULES}
${isCarousel ? HOOK_RULES : ''}
PICK HER REAL WORDS FIRST. Below are her own ideas from Notes (N1…) and her old captions (W1…). If one clears the bar, use it: set "ref" to its code and "kind" to "note" or "well", and put her exact words (cut to the part that lands, never reworded) in "text". Only when none clears the bar, write one in her voice: "ref": "", "kind": "written".
${isCarousel ? 'For the carousel, also give "slides": 3–7 short slides (slide 1 = the hook). Her exact words may be split across slides; a written carousel is labeled written.' : ''}
"title": a plain working name (3–8 words). "job": "reach", "authority" or "dms".
Reply ONLY with JSON: {"ref":"","kind":"","text":"","slides":[],"title":"","job":""}`,
      input: `CARD #${c.id}: ${c.title}\nAccount: ${acct?.handle ?? c.account_id}\n\n${sources.length ? sources.map(s => `[${s.ref}] ${cut(s.text, 600)}`).join('\n\n') : '(no real words on file for this account yet; write one)'}${used.size ? `\n\nAlready on other cards (don't repeat): ${[...used].slice(0, 12).join(' / ')}` : ''}` })))
  } catch (e) { return { filled: false, error: e instanceof Error ? e.message : 'no answer' } }

  const text = (out.text ?? '').trim()
  const slides = (out.slides ?? []).map(s => String(s).trim()).filter(Boolean).slice(0, 7)
  if (!text && !slides.length) return { filled: false, error: 'Ed came back empty.' }
  const src = sources.find(s => s.ref === out.ref)
  // What goes on the card: the slides for a carousel, else the quote. RISE checks THAT against
  // the source: real only when every slide / sentence on the card is her words.
  const shown = isCarousel && slides.length ? slides.join('\n') : text
  const real = !!src && (out.kind === 'note' || out.kind === 'well') && isHerWords(shown, src.text)
  const words = shown
  if (pointsAtRealPerson(words)) return { filled: false, error: 'The quote pointed at a real person; left for Ed to try again.' }
  const q: QuoteSource = real && src
    ? { kind: src.kind, text: words, label: '', note_id: src.idea?.note_id ?? null, date: src.date, idea_id: src.idea?.id ?? null }
    : { kind: 'written', text: words, label: '' }
  q.label = quoteLabel(q)

  const patch: Partial<ContentPiece> = {
    quote: q, quote_format: format,
    onscreen_text: cut(words, 1200),
    notes: `${(c.notes ?? '').trim()}\nQuote card · ${FORMAT_LABEL[format]} · ${q.label}.${format === 'still' ? ' Needs: a photo of you.' : format === 'broll_overlay' ? ' Needs: a b-roll clip to put the words over.' : ''}`.trim(),
  }
  if (q.note_id) patch.note_id = q.note_id
  const isSlot = /^@[\w.]+:\s/.test(c.title.trim()) || !c.title.trim()
  if (isSlot && out.title?.trim()) patch.title = cut(out.title.trim(), 120)
  if (!c.post_job && ['reach', 'authority', 'dms'].includes(String(out.job))) patch.post_job = String(out.job)
  if (isCarousel && c.type !== 'carousel') patch.type = 'carousel'
  updateContent(c.id, patch)

  if (q.idea_id) {
    const db2 = readDb()
    const idea = db2.note_ideas?.ideas.find(i => i.id === q.idea_id)
    if (idea) { idea.status = 'carded'; idea.content_id = c.id; idea.format = format; idea.updated_at = new Date().toISOString(); writeDb(db2) }
  }
  return { filled: true, kind: q.kind }
}
