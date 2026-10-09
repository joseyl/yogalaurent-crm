import { NextRequest, NextResponse } from 'next/server'
import { findPersonByEmail } from '@/lib/findPersonByEmail'
import { createServerClient } from '@/lib/supabase/server'

const ALLOWED_FIELDS = [
  'first_name', 'last_name', 'email', 'alt_email', 'phone',
  'country', 'status', 'assigned_to', 'source_channel', 'notes',
] as const
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

  if ('email' in update) {
    const email = update.email
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
  }

  // A main or alt email that belongs to another record is refused (migration 014): that is a
  // duplicate to merge, not an address to copy. Only a CHANGED address is checked, so the
  // existing duplicates (an alt email that is another record's main email) can still be edited.
  const { data: current } = await supabase.from('people').select('email, alt_email').eq('id', id).maybeSingle()
  const norm = (v: unknown) => (typeof v === 'string' ? v.toLowerCase().replace(/\s/g, '') : '')
  for (const field of ['email', 'alt_email'] as const) {
    const value = update[field]
    if (typeof value !== 'string' || !value.trim()) continue
    if (current && norm(current[field]) === norm(value)) continue
    try {
      const other = await findPersonByEmail(value)
      if (other && other.id !== id) {
        return NextResponse.json(
          { error: `This ${field === 'email' ? 'email' : 'alt email'} is already on another client record.` },
          { status: 409 },
        )
      }
    } catch {
      return NextResponse.json({ error: 'Could not check the email. Try again.' }, { status: 500 })
    }
  }

  const { error } = await supabase.from('people').update(update).eq('id', id)

  if (error?.code === '23505') {
    return NextResponse.json({ error: 'This email is already on another client record.' }, { status: 409 })
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
