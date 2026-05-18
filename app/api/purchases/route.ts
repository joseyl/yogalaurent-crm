import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { person_id, product_id, amount_gbp, purchase_date, notes } = body

  if (!person_id || !product_id || amount_gbp === undefined || amount_gbp === null || !purchase_date) {
    return NextResponse.json(
      { error: 'person_id, product_id, amount_gbp, and purchase_date are required.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      person_id,
      product_id,
      amount_gbp: Number(amount_gbp),
      purchase_date,
      notes: notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
