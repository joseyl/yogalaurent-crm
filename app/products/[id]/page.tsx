import { fetchAll } from '@/lib/fetchAll'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { formatGBP, categoryLabel } from '@/lib/utils'
import ProductPurchasesList from '@/components/ProductPurchasesList'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import Badge from '@/components/ui/Badge'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServerClient()

  // Purchases are read in pages of 1,000 (Supabase returns at most 1,000 rows per request;
  // Drop-in Class has more than 2,000)
  const [{ data: product }, purchases] = await Promise.all([
    supabase.from('products').select('id, name, category').eq('id', id).single(),
    fetchAll<Record<string, unknown>>(() => supabase
      .from('purchases')
      .select('id, amount_gbp, purchase_date, notes, edition, cohort_year, people(id, first_name, last_name)')
      .eq('product_id', id)
      .order('purchase_date', { ascending: false })
      .order('id')),
  ])

  if (!product) notFound()

  const purchaseList = purchases.map(p => {
    const person = p.people as unknown as {
      id: string
      first_name: string | null
      last_name: string | null
    } | null
    return {
      id: p.id as string,
      amount_gbp: Number(p.amount_gbp),
      purchase_date: p.purchase_date as string,
      notes: p.notes as string | null,
      person_id: person?.id ?? null,
      first_name: person?.first_name ?? null,
      last_name: person?.last_name ?? null,
      edition: p.edition as string | null,
      cohort_year: p.cohort_year as number | null,
    }
  })

  const totalRevenue = purchaseList.reduce((s, p) => s + p.amount_gbp, 0)

  // Training: one line per cohort (moved here from the Reports page). Students counts every
  // row, including the 0 rows that record the 60hr and 40hr parts of a 100hr bundle.
  const EDITION_ORDER = ['Winter', 'Spring', 'Summer', 'Autumn']
  const cohorts = new Map<string, { label: string; year: number; edition: string; students: number; revenue: number }>()
  if (product.category === 'training') {
    for (const p of purchaseList) {
      const key = `${p.cohort_year ?? ''}::${p.edition ?? ''}`
      const label = p.edition && p.cohort_year != null ? `${p.edition} ${p.cohort_year}`
        : p.cohort_year != null ? `Cohort ${p.cohort_year}`
        : p.edition ?? 'No cohort assigned'
      const c = cohorts.get(key) ?? { label, year: p.cohort_year ?? -1, edition: p.edition ?? '', students: 0, revenue: 0 }
      c.students += 1
      c.revenue += p.amount_gbp
      cohorts.set(key, c)
    }
  }
  const cohortRows = [...cohorts.values()].sort((a, b) =>
    b.year - a.year || EDITION_ORDER.indexOf(b.edition) - EDITION_ORDER.indexOf(a.edition))

  return (
    <div className="pb-24">
      <div className="px-6 pt-6 pb-4">
        <Link href="/products" className="text-sm text-muted hover:text-body">
          &larr; Back to Products
        </Link>
        <div className="mt-3">
          <PageHeader
            title={product.name}
            badge={<Badge>{categoryLabel(product.category)}</Badge>}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <KpiCard label="Purchases" value={purchaseList.length} />
          <KpiCard label="Total Revenue" value={formatGBP(totalRevenue)} />
        </div>
        {cohortRows.length > 0 && (
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-grey-subtle border-b border-card-border">
                  {['Cohort', 'Students', 'Revenue'].map((h, i) => (
                    <th key={h} className={`uppercase tracking-wide text-muted ${i === 0 ? 'text-left' : 'text-right'}`} style={{ fontSize: '11px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohortRows.map(c => (
                  <tr key={c.label} className="border-b border-card-border">
                    <td className="text-sm text-heading">{c.label}</td>
                    <td className="text-sm text-body text-right">{c.students}</td>
                    <td className="text-sm text-body text-right whitespace-nowrap">{formatGBP(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductPurchasesList purchases={purchaseList} category={product.category} />
    </div>
  )
}
