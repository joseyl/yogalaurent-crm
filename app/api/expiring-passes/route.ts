import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClassPassPurchases } from '@/lib/passRenewals'

export const dynamic = 'force-dynamic'

export async function GET() {
  const in15Days = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  const minus30Days = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('purchases')
    .select(`
      id,
      person_id,
      expires_at,
      purchase_date,
      notes,
      expiry_alert_dismissed,
      people (
        id,
        first_name,
        last_name,
        email
      ),
      products (
        name
      )
    `)
    .eq('expiry_alert_dismissed', false)
    .not('expires_at', 'is', null)
    .gte('expires_at', minus30Days)
    .lte('expires_at', in15Days)
    .order('expires_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const passes = data || []

  // Hide a pass when the same person has bought another class pass (not a
  // drop-in) on or after this pass's purchase date. The pass's own purchase
  // never counts as its renewal.
  let classPurchases
  try {
    classPurchases = await getClassPassPurchases(
      passes.map(p => p.person_id as string).filter(Boolean),
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Renewal check failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const notRenewed = passes.filter(p => {
    if (!p.person_id) return true
    return !classPurchases.some(
      c => c.person_id === p.person_id && c.id !== p.id && c.purchase_date >= p.purchase_date,
    )
  })

  return NextResponse.json({ passes: notRenewed, hiddenAsRenewed: passes.length - notRenewed.length })
}

export async function PATCH(request: Request) {
  const { purchaseId } = await request.json()

  const { error } = await supabaseAdmin
    .from('purchases')
    .update({ expiry_alert_dismissed: true })
    .eq('id', purchaseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
