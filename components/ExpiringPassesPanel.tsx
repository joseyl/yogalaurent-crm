'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PassRow {
  id: string
  expires_at: string
  people: {
    id: string
    first_name: string | null
    last_name: string | null
  } | null
  products: {
    name: string
  } | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(dateStr: string): number {
  const expiry = new Date(dateStr).getTime()
  return Math.floor((expiry - Date.now()) / 86400000)
}

export default function ExpiringPassesPanel() {
  const [passes, setPasses] = useState<PassRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/expiring-passes')
      .then(r => r.json())
      .then(d => {
        setPasses(d.passes ?? [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  async function dismiss(purchaseId: string) {
    await fetch('/api/expiring-passes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId }),
    })
    setPasses(prev => prev.filter(p => p.id !== purchaseId))
  }

  return (
    <div className="bg-white border border-[#e5e7eb] border-l-4 border-l-[#B8540A] p-4">
      <h2 className="font-semibold mb-1" style={{ color: '#1A2C4E' }}>
        Expiring Passes
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        Passes expiring within 15 days or expired in the last 30 days
      </p>

      {!loaded ? (
        <p className="text-gray-400 italic text-sm">Loading…</p>
      ) : passes.length === 0 ? (
        <p className="text-gray-400 italic text-sm">No passes expiring soon</p>
      ) : (
        passes.map(pass => {
          const days = daysUntil(pass.expires_at)
          const expired = days < 0
          const fullName = [pass.people?.first_name, pass.people?.last_name]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={pass.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-2"
            >
              <Link
                href={`/clients/${pass.people?.id}`}
                className="text-sm font-medium text-[#1A2C4E] hover:underline shrink-0"
              >
                {fullName || 'Unknown'}
              </Link>
              <span className="text-xs text-gray-500 hidden sm:block truncate flex-1">
                {pass.products?.name}
              </span>
              <span className="text-xs text-gray-400 shrink-0">{formatDate(pass.expires_at)}</span>
              <span
                className="text-xs font-medium shrink-0"
                style={{ color: expired ? '#dc2626' : '#d97706' }}
              >
                {expired ? 'Expired' : `Expires in ${days}d`}
              </span>
              <button
                onClick={() => dismiss(pass.id)}
                className="btn-secondary shrink-0 text-xs"
              >
                Dismiss
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
