'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatGBP } from '@/lib/utils'

interface Purchase {
  id: string
  amount_gbp: number
  purchase_date: string
  notes: string | null
  person_id: string | null
  first_name: string | null
  last_name: string | null
  edition: string | null
  cohort_year: number | null
}

interface CohortOption {
  key: string
  label: string
  edition: string | null
  cohort_year: number | null
}

interface Props {
  purchases: Purchase[]
  category: string
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function cohortKey(edition: string | null, cohort_year: number | null): string {
  if (!edition && cohort_year == null) return '__none__'
  return `${edition ?? ''}::${cohort_year ?? ''}`
}

function deriveCohortOptions(purchases: Purchase[]): CohortOption[] {
  const seen = new Map<string, CohortOption>()
  for (const p of purchases) {
    const key = cohortKey(p.edition, p.cohort_year)
    if (!seen.has(key)) {
      let label: string
      if (p.edition && p.cohort_year != null) label = `${p.edition} ${p.cohort_year}`
      else if (p.edition) label = p.edition
      else if (p.cohort_year != null) label = `Cohort ${p.cohort_year}`
      else label = 'No cohort assigned'
      seen.set(key, { key, label, edition: p.edition, cohort_year: p.cohort_year })
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    if (a.key === '__none__' && b.key !== '__none__') return 1
    if (b.key === '__none__' && a.key !== '__none__') return -1
    const yearDiff = (b.cohort_year ?? -1) - (a.cohort_year ?? -1)
    if (yearDiff !== 0) return yearDiff
    return (a.edition ?? '').localeCompare(b.edition ?? '')
  })
}

export default function ProductPurchasesList({ purchases, category }: Props) {
  const [cohortFilter, setCohortFilter] = useState('')

  const isTraining = category === 'training'
  const cohortOptions = isTraining ? deriveCohortOptions(purchases) : []

  const filteredPurchases = cohortFilter === ''
    ? purchases
    : purchases.filter(p => cohortKey(p.edition, p.cohort_year) === cohortFilter)

  const enrolledCount = new Set(
    filteredPurchases.map(p => p.person_id).filter((id): id is string => id !== null)
  ).size
  const filteredRevenue = filteredPurchases.reduce((s, p) => s + p.amount_gbp, 0)
  const noun = isTraining ? 'enrolled' : enrolledCount === 1 ? 'buyer' : 'buyers'

  if (purchases.length === 0) {
    return <p className="px-6 text-sm" style={{ color: '#9ca3af' }}>No purchases recorded for this product</p>
  }

  return (
    <>
      {isTraining && cohortOptions.length > 0 && (
        <div className="px-6 mb-3">
          <select
            value={cohortFilter}
            onChange={e => setCohortFilter(e.target.value)}
            className="border border-[#d1d5db] bg-white text-sm focus:outline-none"
            style={{ borderRadius: 0, minHeight: '44px', padding: '8px 10px', minWidth: '200px', maxWidth: '100%' }}
          >
            <option value="">All cohorts</option>
            {cohortOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="px-6 mb-3">
        <p className="text-sm font-semibold" style={{ color: '#1A2C4E' }}>
          {enrolledCount} {noun} — {formatGBP(filteredRevenue)}
        </p>
      </div>

      {filteredPurchases.length === 0 ? (
        <p className="px-6 text-sm" style={{ color: '#9ca3af' }}>No purchases in this cohort.</p>
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
                {filteredPurchases.map(p => (
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
            {filteredPurchases.map(p => (
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
                    <span className="font-semibold text-sm" style={{ color: '#9ca3af' }}>Unknown</span>
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
    </>
  )
}
