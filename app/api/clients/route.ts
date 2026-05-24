import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()

  const [{ data: people, error: peopleError }, { data: purchases, error: purchasesError }] =
    await Promise.all([
      supabase
        .from('people')
        .select('id, first_name, last_name, email, alt_email, phone, country, status, assigned_to, source_channel')
        .eq('status', 'client')
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true }),
      supabase
        .from('purchases')
        .select('person_id, amount_gbp, purchase_date, products(category)'),
    ])

  if (peopleError || purchasesError) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  const spendMap: Record<string, { total: number; last_purchase_date: string | null }> = {}
  const categoriesMap: Record<string, Set<string>> = {}

  for (const p of purchases ?? []) {
    // Spend aggregation
    const existing = spendMap[p.person_id]
    if (!existing) {
      spendMap[p.person_id] = { total: Number(p.amount_gbp ?? 0), last_purchase_date: p.purchase_date as string | null }
    } else {
      existing.total += Number(p.amount_gbp ?? 0)
      const pd = p.purchase_date as string | null
      if (pd && (!existing.last_purchase_date || pd > existing.last_purchase_date)) {
        existing.last_purchase_date = pd
      }
    }
    // Category aggregation
    const prod = p.products as unknown as { category: string } | null
    if (prod?.category) {
      if (!categoriesMap[p.person_id]) categoriesMap[p.person_id] = new Set()
      categoriesMap[p.person_id].add(prod.category)
    }
  }

  const result = (people ?? []).map(person => ({
    id: person.id,
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    alt_email: person.alt_email,
    phone: person.phone,
    country: person.country,
    status: person.status,
    assigned_to: person.assigned_to,
    source_channel: person.source_channel,
    total_spend: spendMap[person.id]?.total ?? 0,
    last_purchase_date: spendMap[person.id]?.last_purchase_date ?? null,
    categories: Array.from(categoriesMap[person.id] ?? []),
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { first_name, last_name, email, alt_email, phone, country, source_channel, assigned_to, notes } = body

  if (!first_name || !last_name || !email) {
    return NextResponse.json({ error: 'first_name, last_name, and email are required.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .eq('email', email as string)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A person with this email already exists.' }, { status: 409 })
  }

  const { data: newPerson, error } = await supabase
    .from('people')
    .insert({
      first_name: first_name as string,
      last_name: last_name as string,
      email: email as string,
      alt_email: (alt_email as string | undefined) || null,
      phone: (phone as string | undefined) || null,
      country: (country as string | undefined) || null,
      source_channel: (source_channel as string | undefined) || null,
      assigned_to: (assigned_to as string | undefined) || 'Jose',
      notes: (notes as string | undefined) || null,
      status: 'client',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: newPerson.id }, { status: 201 })
}
