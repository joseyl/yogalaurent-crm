'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatGBP } from '@/lib/utils'

interface Row {
  id: string
  order_ref: string | null
  purchase_date: string
  balance_due_date: string | null
  total: number
  paid: number
  outstanding: number
  kind: 'awaiting' | 'balance'
  person: { id: string; first_name: string | null; last_name: string | null; email: string } | null
  product: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function AwaitingPaymentPanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [outstandingTotal, setOutstandingTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/awaiting-payment')
      .then(r => r.json())
      .then(d => {
        setRows(d.rows ?? [])
        setOutstandingTotal(d.outstandingTotal ?? 0)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  async function markPaid(row: Row) {
    if (busy) return
    setBusy(row.id)
    try {
      const res = await fetch('/api/awaiting-payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: row.id }),
      })
      if (res.ok) {
        setRows(prev => prev.filter(r => r.id !== row.id))
        setOutstandingTotal(prev => Math.round((prev - row.outstanding) * 100) / 100)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-white border border-[#e5e7eb] border-l-4 border-l-[#B8540A] p-4">
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <h2 className="font-semibold" style={{ color: '#1A2C4E' }}>
          Payments to Confirm
        </h2>
        {loaded && rows.length > 0 && (
          <span className="text-sm font-semibold" style={{ color: '#B8540A' }}>
            {formatGBP(outstandingTotal)} outstanding
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Bank transfers not yet received, and deposit balances still to collect
      </p>

      {!loaded ? (
        <p className="text-gray-400 italic text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-400 italic text-sm">Nothing to chase</p>
      ) : (
        rows.map(row => {
          const fullName = [row.person?.first_name, row.person?.last_name].filter(Boolean).join(' ')
          const overdue = row.balance_due_date ? daysUntil(row.balance_due_date) < 0 : false

          return (
            <div
              key={row.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-2"
            >
              <Link
                href={`/clients/${row.person?.id}`}
                className="text-sm font-medium text-[#1A2C4E] hover:underline shrink-0"
              >
                {fullName || row.person?.email || 'Unknown'}
              </Link>

              <span className="text-xs text-gray-500 hidden sm:block truncate flex-1">
                {row.product}
                {row.order_ref ? ` · ${row.order_ref}` : ''}
              </span>

              <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                {row.kind === 'balance' && row.balance_due_date
                  ? `Due ${formatDate(row.balance_due_date)}`
                  : formatDate(row.purchase_date)}
              </span>

              <span
                className="text-xs font-medium shrink-0"
                style={{ color: overdue ? '#dc2626' : '#d97706' }}
              >
                {row.kind === 'awaiting'
                  ? `Awaiting ${formatGBP(row.outstanding)}`
                  : `Balance ${formatGBP(row.outstanding)}`}
              </span>

              <button
                onClick={() => markPaid(row)}
                disabled={busy === row.id}
                className="btn-secondary shrink-0 text-xs"
              >
                {busy === row.id ? 'Saving…' : 'Mark paid'}
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
