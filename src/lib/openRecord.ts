// Phase 8 · B3: one way to open any record inside the station. Client-only.
// openRecord(kind, id) switches to the record's tab and opens it there, and tells the station's
// history about it (B1), so the gold arrow / browser Back step out of the record one at a time.
// Notes and cards open the record itself; the others open their tab for now.
import { OPEN_CARD_KEY, OPEN_CARD_EVENT } from './openCard'

export type RecordKind = 'note' | 'card' | 'task' | 'project' | 'goal' | 'event'
const VIEW: Record<RecordKind, string> = { note: 'notes', card: 'contentday', task: 'projects', project: 'projects', goal: 'goals', event: 'activity' }
export const RECORD_LABEL: Record<RecordKind, string> = { note: 'Note', card: 'Card', task: 'Task', project: 'Project', goal: 'Goal', event: 'Activity' }

/** Open the record inside its panel without switching tabs (the station calls this on Back/Forward too). */
export function showRecord(kind: RecordKind | null, id?: number) {
  if (!kind || !id) { window.dispatchEvent(new CustomEvent('rise:record-close')); return }
  if (kind === 'note') {
    try { localStorage.setItem('rise-open-note', String(id)) } catch { /* ok */ }
    window.dispatchEvent(new CustomEvent('rise-open-note'))
  } else if (kind === 'card') {
    try { sessionStorage.setItem(OPEN_CARD_KEY, String(id)) } catch { /* ok */ }
    window.dispatchEvent(new CustomEvent(OPEN_CARD_EVENT, { detail: { id } }))
  }
}

export function openRecord(kind: RecordKind, id: number) {
  showRecord(kind, id)
  window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view: VIEW[kind], record: `${kind}:${id}` } }))
}

/** "note:310" → ['note', 310], or null. */
export function parseRecord(s: string | null | undefined): [RecordKind, number] | null {
  const m = (s ?? '').match(/^(note|card|task|project|goal|event):(\d+)$/)
  return m ? [m[1] as RecordKind, Number(m[2])] : null
}
