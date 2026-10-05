'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Collapsible from '@/components/ui/Collapsible'

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
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch('/api/expiring-passes')
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!r.ok || !d || !Array.isArray(d.passes)) throw new Error('load failed')
        setPasses(d.passes)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [])

  async function dismiss(purchaseId: string) {
    await fetch('/api/expiring-passes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId }),
    })
    setPasses(prev => prev.filter(p => p.id !== purchaseId))
  }

  const count = !loaded ? '-' : failed ? '!' : passes.length
  const tone = failed ? 'danger' : loaded && passes.length > 0 ? 'warning' : 'neutral'

  return (
    <Collapsible title="Class Passes: Expiring" count={count} tone={tone}>
      <p className="text-xs text-muted mb-3">
        Passes expiring within 15 days or expired in the last 30 days. Hidden if the person has bought another class pass since.
      </p>

      {!loaded ? (
        <p className="text-sm text-muted italic">Loading...</p>
      ) : failed ? (
        <p className="text-sm" style={{ color: 'var(--color-red-vivid)' }}>
          Could not load expiring passes. Refresh the page to try again.
        </p>
      ) : passes.length === 0 ? (
        <p className="text-sm text-muted">Nothing to action.</p>
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
              className="flex items-center justify-between py-2 border-b border-card-border last:border-0 gap-2"
            >
              <Link
                href={`/clients/${pass.people?.id}`}
                className="text-sm font-medium text-heading hover:text-accent hover:underline shrink-0"
              >
                {fullName || 'Unknown'}
              </Link>
              <span className="text-xs text-muted hidden sm:block truncate flex-1">
                {pass.products?.name}
              </span>
              <span className="text-xs text-muted shrink-0">{formatDate(pass.expires_at)}</span>
              <span
                className="text-xs font-medium shrink-0"
                style={{ color: expired ? 'var(--color-red-vivid)' : 'var(--color-amber-vivid)' }}
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
    </Collapsible>
  )
}
