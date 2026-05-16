import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const ALLOWED_FIELDS = ['status', 'assigned_to', 'notes', 'last_followup_date'] as const
type AllowedField = typeof ALLOWED_FIELDS[number]

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Partial<Record<AllowedField, unknown>> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      update[field] = body[field]
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  const { error } = await supabase.from('leads').update(update).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
