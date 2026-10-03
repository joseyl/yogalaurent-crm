'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import LoadingSpinner from '@/app/components/LoadingSpinner'
import { formatGBP } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'

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

function SortArrow({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: 'asc' | 'desc' }) {
  if (sortField !== field) return null
  return (
    <span className="ml-1 text-accent">
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(amount: number): string {
  return formatGBP(amount)
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
    formatGBP(c.total_spend),
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

  if (loading) {
    return <LoadingSpinner message="Loading clients..." />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const inputCls = 'border border-card-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-accent'
  const thCls = 'text-left text-xs font-medium text-muted uppercase tracking-wide py-3 px-4'

  return (
    <div>
      <PageHeader
        title="Clients"
        actions={<Link href="/clients/new" className="btn-primary">Add Client</Link>}
      />

      {/* Toolbar */}
      <div className="card mb-4">
        <div className="p-4 flex flex-col gap-3">
          {/* Count + page size */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted">
              {filtered.length === allClients.length
                ? `${allClients.length} clients`
                : `Showing ${filtered.length} of ${allClients.length} clients`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                className="border border-card-border rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:border-accent"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          {/* Filter row 1 */}
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search name or email"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
              disabled={loading}
              className={`flex-1 ${inputCls} min-h-[44px] md:min-h-9 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
              className={`${inputCls} min-h-[44px] md:min-h-9`}
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
              className={`${inputCls} min-h-[44px] md:min-h-9`}
            >
              <option value="all">All</option>
              <option value="Jose">Jose</option>
              <option value="Laurent">Laurent</option>
            </select>
          </div>
          {/* Filter row 2 */}
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
              className={`${inputCls} min-h-[44px] md:min-h-9`}
            >
              <option value="all">All Categories</option>
              <option value="classes">Classes</option>
              <option value="training">Training</option>
              <option value="retreat">Retreat</option>
              <option value="workshop">In-person Workshop</option>
              <option value="private">Private</option>
              <option value="other">Other</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted whitespace-nowrap">Min spend £</label>
              <input
                type="number"
                min={0}
                step={1}
                value={minSpend}
                onChange={e => { setMinSpend(e.target.value); setCurrentPage(1) }}
                className={`${inputCls} min-h-[44px] md:min-h-9 w-24`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-grey-subtle border-b border-card-border">
                <th
                  className={`${thCls} pl-5 cursor-pointer select-none whitespace-nowrap`}
                  onClick={() => handleSort('last_name')}
                >
                  Name <SortArrow field="last_name" sortField={sortField} sortDirection={sortDirection} />
                </th>
                {['Email', 'Status', 'Source', 'Assigned To'].map(h => (
                  <th key={h} className={`${thCls} whitespace-nowrap`}>{h}</th>
                ))}
                <th
                  className={`${thCls} text-right cursor-pointer select-none whitespace-nowrap`}
                  onClick={() => handleSort('total_spend')}
                >
                  Total Spend <SortArrow field="total_spend" sortField={sortField} sortDirection={sortDirection} />
                </th>
                <th
                  className={`${thCls} cursor-pointer select-none whitespace-nowrap pr-5`}
                  onClick={() => handleSort('last_purchase_date')}
                >
                  Last Purchase <SortArrow field="last_purchase_date" sortField={sortField} sortDirection={sortDirection} />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(client => (
                <tr
                  key={client.id}
                  className="border-b border-card-border hover:bg-grey-subtle cursor-pointer transition-colors"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <td className="py-3 pl-5 pr-4 font-medium text-heading">{client.first_name} {client.last_name}</td>
                  <td className="py-3 px-4 text-muted text-sm">{client.email}</td>
                  <td className="py-3 px-4"><StatusBadge status={client.status} /></td>
                  <td className="py-3 px-4 text-muted text-sm max-w-[140px] truncate">{client.source_channel ?? '—'}</td>
                  <td className="py-3 px-4 text-sm text-body">{client.assigned_to}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-heading">{formatCurrency(client.total_spend)}</td>
                  <td className="py-3 pl-4 pr-5 text-muted text-sm">{formatDate(client.last_purchase_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-muted text-sm py-8 text-center">No clients match the current filters.</p>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3 mb-4">
        {filtered.length === 0 && (
          <p className="text-muted text-sm py-8 text-center">No clients match the current filters.</p>
        )}
        {paginated.map(client => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="card block p-4 active:bg-grey-subtle"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-heading">{client.first_name} {client.last_name}</span>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-muted text-sm mt-1">{client.email}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold text-accent">{formatCurrency(client.total_spend)}</span>
              <span className="text-xs text-muted">{formatDate(client.last_purchase_date)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination + Export (desktop) */}
      <div className="hidden md:grid grid-cols-3 items-center mt-4">
        <div />
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="text-muted text-sm whitespace-nowrap">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={() => exportCSV(sorted)} className="btn-secondary">
            Export CSV
          </button>
        </div>
      </div>

      {/* Pagination + Export (mobile) */}
      <div className="md:hidden flex flex-col items-center gap-3 mt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="text-muted text-sm">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
        <button onClick={() => exportCSV(sorted)} className="btn-secondary w-full">
          Export CSV
        </button>
      </div>
    </div>
  )
}
