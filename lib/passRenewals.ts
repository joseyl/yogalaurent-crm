import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAll } from '@/lib/fetchAll'

// A class pass purchase used to decide whether someone has renewed.
// Counts: any product in category 'classes' whose name does not contain "drop"
// (so drop-ins never count as a renewal).
export interface ClassPassPurchase {
  id: string
  person_id: string
  purchase_date: string
}

export async function getClassPassPurchases(personIds: string[]): Promise<ClassPassPurchase[]> {
  const ids = [...new Set(personIds.filter(Boolean))]
  if (ids.length === 0) return []

  const rows = await fetchAll<{
    id: string
    person_id: string
    purchase_date: string
    products: { name: string | null; category: string | null } | null
  }>(() =>
    supabaseAdmin
      .from('purchases')
      .select('id, person_id, purchase_date, products!inner(name, category)')
      .eq('products.category', 'classes')
      .not('products.name', 'ilike', '%drop%')
      .in('person_id', ids)
      .order('id'),
  )

  // Belt and braces: repeat the filters here in case the embedded filter is ignored.
  return rows
    .filter(r => r.products?.category === 'classes' && !/drop/i.test(r.products?.name ?? ''))
    .map(r => ({ id: r.id, person_id: r.person_id, purchase_date: r.purchase_date }))
}

// Today's date in London as YYYY-MM-DD.
export function londonToday(): string {
  return londonDateOf(new Date())
}

export function londonDateOf(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(d)
}

// Turns a stored date or timestamp into a London YYYY-MM-DD date.
export function toLondonDate(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return londonDateOf(d)
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

// Whole days from one YYYY-MM-DD date to another (negative if `to` is earlier).
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

// ── Momence pass snapshots (momence_passes) ──────────────────────────────────

export interface PassSnapshotRow {
  snapshot_date: string
  momence_member_id: string | null
  momence_bought_membership_id: string
  person_id: string | null
  name: string | null
  start_date: string | null
  end_date: string | null
  credits_left: number | string | null
  credits_total: number | string | null
}

export const PASS_SNAPSHOT_COLUMNS =
  'snapshot_date, momence_member_id, momence_bought_membership_id, person_id, name, start_date, end_date, credits_left, credits_total'

export function num(v: number | string | null): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// A purchase only counts as a renewal if it is dated this many days or more
// after the pass's start date. This stops a pass's own purchase counting as
// its renewal (Momence start dates are UTC timestamps, so a pass bought just
// after midnight UK time can start "the day before" its CRM purchase date).
export const RENEWAL_MIN_DAYS_AFTER_START = 2

export function isRenewed(pass: PassSnapshotRow, purchases: ClassPassPurchase[]): boolean {
  if (!pass.person_id) return false
  const start = toLondonDate(pass.start_date)
  if (!start) return false
  const threshold = addDays(start, RENEWAL_MIN_DAYS_AFTER_START)
  return purchases.some(p => p.person_id === pass.person_id && p.purchase_date >= threshold)
}

// Display names for pass holders: the CRM client name when linked, otherwise
// the name Momence gave on bookings (attendance_v2). Returns a function that
// gives the name for a row.
export async function passHolderNames(
  rows: PassSnapshotRow[],
): Promise<(r: PassSnapshotRow) => string> {
  const personIds = [...new Set(rows.map(r => r.person_id).filter((id): id is string => !!id))]
  const unlinkedMemberIds = [
    ...new Set(
      rows.filter(r => !r.person_id && r.momence_member_id).map(r => r.momence_member_id as string),
    ),
  ]

  const [peopleRes, memberNames] = await Promise.all([
    personIds.length
      ? supabaseAdmin.from('people').select('id, first_name, last_name').in('id', personIds)
      : Promise.resolve({ data: [], error: null }),
    unlinkedMemberIds.length
      ? fetchAll<{ momence_member_id: string; first_name: string | null; last_name: string | null }>(() =>
          supabaseAdmin
            .from('attendance_v2')
            .select('momence_member_id, first_name, last_name')
            .in('momence_member_id', unlinkedMemberIds)
            .order('class_date', { ascending: false }),
        )
      : Promise.resolve([]),
  ])
  if (peopleRes.error) throw peopleRes.error

  const personName = new Map<string, string>()
  for (const p of (peopleRes.data ?? []) as { id: string; first_name: string | null; last_name: string | null }[]) {
    personName.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(' '))
  }
  const memberName = new Map<string, string>()
  for (const m of memberNames) {
    if (memberName.has(m.momence_member_id)) continue
    const n = [m.first_name, m.last_name].filter(Boolean).join(' ')
    if (n) memberName.set(m.momence_member_id, n)
  }

  return (r: PassSnapshotRow) =>
    r.person_id
      ? personName.get(r.person_id) || 'Unknown'
      : (r.momence_member_id && memberName.get(r.momence_member_id)) || 'Unknown Momence member'
}
