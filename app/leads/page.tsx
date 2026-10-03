'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import LoadingSpinner from '@/app/components/LoadingSpinner'
import Badge from '@/components/ui/Badge'
import PageHeader from '@/components/ui/PageHeader'

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

  const inputCls = 'border border-card-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-accent'
  const thCls = 'text-left text-xs font-medium text-muted uppercase tracking-wide'

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={
          filtered.length === allLeads.length
            ? `${allLeads.length} leads`
            : `Showing ${filtered.length} of ${allLeads.length} leads`
        }
        actions={<Link href="/leads/new" className="btn-primary">Add Lead</Link>}
      />

      {/* Toolbar */}
      <div className="card mb-4">
        <div className="p-4 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Search name, email, or product"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={loading}
            className={`flex-1 ${inputCls} min-h-[44px] md:min-h-9 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={`${inputCls} min-h-[44px] md:min-h-9`}
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
            className={`${inputCls} min-h-[44px] md:min-h-9`}
          >
            <option value="all">All</option>
            <option value="Jose">Jose</option>
            <option value="Laurent">Laurent</option>
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-grey-subtle border-b border-card-border">
                {['Name', 'Email', 'Product of Interest', 'Status', 'Assigned To', 'Days Since Follow-up'].map(h => (
                  <th
                    key={h}
                    className={`${thCls} whitespace-nowrap`}
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
                  className="border-b border-card-border hover:bg-grey-subtle cursor-pointer transition-colors"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td className="font-medium text-heading">{lead.first_name} {lead.last_name}</td>
                  <td className="text-muted text-sm">{lead.email}</td>
                  <td className="text-muted text-sm">{lead.product_name ?? '—'}</td>
                  <td><StatusBadge status={lead.status} type="lead" /></td>
                  <td className="text-sm text-body">{lead.assigned_to}</td>
                  <td className="text-sm">
                    <Badge tone={lead.days_since_followup >= 7 ? 'red' : 'grey'}>{lead.days_since_followup}d</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-muted text-sm py-8 text-center">No leads match the current filters.</p>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-muted text-sm py-8 text-center">No leads match the current filters.</p>
        )}
        {filtered.map(lead => (
          <div
            key={lead.id}
            className="card p-4 cursor-pointer active:bg-grey-subtle"
            onClick={() => router.push(`/leads/${lead.id}`)}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-heading">{lead.first_name} {lead.last_name}</span>
              <StatusBadge status={lead.status} type="lead" />
            </div>
            <p className="text-muted text-sm mt-1">{lead.product_name ?? '—'}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-body">{lead.assigned_to}</span>
              <Badge tone={lead.days_since_followup >= 7 ? 'red' : 'grey'}>{lead.days_since_followup}d</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
