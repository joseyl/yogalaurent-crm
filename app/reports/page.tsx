'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { formatGBP, categoryLabel } from '@/lib/utils'

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

// ── Shared table/card styles ──────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  paddingBottom: '10px',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 500,
}

const tdStyle: React.CSSProperties = {
  padding: '10px 0',
  fontSize: '14px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
}

function SectionHeading({
  title,
  onExport,
}: {
  title: string
  onExport: () => void
}) {
  return (
    <div className="flex justify-between items-center mt-8 mb-4">
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A2C4E' }}>{title}</h2>
      <button onClick={onExport} className="btn-secondary">Export CSV</button>
    </div>
  )
}

function SubHeading({ title, onExport }: { title: string; onExport: () => void }) {
  return (
    <div className="flex justify-between items-center mt-5 mb-3">
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2C4E' }}>{title}</h3>
      <button onClick={onExport} className="btn-secondary">Export CSV</button>
    </div>
  )
}

function Empty() {
  return (
    <p className="text-gray-400 italic text-sm text-center py-4">
      No data for the selected period.
    </p>
  )
}

// ── Revenue Summary Block ─────────────────────────────────────────────────────

function RevenueSummaryBlock({ data }: { data: { total: number; lr: number; ttl: number } }) {
  return (
    <div className="border border-[#e5e7eb] p-5 mb-2" style={{ background: '#f9fafb' }}>
      <p className="uppercase tracking-wide text-xs mb-3" style={{ color: '#6b7280' }}>Revenue for Selected Period</p>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <span className="font-bold" style={{ fontSize: '22px', color: '#1A2C4E' }}>{formatGBP(data.total)}</span>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Total</span>
        </div>
        <div className="border-t border-[#e5e7eb] pt-2 flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: '#374151' }}>Laurent Roure</span>
            <span className="text-sm font-medium" style={{ color: '#374151' }}>{formatGBP(data.lr)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: '#374151' }}>Terra Training Ltd</span>
            <span className="text-sm font-medium" style={{ color: '#374151' }}>{formatGBP(data.ttl)}</span>
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
    <>
      <SectionHeading title="Top 20 Spenders" onExport={exportCsv} />
      {data.length === 0 ? <Empty /> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
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
                  <tr key={s.id}>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: '#1A2C4E' }}>
                      <Link href={`/clients/${s.id}`} className="hover:underline">
                        {s.first_name} {s.last_name}
                      </Link>
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{s.email}</td>
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
                className="block border border-[#e5e7eb] p-4"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1A2C4E' }}>
                      <span className="text-gray-400 font-normal mr-1">#{i + 1}</span>
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{s.email}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-500 text-xs">{s.purchase_count} purchases</span>
                  <span className="font-semibold text-sm" style={{ color: '#B8540A' }}>{fmt(s.total_spend)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
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
            <tr>
              <th style={{ ...thStyle, width: '48px' }}>Rank</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Purchases</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total Spend</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => (
              <tr key={s.id}>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 500, color: '#1A2C4E' }}>
                  <Link href={`/clients/${s.id}`} className="hover:underline">
                    {s.first_name} {s.last_name}
                  </Link>
                </td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>{s.email}</td>
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
            className="block border border-[#e5e7eb] p-4"
            style={{ borderRadius: 0 }}
          >
            <p className="font-semibold text-sm" style={{ color: '#1A2C4E' }}>
              <span className="text-gray-400 font-normal mr-1">#{i + 1}</span>
              {s.first_name} {s.last_name}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">{s.email}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-500 text-xs">{s.purchase_count} purchases</span>
              <span className="font-semibold text-sm" style={{ color: '#B8540A' }}>{fmt(s.total_spend)}</span>
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
    <>
      <div className="flex justify-between items-center mt-8 mb-0">
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A2C4E' }}>Top Spenders by Category</h2>
      </div>
      {sections.map(({ key, label }) => (
        <div key={key}>
          <SubHeading title={label} onExport={() => exportCategory(key)} />
          <CategoryTable data={data[key]} />
        </div>
      ))}
    </>
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
    <>
      <SectionHeading title="Revenue by Retreat" onExport={exportCsv} />
      {data.length === 0 ? <Empty /> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
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
                      <tr key={baseName}>
                        <td style={{ ...tdStyle, fontWeight: 500, color: '#1A2C4E' }}>{label}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{r.client_count}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_revenue)}</td>
                      </tr>
                    )
                  }
                  const groupClients = editions.reduce((s, r) => s + r.client_count, 0)
                  const groupRevenue = editions.reduce((s, r) => s + r.total_revenue, 0)
                  return (
                    <Fragment key={baseName}>
                      <tr style={{ background: '#f9fafb' }}>
                        <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, color: '#1A2C4E', fontSize: '13px' }}>{baseName}</td>
                      </tr>
                      {editions.map(r => (
                        <tr key={`${baseName}-${r.year}`}>
                          <td style={{ ...tdStyle, paddingLeft: '24px', color: '#374151' }}>{r.year ?? '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{r.client_count}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_revenue)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ ...tdStyle, background: '#f3f4f6', fontWeight: 700, color: '#1A2C4E' }}>Total</td>
                        <td style={{ ...tdStyle, background: '#f3f4f6', textAlign: 'center', fontWeight: 700, color: '#1A2C4E' }}>{groupClients}</td>
                        <td style={{ ...tdStyle, background: '#f3f4f6', textAlign: 'right', fontWeight: 700, color: '#1A2C4E' }}>{fmt(groupRevenue)}</td>
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
                  <div key={baseName} className="border border-[#e5e7eb] p-4" style={{ borderRadius: 0 }}>
                    <p className="font-semibold text-sm" style={{ color: '#1A2C4E' }}>{label}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-500 text-xs">{r.client_count} clients</span>
                      <span className="font-semibold text-sm" style={{ color: '#B8540A' }}>{fmt(r.total_revenue)}</span>
                    </div>
                  </div>
                )
              }
              const groupRevenue = editions.reduce((s, r) => s + r.total_revenue, 0)
              return (
                <div key={baseName} className="border border-[#e5e7eb]" style={{ borderRadius: 0 }}>
                  <div className="px-4 py-2" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <p className="font-bold text-sm" style={{ color: '#1A2C4E' }}>{baseName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmt(groupRevenue)} total</p>
                  </div>
                  {editions.map(r => (
                    <div key={`${baseName}-${r.year}`} className="flex justify-between items-center px-4 py-2 border-b border-[#f3f4f6] last:border-0">
                      <span className="text-sm text-gray-600">{r.year ?? '—'}</span>
                      <div className="flex gap-3 items-center">
                        <span className="text-xs text-gray-400">{r.client_count} clients</span>
                        <span className="text-sm font-semibold" style={{ color: '#B8540A' }}>{fmt(r.total_revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
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
    <>
      <div className="flex justify-between items-center mt-8 mb-0">
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A2C4E' }}>Revenue by Training Programme</h2>
      </div>
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
          <div key={productName}>
            <SubHeading title={productName} onExport={() => exportCsv(productName, rows)} />
            {rows.length === 0 ? <Empty /> : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
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
                            <tr key={`${r.edition ?? ''}-${r.cohort_year ?? ''}`}>
                              <td style={tdStyle}>{cohortLabel}</td>
                              <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{r.student_count}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_revenue)}</td>
                            </tr>
                          )
                        })}
                        <tr>
                          <td style={{ ...tdStyle, background: '#f3f4f6', fontWeight: 700, color: '#1A2C4E' }}>{yearLabel}</td>
                          <td style={{ ...tdStyle, background: '#f3f4f6', textAlign: 'center', fontWeight: 700, color: '#1A2C4E' }}>{yearStudents}</td>
                          <td style={{ ...tdStyle, background: '#f3f4f6', textAlign: 'right', fontWeight: 700, color: '#1A2C4E' }}>{fmt(yearRevenue)}</td>
                        </tr>
                      </Fragment>
                    )
                  })}
                  <tr>
                    <td style={{ padding: '10px 0', fontSize: '14px', fontWeight: 700, background: '#1A2C4E', color: 'white', borderBottom: 'none' }}>Grand Total</td>
                    <td style={{ padding: '10px 0', fontSize: '14px', fontWeight: 700, background: '#1A2C4E', color: 'white', textAlign: 'center', borderBottom: 'none' }}>{grandStudents}</td>
                    <td style={{ padding: '10px 0', fontSize: '14px', fontWeight: 700, background: '#1A2C4E', color: 'white', textAlign: 'right', borderBottom: 'none' }}>{fmt(grandRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </>
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
    <>
      <SectionHeading title="Interests Summary" onExport={exportCsv} />
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="show-zero-interests"
          checked={showZero}
          onChange={e => setShowZero(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer', borderRadius: 0 }}
        />
        <label htmlFor="show-zero-interests" className="text-sm text-gray-600" style={{ cursor: 'pointer' }}>
          Show products with zero interests
        </label>
      </div>

      {data.length === 0 ? <Empty /> : (
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr>
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
                          background: '#f3f4f6',
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
                      <tr key={r.product_id}>
                        <td style={{ ...tdStyle, color: '#1A2C4E', paddingLeft: '8px' }}>{r.product_name}</td>
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
                  className="text-xs uppercase tracking-wide font-semibold mb-2 px-1"
                  style={{ color: '#374151', background: '#f3f4f6', padding: '4px 8px' }}
                >
                  {categoryLabel(cat)}
                </p>
                <div className="space-y-1">
                  {rows.map(r => (
                    <div key={r.product_id} className="flex justify-between items-center border border-[#e5e7eb] px-3 py-2" style={{ borderRadius: 0 }}>
                      <span className="text-sm" style={{ color: '#1A2C4E' }}>{r.product_name}</span>
                      <span className="text-sm font-semibold" style={{ color: r.count === 0 ? '#9ca3af' : '#1A2C4E' }}>{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
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

  const inputStyle: React.CSSProperties = {
    border: '1px solid #d1d5db',
    padding: '8px 12px',
    fontSize: '14px',
    borderRadius: 0,
    height: '40px',
    outline: 'none',
  }

  return (
    <div className="px-4 md:px-6 pb-24">
      {/* Page title */}
      <h1 className="font-bold pt-6 mb-4" style={{ fontSize: '24px', color: '#1A2C4E' }}>
        Reports
      </h1>

      {/* Date range filter */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-6">
        <div>
          <p className="text-gray-500 text-xs mb-1">From</p>
          <input
            type="date"
            value={dateFrom}
            onChange={e => handleDateFrom(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">To</p>
          <input
            type="date"
            value={dateTo}
            onChange={e => handleDateTo(e.target.value)}
            style={inputStyle}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={handleClear} className="btn-secondary">
            Clear
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-500">Loading reports...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <RevenueSummaryBlock data={data.revenueByEntity} />
          <TopSpendersSection data={data.topSpenders} />
          <ByCategorySection data={data.byCategory} />
          <RetreatsSection data={data.retreats} />
        </>
      )}

      {!trainingCohortsLoading && (
        <TrainingCohortsSection data={trainingCohorts} />
      )}

      {!interestsSummaryLoading && (
        <InterestsSummarySection data={interestsSummary} />
      )}
    </div>
  )
}
