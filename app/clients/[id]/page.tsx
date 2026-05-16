import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import ClientTabs from '@/components/ClientTabs'

interface Props {
  params: Promise<{ id: string }>
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>{label}</p>
      <p className="font-medium text-sm" style={{ color: '#1A2C4E' }}>{value || '—'}</p>
    </div>
  )
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServerClient()

  const [
    { data: person },
    { data: purchases },
    { data: attendance },
    { data: leads },
  ] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('purchases')
      .select('id, amount_gbp, purchase_date, notes, products(name, category)')
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
  ])

  if (!person) notFound()

  const purchasesData = (purchases ?? []).map(p => {
    const prod = p.products as unknown as { name: string; category: string } | null
    return {
      id: p.id,
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

  return (
    <div className="pb-24 max-w-4xl">
      {/* Back link */}
      <div className="px-6 pt-5 pb-2">
        <Link
          href="/clients"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Clients
        </Link>
      </div>

      {/* Header */}
      <div className="px-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:gap-3 gap-2">
          <h1 className="font-bold" style={{ fontSize: '22px', color: '#1A2C4E' }}>
            {person.first_name} {person.last_name}
          </h1>
          <StatusBadge status={person.status} />
        </div>

        {/* Detail fields grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mt-4">
          <Field label="Email" value={person.email} />
          <Field label="Alt Email" value={person.alt_email} />
          <Field label="Phone" value={person.phone} />
          <Field label="Country" value={person.country} />
          <Field label="Assigned To" value={person.assigned_to} />
          <Field label="Source Channel" value={person.source_channel} />
        </div>

        {/* Notes */}
        <div className="mt-4">
          <p className="uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Notes</p>
          <p className="text-sm" style={{ color: '#374151' }}>{person.notes || '—'}</p>
        </div>
      </div>

      <div className="border-t border-[#e5e7eb] mx-6" />

      {/* Tabs */}
      <div className="mt-2">
        <ClientTabs
          purchases={purchasesData}
          attendance={attendanceData}
          leads={leadsData}
        />
      </div>
    </div>
  )
}
