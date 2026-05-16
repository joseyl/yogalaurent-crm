import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

export async function GET() {
  const supabase = createServerClient()
  const now = new Date()

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
  const elevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0]

  const [
    { data: monthPurchases },
    { data: clientsData },
    { data: leadsData },
  ] = await Promise.all([
    supabase
      .from('purchases')
      .select('amount_gbp, products(category)')
      .gte('purchase_date', firstOfMonth)
      .lt('purchase_date', firstOfNextMonth),
    supabase
      .from('people')
      .select('created_at')
      .eq('status', 'client')
      .gte('created_at', elevenMonthsAgo),
    supabase
      .from('leads')
      .select('date_added')
      .gte('date_added', elevenMonthsAgo),
  ])

  // Chart 1: category revenue this month
  const categoryMap: Record<string, number> = {}
  for (const p of monthPurchases ?? []) {
    const products = p.products as unknown as { category: string } | null
    const cat = products?.category ?? 'other'
    categoryMap[cat] = (categoryMap[cat] ?? 0) + Number(p.amount_gbp ?? 0)
  }
  const categoryRevenue = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // Chart 2: trend — generate 12 month slots
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

  return NextResponse.json({ categoryRevenue, trend })
}
