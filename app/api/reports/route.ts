import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/fetchAll'
import { isValidIsoDate, londonTodayIso, shiftYear } from '@/lib/periods'

/**
 * Reports: where the money came from in a period, compared with the same dates a year
 * earlier. Grouped as category > family (products.base_name) > product.
 * Reads every purchase in pages of 1,000 (Supabase returns at most 1,000 rows per request).
 */

export const dynamic = 'force-dynamic'

const CATEGORY_ORDER = ['training', 'classes', 'workshop', 'retreat', 'private', 'other'] as const
const CATEGORY_LABELS: Record<string, string> = {
  training: 'Teacher trainings',
  classes: 'Classes',
  workshop: 'Workshops and series',
  retreat: 'Retreats',
  private: 'Private sessions',
  other: 'Other',
}

interface Product {
  id: string
  name: string
  category: string
  entity: string | null
  base_name: string | null
  year: number | null
}

interface Purchase {
  person_id: string
  product_id: string
  amount_gbp: number | string | null
  purchase_date: string
}

interface Totals { revenue: number; sales: number }
const emptyTotals = (): Totals => ({ revenue: 0, sales: 0 })
const r2 = (n: number) => Math.round(n * 100) / 100

function inRange(d: string, from: string | null, to: string | null) {
  return (!from || d >= from) && (!to || d <= to)
}

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  const fromRaw = sp.get('date_from') ?? ''
  const toRaw = sp.get('date_to') ?? ''
  const from = isValidIsoDate(fromRaw) ? fromRaw : null
  const to = isValidIsoDate(toRaw) ? toRaw : null
  // Comparison only when the period has both ends
  const prevFrom = from && to ? shiftYear(from, -1) : null
  const prevTo = from && to ? shiftYear(to, -1) : null
  const hasPrev = prevFrom !== null && prevTo !== null

  const supabase = createServerClient()

  let products: Product[]
  let purchases: Purchase[]
  try {
    ;[products, purchases] = await Promise.all([
      fetchAll<Product>(() => supabase.from('products').select('id, name, category, entity, base_name, year').order('id')),
      fetchAll<Purchase>(() => supabase.from('purchases').select('person_id, product_id, amount_gbp, purchase_date').order('id')),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
    return NextResponse.json({ error: `Failed to read purchases: ${msg}` }, { status: 500 })
  }

  const productById = new Map(products.map(p => [p.id, p]))

  // ── Headline and the category > family > product tree ─────────────────────────
  const head = { cur: { revenue: 0, sales: 0, lr: 0, ttl: 0, clients: new Set<string>() }, prev: { revenue: 0, sales: 0, lr: 0, ttl: 0, clients: new Set<string>() } }
  const tree = new Map<string, { cur: Totals; prev: Totals; families: Map<string, { cur: Totals; prev: Totals; products: Map<string, { cur: Totals; prev: Totals }> }> }>()

  // Classes detail: first ever paid classes purchase per person
  const firstClassesPurchase = new Map<string, string>()

  for (const pu of purchases) {
    const prod = productById.get(pu.product_id)
    if (!prod) continue
    const amt = Number(pu.amount_gbp ?? 0)
    if (prod.category === 'classes' && amt > 0) {
      const f = firstClassesPurchase.get(pu.person_id)
      if (!f || pu.purchase_date < f) firstClassesPurchase.set(pu.person_id, pu.purchase_date)
    }
    const isCur = inRange(pu.purchase_date, from, to)
    const isPrev = hasPrev && inRange(pu.purchase_date, prevFrom, prevTo)
    if (!isCur && !isPrev) continue

    const fam = prod.base_name ?? prod.name
    if (!tree.has(prod.category)) tree.set(prod.category, { cur: emptyTotals(), prev: emptyTotals(), families: new Map() })
    const cat = tree.get(prod.category)!
    if (!cat.families.has(fam)) cat.families.set(fam, { cur: emptyTotals(), prev: emptyTotals(), products: new Map() })
    const family = cat.families.get(fam)!
    if (!family.products.has(prod.id)) family.products.set(prod.id, { cur: emptyTotals(), prev: emptyTotals() })
    const product = family.products.get(prod.id)!

    for (const [hit, key] of [[isCur, 'cur'], [isPrev, 'prev']] as const) {
      if (!hit) continue
      for (const t of [cat[key], family[key], product[key]]) {
        t.revenue += amt
        if (amt > 0) t.sales += 1
      }
      const h = head[key]
      h.revenue += amt
      if (amt > 0) { h.sales += 1; h.clients.add(pu.person_id) }
      if (prod.entity === 'Laurent Roure') h.lr += amt
      else if (prod.entity === 'Terra Training Ltd') h.ttl += amt
    }
  }

  const fix = (t: Totals) => ({ revenue: r2(t.revenue), sales: t.sales })
  const categories = [...tree.entries()]
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a[0] as typeof CATEGORY_ORDER[number])
      const bi = CATEGORY_ORDER.indexOf(b[0] as typeof CATEGORY_ORDER[number])
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .map(([category, c]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      cur: fix(c.cur),
      prev: hasPrev ? fix(c.prev) : null,
      families: [...c.families.entries()]
        .map(([family, f]) => ({
          family,
          cur: fix(f.cur),
          prev: hasPrev ? fix(f.prev) : null,
          products: [...f.products.entries()]
            .map(([id, p]) => ({ id, name: productById.get(id)?.name ?? '?', cur: fix(p.cur), prev: hasPrev ? fix(p.prev) : null }))
            .filter(p => p.cur.revenue !== 0 || p.cur.sales > 0 || (p.prev && (p.prev.revenue !== 0 || p.prev.sales > 0)))
            .sort((a, b) => b.cur.revenue - a.cur.revenue || a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => b.cur.revenue - a.cur.revenue || a.family.localeCompare(b.family)),
    }))

  const headline = (h: typeof head.cur) => ({ revenue: r2(h.revenue), sales: h.sales, clients: h.clients.size, lr: r2(h.lr), ttl: r2(h.ttl) })

  // ── Month by month (by year when the period is longer than 36 months) ──────────
  const today = londonTodayIso()
  const curRows = purchases.filter(pu => inRange(pu.purchase_date, from, to))
  const firstDate = from ?? curRows.reduce((m, pu) => (pu.purchase_date < m ? pu.purchase_date : m), today)
  const lastDate = to && to < today ? to : curRows.reduce((m, pu) => (pu.purchase_date > m ? pu.purchase_date : m), to && to < today ? to : today)
  const monthsSpan = (Number(lastDate.slice(0, 4)) - Number(firstDate.slice(0, 4))) * 12 + Number(lastDate.slice(5, 7)) - Number(firstDate.slice(5, 7)) + 1
  const byYear = monthsSpan > 36
  const bucketOf = (d: string) => (byYear ? d.slice(0, 4) : d.slice(0, 7))
  const buckets: string[] = []
  if (byYear) {
    for (let y = Number(firstDate.slice(0, 4)); y <= Number(lastDate.slice(0, 4)); y++) buckets.push(String(y))
  } else {
    let y = Number(firstDate.slice(0, 4)), m = Number(firstDate.slice(5, 7))
    for (let i = 0; i < monthsSpan; i++) {
      buckets.push(`${y}-${String(m).padStart(2, '0')}`)
      m++; if (m > 12) { m = 1; y++ }
    }
  }
  const series = new Map<string, Record<string, number>>(buckets.map(b => [b, {}]))
  for (const pu of curRows) {
    const prod = productById.get(pu.product_id)
    if (!prod) continue
    const row = series.get(bucketOf(pu.purchase_date))
    if (!row) continue
    row[prod.category] = (row[prod.category] ?? 0) + Number(pu.amount_gbp ?? 0)
  }
  const trend = buckets.map(b => {
    const row = series.get(b)!
    return { bucket: b, ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, r2(v)])) }
  })

  // ── Classes in detail ─────────────────────────────────────────────────────────
  function classBuyers(f: string | null, t: string | null) {
    const people = new Set<string>()
    for (const pu of purchases) {
      const prod = productById.get(pu.product_id)
      if (prod?.category !== 'classes' || Number(pu.amount_gbp ?? 0) <= 0) continue
      if (inRange(pu.purchase_date, f, t)) people.add(pu.person_id)
    }
    let newBuyers = 0
    for (const pid of people) {
      const first = firstClassesPurchase.get(pid)
      if (first && inRange(first, f, t)) newBuyers++
    }
    return { buyers: people.size, newBuyers, returning: people.size - newBuyers }
  }

  async function bookingCount(f: string | null, t: string | null): Promise<number | null> {
    let q = supabase
      .from('attendance_v2')
      .select('*', { count: 'exact', head: true })
      .eq('cancelled', false)
      .eq('duplicate_of_momence', false)
    if (f) q = q.gte('class_date', f)
    if (t) q = q.lte('class_date', t)
    const { count, error } = await q
    return error ? null : count
  }

  const [bookings, prevBookings] = await Promise.all([
    bookingCount(from, to),
    hasPrev ? bookingCount(prevFrom, prevTo) : Promise.resolve(null),
  ])

  return NextResponse.json({
    range: { from, to },
    prevRange: hasPrev ? { from: prevFrom, to: prevTo } : null,
    headline: { cur: headline(head.cur), prev: hasPrev ? headline(head.prev) : null },
    categories,
    trend: { byYear, rows: trend },
    classes: {
      cur: { ...classBuyers(from, to), bookings },
      prev: hasPrev ? { ...classBuyers(prevFrom, prevTo), bookings: prevBookings } : null,
    },
  })
}
