import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Refunds of Stripe balance payments (message 6 of the site-to-CRM rulebook).
 *
 * The message carries the running total refunded on the payment, so a repeat is
 * harmless. The database function record_balance_refund
 * (supabase/migrations/011_balance_payments.sql) lowers the order's amount paid by the
 * change in that total; the order total is never touched. A refund whose payment has
 * not arrived or is not matched yet waits and is applied when it is matched.
 */

const SOURCE = 'yogalaurent'
const EVENT = 'balance_refund'

export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'balance-refund' })
}

type LogStatus = 'success' | 'failed' | 'skipped'

async function log(status: LogStatus, payload: unknown, message?: string) {
  await supabaseAdmin.from('webhook_log').insert({
    source: SOURCE,
    event_type: EVENT,
    payload: payload as Record<string, unknown>,
    status,
    error_message: message ?? null,
  })
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function amountOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!validateWebhookSecret(request)) {
    await log('failed', payload, 'Invalid webhook secret')
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const stripePaymentId = text(payload.stripePaymentId)
  const orderRef = text(payload.orderRef).toUpperCase()
  const refundedTotal = amountOrNull(payload.amountRefundedGBP)
  const refundedAtRaw = text(payload.refundedAt)
  const refundedAt = refundedAtRaw && !isNaN(new Date(refundedAtRaw).getTime())
    ? new Date(refundedAtRaw).toISOString()
    : new Date().toISOString()
  const label = `${orderRef || 'no orderRef'} (${stripePaymentId || 'no stripePaymentId'})`

  if (!stripePaymentId) {
    await log('failed', payload, `Balance refund without stripePaymentId (${label})`)
    return NextResponse.json({ error: 'No stripePaymentId' }, { status: 400 })
  }
  if (refundedTotal === null || refundedTotal <= 0) {
    await log('failed', payload, `Invalid refund amount for ${label}`)
    return NextResponse.json({ error: 'Invalid amountRefundedGBP' }, { status: 400 })
  }

  const { data: result, error } = await supabaseAdmin.rpc('record_balance_refund', {
    p_stripe_payment_id: stripePaymentId,
    p_order_ref: orderRef || null,
    p_refund_id: text(payload.stripeRefundId) || null,
    p_refunded_total: refundedTotal,
    p_refunded_at: refundedAt,
    p_email: text(payload.email).toLowerCase() || null,
  })

  if (error) {
    await log('failed', payload, `Balance refund ${label} not recorded: ${error.message}`)
    return NextResponse.json({ error: 'Refund not recorded' }, { status: 500 })
  }

  switch (result as string) {
    case 'applied':
    case 'applied_full':
      await log('success', payload, `WARNING: balance refund of ${refundedTotal.toFixed(2)} in total on ${label}. Amount paid lowered; order total unchanged.`)
      break
    case 'waiting':
      await log('success', payload, `Balance refund on ${label} saved. Its payment is not matched yet; applied when it is.`)
      break
    case 'duplicate':
      await log('skipped', payload, `Balance refund on ${label} already recorded`)
      break
    case 'bad_message':
      await log('failed', payload, `Balance refund ${label} refused: bad message`)
      return NextResponse.json({ error: 'Bad message' }, { status: 400 })
    default:
      await log('failed', payload, `Balance refund on ${label} could not be applied (${result}). Check by hand.`)
  }

  return NextResponse.json({ ok: true, result })
}
