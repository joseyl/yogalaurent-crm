'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Collapsible from '@/components/ui/Collapsible'

// The two class pass cards on the dashboard (data: app/api/class-pass-cards).
// A pass is on one card only, chosen by the action needed.

interface ClassPassCardRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number | null
  hasCreditLimit: boolean
  endDate: string | null
  daysLeft: number | null
  reason: 'ending' | 'low' | 'ending_low' | 'lapsed' | 'expired'
  lastKnown: boolean
}

interface ClassPassCardsData {
  snapshotDate: string | null
  renewalDue: ClassPassCardRow[]
  expiredWithCredits: ClassPassCardRow[]
}

const THIS_YEAR = new Date().getFullYear()

// "16 Nov", or "16 Jan 2027" when not this year
function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(d.getUTCFullYear() !== THIS_YEAR ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

function fullDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function credits(n: number): string {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1)
  return `${v} ${n === 1 ? 'credit' : 'credits'}`
}

function endsIn(days: number): string {
  if (days === 0) return 'ends today'
  if (days === 1) return 'ends tomorrow'
  return `ends in ${days} days`
}

// The reason in plain words, for example "ends in 3 days, 0.5 credits left",
// "0 credits, ends 16 Nov", "lapsed 2 Oct", "ended 5 Oct, 3 credits left (last known)".
function reasonText(r: ClassPassCardRow): string {
  const known = r.lastKnown ? ' (last known)' : ''
  switch (r.reason) {
    case 'lapsed':
      return r.endDate ? `lapsed ${shortDate(r.endDate)}` : 'lapsed'
    case 'expired':
      return `${r.endDate ? `ended ${shortDate(r.endDate)}, ` : ''}${credits(r.creditsLeft ?? 0)} left${known}`
    case 'ending':
    case 'ending_low':
      return `${endsIn(r.daysLeft ?? 0)}${r.creditsLeft !== null ? `, ${credits(r.creditsLeft)} left${known}` : ''}`
    case 'low':
      return `${credits(r.creditsLeft ?? 0)}${known}, ${r.endDate ? `ends ${shortDate(r.endDate)}` : 'no end date'}`
  }
}

function PassRows({ rows }: { rows: ClassPassCardRow[] }) {
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
            className="text-xs font-medium shrink-0 text-right"
            style={{ color: row.reason === 'lapsed' ? 'var(--color-red-vivid)' : 'var(--color-amber-vivid)' }}
          >
            {reasonText(row)}
          </span>
        </div>
      ))}
    </>
  )
}

export default function ClassPassCards() {
  const [data, setData] = useState<ClassPassCardsData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch('/api/class-pass-cards')
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!r.ok || !d || !Array.isArray(d.renewalDue) || !Array.isArray(d.expiredWithCredits)) {
          throw new Error('load failed')
        }
        setData(d)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [])

  const renewal = data?.renewalDue ?? []
  const expired = data?.expiredWithCredits ?? []
  const snapshotNote = data?.snapshotDate ? ` Momence copy of ${fullDate(data.snapshotDate)}.` : ''

  function body(rows: ClassPassCardRow[]) {
    if (!loaded) return <p className="text-sm text-muted italic">Loading...</p>
    if (failed) {
      return (
        <p className="text-sm" style={{ color: 'var(--color-red-vivid)' }}>
          Could not load class passes. Refresh the page to try again.
        </p>
      )
    }
    if (rows.length === 0) return <p className="text-sm text-muted">Nothing to action.</p>
    return <PassRows rows={rows} />
  }

  function count(rows: ClassPassCardRow[]) {
    return !loaded ? '-' : failed ? '!' : rows.length
  }

  function tone(rows: ClassPassCardRow[]): 'neutral' | 'warning' | 'danger' {
    return failed ? 'danger' : loaded && rows.length > 0 ? 'warning' : 'neutral'
  }

  return (
    <>
      <Collapsible title="Class Passes: Renewal due" count={count(renewal)} tone={tone(renewal)}>
        <p className="text-xs text-muted mb-3">
          For a renewal reminder. Passes ending within 15 days, passes with 1.5 credits or fewer left, and passes that
          lapsed in the last 30 days with no credits left or no credit limit. Hidden if the person has bought another
          class pass since the pass started, or Momence shows a newer pass for them.
          {snapshotNote}
        </p>
        {body(renewal)}
      </Collapsible>

      <Collapsible title="Class Passes: Expired with credits (decide)" count={count(expired)} tone={tone(expired)}>
        <p className="text-xs text-muted mb-3">
          For your decision on an extension, case by case. Passes that ended in the last 60 days with credits left when
          Momence last listed them (Momence stops listing a pass once it ends). Hidden if the person has bought another
          class pass since, or Momence shows a newer pass for them.
        </p>
        {body(expired)}
      </Collapsible>
    </>
  )
}
