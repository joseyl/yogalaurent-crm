import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { findOrCreatePerson } from '@/lib/find-or-create-person'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { londonDateOf } from '@/lib/passRenewals'

export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'momence-class-booking' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log('[momence-webhook] payload', JSON.stringify(body))

  if (!validateWebhookSecret(request)) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'class_booking',
      payload: body,
      status: 'failed',
      error_message: 'Invalid webhook secret',
    })
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const email = body.email || body.customer_email || body.attendee_email
  const firstName = body.first_name || body.firstName || null
  const lastName = body.last_name || body.lastName || null
  const phone = body.phone || null
  const className = body.class_name || body.event_name || body.name || 'Unknown class'
  const rawClassDate = body.class_date || body.event_date || body.date
  const classDate = rawClassDate || new Date().toISOString().split('T')[0]
  const passUsed = body.membership_used || body.pass_used || body.membership_name || null

  // Coerce amount_gbp; track NaN so notes can be annotated
  const parsedSaleValue = Number(body.sale_value)
  const saleValueIsNaN = isNaN(parsedSaleValue)
  const saleValue = saleValueIsNaN ? 0 : parsedSaleValue

  if (!email) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'class_booking',
      payload: body,
      status: 'failed',
      error_message: 'No email address in payload',
    })
    return NextResponse.json({ error: 'No email in payload' }, { status: 400 })
  }

  const personId = await findOrCreatePerson({ email, firstName, lastName, phone })

  if (personId == null) {
    const msg = `Person resolution failed for email: ${email}`
    console.error(`[momence-webhook] ${msg}`)
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'class_booking',
      payload: body,
      status: 'failed',
      error_message: msg,
    })
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Write attendance record
  const { error: attendanceError } = await supabaseAdmin.from('attendance').insert({
    person_id: personId,
    class_name: className,
    class_date: classDate,
    pass_used: passUsed,
  })

  if (attendanceError) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'class_booking',
      payload: body,
      status: 'failed',
      person_id: personId,
      error_message: attendanceError.message,
    })
    return NextResponse.json({ error: 'Attendance insert failed' }, { status: 500 })
  }

  // Write purchase record for payments (sale_value > 0)
  let purchaseCreated = false
  let purchaseSkipReason: string | null = null

  if (saleValue > 0) {
    // Guard: purchaseDate must be resolvable
    if (!rawClassDate) {
      const msg = `Missing or invalid purchase_date, received: ${rawClassDate}`
      console.error(`[momence-webhook] ${msg}`)
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const parsedDate = new Date(rawClassDate)
    if (isNaN(parsedDate.getTime())) {
      const msg = `Missing or invalid purchase_date, received: ${rawClassDate}`
      console.error(`[momence-webhook] ${msg}`)
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    // Dated by the day the payment message arrives (London), not the class date.
    // The CRM dates every purchase by order date; dating by class date put
    // advance bookings in the future.
    const purchaseDate = londonDateOf(new Date())
    const classLondonDate = londonDateOf(parsedDate)

    // Look up the drop-in product
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('name', 'Drop-in Class')
      .maybeSingle()

    const productId = product?.id ?? null

    if (productError || productId == null) {
      const msg = `Product not found in catalogue for class name: ${className}`
      console.error(`[momence-webhook] ${msg}`)
      await supabaseAdmin.from('webhook_log').insert({
        source: 'momence',
        event_type: 'class_booking',
        payload: body,
        status: 'failed',
        person_id: personId,
        error_message: msg,
      })
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const noteParts = [`Drop-in payment via Momence webhook. Class: ${className}, class date ${classLondonDate}`]
    if (saleValueIsNaN) noteParts.push('amount could not be parsed from webhook')
    const notes = noteParts.join('; ')

    // Check and write in one locked step in the database (see
    // supabase/migrations/004_record_momence_class_payment.sql). A Momence course
    // checkout sends one message per session within a second, each with the full
    // course price; only the first is recorded.
    const { data: recordStatus, error: recordError } = await supabaseAdmin.rpc(
      'record_momence_class_payment',
      {
        p_person_id: personId,
        p_product_id: productId,
        p_amount: saleValue,
        p_purchase_date: purchaseDate,
        p_notes: notes,
      },
    )

    if (recordError) {
      console.error('[momence-webhook] Purchase record failed', recordError)
      await supabaseAdmin.from('webhook_log').insert({
        source: 'momence',
        event_type: 'class_booking',
        payload: body,
        status: 'failed',
        person_id: personId,
        error_message: `Purchase record failed: ${recordError.message}`,
      })
      return NextResponse.json({ error: 'Purchase record failed' }, { status: 500 })
    }

    if (recordStatus === 'created') {
      purchaseCreated = true
    } else if (recordStatus === 'duplicate') {
      purchaseSkipReason = 'duplicate: this booking was already recorded'
    } else if (recordStatus === 'same_order') {
      purchaseSkipReason = 'same order: part of a course or multi-session checkout already recorded in the last 15 seconds'
    } else {
      purchaseSkipReason = `unexpected result from record_momence_class_payment: ${String(recordStatus)}`
    }
  }

  await supabaseAdmin.from('webhook_log').insert({
    source: 'momence',
    event_type: 'class_booking',
    payload: {
      ...body,
      _purchase_created: purchaseCreated,
      ...(purchaseSkipReason ? { _purchase_skip_reason: purchaseSkipReason } : {}),
    },
    status: 'success',
    person_id: personId,
  })

  return NextResponse.json({ ok: true })
}
