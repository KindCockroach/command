// Phase 8 · A8: the song on a video card.
// Cap fills it when he reviews a video. It's only called "trending" (source 'verified-trend') when it
// comes from the audio scout's history with a source link and a date from the last VERIFIED_DAYS days;
// anything else is "suits the mood". Mandi's own pick (set_by 'mandi') is never replaced.
// One small cheap call per video card, and only when the card has no music yet.
import { readDb, updateContent, type ContentPiece, type MusicPick, type TrendSuggestion } from './db'
import { fableText } from './fable'
import { extractJsonObject, cut } from './jsonkit'

export const VERIFIED_DAYS = 14
const DAY = 86400000

/** Sounds the scout found with a source and a date in the last `days` days, newest first, one per sound. */
export function recentVerifiedSounds(days = VERIFIED_DAYS): (TrendSuggestion & { source_url: string; checked_at: string })[] {
  const since = Date.now() - days * DAY
  const seen = new Set<string>()
  return [...(readDb().trend_audio_history ?? [])].reverse()
    .filter((s): s is TrendSuggestion & { source_url: string; checked_at: string } => !!s.source_url && !!s.checked_at && Date.parse(s.checked_at) >= since)
    .filter(s => { const k = s.sound.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

/** A link that finds the song (Instagram's audio search needs the app, so YouTube search works everywhere). */
export function musicLink(pick: string, artist?: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent([pick, artist].filter(Boolean).join(' '))}`
}

export const needsMusic = (c: ContentPiece) => c.type === 'video' && !c.music

/** Cap picks the song for a video card. Returns the pick, or null (not a video, already has one, no answer). */
export async function fillMusic(contentId: number): Promise<MusicPick | null> {
  const c = readDb().content.find(x => x.id === contentId)
  if (!c || !needsMusic(c)) return null
  const verified = recentVerifiedSounds().slice(0, 12)
  const instructions = `You are Cap, choosing the background song for one short video. Pick the one song that fits what this video makes the viewer feel.
If one of the TRENDING SOUNDS (numbered) truly fits, choose it by number. Don't force a trend that fights the mood: then pick a real, findable song that suits the mood (song + artist), with trend_index null.
Reply ONLY with JSON: {"trend_index": number|null, "pick": "song title", "artist": "artist", "why": "one plain line: why it fits this video"}`
  const input = `THE VIDEO (card #${c.id}): ${cut(c.title, 120)}
On-screen hook: ${cut(c.onscreen_text ?? '', 200) || '(none yet)'}
Job: ${c.post_job ?? '(not set)'}
What it is: ${cut([c.script, c.description].filter(Boolean).join(' / '), 700) || '(no script yet)'}

TRENDING SOUNDS (from the scout, each with a source and date):
${verified.length ? verified.map((s, i) => `${i + 1}. ${s.sound} (trending for: ${s.trending_for || '?'}; checked ${s.checked_at.slice(0, 10)})`).join('\n') : '(none verified in the last two weeks)'}`
  let p: { trend_index?: number | null; pick?: string; artist?: string; why?: string } = {}
  try { p = JSON.parse(extractJsonObject(await fableText({ cheap: true, json: true, maxTokens: 300, instructions, input }))) } catch { return null }
  const t = typeof p.trend_index === 'number' ? verified[p.trend_index - 1] : undefined
  const pick = (p.pick ?? '').trim() || t?.sound.split('—')[0].replace(/["“”']/g, '').trim() || ''
  if (!pick) return null
  const artist = (p.artist ?? '').trim() || undefined
  const music: MusicPick = t
    ? { pick, artist, why: (p.why ?? '').trim() || t.trending_for, link: t.search ? musicLink(t.search) : musicLink(pick, artist), source: 'verified-trend', source_url: t.source_url, checked_at: t.checked_at, set_by: 'cap' }
    : { pick, artist, why: (p.why ?? '').trim(), link: musicLink(pick, artist), source: 'suits-the-mood', checked_at: new Date().toISOString(), set_by: 'cap' }
  // Re-check right before writing: she may have picked one while Cap was thinking.
  const now = readDb().content.find(x => x.id === contentId)
  if (!now || now.music) return null
  updateContent(contentId, { music })
  return music
}
