// Supabase Edge Function: brochure-lead
// Called by the Make scenarios "LP - Download BPTT Brochure" (8339996) and
// "LP - Download YNTT Brochure" (9612315) when someone requests a training brochure.
// Deployed by hand in the Supabase dashboard (Edge Functions > brochure-lead).
// This file is the record of what is deployed; keep the two in step.
// Version deployed 13 Oct 2026.
//
// Body: { email, first_name?, last_name?, product_id? }
// - product_id missing: the lead goes on "Breathwork Professional Training" (lead-only product).
// - The Yoga Nidra scenario sends product_id 8c0bd00b-8f03-4791-a954-0dd5595193b5.
// - A lead is only created if the person has no open lead (not converted or dead) for that product.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Used when the caller does not say which product: Breathwork Professional Training (lead-only product for the BPTT brochure)
const DEFAULT_PRODUCT_ID = '07580454-95a7-4c24-8624-2e3dddde3204'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: { email?: string; first_name?: string; last_name?: string; product_id?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  if (!email) {
    return new Response('Missing email', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Work out which product this lead is for, and check it exists
  const productId = body.product_id?.trim() || DEFAULT_PRODUCT_ID

  const { data: product } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .maybeSingle()

  if (!product) {
    return new Response('Unknown product', { status: 400 })
  }

  // Find or create the person
  let personId: string

  const { data: existing } = await supabase
    .from('people')
    .select('id, status')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    personId = existing.id
  } else {
    const { data: newPerson, error: insertError } = await supabase
      .from('people')
      .insert({
        email,
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        status: 'lead',
        assigned_to: 'Laurent',
        source_channel: 'Brochure Download',
      })
      .select('id')
      .single()

    if (insertError || !newPerson) {
      return new Response('Failed to create person', { status: 500 })
    }

    personId = newPerson.id
  }

  // Only create a lead if this person has no open lead for this same product
  const { data: openLeads } = await supabase
    .from('leads')
    .select('id')
    .eq('person_id', personId)
    .eq('product_id', product.id)
    .not('status', 'in', '("converted","dead")')
    .limit(1)

  if (!openLeads || openLeads.length === 0) {
    const { error: leadError } = await supabase.from('leads').insert({
      person_id: personId,
      product_id: product.id,
      status: 'new',
      assigned_to: 'Laurent',
      date_added: new Date().toISOString().split('T')[0],
      notes: `Lead created via ${product.name} brochure download`,
    })

    if (leadError) {
      return new Response('Failed to create lead', { status: 500 })
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
