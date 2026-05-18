'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { formatGBP } from '@/lib/utils'

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
  name: string
  total_revenue: number
  client_count: number
}

interface TrainingRow {
  name: string
  cohort_year: number
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
  trainingByCohort: TrainingRow[]
  revenueByEntity: { total: number; lr: number; ttl: number }
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

const exportBtnStyle: React.CSSProperties = {
  border: '1px solid #1A2C4E',
  color: '#1A2C4E',
  background: 'white',
  padding: '6px 14px',
  fontSize: '13px',
  fontWeight: 600,
  borderRadius: 0,
  cursor: 'pointer',
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
      <button onClick={onExport} style={exportBtnStyle}>Export CSV</button>
    </div>
  )
}

function SubHeading({ title, onExport }: { title: string; onExport: () => void }) {
  return (
    <div className="flex justify-between items-center mt-5 mb-3">
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A2C4E' }}>{title}</h3>
      <button onClick={onExport} style={exportBtnStyle}>Export CSV</button>
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
    { key: 'workshop', label: 'Workshops' },
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
  function exportCsv() {
    const headers = ['Retreat Name', 'Clients', 'Total Revenue']
    const rows = data.map(r => [r.name, String(r.client_count), formatGBP(r.total_revenue)])
    downloadCsv([headers, ...rows], `revenue-retreats-${today()}.csv`)
  }

  return (
    <>
      <SectionHeading title="Revenue by Retreat" onExport={exportCsv} />
      {data.length === 0 ? <Empty /> : (
        <>
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={thStyle}>Retreat Name</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Clients</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.name}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: '#1A2C4E' }}>{r.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{r.client_count}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {data.map(r => (
              <div key={r.name} className="border border-[#e5e7eb] p-4" style={{ borderRadius: 0 }}>
                <p className="font-semibold text-sm" style={{ color: '#1A2C4E' }}>{r.name}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-500 text-xs">{r.client_count} clients</span>
                  <span className="font-semibold text-sm" style={{ color: '#B8540A' }}>{fmt(r.total_revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ── Section 4: Training by Cohort ─────────────────────────────────────────────

function TrainingSection({ data }: { data: TrainingRow[] }) {
  function exportCsv() {
    const headers = ['Programme', 'Year', 'Clients', 'Total Revenue']
    const rows = data.map(r => [r.name, String(r.cohort_year), String(r.client_count), formatGBP(r.total_revenue)])
    downloadCsv([headers, ...rows], `revenue-training-${today()}.csv`)
  }

  return (
    <>
      <SectionHeading title="Revenue by Training Programme" onExport={exportCsv} />
      {data.length === 0 ? <Empty /> : (
        <>
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={thStyle}>Programme</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Year</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Clients</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => {
                  const showName = i === 0 || data[i - 1].name !== r.name
                  return (
                    <tr key={`${r.name}-${r.cohort_year}`}>
                      <td style={{ ...tdStyle, fontWeight: 500, color: '#1A2C4E', borderLeft: showName ? 'none' : '3px solid transparent' }}>
                        {showName ? r.name : (
                          <span style={{ color: 'transparent', userSelect: 'none' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{r.cohort_year}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{r.client_count}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_revenue)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {data.map(r => (
              <div key={`${r.name}-${r.cohort_year}`} className="border border-[#e5e7eb] p-4" style={{ borderRadius: 0 }}>
                <p className="font-semibold text-sm" style={{ color: '#1A2C4E' }}>{r.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{r.cohort_year}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-500 text-xs">{r.client_count} clients</span>
                  <span className="font-semibold text-sm" style={{ color: '#B8540A' }}>{fmt(r.total_revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
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
          <button
            onClick={handleClear}
            style={{
              border: '1px solid #d1d5db',
              background: 'white',
              padding: '8px 16px',
              fontSize: '14px',
              borderRadius: 0,
              cursor: 'pointer',
              height: '40px',
            }}
          >
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
          <TrainingSection data={data.trainingByCohort} />
        </>
      )}
    </div>
  )
}
