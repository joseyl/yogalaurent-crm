import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import DashboardCharts from '@/components/charts/DashboardCharts'
import ExpiringPassesPanel from '@/components/ExpiringPassesPanel'
import AwaitingPaymentPanel from '@/components/AwaitingPaymentPanel'
import { formatGBP } from '@/lib/utils'
import { fetchAll } from '@/lib/fetchAll'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import Collapsible from '@/components/ui/Collapsible'

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
  const firstOfNextMonth = new Date(Date.UTC(londonYear, londonMonth + 1,  1)).toISOString().split('T')[0]
  const firstOfYear     = new Date(Date.UTC(londonYear, 0,                1)).toISOString().split('T')[0]
  const firstOfNextYear = new Date(Date.UTC(londonYear + 1, 0,            1)).toISOString().split('T')[0]
  const sevenDaysAgo = daysAgo(7)
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
    { data: latestSync },
  ] = await Promise.all([
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('status', 'client'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'quoted']),
    supabase.from('purchases').select('amount_gbp, products(entity)').gte('purchase_date', firstOfMonth).lt('purchase_date', firstOfNextMonth),
    supabase.from('purchases').select('amount_gbp, products(entity)').gte('purchase_date', firstOfYear).lt('purchase_date', firstOfNextYear),
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
    supabase.from('purchases').select('amount_gbp, products(category)').gte('purchase_date', firstOfMonth).lt('purchase_date', firstOfNextMonth),
    supabase.from('people').select('created_at').eq('status', 'client').gte('created_at', elevenMonthsAgo),
    supabase.from('leads').select('date_added').gte('date_added', elevenMonthsAgo),
    supabase.from('sync_runs').select('status,finished_at,error,created_at').order('id', { ascending: false }).limit(1).maybeSingle(),
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
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    trend.push({ month: monthLabel(d.getFullYear(), d.getMonth()), new_clients: 0, new_leads: 0 })
  }
  for (const c of clientsData ?? []) {
    const d = new Date(c.created_at)
    const label = monthLabel(d.getFullYear(), d.getMonth())
    const entry = trend.find(m => m.month === label)
    if (entry) entry.new_clients++
  }
  for (const l of leadsData ?? []) {
    const [yr, mo] = (l.date_added as string).split('-').map(Number)
    const label = monthLabel(yr, mo - 1)
    const entry = trend.find(m => m.month === label)
    if (entry) entry.new_leads++
  }

  return {
    summary: { activeClients: activeClients ?? 0, openLeads: openLeads ?? 0, revenueThisMonth, revenueThisMonthLR, revenueThisMonthTTL, revenueThisYear, revenueThisYearLR, revenueThisYearTTL },
    staleLeads,
    goneQuiet,
    categoryRevenue,
    trend,
    latestSync: latestSync as { status: string; finished_at: string | null; error: string | null; created_at: string } | null,
  }
}

export default async function DashboardPage() {
  const { summary, staleLeads, goneQuiet, categoryRevenue, trend, latestSync } = await fetchDashboardData()

  const dotColor = !latestSync
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

      {/* Momence sync status */}
      <div className="card flex items-center gap-3 p-4 mb-6">
        <span
          className="w-2.5 h-2.5 flex-shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
        <p className="text-sm text-body">
          {latestSync
            ? <>
                Momence copy: last run{' '}
                {formatUKDateTime(latestSync.finished_at ?? latestSync.created_at)},{' '}
                {latestSync.status === 'success' ? 'Success' : 'Failed'}
                {latestSync.status === 'failed' && latestSync.error && ` — ${latestSync.error}`}
              </>
            : 'Momence copy: no sync yet'
          }
        </p>
      </div>

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
        <AwaitingPaymentPanel />
      </div>

      {/* Charts */}
      <DashboardCharts categoryRevenue={categoryRevenue} trend={trend} />
    </div>
  )
}
