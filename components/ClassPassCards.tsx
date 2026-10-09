'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Collapsible from '@/components/ui/Collapsible'

// The class pass pair and the Intro Offers pair on the dashboard
// (data: app/api/class-pass-cards). A pass is on one card only, chosen by the
// action needed. Rendered in pair order, left then right:
//   Class Passes: Renewal due | Class Passes: Expired with credits (decide)
//   Intro Offers: Next step   | Intro Offers: Bought, never used

interface ClassPassCardRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number | null
  hasCreditLimit: boolean
  endDate: string | null
  daysLeft: number | null
  reason: 'ending' | 'low' | 'ending_low' | 'lapsed' | 'expired' | 'intro_ended' | 'intro_never_used'
  lastKnown: boolean
  boughtDate: string | null
}

interface ClassPassCardsData {
  snapshotDate: string | null
  renewalDue: ClassPassCardRow[]
  expiredWithCredits: ClassPassCardRow[]
  introNextStep: ClassPassCardRow[]
  introNeverUsed: ClassPassCardRow[]
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

// The reason in plain words, one per line, for example "ends in 3 days, 0.5 credits left",
// "0 credits, ends 16 Nov", "ended 2 Oct, 0 credits left", "ended 6 Oct, unlimited pass",
// "ended 2 Oct, credits unknown", "ended 5 Oct, 3 credits left (last known)".
function reasonText(r: ClassPassCardRow): string {
  const known = r.lastKnown ? ' (last known)' : ''
  const ended = r.endDate ? `ended ${shortDate(r.endDate)}` : 'ended'
  switch (r.reason) {
    case 'lapsed':
      if (!r.hasCreditLimit) return `${ended}, unlimited pass`
      if (r.creditsLeft === null) return `${ended}, credits unknown`
      return `${ended}, ${credits(r.creditsLeft)} left`
    case 'intro_ended':
      return ended
    case 'intro_never_used':
      return r.boughtDate ? `bought ${shortDate(r.boughtDate)}, not used` : 'not started in Momence'
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
            style={{
              color:
                row.reason === 'lapsed' || row.reason === 'intro_ended'
                  ? 'var(--color-red-vivid)'
                  : 'var(--color-amber-vivid)',
            }}
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
        if (
          !r.ok ||
          !d ||
          !Array.isArray(d.renewalDue) ||
          !Array.isArray(d.expiredWithCredits) ||
          !Array.isArray(d.introNextStep) ||
          !Array.isArray(d.introNeverUsed)
        ) {
          throw new Error('load failed')
        }
        setData(d)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [])

  const renewal = data?.renewalDue ?? []
  const expired = data?.expiredWithCredits ?? []
  const introNext = data?.introNextStep ?? []
  const introNever = data?.introNeverUsed ?? []
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
          ended in the last 30 days with no credits left, no credit limit or credits unknown. Intro Offers are on their
          own cards. Hidden if the person has bought another
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

      <Collapsible title="Intro Offers: Next step" count={count(introNext)} tone={tone(introNext)}>
        <p className="text-xs text-muted mb-3">
          First visits to follow up. Intro Offers that ended in the last 30 days, most recent first. Hidden once the
          person has bought a class pass since (not a drop-in), or Momence shows a newer pass for them.
          {snapshotNote}
        </p>
        {body(introNext)}
      </Collapsible>

      <Collapsible title="Intro Offers: Bought, never used" count={count(introNever)} tone={tone(introNever)}>
        <p className="text-xs text-muted mb-3">
          Intro Offers bought in the last 60 days with no class booked since and no class pass bought since. Also any
          Intro Offer Momence lists as not started. Momence only starts the offer on the first booked class.
        </p>
        {body(introNever)}
      </Collapsible>
    </>
  )
}
