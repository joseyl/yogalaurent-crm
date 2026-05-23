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

  // Write purchase record for drop-in payments (sale_value > 0)
  let purchaseCreated = false
  let purchaseSkipReason: string | null = null

  if (saleValue > 0) {
    const { data: dropInProduct, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('name', 'Drop-in Class')
      .single()

    if (productError || !dropInProduct) {
      await supabaseAdmin.from('webhook_log').insert({
        source: 'momence',
        event_type: 'class_booking',
        payload,
        status: 'error',
        person_id: personId,
        error_message: 'Product "Drop-in Class" not found — purchase not created',
      })
      return NextResponse.json({ error: 'Drop-in product not found' }, { status: 500 })
    }

    const purchaseDate = classDate.split('T')[0]

    const { data: existingPurchase } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('person_id', personId)
      .eq('product_id', dropInProduct.id)
      .eq('purchase_date', purchaseDate)
      .maybeSingle()

    if (existingPurchase) {
      purchaseSkipReason = 'duplicate: purchase already exists for this person, product, and date'
    } else {
      const { error: purchaseError } = await supabaseAdmin.from('purchases').insert({
        person_id: personId,
        product_id: dropInProduct.id,
        amount_gbp: saleValue,
        purchase_date: purchaseDate,
        notes: `Drop-in payment via Momence webhook. Class: ${className}`,
      })

      if (purchaseError) {
        await supabaseAdmin.from('webhook_log').insert({
          source: 'momence',
          event_type: 'class_booking',
          payload,
          status: 'error',
          person_id: personId,
          error_message: `Purchase insert failed: ${purchaseError.message}`,
        })
        return NextResponse.json({ error: 'Purchase insert failed' }, { status: 500 })
      }

      purchaseCreated = true
    }
  }

  await supabaseAdmin.from('webhook_log').insert({
    source: 'momence',
    event_type: 'class_booking',
    payload: {
      ...payload,
      _purchase_created: purchaseCreated,
      ...(purchaseSkipReason ? { _purchase_skip_reason: purchaseSkipReason } : {}),
    },
    status: 'success',
    person_id: personId,
  })

  return NextResponse.json({ ok: true })
}
