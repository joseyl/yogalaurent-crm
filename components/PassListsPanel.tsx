'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Collapsible from '@/components/ui/Collapsible'

interface PassListRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number
  endDate: string | null
}

interface PassListsData {
  snapshotDate: string | null
  runningLow: PassListRow[]
  expiredWithCredits: PassListRow[]
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

function PassRows({ rows, lastKnown }: { rows: PassListRow[]; lastKnown: boolean }) {
  return (
    <>
      {rows.map(row => (
        <div
          key={row.passId}
          className="flex items-center justify-between py-2 border-b border-card-border last:border-0 gap-2"
        >
          {row.personId ? (
            <Link
              href={`/clients/${row.personId}`}
              className="text-sm font-medium text-heading hover:text-accent hover:underline shrink-0"
            >
              {row.name}
            </Link>
          ) : (
            <span className="text-sm font-medium text-heading shrink-0">
              {row.name}
              <span className="block text-xs font-normal text-muted">Not linked to a client</span>
            </span>
          )}
          <span className="text-xs text-muted hidden sm:block truncate flex-1">{row.passName}</span>
          <span
            className="text-xs font-medium shrink-0"
            style={{ color: 'var(--color-amber-vivid)' }}
          >
            {formatCredits(row.creditsLeft)} {row.creditsLeft === 1 ? 'credit' : 'credits'} left
            {lastKnown ? ' (last known)' : ''}
          </span>
          <span className="text-xs text-muted shrink-0">
            {row.endDate ? `${lastKnown ? 'Ended' : 'Ends'} ${formatDate(row.endDate)}` : 'No end date'}
          </span>
        </div>
      ))}
    </>
  )
}

export default function PassListsPanel() {
  const [data, setData] = useState<PassListsData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch('/api/pass-lists')
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!r.ok || !d || !Array.isArray(d.runningLow) || !Array.isArray(d.expiredWithCredits)) {
          throw new Error('load failed')
        }
        setData(d)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [])

  const low = data?.runningLow ?? []
  const expired = data?.expiredWithCredits ?? []
  const snapshotNote = data?.snapshotDate ? ` Momence copy of ${formatDate(data.snapshotDate)}.` : ''

  function body(rows: PassListRow[], lastKnown: boolean) {
    if (!loaded) return <p className="text-sm text-muted italic">Loading...</p>
    if (failed) {
      return (
        <p className="text-sm" style={{ color: 'var(--color-red-vivid)' }}>
          Could not load pass lists. Refresh the page to try again.
        </p>
      )
    }
    if (rows.length === 0) return <p className="text-sm text-muted">Nothing to action.</p>
    return <PassRows rows={rows} lastKnown={lastKnown} />
  }

  function count(rows: PassListRow[]) {
    return !loaded ? '-' : failed ? '!' : rows.length
  }

  function tone(rows: PassListRow[]): 'neutral' | 'warning' | 'danger' {
    return failed ? 'danger' : loaded && rows.length > 0 ? 'warning' : 'neutral'
  }

  return (
    <>
      <Collapsible title="Class Passes: Running low" count={count(low)} tone={tone(low)}>
        <p className="text-xs text-muted mb-3">
          Not expired, 1.5 credits or fewer. Hidden if the person has bought another class pass since the pass started.
          {snapshotNote}
        </p>
        {body(low, false)}
      </Collapsible>

      <Collapsible title="Class Passes: Expired, credits left (last known)" count={count(expired)} tone={tone(expired)}>
        <p className="text-xs text-muted mb-3">
          Expired in the last 60 days with credits left when Momence last listed them. Momence stops listing a pass once it
          expires, so these are the last known credits. Hidden if the person has bought another class pass since.
        </p>
        {body(expired, true)}
      </Collapsible>
    </>
  )
}
