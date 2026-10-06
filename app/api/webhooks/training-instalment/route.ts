import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Monthly payment plan instalments for teacher trainings.
 *
 * yogalaurent.com sends one message per paid Stripe plan charge (invoice) on the
 * Terra Training account. The database function record_training_instalment
 * (supabase/migrations/007_training_instalments.sql) does the rest in one locked step:
 * saves the charge once by its Stripe invoice id, finds the order by orderRef or by the
 * plan id saved on the order, and raises amount_paid_gbp, never above the order total.
 * Every plan charge is added, including the plan's first invoice: instalment 1 is a
 * separate checkout payment the training order already counted.
 * A charge it cannot match is kept as "unmatched" and shown on the dashboard.
 */

const SOURCE = 'yogalaurent'
const EVENT = 'training_instalment'

export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'training-instalment' })
}

type LogStatus = 'success' | 'failed' | 'skipped'

async function log(
  status: LogStatus,
  payload: unknown,
  message?: string,
  personId?: string | null,
) {
  await supabaseAdmin.from('webhook_log').insert({
    source: SOURCE,
    event_type: EVENT,
    payload: payload as Record<string, unknown>,
    status,
    person_id: personId ?? null,
    error_message: message ?? null,
  })
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Finds a person by email or alt_email. Never creates one. */
async function findPersonId(email: string): Promise<string | null> {
  if (!email) return null
  for (const field of ['email', 'alt_email'] as const) {
    const { data, error } = await supabaseAdmin.from('people').select('id').eq(field, email).limit(2)
    if (error) throw error
    if (data && data.length === 1) return data[0].id as string
    if (data && data.length > 1) return null
  }
  return null
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

  const invoiceId = text(payload.stripeInvoiceId)
  const subscriptionId = text(payload.stripeSubscriptionId)
  const orderRef = text(payload.orderRef)
  const email = text(payload.email).toLowerCase()
  const currency = text(payload.currency).toLowerCase() || 'gbp'
  const billingReason = text(payload.billingReason)
  const amount = Math.round(Number(payload.amountPaidGBP) * 100) / 100
  const paidAtRaw = text(payload.paidAt)
  const paidAt = paidAtRaw && !isNaN(new Date(paidAtRaw).getTime())
    ? new Date(paidAtRaw).toISOString()
    : new Date().toISOString()
  const label = orderRef || subscriptionId || invoiceId || 'unknown'

  if (!invoiceId) {
    await log('failed', payload, `No stripeInvoiceId in instalment payload (${label})`)
    return NextResponse.json({ error: 'No stripeInvoiceId' }, { status: 400 })
  }

  if (!isFinite(amount) || amount < 0) {
    await log('failed', payload, `Invalid amountPaidGBP for instalment ${invoiceId} (${label})`)
    return NextResponse.json({ error: 'Invalid amountPaidGBP' }, { status: 400 })
  }

  if (amount === 0) {
    await log('skipped', payload, `Instalment ${invoiceId} (${label}) has amount 0, nothing to record`)
    return NextResponse.json({ ok: true, result: 'zero_amount' })
  }

  let personId: string | null = null
  try {
    personId = await findPersonId(email)
  } catch (err) {
    const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
    await log('failed', payload, `Person lookup failed for instalment ${invoiceId} (${label}): ${message}`)
    return NextResponse.json({ error: 'Person lookup failed' }, { status: 500 })
  }

  const { data: result, error } = await supabaseAdmin.rpc('record_training_instalment', {
    p_invoice_id: invoiceId,
    p_subscription_id: subscriptionId || null,
    p_order_ref: orderRef || null,
    p_email: email || null,
    p_person_id: personId,
    p_amount: amount,
    p_currency: currency,
    p_paid_at: paidAt,
    p_billing_reason: billingReason || null,
  })

  if (error) {
    // 500 so the sender retries; the invoice id stops a retry being counted twice
    await log('failed', payload, `Instalment ${invoiceId} (${label}) not recorded: ${error.message}`, personId)
    return NextResponse.json({ error: 'Instalment not recorded' }, { status: 500 })
  }

  switch (result as string) {
    case 'applied':
      await log('success', payload, undefined, personId)
      break
    case 'applied_capped':
      await log('success', payload, `WARNING: instalment ${invoiceId} (${label}) would take amount paid above the order total. Stopped at the total.`, personId)
      break
    case 'duplicate':
      await log('skipped', payload, `Instalment ${invoiceId} (${label}) already recorded`, personId)
      break
    default:
      // 'unmatched': saved in training_payments with the reason, listed on the dashboard
      await log('failed', payload, `Instalment ${invoiceId} (${label}) could not be matched to an order. See "Instalments not matched" on the dashboard.`, personId)
  }

  return NextResponse.json({ ok: true, result })
}
