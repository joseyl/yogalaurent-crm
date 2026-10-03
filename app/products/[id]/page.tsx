import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { formatGBP, categoryLabel } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import ProductPurchasesList from '@/components/ProductPurchasesList'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import Badge from '@/components/ui/Badge'

interface Props {
  params: Promise<{ id: string }>
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServerClient()

  const [{ data: product }, { data: purchases }, { data: interests }] = await Promise.all([
    supabase.from('products').select('id, name, category').eq('id', id).single(),
    supabase
      .from('purchases')
      .select('id, amount_gbp, purchase_date, notes, edition, cohort_year, people(id, first_name, last_name)')
      .eq('product_id', id)
      .order('purchase_date', { ascending: false })
      .limit(10000),
    supabase
      .from('interests')
      .select('id, person_id, source, added_date, people(id, first_name, last_name, email, status, assigned_to)')
      .eq('product_id', id)
      .order('added_date', { ascending: false })
      .limit(10000),
  ])

  if (!product) notFound()

  const purchaseList = (purchases ?? []).map(p => {
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

  const potentialBuyers = (interests ?? []).map(i => {
    const person = i.people as unknown as {
      id: string
      first_name: string | null
      last_name: string | null
      email: string
      status: string
      assigned_to: string | null
    } | null
    return {
      id: i.id as string,
      person_id: person?.id ?? (i.person_id as string),
      first_name: person?.first_name ?? null,
      last_name: person?.last_name ?? null,
      email: person?.email ?? '',
      status: person?.status ?? '',
      assigned_to: person?.assigned_to ?? null,
      source: i.source as string | null,
      added_date: i.added_date as string,
    }
  })

  const totalRevenue = purchaseList.reduce((s, p) => s + p.amount_gbp, 0)

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
      </div>

      <ProductPurchasesList purchases={purchaseList} category={product.category} />

      {/* ── Potential buyers ─────────────────────────────────────────────── */}
      <div className="px-6 mt-8">
        <h2 className="font-bold mb-3 text-heading" style={{ fontSize: '18px' }}>
          Potential buyers
        </h2>
        <p className="text-sm font-bold mb-3 text-heading">
          {potentialBuyers.length} potential {potentialBuyers.length === 1 ? 'buyer' : 'buyers'}
        </p>

        {potentialBuyers.length === 0 ? (
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            No one tagged as a potential buyer for this product yet.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-grey-subtle border-b border-card-border">
                    {['Name', 'Email', 'Status', 'Assigned To', 'Source', 'Date Added'].map(h => (
                      <th
                        key={h}
                        className="text-left uppercase tracking-wide pb-3 pr-4 text-muted"
                        style={{ fontSize: '11px' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {potentialBuyers.map(b => (
                    <tr key={b.id} className="border-b border-card-border hover:bg-grey-subtle">
                      <td className="py-3 pr-4 font-medium text-heading">
                        <Link href={`/clients/${b.person_id}`} className="hover:underline">
                          {b.first_name} {b.last_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted">{b.email}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted">{b.assigned_to ?? '—'}</td>
                      <td className="py-3 pr-4 text-sm text-muted">{b.source ?? '—'}</td>
                      <td className="py-3 text-sm text-muted whitespace-nowrap">{formatDate(b.added_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {potentialBuyers.map(b => (
                <div key={b.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/clients/${b.person_id}`}
                      className="font-semibold text-sm hover:underline text-heading"
                    >
                      {b.first_name} {b.last_name}
                    </Link>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-muted text-xs mt-1">{b.email}</p>
                  {b.source && <p className="text-muted text-xs mt-0.5">{b.source}</p>}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-muted text-xs">{b.assigned_to ?? '—'}</span>
                    <span className="text-muted text-xs">{formatDate(b.added_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
