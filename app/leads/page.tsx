'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import LoadingSpinner from '@/app/components/LoadingSpinner'

interface Lead {
  id: string
  status: string
  assigned_to: string
  date_added: string
  last_followup_date: string | null
  days_since_followup: number
  notes: string | null
  person_id: string
  first_name: string | null
  last_name: string | null
  email: string
  product_name: string | null
}

function StaleDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#dc2626',
        marginRight: '5px',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    />
  )
}

function DaysBadge({ days }: { days: number }) {
  const stale = days >= 7
  return (
    <span
      className="inline-flex items-center"
      style={{ color: stale ? '#dc2626' : '#6b7280', fontWeight: stale ? 700 : 400 }}
    >
      {stale && <StaleDot />}
      {days}d
    </span>
  )
}

export default function LeadsPage() {
  const router = useRouter()
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')

  useEffect(() => {
    fetch('/api/leads')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load leads. Please refresh.')
        return r.json()
      })
      .then((data: Lead[]) => {
        setAllLeads(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const filtered = allLeads.filter(l => {
    const q = search.toLowerCase()
    if (q) {
      const name = `${l.first_name ?? ''} ${l.last_name ?? ''}`.toLowerCase()
      if (
        !name.includes(q) &&
        !(l.email ?? '').toLowerCase().includes(q) &&
        !(l.product_name ?? '').toLowerCase().includes(q)
      ) return false
    }
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (assignedFilter !== 'all' && l.assigned_to !== assignedFilter) return false
    return true
  })

  if (loading) {
    return <LoadingSpinner message="Loading leads..." />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="font-bold" style={{ fontSize: '24px', color: '#1A2C4E' }}>
            Leads
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length === allLeads.length
              ? `${allLeads.length} leads`
              : `Showing ${filtered.length} of ${allLeads.length} leads`}
          </p>
        </div>
        <Link href="/leads/new" className="btn-primary self-start md:self-auto">
          Add Lead
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 px-6 py-4">
        <input
          type="text"
          placeholder="Search name, email, or product"
          value={search}
          onChange={e => setSearch(e.target.value)}
          disabled={loading}
          className={`flex-1 border border-[#d1d5db] px-3 py-2 text-sm focus:outline-none focus:border-[#1A2C4E] ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          style={{ borderRadius: 0, minHeight: '40px' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-[#d1d5db] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1A2C4E]"
          style={{ borderRadius: 0, minHeight: '40px' }}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="quoted">Quoted</option>
          <option value="converted">Converted</option>
          <option value="dead">Dead</option>
        </select>
        <select
          value={assignedFilter}
          onChange={e => setAssignedFilter(e.target.value)}
          className="border border-[#d1d5db] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1A2C4E]"
          style={{ borderRadius: 0, minHeight: '40px' }}
        >
          <option value="all">All</option>
          <option value="Jose">Jose</option>
          <option value="Laurent">Laurent</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block px-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              {['Name', 'Email', 'Product of Interest', 'Status', 'Assigned To', 'Days Since Follow-up'].map(h => (
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
            {filtered.map(lead => (
              <tr
                key={lead.id}
                className="border-b border-[#f3f4f6] hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <td className="py-3 pr-4 font-medium" style={{ color: '#1A2C4E' }}>
                  {lead.first_name} {lead.last_name}
                </td>
                <td className="py-3 pr-4 text-gray-500 text-sm">{lead.email}</td>
                <td className="py-3 pr-4 text-gray-500 text-sm">{lead.product_name ?? '—'}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={lead.status} type="lead" />
                </td>
                <td className="py-3 pr-4 text-sm">{lead.assigned_to}</td>
                <td className="py-3 text-sm">
                  <DaysBadge days={lead.days_since_followup} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">No leads match the current filters.</p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden px-4">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">No leads match the current filters.</p>
        )}
        {filtered.map(lead => (
          <div
            key={lead.id}
            className="bg-white border border-[#e5e7eb] p-4 mb-2 cursor-pointer active:bg-gray-50"
            style={{ borderRadius: 0 }}
            onClick={() => router.push(`/leads/${lead.id}`)}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: '#1A2C4E' }}>
                {lead.first_name} {lead.last_name}
              </span>
              <StatusBadge status={lead.status} type="lead" />
            </div>
            <p className="text-gray-500 text-sm mt-1">{lead.product_name ?? '—'}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-500">{lead.assigned_to}</span>
              <DaysBadge days={lead.days_since_followup} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
