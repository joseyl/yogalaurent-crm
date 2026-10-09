'use client'

import { useCallback, useEffect, useState } from 'react'
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
  followup: Followup | null
}

// Build B: the follow-up on an Expired with credits pass (table pass_followups)
interface Followup {
  id: string
  status: 'to_decide' | 'offer_extension' | 'followup_due' | 'closed'
  emailSentOn: string | null
  followupDueOn: string | null
  daysOffered: number | null
  note: string | null
}

interface ClassPassCardsData {
  snapshotDate: string | null
  renewalDue: ClassPassCardRow[]
  expiredWithCredits: ClassPassCardRow[]
  introNextStep: ClassPassCardRow[]
  introNeverUsed: ClassPassCardRow[]
  followupsError?: string | null
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

function londonToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
}

const STEP_LABEL: Record<Followup['status'], string> = {
  to_decide: 'To decide',
  offer_extension: 'Offer extension',
  followup_due: 'Follow-up due',
  closed: 'Closed',
}

// The next action in plain words
function nextAction(f: Followup, today: string): { text: string; urgent: boolean } {
  if (f.status === 'to_decide') return { text: 'Decide: offer an extension or not', urgent: false }
  if (f.status === 'offer_extension') return { text: 'Send the email yourself, then tick Email sent', urgent: false }
  const due = f.followupDueOn
  if (!due) return { text: 'Follow up', urgent: true }
  if (due < today) return { text: `Follow-up overdue (due ${shortDate(due)})`, urgent: true }
  if (due === today) return { text: 'Follow-up due today', urgent: true }
  return { text: `Follow up on ${shortDate(due)}`, urgent: false }
}

const fieldClass = 'border border-card-border px-2 text-sm min-h-[44px] md:min-h-[32px] bg-white'

function FollowupActions({ row, onChanged }: { row: ClassPassCardRow; onChanged: () => void }) {
  const f = row.followup!
  const today = londonToday()
  const [mode, setMode] = useState<'idle' | 'no_extension'>('idle')
  const [days, setDays] = useState('')
  const [on, setOn] = useState(today)
  const [outcome, setOutcome] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function step(action: string, extra: Record<string, unknown> = {}) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/pass-followups/${f.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) {
        setError(d?.error ?? 'Not saved, try again')
        if (res.status === 409) onChanged()
        return
      }
      setMode('idle')
      setNote('')
      onChanged()
    } catch {
      setError('Not saved, try again')
    } finally {
      setSaving(false)
    }
  }

  const next = nextAction(f, today)

  return (
    <div className="mt-2 text-xs">
      <p className="mb-2">
        <span className="font-semibold text-heading">{STEP_LABEL[f.status]}</span>
        <span className="text-muted">. </span>
        <span style={{ color: next.urgent ? 'var(--color-red-vivid)' : undefined }} className={next.urgent ? 'font-medium' : 'text-muted'}>
          {next.text}
        </span>
        {f.status === 'followup_due' && f.daysOffered !== null && f.emailSentOn && (
          <span className="text-muted">
            {' '}
            ({f.daysOffered} {f.daysOffered === 1 ? 'day' : 'days'} offered, email {shortDate(f.emailSentOn)})
          </span>
        )}
      </p>
      {f.note && <p className="text-muted mb-2">Note: {f.note}</p>}

      {f.status === 'to_decide' && mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary text-xs min-h-[44px] md:min-h-0" disabled={saving} onClick={() => step('offer')}>
            Offer extension
          </button>
          <button type="button" className="btn-secondary text-xs min-h-[44px] md:min-h-0" disabled={saving} onClick={() => setMode('no_extension')}>
            No extension
          </button>
        </div>
      )}

      {f.status === 'to_decide' && mode === 'no_extension' && (
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            className={`${fieldClass} flex-1 min-w-[160px]`}
            placeholder="Note (optional)"
            value={note}
            maxLength={1000}
            onChange={e => setNote(e.target.value)}
          />
          <button type="button" className="btn-primary text-xs min-h-[44px] md:min-h-0" disabled={saving} onClick={() => step('no_extension', { note })}>
            {saving ? 'Saving...' : 'Close: no extension'}
          </button>
          <button type="button" className="btn-secondary text-xs min-h-[44px] md:min-h-0" disabled={saving} onClick={() => setMode('idle')}>
            Cancel
          </button>
        </div>
      )}

      {f.status === 'offer_extension' && (
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-1 text-muted">
            Days offered
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              className={`${fieldClass} w-20`}
              value={days}
              onChange={e => setDays(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-1 text-muted">
            Email sent on
            <input type="date" className={fieldClass} max={today} value={on} onChange={e => setOn(e.target.value)} />
          </label>
          <input
            type="text"
            className={`${fieldClass} flex-1 min-w-[160px]`}
            placeholder="Note (optional)"
            value={note}
            maxLength={1000}
            onChange={e => setNote(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary text-xs min-h-[44px] md:min-h-0"
            disabled={saving || days === ''}
            onClick={() => step('email_sent', { days: Number(days), on, note })}
          >
            {saving ? 'Saving...' : 'Email sent'}
          </button>
          <button type="button" className="btn-secondary text-xs min-h-[44px] md:min-h-0" disabled={saving} onClick={() => step('back')}>
            Back to To decide
          </button>
        </div>
      )}

      {f.status === 'followup_due' && (
        <div className="flex flex-wrap gap-2 items-center">
          <select className={fieldClass} value={outcome} onChange={e => setOutcome(e.target.value)}>
            <option value="">Outcome...</option>
            <option value="extended">Extended</option>
            <option value="declined">Declined</option>
            <option value="no_reply">No reply</option>
          </select>
          <input
            type="text"
            className={`${fieldClass} flex-1 min-w-[160px]`}
            placeholder="Note (optional)"
            value={note}
            maxLength={1000}
            onChange={e => setNote(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary text-xs min-h-[44px] md:min-h-0"
            disabled={saving || outcome === ''}
            onClick={() => step('close', { outcome, note })}
          >
            {saving ? 'Saving...' : 'Close'}
          </button>
        </div>
      )}

      {error && <p className="mt-1" style={{ color: 'var(--color-red-vivid)' }}>{error}</p>}
    </div>
  )
}

function FollowupRows({ rows, onChanged }: { rows: ClassPassCardRow[]; onChanged: () => void }) {
  return (
    <>
      {rows.map(row => (
        <div key={row.passId} className="py-3 border-b border-card-border last:border-0">
          <div className="flex items-center justify-between gap-2">
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
            <span className="text-xs font-medium shrink-0 text-right" style={{ color: 'var(--color-amber-vivid)' }}>
              {reasonText(row)}
            </span>
          </div>
          <span className="text-xs text-muted sm:hidden">{row.passName}</span>
          {row.followup && <FollowupActions row={row} onChanged={onChanged} />}
        </div>
      ))}
    </>
  )
}

export default function ClassPassCards() {
  const [data, setData] = useState<ClassPassCardsData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    return fetch('/api/class-pass-cards', { cache: 'no-store' })
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
        setFailed(false)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
          For your decision on an extension, case by case. Each pass that ended in the last 60 days with credits left
          gets a follow-up: To decide, then Offer extension (you send the email, then tick Email sent with the days
          offered), Follow-up due 7 days later, then Closed. It stays here until closed. Closes by itself when Momence
          shows the pass with a later end date (Extended), the person buys a class pass or Momence shows a newer pass,
          or the person books a class. The history is on the client page.
        </p>
        {data?.followupsError && (
          <p className="text-xs mb-3" style={{ color: 'var(--color-red-vivid)' }}>
            Follow-ups not fully updated: {data.followupsError}
          </p>
        )}
        {expired.some(r => r.followup) ? (
          loaded && !failed ? <FollowupRows rows={expired} onChanged={load} /> : body(expired)
        ) : (
          body(expired)
        )}
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
