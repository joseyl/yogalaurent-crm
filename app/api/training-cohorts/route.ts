import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface ProductEmbed {
  name: string
  category: string
}

interface PurchaseRow {
  amount_gbp: number | string | null
  edition: string | null
  cohort_year: number | null
  products: ProductEmbed | ProductEmbed[] | null
}

const EDITION_ORDER = ['Winter', 'Spring', 'Summer', 'Autumn']

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('purchases')
    .select('amount_gbp, edition, cohort_year, products(name, category)')
    .limit(10000)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  const purchases = (data ?? []) as unknown as PurchaseRow[]

  const map = new Map<string, {
    product_name: string
    edition: string | null
    cohort_year: number | null
    student_count: number
    total_revenue: number
  }>()

  for (const row of purchases) {
    const prod = Array.isArray(row.products) ? row.products[0] : row.products
    if (!prod || prod.category !== 'training') continue
    const edition = row.edition
    const cohort_year = row.cohort_year
    const key = `${prod.name}::${edition ?? ''}::${cohort_year ?? ''}`
    const entry = map.get(key)
    if (!entry) {
      map.set(key, {
        product_name: prod.name,
        edition,
        cohort_year,
        student_count: 1,
        total_revenue: Number(row.amount_gbp ?? 0),
      })
    } else {
      entry.student_count += 1
      entry.total_revenue += Number(row.amount_gbp ?? 0)
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => {
    if (a.product_name !== b.product_name) return a.product_name.localeCompare(b.product_name)
    if ((a.cohort_year ?? 0) !== (b.cohort_year ?? 0)) return (a.cohort_year ?? 0) - (b.cohort_year ?? 0)
    const ai = EDITION_ORDER.indexOf(a.edition ?? '')
    const bi = EDITION_ORDER.indexOf(b.edition ?? '')
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  return NextResponse.json(rows)
}
