import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ClientDetail from '@/components/ClientDetail'
import { fetchAll } from '@/lib/fetchAll'
import type { PassFollowupHistoryRow } from '@/components/PassFollowupHistory'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServerClient()

  const [
    { data: person },
    { data: purchases },
    attendance,
    { data: leads },
    { data: products },
  ] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('purchases')
      .select('id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year, order_ref, amount_paid_gbp, payment_option, balance_due_date, products(name, category)')
      .eq('person_id', id)
      .order('purchase_date', { ascending: false }),
    fetchAll<{ id: string; class_name: string; class_date: string; pass_used: string | null }>(
      () => supabase
        .from('attendance_v2')
        .select('id, class_name, class_date, pass_used')
        .eq('person_id', id)
        .eq('cancelled', false)
        .eq('duplicate_of_momence', false)
        .order('class_date', { ascending: false })
    ),
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

  // Training plan instalments applied to this client's orders (table training_payments)
  const purchaseIds = (purchases ?? []).map(p => p.id as string)
  const { data: instalmentRows } = purchaseIds.length
    ? await supabase
        .from('training_payments')
        .select('purchase_id, paid_at, created_at, amount_gbp, added_gbp')
        .in('purchase_id', purchaseIds)
        .eq('status', 'applied')
        .order('paid_at', { ascending: true })
    : { data: [] as { purchase_id: string; paid_at: string | null; created_at: string; amount_gbp: number; added_gbp: number }[] }
  const instalmentsByPurchase = new Map<string, { paid_at: string; amount: number }[]>()
  for (const r of instalmentRows ?? []) {
    const list = instalmentsByPurchase.get(r.purchase_id as string) ?? []
    list.push({ paid_at: ((r.paid_at ?? r.created_at) as string), amount: Number(r.added_gbp ?? r.amount_gbp) })
    instalmentsByPurchase.set(r.purchase_id as string, list)
  }

  // Payments against this client's orders (table order_payments): recorded by hand
  // (migration 010) or Stripe balance payments (source stripe, migration 011)
  const { data: paymentRows } = purchaseIds.length
    ? await supabase
        .from('order_payments')
        .select('id, purchase_id, amount_gbp, paid_on, method, note, created_at, source, refunded_gbp')
        .in('purchase_id', purchaseIds)
        .order('paid_on', { ascending: true })
        .order('created_at', { ascending: true })
    : { data: [] as { id: string; purchase_id: string; amount_gbp: number; paid_on: string; method: string; note: string | null; created_at: string; source: string; refunded_gbp: number }[] }
  const paymentsByPurchase = new Map<string, { id: string; amount_gbp: number; paid_on: string; method: string; note: string | null; source: 'hand' | 'stripe'; refunded_gbp: number }[]>()
  for (const r of paymentRows ?? []) {
    const list = paymentsByPurchase.get(r.purchase_id as string) ?? []
    list.push({
      id: r.id as string,
      amount_gbp: Number(r.amount_gbp),
      paid_on: r.paid_on as string,
      method: r.method as string,
      note: (r.note as string | null) ?? null,
      source: r.source === 'stripe' ? 'stripe' : 'hand',
      refunded_gbp: Number(r.refunded_gbp ?? 0),
    })
    paymentsByPurchase.set(r.purchase_id as string, list)
  }

  // Class pass follow-ups for this client (table pass_followups, migration 012, Build B).
  // If the table cannot be read, the client page still loads without them.
  const { data: followupRows } = await supabase
    .from('pass_followups')
    .select('id, pass_name, pass_end_date, credits_left, status, email_sent_on, followup_due_on, days_offered, outcome, closed_automatically, close_reason, closed_at, note, created_at')
    .eq('person_id', id)
    .order('pass_end_date', { ascending: false })
    .order('created_at', { ascending: false })
  const passFollowups: PassFollowupHistoryRow[] = (followupRows ?? []).map(f => ({
    ...(f as unknown as PassFollowupHistoryRow),
    credits_left: f.credits_left == null ? null : Number(f.credits_left),
  }))

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
      edition: p.edition as string | null,
      cohort_year: p.cohort_year as number | null,
      order_ref: (p.order_ref as string | null) ?? null,
      amount_paid_gbp: p.amount_paid_gbp == null ? null : Number(p.amount_paid_gbp),
      payment_option: (p.payment_option as string | null) ?? null,
      balance_due_date: (p.balance_due_date as string | null) ?? null,
      instalments: instalmentsByPurchase.get(p.id as string) ?? [],
      payments: paymentsByPurchase.get(p.id as string) ?? [],
    }
  })

  const attendanceData = attendance.map(a => ({
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
      passFollowups={passFollowups}
    />
  )
}
