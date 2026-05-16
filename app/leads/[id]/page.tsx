import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import LeadDetail from '@/components/LeadDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: leadRaw } = await supabase
    .from('leads')
    .select(
      'id, status, assigned_to, date_added, last_followup_date, notes, person_id, product_id, people!inner(first_name, last_name, email, phone, country, source_channel), products(name)'
    )
    .eq('id', id)
    .maybeSingle()

  if (!leadRaw) notFound()

  const person = leadRaw.people as unknown as {
    first_name: string | null
    last_name: string | null
    email: string
    phone: string | null
    country: string | null
    source_channel: string | null
  }
  const product = leadRaw.products as unknown as { name: string } | null

  const lead = {
    id: leadRaw.id,
    status: leadRaw.status,
    assigned_to: leadRaw.assigned_to,
    date_added: leadRaw.date_added as string,
    last_followup_date: leadRaw.last_followup_date as string | null,
    notes: leadRaw.notes as string | null,
    person_id: leadRaw.person_id,
    product_id: leadRaw.product_id as string | null,
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    phone: person.phone,
    country: person.country,
    source_channel: person.source_channel,
    product_name: product?.name ?? null,
  }

  return <LeadDetail lead={lead} />
}
