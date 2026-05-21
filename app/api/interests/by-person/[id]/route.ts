import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('interests')
    .select('id, product_id, source, added_date, added_by, notes, products(name, category)')
    .eq('person_id', id)
    .order('added_date', { ascending: false })
    .limit(10000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map(row => {
    const product = row.products as unknown as { name: string; category: string } | null
    return {
      id: row.id as string,
      product_id: row.product_id as string,
      source: row.source as string | null,
      added_date: row.added_date as string,
      added_by: row.added_by as string,
      notes: row.notes as string | null,
      product_name: product?.name ?? '',
      category: product?.category ?? 'other',
    }
  })

  return NextResponse.json(result)
}
