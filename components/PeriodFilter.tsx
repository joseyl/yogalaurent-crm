'use client'

import { useState } from 'react'
import { PERIOD_OPTIONS, isValidIsoDate, periodRange, type DateRange, type Period } from '@/lib/periods'

interface Props {
  period: Period
  customFrom: string
  customTo: string
  /** Called only with a complete, valid choice. */
  onChange: (next: { period: Period; customFrom: string; customTo: string }) => void
  className?: string
  /** Show the "Showing: ..." line under the controls. */
  showSummary?: boolean
}

const inputCls =
  'border border-card-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-accent min-h-[44px] md:min-h-9'

/**
 * Period dropdown with custom From and To dates. Dates can be typed or picked. A date is
 * applied as soon as it is complete and valid (or, if cleared, when you leave the box),
 * and only when From is not after To, so the page never reloads half way through typing.
 */
export default function PeriodFilter({ period, customFrom, customTo, onChange, className, showSummary }: Props) {
  // Draft values while typing; committed values live in the parent
  const [draftFrom, setDraftFrom] = useState(customFrom)
  const [draftTo, setDraftTo] = useState(customTo)

  const fromOk = draftFrom === '' || isValidIsoDate(draftFrom)
  const toOk = draftTo === '' || isValidIsoDate(draftTo)
  const orderOk = !(draftFrom && draftTo && fromOk && toOk && draftFrom > draftTo)
  const message = !fromOk || !toOk
    ? 'Enter a complete date'
    : !orderOk
    ? 'From is after To'
    : null

  function commit(from: string, to: string) {
    const fOk = from === '' || isValidIsoDate(from)
    const tOk = to === '' || isValidIsoDate(to)
    if (!fOk || !tOk) return
    if (from && to && from > to) return
    if (from === customFrom && to === customTo && period === 'custom') return
    onChange({ period: 'custom', customFrom: from, customTo: to })
  }

  const range: DateRange = periodRange(period, customFrom, customTo)

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={period}
          onChange={e => {
            const p = e.target.value as Period
            if (p === 'custom') {
              onChange({ period: 'custom', customFrom: fromOk ? draftFrom : '', customTo: toOk ? draftTo : '' })
            } else {
              onChange({ period: p, customFrom: '', customTo: '' })
            }
          }}
          className={inputCls}
          aria-label="Period"
        >
          {PERIOD_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {period === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-muted" htmlFor="period-from">From</label>
            <input
              id="period-from"
              type="date"
              value={draftFrom}
              onChange={e => { setDraftFrom(e.target.value); if (isValidIsoDate(e.target.value)) commit(e.target.value, draftTo) }}
              onBlur={() => commit(draftFrom, draftTo)}
              className={inputCls}
            />
            <label className="text-sm text-muted" htmlFor="period-to">To</label>
            <input
              id="period-to"
              type="date"
              value={draftTo}
              onChange={e => { setDraftTo(e.target.value); if (isValidIsoDate(e.target.value)) commit(draftFrom, e.target.value) }}
              onBlur={() => commit(draftFrom, draftTo)}
              className={inputCls}
            />
            {message && <span className="text-xs" style={{ color: 'var(--color-red-vivid)' }}>{message}</span>}
          </div>
        )}
      </div>
      {showSummary && <p className="text-xs text-muted mt-2">Showing: {range.label}</p>}
    </div>
  )
}
