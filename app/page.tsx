import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import DashboardCharts from '@/components/charts/DashboardCharts'
import ExpiringPassesPanel from '@/components/ExpiringPassesPanel'
import PassListsPanel from '@/components/PassListsPanel'
import AwaitingPaymentPanel from '@/components/AwaitingPaymentPanel'
import { formatGBP } from '@/lib/utils'
import { fetchAll } from '@/lib/fetchAll'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import Collapsible from '@/components/ui/Collapsible'
import { londonToday } from '@/lib/passRenewals'

export const dynamic = 'force-dynamic'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function formatUKDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'never'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoString))
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

// Returns the current year and month (0-indexed) as seen in the Europe/London timezone.
// Using Intl.DateTimeFormat avoids any dependency on the machine's local timezone.
function londonYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const year = Number(parts.find(p => p.type === 'year')!.value)
  const month = Number(parts.find(p => p.type === 'month')!.value) - 1 // convert to 0-indexed
  return { year, month }
}

async function fetchDashboardData() {
  const supabase = createServerClient()
  const now = new Date()

  // Build all date boundaries from the London calendar date so they are
  // identical whether the server runs in UTC or BST.
  // Date.UTC handles month overflow (e.g. month 12 or month -2) correctly.
  const { year: londonYear, month: londonMonth } = londonYearMonth(now)
  const firstOfMonth    = new Date(Date.UTC(londonYear, londonMonth,      1)).toISOString().split('T')[0]
  const firstOfYear     = new Date(Date.UTC(londonYear, 0,                1)).toISOString().split('T')[0]
  // Revenue counts purchases dated from the 1st up to and including today (London).
  // A purchase dated after today is a data error (the CRM dates by order date) and is
  // shown separately below the revenue cards, never added to the totals.
  const today = londonToday()
  const sevenDaysAgo = daysAgo(7)
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const twentyEightDaysAgo = daysAgo(28)
  const oneEightyDaysAgo = daysAgo(180)
  const elevenMonthsAgo = new Date(Date.UTC(londonYear, londonMonth - 11,  1)).toISOString().split('T')[0]

  const [
    { count: activeClients },
    { count: openLeads },
    { data: monthPurchases },
    { data: yearPurchases },
    { data: openLeadsData },
    attendance180,
    { data: clients },
    { data: chartMonthPurchases },
    { data: clientsData },
    { data: leadsData },
    { data: latestSync, error: latestSyncError },
    { data: webhookProblems, count: webhookProblemCount, error: webhookError },
    { data: futureRows, count: futureCount, error: futureError },
    { data: unmatchedRows, count: unmatchedCount, error: unmatchedError },
    { data: toSortRows, count: toSortCount, error: toSortError },
    { data: refundRows, error: refundError },
  ] = await Promise.all([
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('status', 'client'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'quoted']),
    supabase.from('purchases').select('amount_gbp, products(entity)').gte('purchase_date', firstOfMonth).lte('purchase_date', today),
    supabase.from('purchases').select('amount_gbp, products(entity)').gte('purchase_date', firstOfYear).lte('purchase_date', today),
    supabase.from('leads').select('id, last_followup_date, date_added, assigned_to, people(first_name, last_name)').in('status', ['new', 'contacted', 'quoted']),
    fetchAll<{ person_id: string; class_date: string }>(
      () => supabase
        .from('attendance_v2')
        .select('person_id, class_date')
        .gte('class_date', oneEightyDaysAgo)
        .eq('cancelled', false)
        .eq('duplicate_of_momence', false)
        .not('person_id', 'is', null)
    ),
    supabase.from('people').select('id, first_name, last_name').eq('status', 'client'),
    supabase.from('purchases').select('amount_gbp, products(category)').gte('purchase_date', firstOfMonth).lte('purchase_date', today),
    // New Clients line: each client dated by first purchase, else first class, else load date
    // (view client_first_activity, supabase/migrations/005_client_first_activity.sql)
    supabase.from('client_first_activity').select('became_client').gte('became_client', elevenMonthsAgo),
    supabase.from('leads').select('date_added').gte('date_added', elevenMonthsAgo),
    supabase.from('sync_runs').select('status,finished_at,error,started_at').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('webhook_log').select('created_at, source, event_type, status, error_message', { count: 'exact' }).in('status', ['failed', 'skipped']).gte('created_at', sevenDaysAgoIso).order('created_at', { ascending: false }).limit(20),
    supabase.from('purchases').select('id, person_id, purchase_date, amount_gbp, people(first_name, last_name), products(name)', { count: 'exact' }).gt('purchase_date', today).order('purchase_date', { ascending: true }).limit(500),
    // Training plan instalments that could not be matched to an order
    // (table training_payments, supabase/migrations/007_training_instalments.sql)
    supabase.from('training_payments').select('id, paid_at, created_at, amount_gbp, order_ref, note', { count: 'exact' }).eq('status', 'unmatched').order('created_at', { ascending: false }).limit(50),
    // Payment-link sales waiting to be sorted, and refunds: unmatched ones stay until fixed,
    // the rest show for 30 days (supabase/migrations/008_payment_link_sales.sql)
    supabase.from('payment_link_payments').select('id, paid_at, amount_gbp, amount_original, currency, description, note', { count: 'exact' }).eq('status', 'to_sort').order('paid_at', { ascending: false }).limit(50),
    supabase.from('payment_link_refunds').select('id, refunded_at, updated_at, refunded_original, currency, status, kept_gbp, note').or(`status.eq.unmatched,updated_at.gte.${thirtyDaysAgoIso}`).order('updated_at', { ascending: false }).limit(100),
  ])

  // Summary
  let revenueThisMonth = 0
  let revenueThisMonthLR = 0
  let revenueThisMonthTTL = 0
  for (const p of monthPurchases ?? []) {
    const amt = Number(p.amount_gbp ?? 0)
    const prod = p.products as unknown as { entity: string } | null
    revenueThisMonth += amt
    if (prod?.entity === 'Laurent Roure') revenueThisMonthLR += amt
    else if (prod?.entity === 'Terra Training Ltd') revenueThisMonthTTL += amt
  }
  let revenueThisYear = 0
  let revenueThisYearLR = 0
  let revenueThisYearTTL = 0
  for (const p of yearPurchases ?? []) {
    const amt = Number(p.amount_gbp ?? 0)
    const prod = p.products as unknown as { entity: string } | null
    revenueThisYear += amt
    if (prod?.entity === 'Laurent Roure') revenueThisYearLR += amt
    else if (prod?.entity === 'Terra Training Ltd') revenueThisYearTTL += amt
  }

  // Stale leads
  const staleLeads = (openLeadsData ?? [])
    .filter(lead => {
      if (!lead.last_followup_date) return lead.date_added <= sevenDaysAgo
      return lead.last_followup_date <= sevenDaysAgo
    })
    .sort((a, b) => {
      if (!a.last_followup_date && !b.last_followup_date) return a.date_added.localeCompare(b.date_added)
      if (!a.last_followup_date) return -1
      if (!b.last_followup_date) return 1
      return a.last_followup_date.localeCompare(b.last_followup_date)
    })
    .slice(0, 20)

  // Gone quiet
  const byPerson: Record<string, { recent: number; older: number }> = {}
  for (const a of attendance180) {
    if (!byPerson[a.person_id]) byPerson[a.person_id] = { recent: 0, older: 0 }
    if (a.class_date >= twentyEightDaysAgo) {
      byPerson[a.person_id].recent++
    } else {
      byPerson[a.person_id].older++
    }
  }
  const goneQuiet = (clients ?? [])
    .filter(c => {
      const att = byPerson[c.id]
      return att && att.older > 0 && att.recent < 2
    })
    .sort((a, b) => (a.last_name ?? '').localeCompare(b.last_name ?? ''))
    .slice(0, 20)

  // Category revenue chart
  const categoryMap: Record<string, number> = {}
  for (const p of chartMonthPurchases ?? []) {
    const prod = p.products as unknown as { category: string } | null
    const cat = prod?.category ?? 'other'
    categoryMap[cat] = (categoryMap[cat] ?? 0) + Number(p.amount_gbp ?? 0)
  }
  const categoryRevenue = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // Trend chart
  const trend: Array<{ month: string; new_clients: number; new_leads: number }> = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(londonYear, londonMonth - i, 1)
    trend.push({ month: monthLabel(d.getFullYear(), d.getMonth()), new_clients: 0, new_leads: 0 })
  }
  for (const c of clientsData ?? []) {
    const [yr, mo] = (c.became_client as string).split('-').map(Number)
    const label = monthLabel(yr, mo - 1)
    const entry = trend.find(m => m.month === label)
    if (entry) entry.new_clients++
  }
  for (const l of leadsData ?? []) {
    const [yr, mo] = (l.date_added as string).split('-').map(Number)
    const label = monthLabel(yr, mo - 1)
    const entry = trend.find(m => m.month === label)
    if (entry) entry.new_leads++
  }

  // Purchases dated after today
  type FutureRow = {
    id: string
    person_id: string | null
    purchase_date: string
    amount_gbp: number | string | null
    people: { first_name: string | null; last_name: string | null } | null
    products: { name: string | null } | null
  }
  const futureList = ((futureRows ?? []) as unknown as FutureRow[]).map(r => ({
    id: r.id,
    personId: r.person_id,
    name: [r.people?.first_name, r.people?.last_name].filter(Boolean).join(' ') || 'Unknown client',
    product: r.products?.name ?? 'Unknown product',
    date: r.purchase_date,
    amount: Number(r.amount_gbp ?? 0),
  }))

  return {
    summary: { activeClients: activeClients ?? 0, openLeads: openLeads ?? 0, revenueThisMonth, revenueThisMonthLR, revenueThisMonthTTL, revenueThisYear, revenueThisYearLR, revenueThisYearTTL },
    staleLeads,
    goneQuiet,
    categoryRevenue,
    trend,
    latestSync: latestSync as { status: string; finished_at: string | null; error: string | null; started_at: string } | null,
    // true if the sync_runs read failed, so the page never shows a false "no sync yet"
    latestSyncUnavailable: !!latestSyncError,
    // ok is false if the check could not be read, so the page never shows a false 0
    webhookCheck: {
      ok: !webhookError && webhookProblemCount !== null,
      count: webhookProblemCount ?? 0,
      rows: (webhookProblems ?? []) as { created_at: string; source: string; event_type: string; status: string; error_message: string | null }[],
    },
    // ok is false if the check could not be read, so the page never shows a false 0
    unmatchedCheck: {
      ok: !unmatchedError && unmatchedCount !== null,
      count: unmatchedCount ?? 0,
      rows: (unmatchedRows ?? []) as { id: string; paid_at: string | null; created_at: string; amount_gbp: number | string; order_ref: string | null; note: string | null }[],
    },
    // ok is false if the check could not be read, so the page never shows a false 0
    paymentLinkCheck: (() => {
      type RefundRow = { id: string; refunded_at: string | null; updated_at: string; refunded_original: number | string; currency: string | null; status: string; kept_gbp: number | string | null; note: string | null }
      const refunds = (refundRows ?? []) as RefundRow[]
      const unmatchedRefunds = refunds.filter(r => r.status === 'unmatched')
      return {
        ok: !toSortError && toSortCount !== null && !refundError,
        toSortCount: toSortCount ?? 0,
        toSortRows: (toSortRows ?? []) as { id: string; paid_at: string; amount_gbp: number | string | null; amount_original: number | string | null; currency: string | null; description: string | null; note: string | null }[],
        unmatchedRefunds,
        recentRefunds: refunds.filter(r => r.status !== 'unmatched' && r.updated_at >= thirtyDaysAgoIso),
      }
    })(),
    // ok is false if the check could not be read, so the page never hides a problem
    futureCheck: {
      ok: !futureError && futureCount !== null,
      count: futureCount ?? 0,
      total: futureList.reduce((sum, r) => sum + r.amount, 0),
      rows: futureList,
    },
  }
}

export default async function DashboardPage() {
  const { summary, staleLeads, goneQuiet, categoryRevenue, trend, latestSync, latestSyncUnavailable, webhookCheck, unmatchedCheck, paymentLinkCheck, futureCheck } = await fetchDashboardData()

  const dotColor = latestSyncUnavailable
    ? 'var(--color-amber-vivid)'
    : !latestSync
    ? 'var(--color-muted)'
    : latestSync.status === 'success'
    ? 'var(--color-green-vivid)'
    : latestSync.status === 'failed'
    ? 'var(--color-red-vivid)'
    : 'var(--color-amber-vivid)'

  return (
    <div>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Link href="/leads/new" className="btn-secondary">Add Lead</Link>
            <Link href="/clients/new" className="btn-primary">Add Client</Link>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Clients" value={summary.activeClients} />
        <KpiCard label="Open Leads" value={summary.openLeads} />
        <KpiCard label="Revenue This Month" value={formatGBP(summary.revenueThisMonth)}>
          <div className="mt-2 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-xs text-muted">Laurent Roure</span>
              <span className="text-xs font-medium text-muted">{formatGBP(summary.revenueThisMonthLR)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted">Terra Training Ltd</span>
              <span className="text-xs font-medium text-muted">{formatGBP(summary.revenueThisMonthTTL)}</span>
            </div>
          </div>
        </KpiCard>
        <KpiCard label="Revenue This Year" value={formatGBP(summary.revenueThisYear)}>
          <div className="mt-2 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-xs text-muted">Laurent Roure</span>
              <span className="text-xs font-medium text-muted">{formatGBP(summary.revenueThisYearLR)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted">Terra Training Ltd</span>
              <span className="text-xs font-medium text-muted">{formatGBP(summary.revenueThisYearTTL)}</span>
            </div>
          </div>
        </KpiCard>
      </div>

      {/* Purchases dated after today: a data error, shown so it gets fixed */}
      {!futureCheck.ok ? (
        <div className="card flex items-center gap-3 p-4 mb-6">
          <span className="w-2.5 h-2.5 flex-shrink-0 rounded-full" style={{ background: 'var(--color-amber-vivid)' }} />
          <p className="text-sm text-body">Check for purchases dated after today unavailable</p>
        </div>
      ) : futureCheck.count > 0 ? (
        <div className="mb-6">
          <Collapsible
            title={`${futureCheck.count === 1 ? 'Purchase' : 'Purchases'} dated after today (${formatGBP(futureCheck.total)}), check the dates`}
            count={futureCheck.count}
            tone="warning"
          >
            <ul className="space-y-2 text-sm text-body">
              {futureCheck.rows.map(r => (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-card-border pb-2 last:border-0">
                  <span>
                    {r.personId ? (
                      <Link href={`/clients/${r.personId}`} className="font-medium text-heading underline">{r.name}</Link>
                    ) : (
                      <span className="font-medium text-heading">{r.name}</span>
                    )}
                    <span className="block text-xs text-muted">{r.product}</span>
                  </span>
                  <span className="text-xs text-muted">
                    {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${r.date}T00:00:00Z`))}, {formatGBP(r.amount)}
                  </span>
                </li>
              ))}
              {futureCheck.count > futureCheck.rows.length && (
                <li className="text-xs text-muted">Showing the first {futureCheck.rows.length}; the total above covers only those.</li>
              )}
            </ul>
          </Collapsible>
        </div>
      ) : null}

      {/* Alert panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Collapsible
          title="Stale Leads"
          count={staleLeads.length}
          tone={staleLeads.length > 0 ? 'warning' : 'neutral'}
        >
          {staleLeads.length === 0 ? (
            <p className="text-sm text-muted">Nothing to action.</p>
          ) : (
            staleLeads.map(lead => {
              const person = lead.people as unknown as { first_name: string; last_name: string } | null
              const days = daysSince(lead.last_followup_date ?? lead.date_added)
              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between py-2 border-b border-card-border last:border-0 hover:bg-grey-subtle -mx-1 px-1 rounded"
                >
                  <span className="text-sm font-medium text-heading">
                    {person?.first_name} {person?.last_name}
                  </span>
                  <span className="text-xs text-muted ml-2">{days}d ago</span>
                </Link>
              )
            })
          )}
        </Collapsible>

        <Collapsible
          title="Gone Quiet"
          count={goneQuiet.length}
          tone={goneQuiet.length > 0 ? 'warning' : 'neutral'}
        >
          {goneQuiet.length === 0 ? (
            <p className="text-sm text-muted">Nothing to action.</p>
          ) : (
            goneQuiet.map(client => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center py-2 border-b border-card-border last:border-0 hover:bg-grey-subtle -mx-1 px-1 rounded"
              >
                <span className="text-sm font-medium text-heading">
                  {client.first_name} {client.last_name}
                </span>
              </Link>
            ))
          )}
        </Collapsible>

        <ExpiringPassesPanel />
        <PassListsPanel />
        <AwaitingPaymentPanel />
      </div>

      {/* Charts */}
      <DashboardCharts categoryRevenue={categoryRevenue} trend={trend} />

      {/* System status, kept below the information cards */}
      <div className="mt-6">
        {/* Momence sync status */}
        <div className="card flex items-center gap-3 p-4 mb-3">
          <span
            className="w-2.5 h-2.5 flex-shrink-0 rounded-full"
            style={{ background: dotColor }}
          />
          <p className="text-sm text-body">
            {latestSyncUnavailable
              ? 'Momence status unavailable'
              : latestSync
              ? <>
                  Momence copy: last run{' '}
                  {formatUKDateTime(latestSync.finished_at ?? latestSync.started_at)},{' '}
                  {latestSync.status === 'success' ? 'Success' : latestSync.status === 'failed' ? 'Failed' : latestSync.status}
                  {latestSync.status === 'failed' && latestSync.error && ` — ${latestSync.error}`}
                </>
              : 'Momence copy: no sync yet'
            }
          </p>
        </div>

        {/* Webhook problems, last 7 days */}
        <div className="card flex items-center gap-3 p-4 mb-6">
          <span
            className="w-2.5 h-2.5 flex-shrink-0 rounded-full"
            style={{
              background: !webhookCheck.ok
                ? 'var(--color-amber-vivid)'
                : webhookCheck.count === 0
                ? 'var(--color-green-vivid)'
                : 'var(--color-red-vivid)',
            }}
          />
          <p className="text-sm text-body">
            {!webhookCheck.ok
              ? 'Webhook check unavailable'
              : webhookCheck.count === 0
              ? 'Webhooks: no problems in the last 7 days'
              : `Webhooks: ${webhookCheck.count} failed or skipped in the last 7 days`}
          </p>
        </div>

        {webhookCheck.ok && webhookCheck.count > 0 && (
          <div className="mb-6">
            <Collapsible title="Webhook problems" count={webhookCheck.count} tone="danger">
              <ul className="space-y-2 px-4 pb-4 text-sm text-body md:px-5">
                {webhookCheck.rows.map((r, i) => (
                  <li key={i}>
                    {formatUKDateTime(r.created_at)}, {r.source}, {r.event_type}, {r.status}
                    {r.error_message && <span className="block text-xs text-muted">{r.error_message}</span>}
                  </li>
                ))}
                {webhookCheck.count > webhookCheck.rows.length && (
                  <li className="text-xs text-muted">Showing latest {webhookCheck.rows.length}</li>
                )}
              </ul>
            </Collapsible>
          </div>
        )}

        {/* Training plan instalments not matched to an order (stays until fixed, not just 7 days) */}
        <div className="card flex items-center gap-3 p-4 mb-6">
          <span
            className="w-2.5 h-2.5 flex-shrink-0 rounded-full"
            style={{
              background: !unmatchedCheck.ok
                ? 'var(--color-amber-vivid)'
                : unmatchedCheck.count === 0
                ? 'var(--color-green-vivid)'
                : 'var(--color-red-vivid)',
            }}
          />
          <p className="text-sm text-body">
            {!unmatchedCheck.ok
              ? 'Instalment check unavailable'
              : unmatchedCheck.count === 0
              ? 'Training instalments: all matched to an order'
              : `Instalments not matched to an order: ${unmatchedCheck.count}`}
          </p>
        </div>

        {unmatchedCheck.ok && unmatchedCheck.count > 0 && (
          <div className="mb-6">
            <Collapsible title="Instalments not matched" count={unmatchedCheck.count} tone="danger">
              <ul className="space-y-2 px-4 pb-4 text-sm text-body md:px-5">
                {unmatchedCheck.rows.map(r => (
                  <li key={r.id}>
                    {formatUKDateTime(r.paid_at ?? r.created_at)}, {formatGBP(Number(r.amount_gbp ?? 0))}, {r.order_ref ?? 'no orderRef'}
                    {r.note && <span className="block text-xs text-muted">{r.note}</span>}
                  </li>
                ))}
                {unmatchedCheck.count > unmatchedCheck.rows.length && (
                  <li className="text-xs text-muted">Showing latest {unmatchedCheck.rows.length}</li>
                )}
              </ul>
            </Collapsible>
          </div>
        )}
        {/* Payment-link sales waiting to be sorted, and refunds (stays until fixed, not just 7 days) */}
        {(() => {
          const toSort = paymentLinkCheck.toSortCount + paymentLinkCheck.unmatchedRefunds.length
          const refundLabel: Record<string, string> = {
            applied: 'purchase lowered',
            waiting: 'waiting for its sale to be sorted',
            not_counted: 'part payment, nothing changed',
          }
          return (
            <>
              <div className="card flex items-center gap-3 p-4 mb-6">
                <span
                  className="w-2.5 h-2.5 flex-shrink-0 rounded-full"
                  style={{
                    background: !paymentLinkCheck.ok
                      ? 'var(--color-amber-vivid)'
                      : toSort === 0
                      ? 'var(--color-green-vivid)'
                      : 'var(--color-red-vivid)',
                  }}
                />
                <p className="text-sm text-body">
                  {!paymentLinkCheck.ok
                    ? 'Payment-link check unavailable'
                    : toSort === 0
                    ? 'Payment-link sales: nothing to sort'
                    : `Payment-link sales to sort: ${toSort}`}
                </p>
              </div>

              {paymentLinkCheck.ok && toSort > 0 && (
                <div className="mb-6">
                  <Collapsible title="Payment-link sales to sort" count={toSort} tone="danger">
                    <ul className="space-y-2 px-4 pb-4 text-sm text-body md:px-5">
                      {paymentLinkCheck.toSortRows.map(r => (
                        <li key={r.id}>
                          {formatUKDateTime(r.paid_at)},{' '}
                          {r.amount_gbp !== null
                            ? formatGBP(Number(r.amount_gbp))
                            : `${r.amount_original ?? '?'} ${(r.currency ?? '').toUpperCase()}`}
                          , {r.description ?? 'no description'}
                          {r.note && <span className="block text-xs text-muted">{r.note}</span>}
                        </li>
                      ))}
                      {paymentLinkCheck.toSortCount > paymentLinkCheck.toSortRows.length && (
                        <li className="text-xs text-muted">Showing latest {paymentLinkCheck.toSortRows.length} sales</li>
                      )}
                      {paymentLinkCheck.unmatchedRefunds.map(r => (
                        <li key={r.id}>
                          Refund {formatUKDateTime(r.refunded_at ?? r.updated_at)}, {r.refunded_original} {(r.currency ?? '').toUpperCase()} in total
                          {r.note && <span className="block text-xs text-muted">{r.note}</span>}
                        </li>
                      ))}
                    </ul>
                  </Collapsible>
                </div>
              )}

              {paymentLinkCheck.ok && paymentLinkCheck.recentRefunds.length > 0 && (
                <div className="mb-6">
                  <Collapsible title="Payment-link refunds, last 30 days" count={paymentLinkCheck.recentRefunds.length} tone="warning">
                    <ul className="space-y-2 px-4 pb-4 text-sm text-body md:px-5">
                      {paymentLinkCheck.recentRefunds.map(r => (
                        <li key={r.id}>
                          {formatUKDateTime(r.refunded_at ?? r.updated_at)}, {r.refunded_original} {(r.currency ?? '').toUpperCase()} refunded in total,{' '}
                          {refundLabel[r.status] ?? r.status}
                          {r.status === 'applied' && r.kept_gbp !== null && <> (kept {formatGBP(Number(r.kept_gbp))})</>}
                        </li>
                      ))}
                    </ul>
                  </Collapsible>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
