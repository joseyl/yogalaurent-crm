import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const in15Days = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  const minus30Days = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('purchases')
    .select(`
      id,
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

  return NextResponse.json({ passes: data || [] })
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
