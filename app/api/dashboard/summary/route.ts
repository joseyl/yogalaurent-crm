import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()
  const now = new Date()

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
  const firstOfYear = `${now.getFullYear()}-01-01`
  const firstOfNextYear = `${now.getFullYear() + 1}-01-01`

  const [
    { count: activeClients },
    { count: openLeads },
    { data: monthPurchases },
    { data: yearPurchases },
  ] = await Promise.all([
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('status', 'client'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'quoted']),
    supabase.from('purchases').select('amount_gbp').gte('purchase_date', firstOfMonth).lt('purchase_date', firstOfNextMonth),
    supabase.from('purchases').select('amount_gbp').gte('purchase_date', firstOfYear).lt('purchase_date', firstOfNextYear),
  ])

  const revenueThisMonth = (monthPurchases ?? []).reduce((s, p) => s + Number(p.amount_gbp ?? 0), 0)
  const revenueThisYear = (yearPurchases ?? []).reduce((s, p) => s + Number(p.amount_gbp ?? 0), 0)

  return NextResponse.json({
    activeClients: activeClients ?? 0,
    openLeads: openLeads ?? 0,
    revenueThisMonth,
    revenueThisYear,
  })
}
