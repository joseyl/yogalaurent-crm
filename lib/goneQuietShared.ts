// Types and labels for Gone Quiet (Build C), safe to use in the browser.
// The data functions are in lib/goneQuiet.ts (server only).

export type GapGroup = '1_to_3_months' | '3_to_6_months' | '6_to_12_months' | 'over_1_year'

// Longest gap first
export const GROUPS: { key: GapGroup; label: string; short: string; mailchimp: boolean }[] = [
  { key: 'over_1_year', label: 'Over 1 year', short: 'Over 1 year', mailchimp: true },
  { key: '6_to_12_months', label: '6 to 12 months', short: '6 to 12 months', mailchimp: true },
  { key: '3_to_6_months', label: '3 to 6 months', short: '3 to 6 months', mailchimp: false },
  { key: '1_to_3_months', label: '1 to 3 months', short: '1 to 3 months', mailchimp: false },
]

export function isGapGroup(v: unknown): v is GapGroup {
  return typeof v === 'string' && GROUPS.some(g => g.key === v)
}

export type DismissReason = 'not_interested' | 'moved_away' | 'deceased' | 'other'

export const DISMISS_REASONS: { key: DismissReason; label: string }[] = [
  { key: 'not_interested', label: 'Not interested' },
  { key: 'moved_away', label: 'Moved away' },
  { key: 'deceased', label: 'Deceased (also sets the client status)' },
  { key: 'other', label: 'Other' },
]

export interface GoneQuietRow {
  person_id: string
  first_name: string | null
  last_name: string | null
  email: string
  status: string
  classes_attended: number
  came_once: boolean
  last_class: string
  last_purchase: string | null
  last_activity: string
  days_since: number
  gap_group: GapGroup | 'active'
  contacted_on: string | null
  contacted: boolean
  dismissed_on: string | null
  dismiss_reason: DismissReason | null
  dismiss_note: string | null
  dismissed: boolean
  listed: boolean
}
