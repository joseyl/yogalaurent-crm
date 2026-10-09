import { NextRequest, NextResponse } from 'next/server'
import { findOnePersonId } from '@/lib/findPersonByEmail'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { findOrCreatePerson } from '@/lib/find-or-create-person'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Sales made through Stripe payment links on the Terra Training account.
 *
 * yogalaurent.com sends one message per paid checkout that came from a payment link.
 * The database function record_payment_link_sale
 * (supabase/migrations/008_payment_link_sales.sql) does the rest in one locked step:
 * saves the sale once by its Stripe checkout session id, looks the link up in
 * payment_links, and creates a purchase (sale), saves it only (part payment or ignore),
 * or leaves it to sort on the dashboard (unknown link, general link, no pound amount).
 */

const SOURCE = 'yogalaurent'
const EVENT = 'payment_link_sale'

export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'payment-link-sale' })
}

type LogStatus = 'success' | 'failed' | 'skipped'

async function log(status: LogStatus, payload: unknown, message?: string, personId?: string | null) {
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

/** A decimal amount, or null when missing or not a number. */
function amountOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

/** Finds exactly one person by main, alt or other email (migration 014). Never creates one. */
async function findPersonId(email: string): Promise<string | null> {
  return findOnePersonId(email)
}

type CustomField = { key?: unknown; label?: unknown; value?: unknown }
type LineItem = { description?: unknown; quantity?: unknown; amountTotal?: unknown }

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

  const sessionId = text(payload.stripeCheckoutSessionId)
  const linkId = text(payload.stripePaymentLinkId)
  const paymentIntentId = text(payload.stripePaymentIntentId)
  const email = text(payload.email).toLowerCase()
  const name = text(payload.name)
  const phone = text(payload.phone)
  const currency = text(payload.currency).toLowerCase() || 'gbp'
  const amountOriginal = amountOrNull(payload.amountOriginal)
  let amountGBP = amountOrNull(payload.amountGBP)
  const amountDiscount = amountOrNull(payload.amountDiscount) ?? 0
  const discountCode = text(payload.discountCode)
  const paidAtRaw = text(payload.paidAt)
  const paidAt = paidAtRaw && !isNaN(new Date(paidAtRaw).getTime())
    ? new Date(paidAtRaw).toISOString()
    : new Date().toISOString()
  const label = sessionId || linkId || 'unknown'

  if (!sessionId || !linkId) {
    await log('failed', payload, `Payment-link sale without stripeCheckoutSessionId or stripePaymentLinkId (${label})`)
    return NextResponse.json({ error: 'Missing Stripe ids' }, { status: 400 })
  }
  if (!email) {
    await log('failed', payload, `No email in payment-link sale ${label}`)
    return NextResponse.json({ error: 'No email' }, { status: 400 })
  }
  if (amountOriginal === null || amountOriginal < 0) {
    await log('failed', payload, `Invalid amountOriginal in payment-link sale ${label}`)
    return NextResponse.json({ error: 'Invalid amountOriginal' }, { status: 400 })
  }
  if (amountGBP !== null && amountGBP < 0) amountGBP = null
  // A pound sale with no separate pound figure: the pound figure is the amount itself
  if (amountGBP === null && currency === 'gbp') amountGBP = amountOriginal

  const lineItems = Array.isArray(payload.lineItems) ? (payload.lineItems as LineItem[]) : []
  const description = lineItems.map(li => text(li.description)).filter(Boolean).join(' + ')
  const quantity = lineItems.reduce((sum, li) => sum + (Number(li.quantity) > 0 ? Number(li.quantity) : 0), 0) || 1

  const customFields = Array.isArray(payload.customFields) ? (payload.customFields as CustomField[]) : []
  const customInfo = customFields
    .map(f => {
      const value = text(f.value)
      if (!value) return ''
      return `${text(f.label) || text(f.key) || 'Field'}: ${value}`
    })
    .filter(Boolean)
    .join('; ')

  // Only create a client for links that can become a sale. Part payments and ignored
  // links only look the person up.
  let personId: string | null = null
  try {
    const { data: link, error: linkError } = await supabaseAdmin
      .from('payment_links')
      .select('action')
      .eq('stripe_payment_link_id', linkId)
      .maybeSingle()
    if (linkError) throw linkError

    if (link && (link.action === 'part_payment' || link.action === 'ignore')) {
      personId = await findPersonId(email)
    } else {
      const [firstName, ...rest] = name.split(/\s+/).filter(Boolean)
      personId = await findOrCreatePerson({
        email,
        firstName: firstName || undefined,
        lastName: rest.join(' ') || undefined,
        phone: phone || undefined,
        sourceChannel: 'Payment link',
      })
      if (!personId) throw new Error('find or create person failed')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
    await log('failed', payload, `Person lookup failed for payment-link sale ${label}: ${message}`)
    return NextResponse.json({ error: 'Person lookup failed' }, { status: 500 })
  }

  const { data: result, error } = await supabaseAdmin.rpc('record_payment_link_sale', {
    p_session_id: sessionId,
    p_payment_intent_id: paymentIntentId || null,
    p_payment_link_id: linkId,
    p_email: email,
    p_person_id: personId,
    p_payer_name: name || null,
    p_custom_info: customInfo || null,
    p_description: description || null,
    p_quantity: quantity,
    p_currency: currency,
    p_amount_original: amountOriginal,
    p_amount_gbp: amountGBP,
    p_discount_code: discountCode || null,
    p_amount_discount: amountDiscount,
    p_paid_at: paidAt,
    p_origin: 'webhook',
  })

  if (error) {
    // 500 so Stripe retries; the checkout session id stops a retry being counted twice
    await log('failed', payload, `Payment-link sale ${label} not recorded: ${error.message}`, personId)
    return NextResponse.json({ error: 'Sale not recorded' }, { status: 500 })
  }

  switch (result as string) {
    case 'recorded':
      await log('success', payload, undefined, personId)
      break
    case 'part_payment':
      await log('success', payload, `Part payment ${label}: saved, no purchase created`, personId)
      break
    case 'duplicate':
      await log('skipped', payload, `Payment-link sale ${label} already recorded`, personId)
      break
    case 'ignored':
      await log('skipped', payload, `Payment-link sale ${label} is on an ignored link: saved, no purchase`, personId)
      break
    default:
      // 'to_sort': saved with the reason, listed on the dashboard
      await log('failed', payload, `Payment-link sale ${label} needs sorting. See "Payment-link sales to sort" on the dashboard.`, personId)
  }

  return NextResponse.json({ ok: true, result })
}
