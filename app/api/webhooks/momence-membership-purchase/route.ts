import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSecret } from '@/lib/webhook-auth'
import { findOrCreatePerson } from '@/lib/find-or-create-person'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MOMENCE_MEMBERSHIP_LOOKUP } from '@/lib/momence'

export async function POST(request: NextRequest) {
  const payload = await request.json()

  if (!validateWebhookSecret(request)) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'membership_purchase',
      payload,
      status: 'failed',
      error_message: 'Invalid webhook secret',
    })
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const email = payload.email || payload.customer_email
  const firstName = payload.first_name || payload.firstName || null
  const lastName = payload.last_name || payload.lastName || null
  const phone = payload.phone || null
  const membershipId = String(payload.membership_id || payload.membershipId || '')
  const purchaseDate = payload.purchase_date || payload.created_at || new Date().toISOString().split('T')[0]

  if (!email) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'membership_purchase',
      payload,
      status: 'failed',
      error_message: 'No email address in payload',
    })
    return NextResponse.json({ error: 'No email in payload' }, { status: 400 })
  }

  const membership = MOMENCE_MEMBERSHIP_LOOKUP[membershipId]

  if (!membership) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'membership_purchase',
      payload,
      status: 'skipped',
      error_message: `Unknown membership ID: ${membershipId}`,
    })
    return NextResponse.json({ ok: true, note: 'Unknown membership ID, skipped' })
  }

  const personId = await findOrCreatePerson({ email, firstName, lastName, phone })

  if (!personId) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'membership_purchase',
      payload,
      status: 'failed',
      error_message: 'Failed to find or create person record',
    })
    return NextResponse.json({ error: 'Person lookup failed' }, { status: 500 })
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('name', membership.productName)
    .single()

  if (!product) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'membership_purchase',
      payload,
      status: 'failed',
      person_id: personId,
      error_message: `Product not found in CRM: ${membership.productName}`,
    })
    return NextResponse.json({ error: 'Product not found' }, { status: 500 })
  }

  const parsedDate = purchaseDate.split('T')[0]
  const expiresAt = membership.expiryDays
    ? new Date(new Date(parsedDate).getTime() + membership.expiryDays * 86400000)
        .toISOString()
        .split('T')[0]
    : null

  const { error: purchaseError } = await supabaseAdmin.from('purchases').insert({
    person_id: personId,
    product_id: product.id,
    amount_gbp: membership.amountGbp,
    purchase_date: parsedDate,
    notes: membership.notes,
    expires_at: expiresAt,
    expiry_alert_dismissed: false,
  })

  if (purchaseError) {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'momence',
      event_type: 'membership_purchase',
      payload,
      status: 'failed',
      person_id: personId,
      error_message: purchaseError.message,
    })
    return NextResponse.json({ error: 'Purchase insert failed' }, { status: 500 })
  }

  await supabaseAdmin.from('webhook_log').insert({
    source: 'momence',
    event_type: 'membership_purchase',
    payload,
    status: 'success',
    person_id: personId,
  })

  return NextResponse.json({ ok: true })
}
