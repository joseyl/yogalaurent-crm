'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GROUPS, DISMISS_REASONS, type GapGroup, type GoneQuietRow } from '@/lib/goneQuietShared'

// The Gone Quiet page (Build C). Group tabs, a Came once filter, a Dismissed view, and
// Contacted and Dismiss per person (saved through app/api/gone-quiet/[personId]).

const THIS_YEAR = new Date().getFullYear()

// "16 Nov", or "16 Jan 2025" when not this year
function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(d.getUTCFullYear() !== THIS_YEAR ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

function gapText(days: number): string {
  if (days < 60) return `${days} days ago`
  const months = Math.floor(days / 30.44)
  if (months < 24) return `${months} months ago`
  return `${Math.floor(days / 365.25)} years ago`
}

const REASON_LABEL: Record<string, string> = {
  not_interested: 'Not interested',
  moved_away: 'Moved away',
  deceased: 'Deceased',
  other: 'Other',
}

const fieldClass = 'border border-card-border px-2 text-sm min-h-[44px] md:min-h-[32px] bg-white'
const btn = 'text-xs min-h-[44px] md:min-h-0'

function name(r: GoneQuietRow): string {
  return [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email
}

export default function GoneQuietList({
  rows,
  today,
  initialGroup,
  initialView,
  initialCameOnce,
}: {
  rows: GoneQuietRow[]
  today: string
  initialGroup: GapGroup
  initialView: 'list' | 'dismissed'
  initialCameOnce: boolean
}) {
  const router = useRouter()
  const [group, setGroup] = useState<GapGroup>(initialGroup)
  const [view, setView] = useState<'list' | 'dismissed'>(initialView)
  const [cameOnce, setCameOnce] = useState(initialCameOnce)

  function go(next: { group?: GapGroup; view?: 'list' | 'dismissed'; cameOnce?: boolean }) {
    const g = next.group ?? group
    const v = next.view ?? view
    const c = next.cameOnce ?? cameOnce
    setGroup(g)
    setView(v)
    setCameOnce(c)
    const qs = new URLSearchParams()
    if (v === 'dismissed') qs.set('view', 'dismissed')
    else qs.set('group', g)
    if (c) qs.set('cameOnce', '1')
    router.replace(`/gone-quiet?${qs.toString()}`, { scroll: false })
  }

  const listed = useMemo(() => rows.filter(r => r.listed), [rows])
  const dismissed = useMemo(() => rows.filter(r => r.dismissed), [rows])
  const counts = useMemo(() => {
    const c = {} as Record<GapGroup, { all: number; once: number; contacted: number }>
    for (const g of GROUPS) c[g.key] = { all: 0, once: 0, contacted: 0 }
    for (const r of listed) {
      if (r.gap_group === 'active') continue
      c[r.gap_group].all++
      if (r.came_once) c[r.gap_group].once++
      if (r.contacted) c[r.gap_group].contacted++
    }
    return c
  }, [listed])

  const shown =
    view === 'dismissed'
      ? dismissed.filter(r => !cameOnce || r.came_once)
      : listed.filter(r => r.gap_group === group && (!cameOnce || r.came_once))
  const current = GROUPS.find(g => g.key === group)!

  return (
    <div>
      {/* Group tabs, longest gap first, then Dismissed */}
      <div className="flex flex-wrap gap-2 mb-4">
        {GROUPS.map(g => {
          const active = view === 'list' && group === g.key
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => go({ group: g.key, view: 'list' })}
              className={`${active ? 'btn-primary' : 'btn-secondary'} ${btn}`}
            >
              {g.label} ({counts[g.key].all})
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => go({ view: 'dismissed' })}
          className={`${view === 'dismissed' ? 'btn-primary' : 'btn-secondary'} ${btn}`}
        >
          Dismissed ({dismissed.length})
        </button>
      </div>

      <div className="card p-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-body min-h-[44px] md:min-h-0">
          <input type="checkbox" checked={cameOnce} onChange={e => go({ cameOnce: e.target.checked })} />
          Came once only
          {view === 'list' && <span className="text-muted">({counts[group].once} in this group)</span>}
        </label>
        {view === 'list' &&
          (current.mailchimp ? (
            <div className="flex flex-col gap-1 sm:items-end">
              <a
                href={`/api/gone-quiet/export?group=${group}${cameOnce ? '&cameOnce=1' : ''}`}
                className={`btn-primary ${btn}`}
              >
                Export for Mailchimp ({shown.length})
              </a>
              <span className="text-xs text-muted">
                Save it in yogalaurent-crm-data. The segment and its tag are built in the Mailchimp Expert project.
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted">Personal emails from your template for this group. Tick Contacted once sent.</span>
          ))}
      </div>

      {view === 'list' && (
        <p className="text-xs text-muted mb-3">
          {shown.length} {shown.length === 1 ? 'person' : 'people'}
          {counts[group].contacted > 0 && `, ${counts[group].contacted} contacted (greyed out)`}.
        </p>
      )}
      {view === 'dismissed' && (
        <p className="text-xs text-muted mb-3">
          Dismissed people come back by themselves if they attend or buy again. Bring back undoes a dismissal by hand
          (it does not change a deceased status).
        </p>
      )}

      {shown.length === 0 ? (
        <div className="card p-4 text-sm text-muted">Nobody here.</div>
      ) : (
        <ul className="card divide-y divide-card-border">
          {shown.map(r => (
            <PersonRow key={r.person_id} r={r} today={today} view={view} onChanged={() => router.refresh()} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PersonRow({
  r,
  today,
  view,
  onChanged,
}: {
  r: GoneQuietRow
  today: string
  view: 'list' | 'dismissed'
  onChanged: () => void
}) {
  const [mode, setMode] = useState<'idle' | 'contacted' | 'dismiss'>('idle')
  const [on, setOn] = useState(today)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/gone-quiet/${r.person_id}`, {
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
      setReason('')
      onChanged()
    } catch {
      setError('Not saved, try again')
    } finally {
      setSaving(false)
    }
  }

  const grey = view === 'list' && r.contacted

  return (
    <li className="p-4" style={grey ? { opacity: 0.5 } : undefined}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <span className="flex flex-wrap items-center gap-2">
          <Link href={`/clients/${r.person_id}`} className="text-sm font-medium text-heading underline">
            {name(r)}
          </Link>
          {r.came_once && (
            <span className="bg-amber-subtle text-amber-vivid px-2 py-0.5 text-xs font-medium">Came once</span>
          )}
          {r.status === 'lead' && <span className="bg-grey-subtle text-grey-vivid px-2 py-0.5 text-xs">Lead</span>}
        </span>
        <span className="text-xs text-muted">
          Last activity {shortDate(r.last_activity)}, {gapText(r.days_since)}
        </span>
      </div>
      <p className="text-xs text-muted mt-1">
        {r.classes_attended} {r.classes_attended === 1 ? 'class' : 'classes'}, last class {shortDate(r.last_class)}
        {r.last_purchase ? `; last purchase ${shortDate(r.last_purchase)}` : '; no purchase'}
        {r.contacted_on && view === 'list' && r.contacted && `; contacted ${shortDate(r.contacted_on)}`}
      </p>

      {view === 'dismissed' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-body">
            Dismissed {r.dismissed_on ? shortDate(r.dismissed_on) : ''}: {REASON_LABEL[r.dismiss_reason ?? ''] ?? r.dismiss_reason}
            {r.dismiss_note ? `. ${r.dismiss_note}` : ''}
            {r.status === 'deceased' && r.dismiss_reason !== 'deceased' ? '. Status: deceased' : ''}
          </span>
          <button type="button" className={`btn-secondary ${btn}`} disabled={saving} onClick={() => act('undismiss')}>
            Bring back
          </button>
        </div>
      ) : mode === 'contacted' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <label className="text-muted">Email sent on</label>
          <input type="date" className={fieldClass} max={today} value={on} onChange={e => setOn(e.target.value)} />
          <button type="button" className={`btn-primary ${btn}`} disabled={saving || !on} onClick={() => act('contacted', { on })}>
            Save
          </button>
          <button type="button" className={`btn-secondary ${btn}`} disabled={saving} onClick={() => setMode('idle')}>
            Cancel
          </button>
        </div>
      ) : mode === 'dismiss' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <select className={fieldClass} value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">Reason</option>
            {DISMISS_REASONS.map(d => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          <input
            className={`${fieldClass} flex-1 min-w-[10rem]`}
            placeholder="Note (optional)"
            maxLength={1000}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button
            type="button"
            className={`btn-primary ${btn}`}
            disabled={saving || !reason}
            onClick={() => act('dismiss', { reason, note })}
          >
            Dismiss
          </button>
          <button type="button" className={`btn-secondary ${btn}`} disabled={saving} onClick={() => setMode('idle')}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {r.contacted ? (
            <button type="button" className={`btn-secondary ${btn}`} disabled={saving} onClick={() => act('uncontacted')}>
              Undo contacted
            </button>
          ) : (
            <button type="button" className={`btn-primary ${btn}`} disabled={saving} onClick={() => { setOn(today); setMode('contacted') }}>
              Contacted
            </button>
          )}
          <button type="button" className={`btn-secondary ${btn}`} disabled={saving} onClick={() => setMode('dismiss')}>
            Dismiss
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs" style={{ color: 'var(--color-red-vivid)' }}>{error}</p>}
    </li>
  )
}
