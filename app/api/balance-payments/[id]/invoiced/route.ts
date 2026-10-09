import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Done button on the dashboard's "Invoice to raise" list: marks a Stripe balance payment
 * as invoiced (balance_payments.invoice_raised_at, migration 011). Behind the login.
 * Ticking twice changes nothing.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('balance_payments')
    .update({ invoice_raised_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('invoice_raised_at', null)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    const { data: row } = await supabase.from('balance_payments').select('id').eq('id', id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
    return NextResponse.json({ ok: true, already: true })
  }

  return NextResponse.json({ ok: true })
}
