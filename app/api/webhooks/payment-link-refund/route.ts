import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Refunds of payment-link sales (Stripe charge.refunded on the Terra Training account).
 *
 * The message carries the running total refunded on the charge, so a repeat is harmless.
 * The database function record_payment_link_refund
 * (supabase/migrations/008_payment_link_sales.sql) sets the purchase to the amount kept.
 * A refund on a part payment changes nothing. A refund it cannot match is kept as
 * "unmatched" and shown on the dashboard.
 */

const SOURCE = 'yogalaurent'
const EVENT = 'payment_link_refund'

export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'payment-link-refund' })
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
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
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

  const paymentIntentId = text(payload.stripePaymentIntentId)
  const chargeId = text(payload.stripeChargeId)
  const refundId = text(payload.refundId)
  const currency = text(payload.currency).toLowerCase() || 'gbp'
  const chargeAmount = amountOrNull(payload.chargeAmountOriginal)
  const refundedTotal = amountOrNull(payload.amountRefundedOriginal)
  const refundedAtRaw = text(payload.refundedAt)
  const refundedAt = refundedAtRaw && !isNaN(new Date(refundedAtRaw).getTime())
    ? new Date(refundedAtRaw).toISOString()
    : new Date().toISOString()
  const label = paymentIntentId || chargeId || 'unknown'

  if (!paymentIntentId) {
    await log('failed', payload, `Payment-link refund without stripePaymentIntentId (${label})`)
    return NextResponse.json({ error: 'No stripePaymentIntentId' }, { status: 400 })
  }
  if (refundedTotal === null || refundedTotal <= 0 || chargeAmount === null || chargeAmount < 0) {
    await log('failed', payload, `Invalid refund amounts for ${label}`)
    return NextResponse.json({ error: 'Invalid refund amounts' }, { status: 400 })
  }

  const { data: result, error } = await supabaseAdmin.rpc('record_payment_link_refund', {
    p_payment_intent_id: paymentIntentId,
    p_charge_id: chargeId || null,
    p_refund_id: refundId || null,
    p_currency: currency,
    p_charge_amount: chargeAmount,
    p_refunded_total: refundedTotal,
    p_refunded_at: refundedAt,
  })

  if (error) {
    await log('failed', payload, `Refund ${label} not recorded: ${error.message}`)
    return NextResponse.json({ error: 'Refund not recorded' }, { status: 500 })
  }

  switch (result as string) {
    case 'applied':
    case 'applied_full':
      await log('success', payload, `WARNING: refund of ${refundedTotal} ${currency.toUpperCase()} in total on ${label}. Purchase lowered to the amount kept.`)
      break
    case 'not_counted':
      await log('success', payload, `Refund on ${label} is on a part payment or ignored link: nothing changed`)
      break
    case 'waiting':
      await log('success', payload, `Refund on ${label} saved. Its sale is still to sort; applied when it is.`)
      break
    case 'duplicate':
      await log('skipped', payload, `Refund on ${label} already recorded`)
      break
    default:
      await log('failed', payload, `Refund on ${label} could not be matched to a payment-link sale. See the dashboard.`)
  }

  return NextResponse.json({ ok: true, result })
}
