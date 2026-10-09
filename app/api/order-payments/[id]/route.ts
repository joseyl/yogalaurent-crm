import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Deletes a payment recorded by mistake and takes its amount back off the order's
 * amount paid (database step delete_order_payment, migration 010). Behind the login.
 * Stripe instalments are not in this table and cannot be deleted here. Stripe balance
 * payments (source stripe, migration 011) are refused by the database step.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('delete_order_payment', { p_payment_id: id })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const r = data as { result: string; amount_paid?: number | string | null; outstanding?: number | string | null }

  if (r.result === 'stripe_payment') {
    return NextResponse.json({ error: 'This is a Stripe payment. It cannot be deleted here; a refund in Stripe is applied automatically.' }, { status: 400 })
  }

  if (r.result === 'not_found') {
    return NextResponse.json({ error: 'Payment not found. It may already have been deleted.' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    amount_paid: r.amount_paid == null ? null : Number(r.amount_paid),
    outstanding: r.outstanding == null ? null : Number(r.outstanding),
  })
}
