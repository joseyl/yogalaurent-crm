'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'

interface Client {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  alt_email: string | null
  phone: string | null
  country: string | null
  status: string
  assigned_to: string
  source_channel: string | null
  total_spend: number
  last_purchase_date: string | null
  categories: string[]
}

type SortField = 'last_name' | 'total_spend' | 'last_purchase_date'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function exportCSV(data: Client[]) {
  const today = new Date().toISOString().split('T')[0]
  const headers = [
    'First Name', 'Last Name', 'Email', 'Alt Email', 'Phone',
    'Country', 'Status', 'Assigned To', 'Source Channel', 'Total Spend', 'Last Purchase Date',
  ]
  const rows = data.map(c => [
    c.first_name ?? '',
    c.last_name ?? '',
    c.email,
    c.alt_email ?? '',
    c.phone ? `="${c.phone}"` : '',
    c.country ?? '',
    c.status,
    c.assigned_to,
    c.source_channel ?? '',
    c.total_spend.toFixed(2),
    c.last_purchase_date ?? '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `clients-export-${today}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const btnBase: React.CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '6px 14px',
  fontSize: '14px',
  borderRadius: 0,
  background: 'white',
  cursor: 'pointer',
}

export default function ClientsPage() {
  const router = useRouter()
  const [allClients, setAllClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [minSpend, setMinSpend] = useState('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('last_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load clients. Please refresh.')
        return r.json()
      })
      .then((data: Client[]) => {
        setAllClients(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // Filter
  const filtered = allClients.filter(c => {
    const q = search.toLowerCase()
    if (q) {
      const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase()
      if (!name.includes(q) && !(c.email ?? '').toLowerCase().includes(q)) return false
    }
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (assignedFilter !== 'all' && c.assigned_to !== assignedFilter) return false
    if (categoryFilter !== 'all' && !c.categories.includes(categoryFilter)) return false
    const spend = parseFloat(minSpend)
    if (!isNaN(spend) && spend > 0 && c.total_spend < spend) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'last_name') {
      cmp = (a.last_name ?? '').localeCompare(b.last_name ?? '')
    } else if (sortField === 'total_spend') {
      cmp = a.total_spend - b.total_spend
    } else {
      // last_purchase_date — nulls last in both directions
      const aDate = a.last_purchase_date
      const bDate = b.last_purchase_date
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      cmp = aDate.localeCompare(bDate)
    }
    return sortDirection === 'asc' ? cmp : -cmp
  })

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  function SortArrow({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return (
      <span style={{ marginLeft: '4px', color: '#B8540A' }}>
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">Loading clients...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const inputCls = 'border border-[#d1d5db] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1A2C4E]'

  return (
    <div className="pb-24">
      {/* Header: title + Add Client button */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 px-6 pt-6 pb-2">
        <h1 className="font-bold" style={{ fontSize: '24px', color: '#1A2C4E' }}>
          Clients
        </h1>
        <Link
          href="/clients/new"
          className="font-semibold text-white self-start"
          style={{ background: '#B8540A', padding: '10px 20px', borderRadius: 0, fontSize: '14px' }}
        >
          Add Client
        </Link>
      </div>

      {/* Count + page size selector */}
      <div className="flex items-center justify-between px-6 py-2">
        <p className="text-gray-500 text-sm">
          {filtered.length === allClients.length
            ? `${allClients.length} clients`
            : `Showing ${filtered.length} of ${allClients.length} clients`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
            className={inputCls}
            style={{ borderRadius: 0, minHeight: '32px', padding: '4px 8px' }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Filter row 1 */}
      <div className="flex flex-col md:flex-row gap-3 px-6 pt-2 pb-2">
        <input
          type="text"
          placeholder="Search name or email"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          disabled={loading}
          className={`flex-1 ${inputCls} ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          style={{ borderRadius: 0, minHeight: '40px' }}
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
          className={inputCls}
          style={{ borderRadius: 0, minHeight: '40px' }}
        >
          <option value="all">All Statuses</option>
          <option value="client">Client</option>
          <option value="lead">Lead</option>
          <option value="inactive">Inactive</option>
          <option value="deceased">Deceased</option>
        </select>
        <select
          value={assignedFilter}
          onChange={e => { setAssignedFilter(e.target.value); setCurrentPage(1) }}
          className={inputCls}
          style={{ borderRadius: 0, minHeight: '40px' }}
        >
          <option value="all">All</option>
          <option value="Jose">Jose</option>
          <option value="Laurent">Laurent</option>
        </select>
      </div>

      {/* Filter row 2 */}
      <div className="flex flex-col md:flex-row gap-3 px-6 pb-4">
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
          className={inputCls}
          style={{ borderRadius: 0, minHeight: '40px' }}
        >
          <option value="all">All Categories</option>
          <option value="classes">Classes</option>
          <option value="training">Training</option>
          <option value="retreat">Retreat</option>
          <option value="workshop">Workshop</option>
          <option value="private">Private</option>
          <option value="other">Other</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Min spend £</label>
          <input
            type="number"
            min={0}
            step={1}
            value={minSpend}
            onChange={e => { setMinSpend(e.target.value); setCurrentPage(1) }}
            className={inputCls}
            style={{ borderRadius: 0, minHeight: '40px', width: '100px' }}
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block px-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              {/* Sortable: Name */}
              <th
                className="text-left uppercase tracking-wide pb-3 pr-4 cursor-pointer select-none"
                style={{ fontSize: '11px', color: '#6b7280' }}
                onClick={() => handleSort('last_name')}
              >
                Name<SortArrow field="last_name" />
              </th>
              {/* Non-sortable */}
              {['Email', 'Status', 'Source', 'Assigned To'].map(h => (
                <th
                  key={h}
                  className="text-left uppercase tracking-wide pb-3 pr-4"
                  style={{ fontSize: '11px', color: '#6b7280' }}
                >
                  {h}
                </th>
              ))}
              {/* Sortable: Total Spend */}
              <th
                className="text-right uppercase tracking-wide pb-3 pr-4 cursor-pointer select-none"
                style={{ fontSize: '11px', color: '#6b7280' }}
                onClick={() => handleSort('total_spend')}
              >
                Total Spend<SortArrow field="total_spend" />
              </th>
              {/* Sortable: Last Purchase */}
              <th
                className="text-left uppercase tracking-wide pb-3 cursor-pointer select-none"
                style={{ fontSize: '11px', color: '#6b7280' }}
                onClick={() => handleSort('last_purchase_date')}
              >
                Last Purchase<SortArrow field="last_purchase_date" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(client => (
              <tr
                key={client.id}
                className="border-b border-[#f3f4f6] hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <td className="py-3 pr-4 font-medium" style={{ color: '#1A2C4E' }}>
                  {client.first_name} {client.last_name}
                </td>
                <td className="py-3 pr-4 text-gray-500 text-sm">{client.email}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={client.status} />
                </td>
                <td className="py-3 pr-4 text-gray-500 text-sm max-w-[140px] truncate">
                  {client.source_channel ?? '—'}
                </td>
                <td className="py-3 pr-4 text-sm">{client.assigned_to}</td>
                <td className="py-3 pr-4 text-sm text-right">{formatCurrency(client.total_spend)}</td>
                <td className="py-3 text-gray-500 text-sm">{formatDate(client.last_purchase_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">No clients match the current filters.</p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden px-4">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">No clients match the current filters.</p>
        )}
        {paginated.map(client => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="block bg-white border border-[#e5e7eb] p-4 mb-2 active:bg-gray-50"
            style={{ borderRadius: 0 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: '#1A2C4E' }}>
                {client.first_name} {client.last_name}
              </span>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-gray-500 text-sm mt-1">{client.email}</p>
            <p className="font-semibold text-sm mt-1" style={{ color: '#B8540A' }}>
              {formatCurrency(client.total_spend)}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">{formatDate(client.last_purchase_date)}</p>
          </Link>
        ))}
      </div>

      {/* Pagination + Export (desktop) */}
      <div className="hidden md:grid grid-cols-3 items-center mt-4 px-6">
        <div />
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            style={{ ...btnBase, opacity: safePage <= 1 ? 0.4 : 1, cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span className="text-gray-500 text-sm whitespace-nowrap">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            style={{ ...btnBase, opacity: safePage >= totalPages ? 0.4 : 1, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => exportCSV(sorted)}
            style={{
              border: '1px solid #1A2C4E',
              color: '#1A2C4E',
              background: 'white',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Pagination + Export (mobile) */}
      <div className="md:hidden flex flex-col items-center gap-3 mt-4 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            style={{ ...btnBase, opacity: safePage <= 1 ? 0.4 : 1, cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span className="text-gray-500 text-sm">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            style={{ ...btnBase, opacity: safePage >= totalPages ? 0.4 : 1, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
        <button
          onClick={() => exportCSV(sorted)}
          className="w-full"
          style={{
            border: '1px solid #1A2C4E',
            color: '#1A2C4E',
            background: 'white',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  )
}
