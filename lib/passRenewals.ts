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
