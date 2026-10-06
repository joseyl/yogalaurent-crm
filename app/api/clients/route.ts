import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/fetchAll'

export const dynamic = 'force-dynamic'

// Each client comes with their purchases (date, amount, category) so the Clients
// page can work out spend for any category and period without reloading.
// Purchases are read in pages: a single read stops at 1,000 rows.
export async function GET() {
  const supabase = createServerClient()

  let people: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    alt_email: string | null
    phone: string | null
    country: string | null
    status: string
    assigned_to: string
    source_channel: string | null
  }[]
  let purchases: {
    person_id: string
    amount_gbp: number | string | null
    purchase_date: string | null
    products: { category: string | null } | null
  }[]

  try {
    ;[people, purchases] = await Promise.all([
      fetchAll<(typeof people)[number]>(() =>
        supabase
          .from('people')
          .select('id, first_name, last_name, email, alt_email, phone, country, status, assigned_to, source_channel')
          .eq('status', 'client')
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true })
          .order('id', { ascending: true }),
      ),
      fetchAll<(typeof purchases)[number]>(() =>
        supabase
          .from('purchases')
          .select('person_id, amount_gbp, purchase_date, products(category)')
          .order('id', { ascending: true }),
      ),
    ])
  } catch {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  const byPerson: Record<string, { d: string; a: number; c: string }[]> = {}
  for (const p of purchases) {
    if (!p.person_id || !p.purchase_date) continue
    if (!byPerson[p.person_id]) byPerson[p.person_id] = []
    byPerson[p.person_id].push({
      d: p.purchase_date,
      a: Number(p.amount_gbp ?? 0),
      c: p.products?.category ?? 'other',
    })
  }

  const result = people.map(person => ({
    ...person,
    purchases: byPerson[person.id] ?? [],
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
