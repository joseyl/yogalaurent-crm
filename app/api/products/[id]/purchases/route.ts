import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServerClient()

  const [{ data: product, error: productError }, { data: purchases, error: purchasesError }] =
    await Promise.all([
      supabase.from('products').select('id, name, category').eq('id', id).single(),
      supabase
        .from('purchases')
        .select('id, amount_gbp, purchase_date, notes, people(id, first_name, last_name)')
        .eq('product_id', id)
        .order('purchase_date', { ascending: false })
        .limit(10000),
    ])

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  if (purchasesError) {
    return NextResponse.json({ error: purchasesError.message }, { status: 500 })
  }

  return NextResponse.json({ product, purchases: purchases ?? [] })
}
