'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Collapsible from '@/components/ui/Collapsible'

interface ExpiringPassRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number | null
  endDate: string
  daysLeft: number
  missingFromLatest: boolean
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCredits(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export default function ExpiringPassesPanel() {
  const [passes, setPasses] = useState<ExpiringPassRow[]>([])
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

  const count = !loaded ? '-' : failed ? '!' : passes.length
  const tone = failed ? 'danger' : loaded && passes.length > 0 ? 'warning' : 'neutral'

  return (
    <Collapsible title="Class Passes: Expiring" count={count} tone={tone}>
      <p className="text-xs text-muted mb-3">
        Passes ending within 15 days or ended in the last 30 days, using the end date in Momence. Hidden if the person has bought another class pass since the pass started.
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
          const expired = pass.daysLeft < 0
          const status = expired
            ? 'Expired'
            : pass.daysLeft === 0
              ? 'Expires today'
              : `Expires in ${pass.daysLeft}d`

          return (
            <div
              key={pass.passId}
              className="flex items-center justify-between py-2 border-b border-card-border last:border-0 gap-2"
            >
              {pass.personId ? (
                <Link
                  href={`/clients/${pass.personId}`}
                  className="text-sm font-medium text-heading hover:text-accent hover:underline shrink-0"
                >
                  {pass.name}
                </Link>
              ) : (
                <span className="text-sm font-medium text-heading shrink-0">
                  {pass.name}
                  <span className="block text-xs font-normal text-muted">Not linked to a client</span>
                </span>
              )}
              <span className="text-xs text-muted hidden sm:block truncate flex-1">{pass.passName}</span>
              {pass.creditsLeft !== null && (
                <span className="text-xs text-muted shrink-0">
                  {formatCredits(pass.creditsLeft)} {pass.creditsLeft === 1 ? 'credit' : 'credits'} left
                  {pass.missingFromLatest ? ' (last known)' : ''}
                </span>
              )}
              <span className="text-xs text-muted shrink-0">{formatDate(pass.endDate)}</span>
              <span
                className="text-xs font-medium shrink-0"
                style={{ color: expired ? 'var(--color-red-vivid)' : 'var(--color-amber-vivid)' }}
              >
                {status}
              </span>
            </div>
          )
        })
      )}
    </Collapsible>
  )
}
