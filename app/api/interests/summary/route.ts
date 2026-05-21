import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = createServerClient()

  const [{ data: products }, { data: interests }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, category')
      .neq('archived', true)
      .limit(10000),
    supabase
      .from('interests')
      .select('product_id')
      .limit(10000),
  ])

  const countMap: Record<string, number> = {}
  for (const row of interests ?? []) {
    const pid = row.product_id as string
    countMap[pid] = (countMap[pid] ?? 0) + 1
  }

  const result = (products ?? []).map(p => ({
    product_id: p.id as string,
    product_name: p.name as string,
    category: p.category as string,
    count: countMap[p.id as string] ?? 0,
  })).sort((a, b) => b.count - a.count)

  return NextResponse.json(result)
}
