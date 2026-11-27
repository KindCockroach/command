// Phase 8 · A5: protected formats. These are named slots in an account's weekly plan that Cap
// never trims for capacity and never swaps for a "stronger" format. They're set PER ACCOUNT (Mandi,
// Nov 25: every account and product has its own rules), so an account not listed here has none.
// Cap's skill `cap-protected-formats` and craftFor() read this list; there's no new UI.
// To add one for another account, add it here (or ask Cap in the plan chat and log it to the build list).

export type ProtectedFormat = { format: string; per_week: number; what: string }

export const PROTECTED_FORMATS: Record<string, ProtectedFormat[]> = {
  mandijoybeck: [
    { format: 'personal still image (her photo + her words)', per_week: 1, what: 'A photo of Mandi with her own words on it. Any topic. Her words come from the Well or Notes, never written for her.' },
    { format: 'character humor', per_week: 1, what: 'A character bit: Mandi plays someone. Funny first, true underneath.' },
    { format: 'inner-child / role-play series', per_week: 1, what: 'The inner child × higher self series: two parts of her talking. A film card with the character rail.' },
    { format: 'meditation', per_week: 1, what: 'A short guided practice in her meditation voice (Pod writes it from an outline).' },
  ],
  theknowingis: [
    { format: 'inner-child / role-play series', per_week: 1, what: 'The inner child × higher self series, in this account’s voice.' },
  ],
}

export function protectedFor(accountId?: string | null): ProtectedFormat[] {
  return accountId ? PROTECTED_FORMATS[accountId] ?? [] : []
}

export function isProtectedFormat(accountId: string | null | undefined, format?: string): boolean {
  return !!format && protectedFor(accountId).some(p => p.format === format)
}

/** The craft rule for this account's protected formats ('' when it has none). */
export function protectedFormatsRule(accountId?: string | null): string {
  const list = protectedFor(accountId)
  if (!list.length) return ''
  return `\n\nPROTECTED FORMATS for this account (they always run, every week, and are never swapped for another format):\n${list.map(p => `- ${p.format}: ${p.what}`).join('\n')}\nWhen a card is one of these, write it as that format. Don't turn it into a talking head or a generic post.`
}
