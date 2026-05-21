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
    .select('id, person_id, source, added_date, added_by, notes, people(id, first_name, last_name, email, status, assigned_to)')
    .eq('product_id', id)
    .order('added_date', { ascending: false })
    .limit(10000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map(row => {
    const person = row.people as unknown as {
      id: string
      first_name: string | null
      last_name: string | null
      email: string
      status: string
      assigned_to: string | null
    } | null
    return {
      id: row.id as string,
      person_id: person?.id ?? (row.person_id as string),
      source: row.source as string | null,
      added_date: row.added_date as string,
      added_by: row.added_by as string,
      notes: row.notes as string | null,
      first_name: person?.first_name ?? null,
      last_name: person?.last_name ?? null,
      email: person?.email ?? '',
      status: person?.status ?? '',
      assigned_to: person?.assigned_to ?? null,
    }
  })

  return NextResponse.json(result)
}
