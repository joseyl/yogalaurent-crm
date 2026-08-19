import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { findOrCreatePerson } from '@/lib/find-or-create-person'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  PROGRAMME_PRODUCT,
  BUNDLE_COMPONENTS,
  parseCohort,
  toDateOnly,
  toAmount,
} from '@/lib/training-order'

const SOURCE = 'yogalaurent'
const EVENT = 'training_order'

/** Health check, so we can confirm the route is live without sending an order. */
export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'training-order' })
}

type LogStatus = 'success' | 'failed' | 'skipped'

async function log(
  status: LogStatus,
  payload: unknown,
  errorMessage?: string,
  personId?: string | null,
) {
  await supabaseAdmin.from('webhook_log').insert({
    source: SOURCE,
    event_type: EVENT,
    payload: payload as Record<string, unknown>,
    status,
    person_id: personId ?? null,
    error_message: errorMessage ?? null,
  })
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

  const orderRef = typeof payload.orderRef === 'string' ? payload.orderRef.trim() : ''
  const programmeType = typeof payload.programmeType === 'string' ? payload.programmeType.trim() : ''
  const programmeTitle = typeof payload.programmeTitle === 'string' ? payload.programmeTitle : ''
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''

  if (!orderRef) {
    await log('failed', payload, 'No orderRef in payload')
    return NextResponse.json({ error: 'No orderRef' }, { status: 400 })
  }

  if (!email) {
    await log('failed', payload, `No email address in payload for ${orderRef}`)
    return NextResponse.json({ error: 'No email' }, { status: 400 })
  }

  // Idempotency. Stripe retries, and Jose may replay a Make execution.
  // If we have already seen this order reference, do nothing and say so.
  const { data: existing } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('order_ref', orderRef)
    .limit(1)

  if (existing && existing.length > 0) {
    await log('skipped', payload, `Order ${orderRef} already recorded`)
    return NextResponse.json({ ok: true, note: 'Already recorded' })
  }

  const productName = PROGRAMME_PRODUCT[programmeType]

  if (!productName) {
    await log(
      'failed',
      payload,
      `Unknown programme type "${programmeType}" for ${orderRef}. Add it to PROGRAMME_PRODUCT.`,
    )
    return NextResponse.json({ error: 'Unknown programme type' }, { status: 400 })
  }

  const componentNames = BUNDLE_COMPONENTS[programmeType] ?? []
  const wantedNames = [productName, ...componentNames]

  const { data: products, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .in('name', wantedNames)

  const productIdByName = new Map((products ?? []).map(p => [p.name, p.id as string]))
  const mainProductId = productIdByName.get(productName)

  if (productError || !mainProductId) {
    await log(
      'failed',
      payload,
      `Product not found in CRM: "${productName}" (order ${orderRef})`,
    )
    return NextResponse.json({ error: 'Product not found' }, { status: 400 })
  }

  const personId = await findOrCreatePerson({
    email,
    firstName: typeof payload.firstName === 'string' ? payload.firstName : undefined,
    lastName: typeof payload.lastName === 'string' ? payload.lastName : undefined,
    phone: typeof payload.phone === 'string' ? payload.phone : undefined,
    country: typeof payload.country === 'string' ? payload.country : undefined,
    sourceChannel: 'Training',
  })

  if (!personId) {
    await log('failed', payload, `Could not find or create a person for ${email} (${orderRef})`)
    return NextResponse.json({ error: 'Person lookup failed' }, { status: 500 })
  }

  const { edition, cohortYear } = parseCohort(programmeTitle)
  const purchaseDate = toDateOnly(payload.purchaseDate)
  const totalAmount = toAmount(payload.totalAmountGBP)
  const amountPaid = toAmount(payload.amountPaidGBP)
  const paymentOption = typeof payload.paymentOption === 'string' ? payload.paymentOption : null
  const source = typeof payload.source === 'string' ? payload.source : 'stripe'

  const balanceDueDate =
    typeof payload.balanceDueDate === 'string' && payload.balanceDueDate.trim()
      ? toDateOnly(payload.balanceDueDate)
      : null

  const noteParts: string[] = [programmeTitle || 'Teacher training']
  if (payload.discountCode) noteParts.push(`Discount code: ${payload.discountCode}`)
  if (source === 'bank_transfer') noteParts.push('AWAITING BANK TRANSFER — not yet paid')
  if (source === 'admin') noteParts.push('Entered by staff via admin booking')
  if (!edition || !cohortYear) {
    noteParts.push(`Cohort could not be read from the programme title "${programmeTitle}"`)
  }

  const rows = [
    {
      person_id: personId,
      product_id: mainProductId,
      amount_gbp: totalAmount,
      amount_paid_gbp: amountPaid,
      payment_option: paymentOption,
      balance_due_date: balanceDueDate,
      purchase_date: purchaseDate,
      order_ref: orderRef,
      source,
      edition,
      cohort_year: cohortYear,
      notes: noteParts.join('. '),
    },
    // Zero-value component rows for a 100-hour bundle, matching how the
    // existing bundle purchases are stored.
    ...componentNames
      .map(name => productIdByName.get(name))
      .filter((id): id is string => Boolean(id))
      .map(componentId => ({
        person_id: personId,
        product_id: componentId,
        amount_gbp: 0,
        amount_paid_gbp: 0,
        payment_option: paymentOption,
        balance_due_date: null,
        purchase_date: purchaseDate,
        order_ref: orderRef,
        source,
        edition,
        cohort_year: cohortYear,
        notes: `Included in 100-hour bundle (order ${orderRef})`,
      })),
  ]

  const { error: insertError } = await supabaseAdmin.from('purchases').insert(rows)

  if (insertError) {
    await log('failed', payload, `Purchase insert failed for ${orderRef}: ${insertError.message}`, personId)
    return NextResponse.json({ error: 'Purchase insert failed' }, { status: 500 })
  }

  await log('success', payload, undefined, personId)

  return NextResponse.json({ ok: true, orderRef, rowsCreated: rows.length })
}
