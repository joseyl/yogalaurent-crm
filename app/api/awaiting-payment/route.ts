import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Money still to collect.
 *
 * Two kinds of row show up here:
 *   awaiting  - a bank transfer or staff booking where nothing has arrived yet
 *   balance   - a deposit booking where the rest is still outstanding
 *
 * Monthly instalments are left out, because Stripe collects those on its own.
 * Rows created before the amount-paid field existed are left out too, because
 * we have no way of knowing what was collected on them.
 */

interface Row {
  id: string
  order_ref: string | null
  purchase_date: string
  balance_due_date: string | null
  amount_gbp: number | string | null
  amount_paid_gbp: number | string | null
  payment_option: string | null
  source: string | null
  people: { id: string; first_name: string | null; last_name: string | null; email: string } | null
  products: { name: string } | null
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('purchases')
    .select(`
      id,
      order_ref,
      purchase_date,
      balance_due_date,
      amount_gbp,
      amount_paid_gbp,
      payment_option,
      source,
      people ( id, first_name, last_name, email ),
      products ( name )
    `)
    .not('amount_paid_gbp', 'is', null)
    .order('purchase_date', { ascending: true })
    .limit(2000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = ((data ?? []) as unknown as Row[])
    .filter(r => {
      const total = Number(r.amount_gbp ?? 0)
      const paid = Number(r.amount_paid_gbp ?? 0)
      if (total <= 0) return false
      if (paid >= total) return false
      if (r.payment_option === 'instalments') return false
      return true
    })
    .map(r => {
      const total = Number(r.amount_gbp ?? 0)
      const paid = Number(r.amount_paid_gbp ?? 0)
      return {
        id: r.id,
        order_ref: r.order_ref,
        purchase_date: r.purchase_date,
        balance_due_date: r.balance_due_date,
        total,
        paid,
        outstanding: Math.round((total - paid) * 100) / 100,
        kind: paid === 0 ? 'awaiting' : 'balance',
        person: r.people,
        product: r.products?.name ?? null,
      }
    })

  const outstandingTotal = rows.reduce((sum, r) => sum + r.outstanding, 0)

  return NextResponse.json({ rows, outstandingTotal })
}

/** Marks a purchase as paid in full. */
export async function PATCH(request: Request) {
  let body: { purchaseId?: string; amountPaid?: number }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.purchaseId) {
    return NextResponse.json({ error: 'purchaseId is required' }, { status: 400 })
  }

  const { data: purchase, error: readError } = await supabaseAdmin
    .from('purchases')
    .select('amount_gbp')
    .eq('id', body.purchaseId)
    .single()

  if (readError || !purchase) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
  }

  const amountPaid =
    typeof body.amountPaid === 'number' && isFinite(body.amountPaid)
      ? body.amountPaid
      : Number(purchase.amount_gbp ?? 0)

  const { error } = await supabaseAdmin
    .from('purchases')
    .update({ amount_paid_gbp: amountPaid })
    .eq('id', body.purchaseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, amountPaid })
}
