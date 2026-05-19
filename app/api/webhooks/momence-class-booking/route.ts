import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { findOrCreatePerson } from '@/lib/find-or-create-person'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const payload = await request.json()

  if (!validateWebhookSecret(request)) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'class_booking',
      payload,
      status: 'failed',
      error_message: 'Invalid webhook secret',
    })
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const email = payload.email || payload.customer_email || payload.attendee_email
  const firstName = payload.first_name || payload.firstName || null
  const lastName = payload.last_name || payload.lastName || null
  const phone = payload.phone || null
  const className = payload.class_name || payload.event_name || payload.name || 'Unknown class'
  const classDate = payload.class_date || payload.event_date || payload.date || new Date().toISOString().split('T')[0]
  const passUsed = payload.membership_used || payload.pass_used || payload.membership_name || null
  const paymentMethod = payload.payment_method || null
  const saleValue = parseFloat(payload.sale_value || '0') || 0

  if (!email) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'class_booking',
      payload,
      status: 'failed',
      error_message: 'No email address in payload',
    })
    return NextResponse.json({ error: 'No email in payload' }, { status: 400 })
  }

  const personId = await findOrCreatePerson({ email, firstName, lastName, phone })

  if (!personId) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'class_booking',
      payload,
      status: 'failed',
      error_message: 'Failed to find or create person record',
    })
    return NextResponse.json({ error: 'Person lookup failed' }, { status: 500 })
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
      payload,
      status: 'failed',
      person_id: personId,
      error_message: attendanceError.message,
    })
    return NextResponse.json({ error: 'Attendance insert failed' }, { status: 500 })
  }

  // Write purchase record for card drop-in payments
  const isCardPayment = paymentMethod && paymentMethod.toLowerCase() === 'card'
  if (isCardPayment && saleValue > 0) {
    const { data: dropInProduct } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('name', 'Drop-in Class')
      .single()

    if (dropInProduct) {
      const purchaseDate = classDate.split(',')[0].trim()
      await supabaseAdmin.from('purchases').insert({
        person_id: personId,
        product_id: dropInProduct.id,
        amount_gbp: saleValue,
        purchase_date: purchaseDate,
        notes: className,
        expires_at: null,
        expiry_alert_dismissed: false,
      })
    }
  }

  await supabaseAdmin.from('webhook_log').insert({
    source: 'momence',
    event_type: 'class_booking',
    payload,
    status: 'success',
    person_id: personId,
  })

  return NextResponse.json({ ok: true })
}
