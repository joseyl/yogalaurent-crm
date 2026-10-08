import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { formatGBP } from '@/lib/utils'

/**
 * Records a payment against an order (bank transfer, card, cash, other).
 * Goes through the locked database step record_order_payment (migration 010), which
 * saves the payment, adds it to amount paid, and refuses more than is still owed.
 * Behind the login.
 */

const METHODS = ['bank_transfer', 'card', 'cash', 'other'] as const

interface RpcResult {
  result: string
  payment_id?: string
  started_from_blank?: boolean
  amount_paid?: number | string | null
  outstanding?: number | string | null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  let body: { amount?: unknown; paid_on?: unknown; method?: unknown; note?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount)
  const paidOn = typeof body.paid_on === 'string' ? body.paid_on : ''
  const method = typeof body.method === 'string' ? body.method : ''
  const note = typeof body.note === 'string' ? body.note : null

  if (!isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Enter an amount above 0.' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
    return NextResponse.json({ error: 'Choose the date the payment was made.' }, { status: 400 })
  }
  if (!(METHODS as readonly string[]).includes(method)) {
    return NextResponse.json({ error: 'Choose how it was paid.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('record_order_payment', {
    p_purchase_id: id,
    p_amount: amount,
    p_paid_on: paidOn,
    p_method: method,
    p_note: note,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const r = data as RpcResult
  const outstanding = r.outstanding == null ? null : Number(r.outstanding)

  switch (r.result) {
    case 'recorded':
      return NextResponse.json({
        payment: {
          id: r.payment_id,
          amount_gbp: amount,
          paid_on: paidOn,
          method,
          note: note && note.trim() ? note.trim() : null,
        },
        amount_paid: r.amount_paid == null ? null : Number(r.amount_paid),
        outstanding,
      }, { status: 201 })
    case 'too_much':
      return NextResponse.json({
        error: `That is more than is still owed. Only ${formatGBP(outstanding ?? 0)} is owed on this order.`,
        outstanding,
      }, { status: 400 })
    case 'paid_in_full':
      return NextResponse.json({ error: 'This order is already paid in full.', outstanding: 0 }, { status: 400 })
    case 'nothing_owed':
      return NextResponse.json({ error: 'This order is at £0 or below, so there is nothing to pay.' }, { status: 400 })
    case 'bad_amount':
      return NextResponse.json({ error: 'Enter an amount above 0, in pounds and pence.' }, { status: 400 })
    case 'bad_method':
      return NextResponse.json({ error: 'Choose how it was paid.' }, { status: 400 })
    case 'bad_date':
      return NextResponse.json({ error: 'Choose the date the payment was made.' }, { status: 400 })
    case 'future_date':
      return NextResponse.json({ error: 'The payment date cannot be after today.' }, { status: 400 })
    case 'not_found':
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    default:
      return NextResponse.json({ error: `Unexpected result: ${r.result}` }, { status: 500 })
  }
}
