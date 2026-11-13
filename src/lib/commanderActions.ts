// COMMANDER RECEIPTS — shared by both chat surfaces (the Commander on the Home
// screen and "Ask RISE about its feed" in the Activity station).
//
// The Commander's tools now run on the SERVER (lib/commanderTools, driven by the
// agent loop in lib/fable). The browser no longer executes anything: the chat route
// returns { reply, receipts }, and a receipt is the record of one tool call — what
// really happened, success or failure. This file is what's left on the client:
// reading receipts, wording them, and carrying them into the next turn's history.

export type CommanderReceipt = { tool: string; ok: boolean; summary: string; openShred?: string }

// The route's JSON is untrusted shape-wise — keep only well-formed receipts.
export function parseReceipts(v: unknown): CommanderReceipt[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .filter(r => typeof r.tool === 'string' && typeof r.ok === 'boolean')
    .map(r => ({
      tool: r.tool as string, ok: r.ok as boolean,
      summary: typeof r.summary === 'string' ? r.summary : '',
      ...(typeof r.openShred === 'string' ? { openShred: r.openShred } : {}),
    }))
}

// "✓ Card created: "Title" (id 12…)"  /  "✗ update_card failed: reason"
export function receiptLine(r: CommanderReceipt): string {
  return r.ok ? `✓ ${r.summary || r.tool}` : `✗ ${r.tool} failed: ${r.summary || 'no reason given'}`
}

// What goes back to the server as this assistant turn's history: her reply plus a
// short line per receipt, so "edit that card" next turn has the id to work with.
export function withReceipts(content: string, receipts?: CommanderReceipt[]): string {
  if (!receipts?.length) return content
  const lines = receipts.map(r => `[receipt] ${receiptLine(r).replace(/\s+/g, ' ').slice(0, 400)}`)
  return `${content}\n\n${lines.join('\n')}`.trim()
}

// The shred tool creates nothing — it asks the UI to open the cross-account preview.
export function shredRequest(receipts: CommanderReceipt[]): string | null {
  const r = receipts.find(x => x.ok && typeof x.openShred === 'string')
  return r ? (r.openShred as string) : null
}

// Tell the rest of the station to refresh after tools changed data.
export function announceDataChanged(receipts: CommanderReceipt[]): void {
  if (typeof window === 'undefined') return
  for (const r of receipts) if (r.ok) window.dispatchEvent(new CustomEvent('rise-data-changed', { detail: { type: r.tool } }))
}
