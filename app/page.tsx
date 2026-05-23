import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import DashboardCharts from '@/components/charts/DashboardCharts'
import ExpiringPassesPanel from '@/components/ExpiringPassesPanel'
import { formatGBP } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

async function fetchDashboardData() {
  const supabase = createServerClient()
  const now = new Date()

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
  const firstOfYear = `${now.getFullYear()}-01-01`
  const firstOfNextYear = `${now.getFullYear() + 1}-01-01`
  const sevenDaysAgo = daysAgo(7)
  const twentyEightDaysAgo = daysAgo(28)
  const oneEightyDaysAgo = daysAgo(180)
  const elevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0]

  const [
    { count: activeClients },
    { count: openLeads },
    { data: monthPurchases },
    { data: yearPurchases },
    { data: openLeadsData },
    { data: attendance180 },
    { data: clients },
    { data: chartMonthPurchases },
    { data: clientsData },
    { data: leadsData },
  ] = await Promise.all([
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('status', 'client'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'quoted']),
    supabase.from('purchases').select('amount_gbp, products(entity)').gte('purchase_date', firstOfMonth).lt('purchase_date', firstOfNextMonth),
    supabase.from('purchases').select('amount_gbp, products(entity)').gte('purchase_date', firstOfYear).lt('purchase_date', firstOfNextYear),
    supabase.from('leads').select('id, last_followup_date, date_added, assigned_to, people(first_name, last_name)').in('status', ['new', 'contacted', 'quoted']),
    supabase.from('attendance').select('person_id, class_date').gte('class_date', oneEightyDaysAgo),
    supabase.from('people').select('id, first_name, last_name').eq('status', 'client'),
    supabase.from('purchases').select('amount_gbp, products(category)').gte('purchase_date', firstOfMonth).lt('purchase_date', firstOfNextMonth),
    supabase.from('people').select('created_at').eq('status', 'client').gte('created_at', elevenMonthsAgo),
    supabase.from('leads').select('date_added').gte('date_added', elevenMonthsAgo),
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
  for (const a of attendance180 ?? []) {
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
  }
}

export default async function DashboardPage() {
  const { summary, staleLeads, goneQuiet, categoryRevenue, trend } = await fetchDashboardData()

  return (
    <div className="pb-24">
      <h1
        className="font-bold"
        style={{ fontSize: '24px', color: '#1A2C4E', padding: '24px 24px 16px' }}
      >
        Dashboard
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 px-4">
        <SummaryCard label="Active Clients" value={summary.activeClients.toString()} />
        <SummaryCard label="Open Leads" value={summary.openLeads.toString()} />
        <RevenueMonthCard total={summary.revenueThisMonth} lr={summary.revenueThisMonthLR} ttl={summary.revenueThisMonthTTL} />
        <RevenueYearCard total={summary.revenueThisYear} lr={summary.revenueThisYearLR} ttl={summary.revenueThisYearTTL} />
      </div>

      {/* Charts */}
      <DashboardCharts categoryRevenue={categoryRevenue} trend={trend} />

      {/* Alert panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 mt-6">
        <AlertPanel title="Stale Leads">
          {staleLeads.length === 0 ? (
            <p className="text-gray-400 italic text-sm">All clear</p>
          ) : (
            staleLeads.map(lead => {
              const person = lead.people as unknown as { first_name: string; last_name: string } | null
              const days = daysSince(lead.last_followup_date ?? lead.date_added)
              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1"
                >
                  <span className="text-sm font-medium text-[#1A2C4E]">
                    {person?.first_name} {person?.last_name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{days}d ago</span>
                </Link>
              )
            })
          )}
        </AlertPanel>

        <AlertPanel title="Gone Quiet">
          {goneQuiet.length === 0 ? (
            <p className="text-gray-400 italic text-sm">All clear</p>
          ) : (
            goneQuiet.map(client => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1"
              >
                <span className="text-sm font-medium text-[#1A2C4E]">
                  {client.first_name} {client.last_name}
                </span>
              </Link>
            ))
          )}
        </AlertPanel>

        <ExpiringPassesPanel />
      </div>

      {/* Quick-action buttons */}
      <div className="flex justify-center gap-3 mt-6 mb-6 px-4">
        <Link href="/clients/new" className="btn-primary">
          Add Client
        </Link>
        <Link href="/leads/new" className="btn-primary">
          Add Lead
        </Link>
      </div>
    </div>
  )
}

function RevenueYearCard({ total, lr, ttl }: { total: number; lr: number; ttl: number }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-sm p-5">
      <p className="uppercase tracking-wide text-xs" style={{ color: '#6b7280' }}>Revenue This Year</p>
      <p className="font-bold mt-1" style={{ fontSize: '28px', color: '#1A2C4E' }}>{formatGBP(total)}</p>
      <div className="mt-2 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: '#6b7280' }}>Laurent Roure</span>
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{formatGBP(lr)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: '#6b7280' }}>Terra Training Ltd</span>
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{formatGBP(ttl)}</span>
        </div>
      </div>
    </div>
  )
}

function RevenueMonthCard({ total, lr, ttl }: { total: number; lr: number; ttl: number }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-sm p-5">
      <p className="uppercase tracking-wide text-xs" style={{ color: '#6b7280' }}>Revenue This Month</p>
      <p className="font-bold mt-1" style={{ fontSize: '28px', color: '#1A2C4E' }}>{formatGBP(total)}</p>
      <div className="mt-2 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: '#6b7280' }}>Laurent Roure</span>
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{formatGBP(lr)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: '#6b7280' }}>Terra Training Ltd</span>
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{formatGBP(ttl)}</span>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-sm p-5">
      <p
        className="uppercase tracking-wide text-xs"
        style={{ color: '#6b7280' }}
      >
        {label}
      </p>
      <p
        className="font-bold mt-1"
        style={{ fontSize: '28px', color: '#1A2C4E' }}
      >
        {value}
      </p>
    </div>
  )
}

function AlertPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e5e7eb] border-l-4 border-l-[#B8540A] p-4">
      <h2 className="font-semibold mb-3" style={{ color: '#1A2C4E' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
