import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { formatGBP, categoryLabel } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'

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
      .select('id, amount_gbp, purchase_date, notes, people(id, first_name, last_name)')
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
        <Link href="/products" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Products
        </Link>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1 className="font-bold" style={{ fontSize: '22px', color: '#1A2C4E' }}>
            {product.name}
          </h1>
          <span
            style={{
              background: '#f3f4f6',
              color: '#374151',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {categoryLabel(product.category)}
          </span>
        </div>
        <div className="flex gap-8 mt-3">
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#6b7280' }}>
              Purchases
            </p>
            <p className="font-bold text-lg mt-0.5" style={{ color: '#1A2C4E' }}>
              {purchaseList.length}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: '#6b7280' }}>
              Total Revenue
            </p>
            <p className="font-bold text-lg mt-0.5" style={{ color: '#1A2C4E' }}>
              {formatGBP(totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      {purchaseList.length === 0 ? (
        <p className="px-6 text-sm" style={{ color: '#9ca3af' }}>
          No purchases recorded for this product
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block px-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  {['Client', 'Date', 'Amount', 'Notes'].map(h => (
                    <th
                      key={h}
                      className="text-left uppercase tracking-wide pb-3 pr-4"
                      style={{ fontSize: '11px', color: '#6b7280' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseList.map(p => (
                  <tr key={p.id} className="border-b border-[#f3f4f6]">
                    <td className="py-3 pr-4 font-medium" style={{ color: '#1A2C4E' }}>
                      {p.person_id ? (
                        <Link href={`/clients/${p.person_id}`} className="hover:underline">
                          {p.first_name} {p.last_name}
                        </Link>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>Unknown</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(p.purchase_date)}
                    </td>
                    <td
                      className="py-3 pr-4 text-sm text-right whitespace-nowrap"
                      style={{ color: p.amount_gbp === 0 ? '#9ca3af' : undefined }}
                    >
                      {formatGBP(p.amount_gbp)}
                    </td>
                    <td className="py-3 text-sm text-gray-500">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden px-4">
            {purchaseList.map(p => (
              <div
                key={p.id}
                className="bg-white border border-[#e5e7eb] p-4 mb-2"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center justify-between">
                  {p.person_id ? (
                    <Link
                      href={`/clients/${p.person_id}`}
                      className="font-semibold text-sm hover:underline"
                      style={{ color: '#1A2C4E' }}
                    >
                      {p.first_name} {p.last_name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-sm" style={{ color: '#9ca3af' }}>
                      Unknown
                    </span>
                  )}
                  <span
                    className="font-semibold text-sm"
                    style={{ color: p.amount_gbp === 0 ? '#9ca3af' : '#B8540A' }}
                  >
                    {formatGBP(p.amount_gbp)}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-1">{formatDate(p.purchase_date)}</p>
                {p.notes && <p className="text-gray-500 text-xs mt-1">{p.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Potential buyers ─────────────────────────────────────────────── */}
      <div className="px-6 mt-8">
        <h2 className="font-bold mb-3" style={{ fontSize: '18px', color: '#1A2C4E' }}>
          Potential buyers
        </h2>
        <p className="text-sm font-bold mb-3" style={{ color: '#1A2C4E' }}>
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
                  <tr className="border-b border-[#e5e7eb]">
                    {['Name', 'Email', 'Status', 'Assigned To', 'Source', 'Date Added'].map(h => (
                      <th
                        key={h}
                        className="text-left uppercase tracking-wide pb-3 pr-4"
                        style={{ fontSize: '11px', color: '#6b7280' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {potentialBuyers.map(b => (
                    <tr key={b.id} className="border-b border-[#f3f4f6]">
                      <td className="py-3 pr-4 font-medium" style={{ color: '#1A2C4E' }}>
                        <Link href={`/clients/${b.person_id}`} className="hover:underline">
                          {b.first_name} {b.last_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-500">{b.email}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-500">{b.assigned_to ?? '—'}</td>
                      <td className="py-3 pr-4 text-sm text-gray-500">{b.source ?? '—'}</td>
                      <td className="py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(b.added_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {potentialBuyers.map(b => (
                <div key={b.id} className="border border-[#e5e7eb] p-4" style={{ borderRadius: 0 }}>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/clients/${b.person_id}`}
                      className="font-semibold text-sm hover:underline"
                      style={{ color: '#1A2C4E' }}
                    >
                      {b.first_name} {b.last_name}
                    </Link>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{b.email}</p>
                  {b.source && <p className="text-gray-500 text-xs mt-0.5">{b.source}</p>}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-400 text-xs">{b.assigned_to ?? '—'}</span>
                    <span className="text-gray-400 text-xs">{formatDate(b.added_date)}</span>
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
