// Build D, release 2: types and labels shared by the Possible duplicates pages (server and
// browser). The rules live in the database (supabase/migrations/015_duplicates_merge.sql).

export interface PersonSummary {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  alt_email: string | null
  other_emails: string[]
  phone: string | null
  country: string | null
  status: string
  notes: string | null
  source_channel: string | null
  momence_member_id: number | null
  created_at: string | null
  purchases: number
  spend: number
  intro_offers: number
  classes: number
  leads: number
  last_activity: string | null
}

export interface PairRow {
  person_a: string
  person_b: string
  same_email: boolean
  same_phone: boolean
  same_name: boolean
  similar_name: boolean
  rank: number
  reasons: number
  intro_offers: number
  more_than_one_intro_offer: boolean
  has_deceased: boolean
  both_momence_numbers: boolean
  not_same: boolean
  not_same_note: string | null
  not_same_at: string | null
}

export interface MergeRow {
  id: string
  kept_id: string
  removed_id: string
  removed_name: string
  removed_email: string
  kept_name: string | null
  kept_exists: boolean
  row_counts: Record<string, number>
  emails_added: string[]
  emails_skipped: string[]
  gone_quiet_rule: string
  note: string | null
  status: 'merged' | 'undone'
  merged_at: string
  undone_at: string | null
}

export function reasonLabels(p: PairRow): string[] {
  const out: string[] = []
  if (p.same_email) out.push('Same email')
  if (p.same_phone) out.push('Same phone')
  if (p.same_name) out.push('Same full name')
  if (p.similar_name) out.push('Nickname or one letter off')
  return out
}

export function personName(p: { first_name: string | null; last_name: string | null; email?: string | null }): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'No name'
}

// Row counts in the merge log, in plain words
const TABLE_LABEL: Record<string, string> = {
  purchases: 'purchases',
  attendance_v2: 'classes',
  attendance: 'classes (old table)',
  leads: 'leads',
  momence_passes: 'Momence pass copies',
  momence_sales: 'Momence sales',
  pass_followups: 'pass follow-ups',
  payment_link_payments: 'payment-link payments',
  training_payments: 'training instalments',
  webhook_log: 'log lines',
  purchases_removed_2026_08_19: 'August backup rows',
  gone_quiet_actions: 'Gone Quiet record',
  person_emails: 'other emails',
}

export function countsText(counts: Record<string, number>, goneQuietRule?: string): string {
  const parts = Object.entries(counts)
    .filter(([t, n]) => n > 0 && t !== 'gone_quiet_actions')
    .map(([t, n]) => `${n} ${TABLE_LABEL[t] ?? t}`)
  const text = parts.length ? parts.join(', ') : 'nothing to move'
  if (goneQuietRule === 'moved') return `${text}; Gone Quiet record moved across`
  if (goneQuietRule === 'kept_own') return `${text}; Gone Quiet: the kept record's own row kept, the other saved in the merge log`
  return text
}

export function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
}
