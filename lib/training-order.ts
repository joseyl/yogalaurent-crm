/**
 * Helpers for recording a teacher training order that came from yogalaurent.com.
 *
 * The website sends us the Sanity `programmeType` and the programme title.
 * We turn those into a CRM product, an edition (Winter/Spring/Summer/Autumn)
 * and a cohort year.
 */

export const PROGRAMME_PRODUCT: Record<string, string> = {
  '40h': 'Breathwork Professional Training - 40hr',
  '60h': 'Breathwork Professional Training - 60hr',
  '100h': 'Breathwork Professional Training - 100hr Bundle',
  'yoga-nidra': 'Yoga Nidra Teacher Training',
}

/**
 * A 100-hour bundle is recorded the way the existing data records it: the
 * bundle at full price, plus a 40hr and a 60hr row at zero, so the student
 * still appears on both module lists. Set this to an empty object to stop
 * creating the zero-value component rows.
 */
export const BUNDLE_COMPONENTS: Record<string, string[]> = {
  '100h': [
    'Breathwork Professional Training - 40hr',
    'Breathwork Professional Training - 60hr',
  ],
}

const SEASONS = ['Winter', 'Spring', 'Summer', 'Autumn'] as const
export type Edition = (typeof SEASONS)[number]

const MONTH_TO_EDITION: Record<string, Edition> = {
  january: 'Winter', february: 'Winter', december: 'Winter',
  march: 'Spring', april: 'Spring', may: 'Spring',
  june: 'Summer', july: 'Summer', august: 'Summer',
  september: 'Autumn', october: 'Autumn', november: 'Autumn',
}

/**
 * Reads the cohort off the end of a programme title, e.g.
 *   "60-Hour Professional Training — Autumn 2026"        -> Autumn 2026
 *   "Yoga Nidra and Deep Relaxation Training — January 2027" -> Winter 2027
 * Returns nulls if the title does not end in a recognisable season or month
 * plus a year, rather than guessing.
 */
export function parseCohort(title: string | undefined | null): {
  edition: Edition | null
  cohortYear: number | null
} {
  if (!title) return { edition: null, cohortYear: null }

  const match = title.trim().match(/([A-Za-z]+)\s+(20\d{2})\s*$/)
  if (!match) return { edition: null, cohortYear: null }

  const word = match[1].toLowerCase()
  const cohortYear = Number(match[2])

  const season = SEASONS.find(s => s.toLowerCase() === word)
  if (season) return { edition: season, cohortYear }

  if (word === 'fall') return { edition: 'Autumn', cohortYear }

  const fromMonth = MONTH_TO_EDITION[word]
  if (fromMonth) return { edition: fromMonth, cohortYear }

  return { edition: null, cohortYear }
}

/** Accepts "2026-08-19", a full ISO timestamp, or nothing. Never throws. */
export function toDateOnly(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  }
  return new Date().toISOString().split('T')[0]
}

/** Coerces anything to a number, falling back to 0 rather than NaN. */
export function toAmount(value: unknown): number {
  const n = Number(value)
  return isFinite(n) ? Math.round(n * 100) / 100 : 0
}
