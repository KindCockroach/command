// Open one card in Content Day: the caller (the calendar) leaves the card id here, then navigates.
// Content Day reads it on mount, or hears the event if it's already open.
export const OPEN_CARD_KEY = 'rise-contentday-open'
export const OPEN_CARD_EVENT = 'rise:contentday-open'
export function openInContentDay(contentId: number) {
  try { sessionStorage.setItem(OPEN_CARD_KEY, String(contentId)) } catch { /* ok */ }
  window.dispatchEvent(new CustomEvent(OPEN_CARD_EVENT, { detail: { id: contentId } }))
  window.dispatchEvent(new CustomEvent('station:navigate', { detail: { view: 'contentday' } }))
}
