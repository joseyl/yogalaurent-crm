import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((today - date) / (1000 * 60 * 60 * 24))
}

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, status, assigned_to, date_added, last_followup_date, notes, person_id, people!inner(first_name, last_name, email), products(name)'
    )
    .order('last_followup_date', { ascending: true, nullsFirst: true })
    .order('date_added', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  const result = (data ?? []).map(lead => {
    const person = lead.people as unknown as { first_name: string | null; last_name: string | null; email: string }
    const product = lead.products as unknown as { name: string } | null
    const referenceDate = (lead.last_followup_date ?? lead.date_added) as string
    return {
      id: lead.id,
      status: lead.status,
      assigned_to: lead.assigned_to,
      date_added: lead.date_added,
      last_followup_date: lead.last_followup_date,
      days_since_followup: daysSince(referenceDate),
      notes: lead.notes,
      person_id: lead.person_id,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      product_name: product?.name ?? null,
    }
  })

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

  const { first_name, last_name, email, phone, product_id, source_channel, assigned_to, notes } = body

  if (!first_name || !last_name || !email) {
    return NextResponse.json({ error: 'first_name, last_name, and email are required.' }, { status: 400 })
  }

  // Find or create person
  const { data: existingPerson } = await supabase
    .from('people')
    .select('id')
    .eq('email', email as string)
    .maybeSingle()

  let personId: string

  if (existingPerson) {
    personId = existingPerson.id
  } else {
    const { data: newPerson, error: insertError } = await supabase
      .from('people')
      .insert({
        first_name: first_name as string,
        last_name: last_name as string,
        email: email as string,
        phone: (phone as string | undefined) || null,
        source_channel: (source_channel as string | undefined) || null,
        assigned_to: (assigned_to as string | undefined) || 'Jose',
        status: 'lead',
      })
      .select('id')
      .single()

    if (insertError || !newPerson) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create person' }, { status: 500 })
    }
    personId = newPerson.id
  }

  // Insert lead
  const { data: newLead, error: leadError } = await supabase
    .from('leads')
    .insert({
      person_id: personId,
      product_id: (product_id as string | undefined) || null,
      assigned_to: (assigned_to as string | undefined) || 'Jose',
      notes: (notes as string | undefined) || null,
      date_added: new Date().toISOString().split('T')[0],
      status: 'new',
    })
    .select('id')
    .single()

  if (leadError || !newLead) {
    return NextResponse.json({ error: leadError?.message ?? 'Failed to create lead' }, { status: 500 })
  }

  return NextResponse.json({ id: newLead.id }, { status: 201 })
}
