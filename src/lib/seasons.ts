// Phase 8 · A6: a small holidays + seasons list Cap reads when he picks trends and plans the week.
// Plain date math, no API. Moments only; Cap still decides whether one fits an account.

export type Moment = { date: string; name: string; kind: 'holiday' | 'season' }

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
// The nth weekday (0 = Sunday) of a month; n = -1 is the last one.
function nth(y: number, m: number, dow: number, n: number): string {
  if (n > 0) { const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return ymd(y, m, 1 + ((dow - first + 7) % 7) + (n - 1) * 7) }
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(); const last = new Date(Date.UTC(y, m - 1, lastDay)).getUTCDay()
  return ymd(y, m, lastDay - ((last - dow + 7) % 7))
}
// Easter Sunday (Anonymous Gregorian algorithm).
function easter(y: number): string {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  return ymd(y, month, day)
}

export function momentsFor(y: number): Moment[] {
  const H = (date: string, name: string): Moment => ({ date, name, kind: 'holiday' })
  const S = (date: string, name: string): Moment => ({ date, name, kind: 'season' })
  const thanksgiving = nth(y, 11, 4, 4)
  return [
    H(ymd(y, 1, 1), 'New Year’s Day'), S(ymd(y, 1, 2), 'New year, fresh start (first two weeks of January)'),
    H(ymd(y, 2, 14), 'Valentine’s Day'), H(ymd(y, 3, 17), 'St. Patrick’s Day'), S(ymd(y, 3, 20), 'First day of spring'),
    H(easter(y), 'Easter'), H(nth(y, 5, 0, 2), 'Mother’s Day'), H(nth(y, 5, 1, -1), 'Memorial Day'),
    S(ymd(y, 6, 1), 'Summer break starts (kids home)'), H(nth(y, 6, 0, 3), 'Father’s Day'), S(ymd(y, 6, 21), 'First day of summer'),
    H(ymd(y, 7, 4), 'Fourth of July'), S(ymd(y, 8, 10), 'Back to school (mid-August)'), H(nth(y, 9, 1, 1), 'Labor Day'),
    S(ymd(y, 9, 22), 'First day of fall'), H(ymd(y, 10, 31), 'Halloween'), H(thanksgiving, 'Thanksgiving'),
    H(new Date(Date.parse(thanksgiving + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10), 'Black Friday'),
    S(ymd(y, 12, 1), 'Holiday season (December)'), S(ymd(y, 12, 21), 'Winter break / first day of winter'),
    H(ymd(y, 12, 25), 'Christmas'), H(ymd(y, 12, 31), 'New Year’s Eve'),
  ]
}

/** Moments between `from` and `from + days`, in date order. */
export function upcomingMoments(from: string, days = 21): Moment[] {
  const y = Number(from.slice(0, 4))
  const to = new Date(Date.parse(from + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10)
  return [...momentsFor(y), ...momentsFor(y + 1)].filter(m => m.date >= from && m.date <= to).sort((a, b) => a.date.localeCompare(b.date))
}
