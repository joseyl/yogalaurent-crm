import Card from '@/components/ui/Card'

// Client page: the history of class pass follow-ups for this client (Build B,
// table pass_followups, migration 012). Newest first. Shown only when there is one.

export interface PassFollowupHistoryRow {
  id: string
  pass_name: string | null
  pass_end_date: string
  credits_left: number | null
  status: 'to_decide' | 'offer_extension' | 'followup_due' | 'closed'
  email_sent_on: string | null
  followup_due_on: string | null
  days_offered: number | null
  outcome: string | null
  closed_automatically: boolean
  close_reason: string | null
  closed_at: string | null
  note: string | null
  created_at: string
}

const STEP: Record<PassFollowupHistoryRow['status'], string> = {
  to_decide: 'Open: To decide',
  offer_extension: 'Open: Offer extension',
  followup_due: 'Open: Follow-up due',
  closed: 'Closed',
}

const OUTCOME: Record<string, string> = {
  extended: 'Extended',
  declined: 'Declined',
  no_reply: 'No reply',
  no_extension: 'No extension',
  bought_pass: 'Bought a class pass',
  booked_class: 'Booked a class',
}

function fullDate(value: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
}

function credits(n: number): string {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1)
  return `${v} ${n === 1 ? 'credit' : 'credits'}`
}

export default function PassFollowupHistory({ rows }: { rows: PassFollowupHistoryRow[] }) {
  if (rows.length === 0) return null
  return (
    <Card className="mb-6">
      <p className="uppercase tracking-wide text-xs mb-3 text-muted">Class pass follow-ups</p>
      {rows.map(r => {
        const dates = [
          `ended ${fullDate(r.pass_end_date)}${r.credits_left !== null ? ` with ${credits(r.credits_left)} left` : ''}`,
          r.email_sent_on ? `email sent ${fullDate(r.email_sent_on)}` : null,
          r.followup_due_on && r.status !== 'closed' ? `follow-up due ${fullDate(r.followup_due_on)}` : null,
          r.closed_at ? `closed ${fullDate(r.closed_at)}` : null,
        ].filter(Boolean)
        return (
          <div key={r.id} className="py-2 border-b border-card-border last:border-0 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-medium text-heading">{r.pass_name ?? 'Class pass'}</span>
              <span className="text-xs font-medium text-heading">
                {r.status === 'closed'
                  ? `${OUTCOME[r.outcome ?? ''] ?? 'Closed'}${r.closed_automatically ? ' (closed by itself)' : ''}`
                  : STEP[r.status]}
              </span>
            </div>
            <p className="text-xs text-muted">
              {r.days_offered !== null ? `${r.days_offered} ${r.days_offered === 1 ? 'day' : 'days'} offered. ` : ''}
              {dates.join(', ')}
            </p>
            {r.close_reason && <p className="text-xs text-muted">{r.close_reason}</p>}
            {r.note && <p className="text-xs text-body">Note: {r.note}</p>}
          </div>
        )
      })}
    </Card>
  )
}
