'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import LoadingSpinner from '@/app/components/LoadingSpinner'
import { formatGBP, categoryLabel } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import Collapsible from '@/components/ui/Collapsible'

// ── Types ────────────────────────────────────────────────────────────────────

interface Spender {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  status: string
  total_spend: number
  purchase_count: number
}

interface CategorySpender {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  total_spend: number
  purchase_count: number
}

interface RetreatRow {
  base_name: string
  year: number | null
  total_revenue: number
  client_count: number
}

interface ReportsData {
  topSpenders: Spender[]
  byCategory: {
    classes: CategorySpender[]
    training: CategorySpender[]
    retreat: CategorySpender[]
    workshop: CategorySpender[]
  }
  retreats: RetreatRow[]
  revenueByEntity: { total: number; lr: number; ttl: number }
}

interface TrainingCohortRow {
  product_name: string
  edition: string | null
  cohort_year: number | null
  student_count: number
  total_revenue: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return formatGBP(n)
}

function escapeCsv(v: string): string {
  if (v.includes(',') || v.includes('\n') || v.includes('"')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Shared table styles ───────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  paddingBottom: '10px',
  textAlign: 'left',
  fontWeight: 500,
}

const tdStyle: React.CSSProperties = {
  padding: '10px 0',
  fontSize: '14px',
  borderBottom: '1px solid var(--color-card-border)',
  verticalAlign: 'middle',
}

function Empty() {
  return (
    <p className="text-muted italic text-sm text-center py-4">
      No data for the selected period.
    </p>
  )
}

// ── Revenue Summary Block ─────────────────────────────────────────────────────

function RevenueSummaryBlock({ data }: { data: { total: number; lr: number; ttl: number } }) {
  return (
    <div className="card p-5 mb-4">
      <p className="uppercase tracking-wide text-xs mb-3 text-muted">Revenue for Selected Period</p>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <span className="font-bold text-heading" style={{ fontSize: '22px' }}>{formatGBP(data.total)}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Total</span>
        </div>
        <div className="border-t border-card-border pt-2 flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-body">Laurent Roure</span>
            <span className="text-sm font-medium text-body">{formatGBP(data.lr)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-body">Terra Training Ltd</span>
            <span className="text-sm font-medium text-body">{formatGBP(data.ttl)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section 1: Top Spenders ───────────────────────────────────────────────────

function TopSpendersSection({ data }: { data: Spender[] }) {
  function exportCsv() {
    const headers = ['Rank', 'First Name', 'Last Name', 'Email', 'Status', 'Purchases', 'Total Spend']
    const rows = data.map((s, i) => [
      String(i + 1),
      s.first_name ?? '',
      s.last_name ?? '',
      s.email,
      s.status,
      String(s.purchase_count),
      formatGBP(s.total_spend),
    ])
    downloadCsv([headers, ...rows], `top-spenders-${today()}.csv`)
  }

  return (
    <Collapsible title="Top 20 Spenders" defaultOpen>
      <div className="flex justify-end mb-4">
        <button onClick={exportCsv} className="btn-secondary">Export CSV</button>
      </div>
      {data.length === 0 ? <Empty /> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-grey-subtle border-b border-card-border">
                  <th style={{ ...thStyle, width: '48px' }}>Rank</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Purchases</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s, i) => (
                  <tr key={s.id} className="hover:bg-grey-subtle">
                    <td style={{ ...tdStyle, color: 'var(--color-muted)' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--color-heading)' }}>
                      <Link href={`/clients/${s.id}`} className="hover:underline">
                        {s.first_name} {s.last_name}
                      </Link>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-muted)' }}>{s.email}</td>
                    <td style={tdStyle}><StatusBadge status={s.status} /></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{s.purchase_count}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(s.total_spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.map((s, i) => (
              <Link
                key={s.id}
                href={`/clients/${s.id}`}
                className="card block p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-heading">
                      <span className="text-muted font-normal mr-1">#{i + 1}</span>
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-muted text-xs mt-0.5">{s.email}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted text-xs">{s.purchase_count} purchases</span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{fmt(s.total_spend)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </Collapsible>
  )
}

// ── Section 2: By Category ────────────────────────────────────────────────────

function CategoryTable({ data }: { data: CategorySpender[] }) {
  if (data.length === 0) return <Empty />
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-grey-subtle border-b border-card-border">
              <th style={{ ...thStyle, width: '48px' }}>Rank</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Purchases</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total Spend</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => (
              <tr key={s.id} className="hover:bg-grey-subtle">
                <td style={{ ...tdStyle, color: 'var(--color-muted)' }}>{i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--color-heading)' }}>
                  <Link href={`/clients/${s.id}`} className="hover:underline">
                    {s.first_name} {s.last_name}
                  </Link>
                </td>
                <td style={{ ...tdStyle, color: 'var(--color-muted)' }}>{s.email}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{s.purchase_count}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(s.total_spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {data.map((s, i) => (
          <Link
            key={s.id}
            href={`/clients/${s.id}`}
            className="card block p-4"
          >
            <p className="font-semibold text-sm text-heading">
              <span className="text-muted font-normal mr-1">#{i + 1}</span>
              {s.first_name} {s.last_name}
            </p>
            <p className="text-muted text-xs mt-0.5">{s.email}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted text-xs">{s.purchase_count} purchases</span>
              <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{fmt(s.total_spend)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

function ByCategorySection({
  data,
}: {
  data: ReportsData['byCategory']
}) {
  const sections: { key: keyof ReportsData['byCategory']; label: string }[] = [
    { key: 'classes', label: 'Classes' },
    { key: 'training', label: 'Training' },
    { key: 'retreat', label: 'Retreats' },
    { key: 'workshop', label: 'In-person Workshops' },
  ]

  function exportCategory(key: keyof ReportsData['byCategory']) {
    const headers = ['Rank', 'First Name', 'Last Name', 'Email', 'Purchases', 'Total Spend']
    const rows = data[key].map((s, i) => [
      String(i + 1),
      s.first_name ?? '',
      s.last_name ?? '',
      s.email,
      String(s.purchase_count),
      formatGBP(s.total_spend),
    ])
    downloadCsv([headers, ...rows], `top-spenders-${key}-${today()}.csv`)
  }

  return (
    <Collapsible title="Top Spenders by Category" defaultOpen>
      {sections.map(({ key, label }) => (
        <div key={key} className="mb-6 last:mb-0">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-heading">{label}</h3>
            <button onClick={() => exportCategory(key)} className="btn-secondary">Export CSV</button>
          </div>
          <CategoryTable data={data[key]} />
        </div>
      ))}
    </Collapsible>
  )
}

// ── Section 3: Revenue by Retreat ─────────────────────────────────────────────

function RetreatsSection({ data }: { data: RetreatRow[] }) {
  // Group by base_name
  const groupMap = new Map<string, RetreatRow[]>()
  for (const row of data) {
    if (!groupMap.has(row.base_name)) groupMap.set(row.base_name, [])
    groupMap.get(row.base_name)!.push(row)
  }

  // Sort editions within each group by year desc
  for (const rows of groupMap.values()) {
    rows.sort((a, b) => {
      if (a.year === b.year) return 0
      if (a.year === null) return 1
      if (b.year === null) return -1
      return b.year - a.year
    })
  }

  // Sort groups by max year desc
  const sortedGroups = Array.from(groupMap.entries()).sort(([, aRows], [, bRows]) => {
    const aMax = aRows.reduce<number | null>((m, r) => r.year !== null && (m === null || r.year > m) ? r.year : m, null)
    const bMax = bRows.reduce<number | null>((m, r) => r.year !== null && (m === null || r.year > m) ? r.year : m, null)
    if (aMax === bMax) return 0
    if (aMax === null) return 1
    if (bMax === null) return -1
    return bMax - aMax
  })

  function exportCsv() {
    const headers = ['Destination', 'Year', 'Clients', 'Total Revenue']
    const rows: string[][] = []
    for (const [baseName, editions] of sortedGroups) {
      for (const r of editions) {
        rows.push([baseName, r.year != null ? String(r.year) : '', String(r.client_count), formatGBP(r.total_revenue)])
      }
    }
    downloadCsv([headers, ...rows], `revenue-retreats-${today()}.csv`)
  }

  return (
    <Collapsible title="Revenue by Retreat" defaultOpen>
      <div className="flex justify-end mb-4">
        <button onClick={exportCsv} className="btn-secondary">Export CSV</button>
      </div>
      {data.length === 0 ? <Empty /> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-grey-subtle border-b border-card-border">
                  <th style={thStyle}>Retreat</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Clients</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sortedGroups.map(([baseName, editions]) => {
                  if (editions.length === 1) {
                    const r = editions[0]
                    const label = r.year != null ? `${baseName} ${r.year}` : baseName
                    return (
                      <tr key={baseName} className="hover:bg-grey-subtle">
                        <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--color-heading)' }}>{label}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-muted)' }}>{r.client_count}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_revenue)}</td>
                      </tr>
                    )
                  }
                  const groupClients = editions.reduce((s, r) => s + r.client_count, 0)
                  const groupRevenue = editions.reduce((s, r) => s + r.total_revenue, 0)
                  return (
                    <Fragment key={baseName}>
                      <tr className="bg-grey-subtle">
                        <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-heading)', fontSize: '13px' }}>{baseName}</td>
                      </tr>
                      {editions.map(r => (
                        <tr key={`${baseName}-${r.year}`} className="hover:bg-grey-subtle">
                          <td style={{ ...tdStyle, paddingLeft: '24px', color: '#374151' }}>{r.year ?? '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-muted)' }}>{r.client_count}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_revenue)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ ...tdStyle, background: 'var(--color-grey-subtle)', fontWeight: 700, color: 'var(--color-heading)' }}>Total</td>
                        <td style={{ ...tdStyle, background: 'var(--color-grey-subtle)', textAlign: 'center', fontWeight: 700, color: 'var(--color-heading)' }}>{groupClients}</td>
                        <td style={{ ...tdStyle, background: 'var(--color-grey-subtle)', textAlign: 'right', fontWeight: 700, color: 'var(--color-heading)' }}>{fmt(groupRevenue)}</td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sortedGroups.map(([baseName, editions]) => {
              if (editions.length === 1) {
                const r = editions[0]
                const label = r.year != null ? `${baseName} ${r.year}` : baseName
                return (
                  <div key={baseName} className="card p-4">
                    <p className="font-semibold text-sm text-heading">{label}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-muted text-xs">{r.client_count} clients</span>
                      <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{fmt(r.total_revenue)}</span>
                    </div>
                  </div>
                )
              }
              const groupRevenue = editions.reduce((s, r) => s + r.total_revenue, 0)
              return (
                <div key={baseName} className="card overflow-hidden">
                  <div className="px-4 py-2 bg-grey-subtle border-b border-card-border">
                    <p className="font-bold text-sm text-heading">{baseName}</p>
                    <p className="text-xs text-muted mt-0.5">{fmt(groupRevenue)} total</p>
                  </div>
                  {editions.map(r => (
                    <div key={`${baseName}-${r.year}`} className="flex justify-between items-center px-4 py-2 border-b border-card-border last:border-0">
                      <span className="text-sm text-body">{r.year ?? '—'}</span>
                      <div className="flex gap-3 items-center">
                        <span className="text-xs text-muted">{r.client_count} clients</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{fmt(r.total_revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Collapsible>
  )
}

// ── Section 4: Revenue by Training Programme (cohort breakdown) ───────────────

const TRAINING_PRODUCTS_ORDER = [
  'Breathwork Professional Training - 60hr (Live)',
  'Breathwork Professional Training - 60hr',
  'Breathwork Professional Training - 40hr',
  'Breathwork Professional Training - 100hr Bundle',
  'Yoga Nidra Teacher Training',
]

function TrainingCohortsSection({ data }: { data: TrainingCohortRow[] }) {
  function exportCsv(productName: string, rows: TrainingCohortRow[]) {
    const headers = ['Cohort', 'Students', 'Revenue']
    const csvRows = rows.map(r => [
      r.edition && r.cohort_year != null ? `${r.edition} ${r.cohort_year}` : 'Unassigned',
      String(r.student_count),
      formatGBP(r.total_revenue),
    ])
    downloadCsv([headers, ...csvRows], `training-${productName.replace(/\s+/g, '-').toLowerCase()}-${today()}.csv`)
  }

  return (
    <Collapsible title="Revenue by Training Programme" defaultOpen>
      {TRAINING_PRODUCTS_ORDER.map(productName => {
        const rows = data.filter(r => r.product_name === productName)

        // Group rows by cohort_year, preserving insertion order (API already sorted)
        const yearMap = new Map<number | null, TrainingCohortRow[]>()
        for (const row of rows) {
          const yr = row.cohort_year
          if (!yearMap.has(yr)) yearMap.set(yr, [])
          yearMap.get(yr)!.push(row)
        }

        const grandStudents = rows.reduce((s, r) => s + r.student_count, 0)
        const grandRevenue = rows.reduce((s, r) => s + r.total_revenue, 0)

        return (
          <div key={productName} className="mb-6 last:mb-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-heading">{productName}</h3>
              <button onClick={() => exportCsv(productName, rows)} className="btn-secondary">Export CSV</button>
            </div>
            {rows.length === 0 ? <Empty /> : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-grey-subtle border-b border-card-border">
                    <th style={thStyle}>Cohort</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Students</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(yearMap.entries()).map(([yr, cohortRows]) => {
                    const yearStudents = cohortRows.reduce((s, r) => s + r.student_count, 0)
                    const yearRevenue = cohortRows.reduce((s, r) => s + r.total_revenue, 0)
                    const yearLabel = yr != null ? `${yr} Total` : 'Unassigned Total'
                    return (
                      <Fragment key={yr ?? 'unassigned'}>
                        {cohortRows.map(r => {
                          const cohortLabel =
                            r.edition && r.cohort_year != null
                              ? `${r.edition} ${r.cohort_year}`
                              : 'Unassigned'
                          return (
                            <tr key={`${r.edition ?? ''}-${r.cohort_year ?? ''}`} className="hover:bg-grey-subtle">
                              <td style={tdStyle}>{cohortLabel}</td>
                              <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-muted)' }}>{r.student_count}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_revenue)}</td>
                            </tr>
                          )
                        })}
                        <tr>
                          <td style={{ ...tdStyle, background: 'var(--color-grey-subtle)', fontWeight: 700, color: 'var(--color-heading)' }}>{yearLabel}</td>
                          <td style={{ ...tdStyle, background: 'var(--color-grey-subtle)', textAlign: 'center', fontWeight: 700, color: 'var(--color-heading)' }}>{yearStudents}</td>
                          <td style={{ ...tdStyle, background: 'var(--color-grey-subtle)', textAlign: 'right', fontWeight: 700, color: 'var(--color-heading)' }}>{fmt(yearRevenue)}</td>
                        </tr>
                      </Fragment>
                    )
                  })}
                  <tr>
                    <td style={{ padding: '10px 0', fontSize: '14px', fontWeight: 700, background: 'var(--color-heading)', color: 'white', borderBottom: 'none' }}>Grand Total</td>
                    <td style={{ padding: '10px 0', fontSize: '14px', fontWeight: 700, background: 'var(--color-heading)', color: 'white', textAlign: 'center', borderBottom: 'none' }}>{grandStudents}</td>
                    <td style={{ padding: '10px 0', fontSize: '14px', fontWeight: 700, background: 'var(--color-heading)', color: 'white', textAlign: 'right', borderBottom: 'none' }}>{fmt(grandRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </Collapsible>
  )
}

// ── Section 5: Interests Summary ─────────────────────────────────────────────

interface InterestSummaryRow {
  product_id: string
  product_name: string
  category: string
  count: number
}

const INTEREST_CATEGORY_ORDER = ['training', 'retreat', 'workshop', 'classes', 'private', 'other']

function InterestsSummarySection({ data }: { data: InterestSummaryRow[] }) {
  const [showZero, setShowZero] = useState(false)

  function exportCsv() {
    const headers = ['Category', 'Product', 'Potential Buyers']
    const rows = data.map(r => [categoryLabel(r.category), r.product_name, String(r.count)])
    downloadCsv([headers, ...rows], `interests-summary-${today()}.csv`)
  }

  const grouped: Record<string, InterestSummaryRow[]> = {}
  for (const row of data) {
    if (!grouped[row.category]) grouped[row.category] = []
    grouped[row.category].push(row)
  }

  const orderedCategories = INTEREST_CATEGORY_ORDER.filter(c => grouped[c])

  return (
    <Collapsible title="Interests Summary" defaultOpen>
      <div className="flex justify-end mb-4">
        <button onClick={exportCsv} className="btn-secondary">Export CSV</button>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="show-zero-interests"
          checked={showZero}
          onChange={e => setShowZero(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer', borderRadius: 0 }}
        />
        <label htmlFor="show-zero-interests" className="text-sm text-body" style={{ cursor: 'pointer' }}>
          Show products with zero interests
        </label>
      </div>

      {data.length === 0 ? <Empty /> : (
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-grey-subtle border-b border-card-border">
                <th style={thStyle}>Product</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Potential Buyers</th>
              </tr>
            </thead>
            <tbody>
              {orderedCategories.map(cat => {
                const rows = grouped[cat].filter(r => showZero || r.count > 0)
                if (rows.length === 0) return null
                return (
                  <>
                    <tr key={`cat-${cat}`}>
                      <td
                        colSpan={2}
                        style={{
                          ...tdStyle,
                          background: 'var(--color-grey-subtle)',
                          fontWeight: 600,
                          fontSize: '12px',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          paddingLeft: '8px',
                        }}
                      >
                        {categoryLabel(cat)}
                      </td>
                    </tr>
                    {rows.map(r => (
                      <tr key={r.product_id} className="hover:bg-grey-subtle">
                        <td style={{ ...tdStyle, color: 'var(--color-heading)', paddingLeft: '8px' }}>{r.product_name}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: r.count > 0 ? 600 : undefined, color: r.count === 0 ? '#9ca3af' : undefined }}>
                          {r.count}
                        </td>
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile */}
      {data.length > 0 && (
        <div className="md:hidden space-y-4">
          {orderedCategories.map(cat => {
            const rows = grouped[cat].filter(r => showZero || r.count > 0)
            if (rows.length === 0) return null
            return (
              <div key={cat}>
                <p
                  className="text-xs uppercase tracking-wide font-semibold mb-2 bg-grey-subtle"
                  style={{ color: '#374151', padding: '4px 8px' }}
                >
                  {categoryLabel(cat)}
                </p>
                <div className="space-y-1">
                  {rows.map(r => (
                    <div key={r.product_id} className="card flex justify-between items-center px-3 py-2">
                      <span className="text-sm text-heading">{r.product_name}</span>
                      <span className="text-sm font-semibold" style={{ color: r.count === 0 ? '#9ca3af' : 'var(--color-heading)' }}>{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Collapsible>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [interestsSummary, setInterestsSummary] = useState<InterestSummaryRow[]>([])
  const [interestsSummaryLoading, setInterestsSummaryLoading] = useState(true)

  const [trainingCohorts, setTrainingCohorts] = useState<TrainingCohortRow[]>([])
  const [trainingCohortsLoading, setTrainingCohortsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const sp = new URLSearchParams()
    if (dateFrom) sp.set('date_from', dateFrom)
    if (dateTo) sp.set('date_to', dateTo)
    const url = `/api/reports${sp.toString() ? '?' + sp.toString() : ''}`
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load reports. Please refresh.')
        return r.json()
      })
      .then((d: ReportsData) => {
        if (!cancelled) { setData(d); setLoading(false) }
      })
      .catch((err: Error) => {
        if (!cancelled) { setError(err.message); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [dateFrom, dateTo])

  useEffect(() => {
    let cancelled = false
    fetch('/api/interests/summary')
      .then(r => r.json())
      .then((d: InterestSummaryRow[]) => {
        if (!cancelled) { setInterestsSummary(d); setInterestsSummaryLoading(false) }
      })
      .catch(() => {
        if (!cancelled) setInterestsSummaryLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/training-cohorts')
      .then(r => r.json())
      .then((d: TrainingCohortRow[]) => {
        if (!cancelled) { setTrainingCohorts(d); setTrainingCohortsLoading(false) }
      })
      .catch(() => {
        if (!cancelled) setTrainingCohortsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  function handleDateFrom(value: string) {
    setLoading(true)
    setError(null)
    setDateFrom(value)
  }

  function handleDateTo(value: string) {
    setLoading(true)
    setError(null)
    setDateTo(value)
  }

  function handleClear() {
    setLoading(true)
    setError(null)
    setDateFrom('')
    setDateTo('')
  }

  const inputCls = 'border border-card-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-accent'

  if (loading) {
    return <LoadingSpinner message="Loading reports..." />
  }

  return (
    <div className="px-4 md:px-6 pb-24">
      <PageHeader title="Reports" />

      {/* Date range filter */}
      <div className="card mb-6">
        <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div>
            <p className="text-muted text-xs mb-1">From</p>
            <input
              type="date"
              value={dateFrom}
              onChange={e => handleDateFrom(e.target.value)}
              className={inputCls}
              style={{ height: '40px' }}
            />
          </div>
          <div>
            <p className="text-muted text-xs mb-1">To</p>
            <input
              type="date"
              value={dateTo}
              onChange={e => handleDateTo(e.target.value)}
              className={inputCls}
              style={{ height: '40px' }}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={handleClear} className="btn-secondary">
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-4">
          <RevenueSummaryBlock data={data.revenueByEntity} />
          <TopSpendersSection data={data.topSpenders} />
          <ByCategorySection data={data.byCategory} />
          <RetreatsSection data={data.retreats} />
        </div>
      )}

      {!trainingCohortsLoading && (
        <div className="mt-4">
          <TrainingCohortsSection data={trainingCohorts} />
        </div>
      )}

      {!interestsSummaryLoading && (
        <div className="mt-4">
          <InterestsSummarySection data={interestsSummary} />
        </div>
      )}
    </div>
  )
}
