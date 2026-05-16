'use client'

import { useState } from 'react'
import StatusBadge from '@/components/StatusBadge'

interface Purchase {
  id: string
  amount_gbp: number
  purchase_date: string
  notes: string | null
  product_name: string
  category: string
}

interface Attendance {
  id: string
  class_name: string
  class_date: string
  pass_used: string | null
}

interface LeadRecord {
  id: string
  status: string
  date_added: string
  last_followup_date: string | null
  notes: string | null
  assigned_to: string
  product_name: string | null
}

interface Props {
  purchases: Purchase[]
  attendance: Attendance[]
  leads: LeadRecord[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TABS = ['Purchases', 'Attendance', 'Lead History'] as const
type Tab = typeof TABS[number]

const CATEGORIES = ['All Categories', 'classes', 'training', 'retreat', 'workshop', 'private', 'other']

export default function ClientTabs({ purchases, attendance, leads }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Purchases')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')

  const totalSpend = purchases.reduce((s, p) => s + Number(p.amount_gbp ?? 0), 0)
  const filteredPurchases = categoryFilter === 'All Categories'
    ? purchases
    : purchases.filter(p => p.category === categoryFilter)

  const lastAttendance = attendance[0]?.class_date ?? null
  const attendanceCount = attendance.length

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-[#e5e7eb] flex">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-3 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab ? '#1A2C4E' : '#6b7280',
              borderBottom: activeTab === tab ? '2px solid #1A2C4E' : '2px solid transparent',
              fontWeight: activeTab === tab ? 600 : 400,
              background: 'none',
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Purchases tab */}
        {activeTab === 'Purchases' && (
          <div>
            <p className="font-bold mb-4" style={{ color: '#1A2C4E' }}>
              Total spend: £{totalSpend.toFixed(2)}
            </p>
            <div className="mb-4">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="border border-[#d1d5db] px-3 py-2 text-sm bg-white focus:outline-none"
                style={{ borderRadius: 0 }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c === 'All Categories' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {filteredPurchases.length === 0 ? (
              <p className="text-gray-400 text-sm">No purchases recorded.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        {['Date', 'Product', 'Category', 'Amount', 'Notes'].map(h => (
                          <th
                            key={h}
                            className="text-left uppercase tracking-wide pb-3 pr-4 text-[11px]"
                            style={{ color: '#6b7280' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map(p => (
                        <tr key={p.id} className="border-b border-[#f3f4f6]">
                          <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(p.purchase_date)}</td>
                          <td className="py-3 pr-4 text-sm font-medium" style={{ color: '#1A2C4E' }}>{p.product_name}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={p.category} type="person" />
                          </td>
                          <td className="py-3 pr-4 text-sm text-right">£{Number(p.amount_gbp).toFixed(2)}</td>
                          <td className="py-3 text-sm text-gray-500">{p.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {filteredPurchases.map(p => (
                    <div key={p.id} className="border border-[#e5e7eb] p-3" style={{ borderRadius: 0 }}>
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm" style={{ color: '#1A2C4E' }}>{p.product_name}</p>
                        <p className="font-semibold text-sm" style={{ color: '#B8540A' }}>£{Number(p.amount_gbp).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-400 text-xs">{formatDate(p.purchase_date)}</p>
                        <StatusBadge status={p.category} type="person" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Attendance tab */}
        {activeTab === 'Attendance' && (
          <div>
            {attendanceCount === 0 ? (
              <p className="text-gray-400 text-sm">No attendance recorded.</p>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: '#1A2C4E' }}>
                  <span className="font-bold">{attendanceCount}</span> classes attended. Last attended:{' '}
                  <span className="font-bold">{formatDate(lastAttendance)}</span>.
                </p>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        {['Date', 'Class Name', 'Pass Used'].map(h => (
                          <th
                            key={h}
                            className="text-left uppercase tracking-wide pb-3 pr-4 text-[11px]"
                            style={{ color: '#6b7280' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map(a => (
                        <tr key={a.id} className="border-b border-[#f3f4f6]">
                          <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(a.class_date)}</td>
                          <td className="py-3 pr-4 text-sm font-medium" style={{ color: '#1A2C4E' }}>{a.class_name}</td>
                          <td className="py-3 text-sm text-gray-500">{a.pass_used ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {attendance.map(a => (
                    <div key={a.id} className="border border-[#e5e7eb] p-3" style={{ borderRadius: 0 }}>
                      <p className="font-medium text-sm" style={{ color: '#1A2C4E' }}>{a.class_name}</p>
                      <p className="text-gray-400 text-xs mt-1">{formatDate(a.class_date)}</p>
                      {a.pass_used && <p className="text-gray-500 text-xs mt-0.5">{a.pass_used}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Lead History tab */}
        {activeTab === 'Lead History' && (
          <div>
            {leads.length === 0 ? (
              <p className="text-gray-400 text-sm">No lead history.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        {['Date Added', 'Product', 'Status', 'Assigned To', 'Last Follow-up', 'Notes'].map(h => (
                          <th
                            key={h}
                            className="text-left uppercase tracking-wide pb-3 pr-4 text-[11px]"
                            style={{ color: '#6b7280' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map(l => (
                        <tr key={l.id} className="border-b border-[#f3f4f6]">
                          <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(l.date_added)}</td>
                          <td className="py-3 pr-4 text-sm font-medium" style={{ color: '#1A2C4E' }}>{l.product_name ?? '—'}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={l.status} type="lead" />
                          </td>
                          <td className="py-3 pr-4 text-sm">{l.assigned_to}</td>
                          <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(l.last_followup_date)}</td>
                          <td className="py-3 text-sm text-gray-500">{l.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {leads.map(l => (
                    <div key={l.id} className="border border-[#e5e7eb] p-3" style={{ borderRadius: 0 }}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm" style={{ color: '#1A2C4E' }}>{l.product_name ?? '—'}</p>
                        <StatusBadge status={l.status} type="lead" />
                      </div>
                      <p className="text-gray-400 text-xs mt-1">Added: {formatDate(l.date_added)}</p>
                      <p className="text-gray-400 text-xs">Follow-up: {formatDate(l.last_followup_date)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
