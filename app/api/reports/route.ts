import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface PersonEmbed {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  status: string
}

interface ProductEmbed {
  id: string
  name: string
  category: string
}

interface PurchaseRow {
  id: string
  person_id: string
  amount_gbp: number | string
  purchase_date: string
  people: PersonEmbed | PersonEmbed[] | null
  products: ProductEmbed | ProductEmbed[] | null
}

function getPerson(row: PurchaseRow): PersonEmbed | null {
  if (!row.people) return null
  return Array.isArray(row.people) ? row.people[0] ?? null : row.people
}

function getProduct(row: PurchaseRow): ProductEmbed | null {
  if (!row.products) return null
  return Array.isArray(row.products) ? row.products[0] ?? null : row.products
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const supabase = createServerClient()

  let query = supabase
    .from('purchases')
    .select('id, person_id, amount_gbp, purchase_date, people!inner(id, first_name, last_name, email, status), products(id, name, category)')
    .limit(10000)

  if (dateFrom) query = query.gte('purchase_date', dateFrom)
  if (dateTo) query = query.lte('purchase_date', dateTo)

  const { data: rawPurchases, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  const purchases = (rawPurchases ?? []) as unknown as PurchaseRow[]

  // ── Query 1: Top 20 spenders overall ────────────────────────────────────────
  const spenderMap: Record<string, {
    id: string; first_name: string | null; last_name: string | null
    email: string; status: string; total_spend: number; purchase_count: number
  }> = {}

  for (const row of purchases) {
    const person = getPerson(row)
    if (!person) continue
    const pid = person.id
    const amt = Number(row.amount_gbp ?? 0)
    if (!spenderMap[pid]) {
      spenderMap[pid] = {
        id: pid,
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        status: person.status,
        total_spend: 0,
        purchase_count: 0,
      }
    }
    spenderMap[pid].total_spend += amt
    spenderMap[pid].purchase_count += 1
  }

  const topSpenders = Object.values(spenderMap)
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, 20)

  // ── Query 2: Top 10 spenders by category ────────────────────────────────────
  const categories = ['classes', 'training', 'retreat', 'workshop'] as const
  type Category = typeof categories[number]

  const categoryMaps: Record<Category, Record<string, {
    id: string; first_name: string | null; last_name: string | null
    email: string; total_spend: number; purchase_count: number
  }>> = { classes: {}, training: {}, retreat: {}, workshop: {} }

  for (const row of purchases) {
    const person = getPerson(row)
    const product = getProduct(row)
    if (!person || !product) continue
    const cat = product.category as Category
    if (!categoryMaps[cat]) continue
    const pid = person.id
    const amt = Number(row.amount_gbp ?? 0)
    const map = categoryMaps[cat]
    if (!map[pid]) {
      map[pid] = {
        id: pid,
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        total_spend: 0,
        purchase_count: 0,
      }
    }
    map[pid].total_spend += amt
    map[pid].purchase_count += 1
  }

  const byCategory = Object.fromEntries(
    categories.map(cat => [
      cat,
      Object.values(categoryMaps[cat])
        .sort((a, b) => b.total_spend - a.total_spend)
        .slice(0, 10),
    ])
  ) as Record<Category, typeof categoryMaps.classes[string][]>

  // ── Query 3: Revenue per retreat product ─────────────────────────────────────
  const retreatMap: Record<string, { name: string; total_revenue: number; persons: Set<string> }> = {}

  for (const row of purchases) {
    const product = getProduct(row)
    if (!product || product.category !== 'retreat') continue
    const name = product.name
    const amt = Number(row.amount_gbp ?? 0)
    if (!retreatMap[name]) retreatMap[name] = { name, total_revenue: 0, persons: new Set() }
    retreatMap[name].total_revenue += amt
    retreatMap[name].persons.add(row.person_id)
  }

  const retreats = Object.values(retreatMap)
    .map(r => ({ name: r.name, total_revenue: r.total_revenue, client_count: r.persons.size }))
    .sort((a, b) => b.total_revenue - a.total_revenue)

  // ── Query 4: Training by cohort year ─────────────────────────────────────────
  const trainingMap: Record<string, { name: string; cohort_year: number; total_revenue: number; persons: Set<string> }> = {}

  for (const row of purchases) {
    const product = getProduct(row)
    if (!product || product.category !== 'training') continue
    const name = product.name
    const year = new Date(row.purchase_date).getFullYear()
    const key = `${name}::${year}`
    const amt = Number(row.amount_gbp ?? 0)
    if (!trainingMap[key]) trainingMap[key] = { name, cohort_year: year, total_revenue: 0, persons: new Set() }
    trainingMap[key].total_revenue += amt
    trainingMap[key].persons.add(row.person_id)
  }

  const trainingByCohort = Object.values(trainingMap)
    .map(t => ({ name: t.name, cohort_year: t.cohort_year, total_revenue: t.total_revenue, client_count: t.persons.size }))
    .sort((a, b) => a.name.localeCompare(b.name) || b.cohort_year - a.cohort_year)

  return NextResponse.json({ topSpenders, byCategory, retreats, trainingByCohort })
}
