// Characters: who Mandi plays on camera, so Content Day can batch the shoot by outfit.
//
// The roster is OPEN, not a frozen list. A card is tagged when it is created (and again when its
// script changes, unless Mandi set the tags by hand). Tags come from the script's speaker labels
// ("Inner Child: …", "Adult me: …") and the shoot plan's roles. A label nobody has used before
// is a new character: Cap mints it on the spot. A solo script with no labels is "Her adult".

import type { Character, ContentPiece, Db } from './db'

const nowIso = () => new Date().toISOString()

export const DEFAULT_SOLO = 'Her adult'

// The roster so far (Nov 22). Aliases are how her scripts actually label the lines.
const SEED: Omit<Character, 'created_at'>[] = [
  { name: 'inner-child', aliases: ['inner child', 'little you', 'little me', 'little one', 'child', 'kid', 'younger me', 'young me', 'little mandi', 'child me'], status: 'active', created_by: 'seed' },
  { name: 'Her adult', aliases: ['adult me', 'grown you', 'grown up', 'grownup', 'adult', 'adult you', 'grown me', 'higher self', 'me', 'mandi', 'narrator', 'her', 'mom me'], status: 'active', created_by: 'seed' },
  { name: 'Adult Child', aliases: ['adult child', 'grown child', 'grown kid'], status: 'active', created_by: 'seed' },
  { name: 'Her Mother', aliases: ['her mother', 'mother', 'my mother', 'mom', 'my mom', 'her mom'], status: 'active', created_by: 'seed' },
  { name: 'Slouchy Mom', aliases: ['slouchy mom'], status: 'brewing', created_by: 'seed' },
  { name: 'Anxious Mom', aliases: ['anxious mom'], status: 'brewing', created_by: 'seed' },
  { name: 'Cool Mom', aliases: ['cool mom'], status: 'brewing', created_by: 'seed' },
]

// Labels that are stage directions, not people.
const NOT_A_CHARACTER = new Set(['visual', 'visuals', 'alt visual', 'notes', 'note', 'script', 'text overlay', 'overlay', 'on screen', 'onscreen', 'on screen text', 'text', 'formula', 'format', 'format test', 'alt', 'cta', 'hook', 'caption', 'b roll', 'broll', 'shot', 'scene', 'beat', 'cue', 'setup', 'set up', 'camera', 'emotion', 'vo', 'voiceover', 'voice over', 'audio', 'sound', 'music', 'you', 'title', 'cut', 'cut to', 'transition', 'end', 'intro', 'outro', 'pause', 'action', 'direction', 'tip', 'step', 'example', 'why', 'how', 'what', 'question', 'answer', 'ps', 'p s', 'edit', 'trend', 'source', 'link'])

const key = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// Lettered or numbered options ("A:", "Option B:", "Take 2:") are not people.
const isJunkLabel = (s: string) => { const k = key(s); return k.length < 2 || NOT_A_CHARACTER.has(k) || /^(option|version|variant|v|take|part|step|line|hook|alt|scene|shot|beat)( [a-z0-9])?$/.test(k) || /^[a-z0-9]$/.test(k) }

export function ensureRoster(db: Db): Character[] {
  db.characters ??= []
  const now = nowIso()
  for (const c of SEED) if (!db.characters.some(x => key(x.name) === key(c.name))) db.characters.push({ ...c, created_at: now })
  // Drop junk Cap minted before the option-label rule existed (Mandi's own names always stay).
  db.characters = db.characters.filter(c => c.created_by !== 'cap' || !isJunkLabel(c.name))
  return db.characters
}

// Find the roster character a label means, if any.
export function matchCharacter(db: Db, label: string): Character | undefined {
  const k = key(label)
  if (!k) return undefined
  return ensureRoster(db).find(c => key(c.name) === k || (c.aliases ?? []).some(a => key(a) === k))
}

// Mint a new character (or return the one that already exists). A brewing one becomes active
// once a card uses it.
export function mintCharacter(db: Db, name: string, by: 'cap' | 'mandi'): Character | null {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40)
  if (!clean || isJunkLabel(clean)) return null
  const found = matchCharacter(db, clean)
  if (found) return found
  const c: Character = { name: clean, status: 'active', created_by: by, created_at: nowIso() }
  ensureRoster(db).push(c)
  return c
}

// A speaker label at the start of a line: "Inner Child: …", "**Adult me:** …", "[Little you]: …".
const LABEL = /^\s*[*_]*\[?([A-Za-z][A-Za-z '’\-]{0,28}?)\]?[*_]*\s*(?:\([^)]{0,40}\))?\s*[*_]*:\s*(.*)$/

export type ScriptLine = { speaker: string | null; text: string; direction?: string | null }

// Split a script into spoken lines (with the roster character who says each) and directions
// (Visual:, Notes:, Text overlay: …). Unlabeled lines belong to whoever spoke last.
export function parseScript(db: Db, script: string): { lines: ScriptLine[]; labels: string[] } {
  const lines: ScriptLine[] = []
  const labels: string[] = []
  let speaker: string | null = null
  for (const raw of (script ?? '').split('\n')) {
    const t = raw.trim()
    if (!t) continue
    const m = t.match(LABEL)
    if (m) {
      const label = m[1].trim()
      const k = key(label)
      if (isJunkLabel(label) && !matchCharacter(db, label)) { lines.push({ speaker: null, text: m[2].trim(), direction: label }); continue }
      if (label.split(' ').length <= 3) {
        const c = matchCharacter(db, label)
        speaker = c ? c.name : label
        labels.push(speaker)
        if (m[2].trim()) lines.push({ speaker, text: m[2].trim() })
        continue
      }
    }
    // Bullets right under a direction ("Notes:\n• Keep it calm") are part of that direction.
    const prev = lines[lines.length - 1]
    if (prev?.direction && /^[•\-–*]\s/.test(t)) { lines.push({ speaker: null, text: t.replace(/^[•\-–*]\s*/, ''), direction: prev.direction }); continue }
    lines.push({ speaker, text: t })
  }
  return { lines, labels }
}

// Who is on camera in this card. New labels used at least twice are minted as characters
// (once could be a typo or a one-off direction).
export function inferCharacters(db: Db, c: Pick<ContentPiece, 'script' | 'shoot_plan'>): string[] {
  const { labels } = parseScript(db, c.script ?? '')
  const names = new Set<string>()
  const counts: Record<string, number> = {}
  for (const l of labels) counts[l] = (counts[l] ?? 0) + 1
  for (const [l, n] of Object.entries(counts)) {
    const known = matchCharacter(db, l)
    if (known) names.add(known.name)
    else if (n >= 2) { const minted = mintCharacter(db, l, 'cap'); if (minted) names.add(minted.name) }
  }
  if (c.shoot_plan) {
    try {
      for (const s of (JSON.parse(c.shoot_plan)?.sections ?? []) as { role?: string }[]) {
        const role = String(s.role ?? '').trim()
        if (!role) continue
        const known = matchCharacter(db, role) ?? (/single voice|narrator|mandi/i.test(role) ? matchCharacter(db, DEFAULT_SOLO) : undefined)
        if (known) names.add(known.name)
        else { const minted = mintCharacter(db, role, 'cap'); if (minted) names.add(minted.name) }
      }
    } catch { /* not a plan */ }
  }
  if (!names.size && (c.script ?? '').trim()) names.add(DEFAULT_SOLO)
  return [...names]
}

// Tag a card in place (inside a db write). Never overwrites tags Mandi set by hand.
export function tagCharacters(db: Db, c: ContentPiece): boolean {
  if (c.characters_by === 'mandi') return false
  const next = inferCharacters(db, c)
  if (!next.length && !(c.characters ?? []).length) return false
  const same = (c.characters ?? []).length === next.length && next.every(n => c.characters!.includes(n))
  if (same) return false
  c.characters = next
  c.characters_by = 'auto'
  for (const n of next) { const ch = matchCharacter(db, n); if (ch && ch.status === 'brewing') ch.status = 'active' }
  return true
}

// Mandi's own pick, from Content Day. Names she types that aren't on the roster are minted.
export function setCardCharacters(db: Db, c: ContentPiece, names: string[]): string[] {
  const out: string[] = []
  for (const n of names) {
    const ch = matchCharacter(db, n) ?? mintCharacter(db, n, 'mandi')
    if (ch && !out.includes(ch.name)) { out.push(ch.name); if (ch.status === 'brewing') ch.status = 'active' }
  }
  c.characters = out
  c.characters_by = 'mandi'
  return out
}

// Cards tagged with a name that is no longer on the roster (junk that was pruned) need a retag.
export function hasStaleTags(db: Db, c: ContentPiece): boolean {
  return c.characters_by !== 'mandi' && (c.characters ?? []).some(n => !matchCharacter(db, n))
}

// For writers: how to label lines so the card lands in the right batch on Content Day.
export function rosterForWriters(db: Db): string {
  const r = ensureRoster(db)
  return `\n\nCHARACTERS ON CAMERA: when a script has more than one voice, start each spoken line with the character's name and a colon ("inner-child: …"). Use the roster: ${r.map(c => c.name).join(', ')}. If a new character appears, give it a short name (2-3 words) and use it the same way every time; RISE adds it to the roster. A solo script needs no labels.`
}

// Is this character played as a child? (Content Day styles child lines differently.)
export const isChildCharacter = (name: string | null | undefined) => !!name && /child|kid|little|young/i.test(name) && !/adult child/i.test(name)
