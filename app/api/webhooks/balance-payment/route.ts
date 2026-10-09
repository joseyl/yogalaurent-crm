import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Balance payments made through Stripe on yogalaurent.com (message 5 of the
 * site-to-CRM rulebook): balance links (collection "link") and Bacs training bookings
 * that have cleared (collection "checkout", linkId null).
 *
 * The database function record_balance_payment
 * (supabase/migrations/011_balance_payments.sql) does the rest in one locked step:
 * saves the payment once by its Stripe payment id, matches it to the order (exact
 * number, else the -N copies picked by email, else "payment to match" on the
 * dashboard), adds the full amount to amount paid and marks it "invoice to raise".
 * Money received is never refused: overpayments and email mismatches are flagged.
 */

const SOURCE = 'yogalaurent'
const EVENT = 'balance_payment'

export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'balance-payment' })
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

function isoOrNull(v: unknown): string | null {
  const s = text(v)
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

type Result = {
  result: string
  reason?: string
  payment_id?: string
  matched_order_ref?: string | null
  email_differs?: boolean
  overpaid?: number | string | null
  note?: string | null
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
  const amount = amountOrNull(payload.amountGBP)
  const paidAt = isoOrNull(payload.paidAt)
  const initiatedAt = isoOrNull(payload.initiatedAt)
  const method = text(payload.method).toLowerCase()
  const collection = text(payload.collection).toLowerCase()
  const label = `${orderRef || 'no orderRef'} (${stripePaymentId || 'no stripePaymentId'})`

  const { data, error } = await supabaseAdmin.rpc('record_balance_payment', {
    p_stripe_payment_id: stripePaymentId,
    p_order_ref: orderRef,
    p_programme: text(payload.programme) || null,
    p_amount: amount,
    p_paid_at: paidAt,
    p_initiated_at: initiatedAt,
    p_method: method,
    p_email: text(payload.email).toLowerCase() || null,
    p_collection: collection,
    p_link_id: text(payload.linkId) || null,
  })

  if (error) {
    await log('failed', payload, `Balance payment ${label} not recorded: ${error.message}`)
    return NextResponse.json({ error: 'Balance payment not recorded' }, { status: 500 })
  }

  const r = data as Result
  const money = amount === null ? '' : `${amount.toFixed(2)} `

  switch (r.result) {
    case 'bad_message':
      await log('failed', payload, `Balance payment ${label} refused: ${r.reason ?? 'bad message'}`)
      return NextResponse.json({ error: `Bad message: ${r.reason ?? 'invalid'}` }, { status: 400 })
    case 'duplicate':
      await log('skipped', payload, `Balance payment ${label} already recorded`)
      break
    case 'matched': {
      const flags = [
        r.matched_order_ref && r.matched_order_ref !== orderRef ? `matched to ${r.matched_order_ref}` : null,
        r.overpaid != null ? `WARNING: overpaid by ${Number(r.overpaid).toFixed(2)}` : null,
        r.email_differs ? 'WARNING: email differs from the client record' : null,
      ].filter(Boolean)
      await log('success', payload,
        `Balance payment ${money}on ${label} recorded (${method}). Invoice to raise.${flags.length ? ' ' + flags.join('. ') + '.' : ''}`)
      break
    }
    case 'to_match':
      await log('success', payload, `Balance payment ${money}on ${label} saved as payment to match: ${r.note ?? ''}`)
      break
    default:
      await log('failed', payload, `Balance payment ${label}: unexpected result ${r.result}`)
      return NextResponse.json({ error: 'Unexpected result' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, result: r.result })
}
