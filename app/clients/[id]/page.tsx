import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ClientDetail from '@/components/ClientDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServerClient()

  const [
    { data: person },
    { data: purchases },
    { data: attendance },
    { data: leads },
    { data: products },
  ] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('purchases')
      .select('id, product_id, amount_gbp, purchase_date, notes, products(name, category)')
      .eq('person_id', id)
      .order('purchase_date', { ascending: false }),
    supabase
      .from('attendance')
      .select('id, class_name, class_date, pass_used')
      .eq('person_id', id)
      .order('class_date', { ascending: false }),
    supabase
      .from('leads')
      .select('id, status, date_added, last_followup_date, notes, assigned_to, products(name)')
      .eq('person_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('products')
      .select('id, name, category, entity')
      .neq('archived', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true }),
  ])

  if (!person) notFound()

  const purchasesData = (purchases ?? []).map(p => {
    const prod = p.products as unknown as { name: string; category: string } | null
    return {
      id: p.id,
      product_id: (p.product_id as string) ?? '',
      amount_gbp: Number(p.amount_gbp),
      purchase_date: p.purchase_date as string,
      notes: p.notes as string | null,
      product_name: prod?.name ?? '—',
      category: prod?.category ?? 'other',
    }
  })

  const attendanceData = (attendance ?? []).map(a => ({
    id: a.id,
    class_name: a.class_name as string,
    class_date: a.class_date as string,
    pass_used: a.pass_used as string | null,
  }))

  const leadsData = (leads ?? []).map(l => {
    const prod = l.products as unknown as { name: string } | null
    return {
      id: l.id,
      status: l.status as string,
      date_added: l.date_added as string,
      last_followup_date: l.last_followup_date as string | null,
      notes: l.notes as string | null,
      assigned_to: l.assigned_to as string,
      product_name: prod?.name ?? null,
    }
  })

  const personData = {
    id: person.id as string,
    first_name: person.first_name as string | null,
    last_name: person.last_name as string | null,
    email: person.email as string,
    alt_email: person.alt_email as string | null,
    phone: person.phone as string | null,
    country: person.country as string | null,
    status: person.status as string,
    assigned_to: person.assigned_to as string | null,
    source_channel: person.source_channel as string | null,
    notes: person.notes as string | null,
  }

  const productsData = (products ?? []).map(p => ({
    id: p.id as string,
    name: p.name as string,
    category: p.category as string,
    entity: p.entity as string,
  }))

  return (
    <ClientDetail
      person={personData}
      purchases={purchasesData}
      attendance={attendanceData}
      leads={leadsData}
      products={productsData}
    />
  )
}
