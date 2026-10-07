// Shared period filter logic for the Clients and Reports pages. All dates are London
// calendar dates (YYYY-MM-DD) and ranges are inclusive.

export type Period =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_12_months'
  | 'this_year'
  | 'last_year'
  | 'custom'

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_12_months', label: 'Last 12 months' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
  { value: 'custom', label: 'Custom dates' },
]

export interface DateRange {
  from: string | null
  to: string | null
  /** Full dates, for example "1 Sep 2026 to 30 Sep 2026" */
  label: string
  /** Short name for column headings, for example "Sep 2026" or "Last 12 months" */
  short: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')

export function londonTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** First day of the month that is `back` months before (y, m). m is 1 to 12. */
function monthStart(y: number, m: number, back: number): string {
  const d = new Date(Date.UTC(y, m - 1 - back, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`
}

/** 2026-09-01 -> 1 Sep 2026 */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** True for a complete, real calendar date YYYY-MM-DD. */
export function isValidIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100
}

function describe(from: string | null, to: string | null): string {
  if (from && to) return `${formatDay(from)} to ${formatDay(to)}`
  if (from) return `From ${formatDay(from)}`
  if (to) return `Up to ${formatDay(to)}`
  return 'All time'
}

/**
 * Inclusive range for a period. "Last 3 months" and "Last 12 months" run from the 1st of
 * the month 2 or 11 months back up to today (this month so far included).
 * Custom dates must already be validated (see PeriodFilter).
 */
export function periodRange(period: Period, customFrom = '', customTo = ''): DateRange {
  const today = londonTodayIso()
  const [y, m] = today.split('-').map(Number)
  let from: string | null = null
  let to: string | null = null
  switch (period) {
    case 'this_month':
      from = `${y}-${pad(m)}-01`
      to = `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`
      break
    case 'last_month': {
      const ly = m === 1 ? y - 1 : y
      const lm = m === 1 ? 12 : m - 1
      from = `${ly}-${pad(lm)}-01`
      to = `${ly}-${pad(lm)}-${pad(lastDayOfMonth(ly, lm))}`
      break
    }
    case 'last_3_months':
      from = monthStart(y, m, 2)
      to = today
      break
    case 'last_12_months':
      from = monthStart(y, m, 11)
      to = today
      break
    case 'this_year':
      from = `${y}-01-01`
      to = `${y}-12-31`
      break
    case 'last_year':
      from = `${y - 1}-01-01`
      to = `${y - 1}-12-31`
      break
    case 'custom':
      from = customFrom || null
      to = customTo || null
      break
  }
  const label = describe(from, to)
  let short = label
  if (period === 'this_month') short = `${MONTHS[m - 1]} ${y}`
  else if (period === 'last_month') short = `${MONTHS[(m + 10) % 12]} ${m === 1 ? y - 1 : y}`
  else if (period === 'last_3_months') short = 'Last 3 months'
  else if (period === 'last_12_months') short = 'Last 12 months'
  else if (period === 'this_year') short = `${y}`
  else if (period === 'last_year') short = `${y - 1}`
  return { from, to, label, short }
}

/** The same dates one year earlier (29 Feb becomes 28 Feb). */
export function shiftYear(iso: string, years: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const ny = y + years
  const day = Math.min(d, lastDayOfMonth(ny, m))
  return `${ny}-${pad(m)}-${pad(day)}`
}
