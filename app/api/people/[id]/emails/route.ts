import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Other emails of a client (Build D, migration 014). Behind the login.
 * The database step person_email_step checks and saves in one locked step.
 *
 * POST   { email, note? }  adds an other email
 * DELETE { emailId }       removes one
 */

const MESSAGES: Record<string, string> = {
  not_found: 'This client no longer exists.',
  bad_email: 'That does not look like an email address.',
  already_on_record: 'This email is already on this client.',
  belongs_to_other: 'This email belongs to another client record. If it is the same person, merge the two records instead.',
  email_not_found: 'That email is no longer on this client. Refresh the page.',
  bad_action: 'Unknown action.',
}

async function step(id: string, body: Record<string, unknown>) {
  const supabase = createServerClient()
  return supabase.rpc('person_email_step', {
    p_action: body.action,
    p_person_id: id,
    p_email: typeof body.email === 'string' ? body.email.slice(0, 320) : null,
    p_id: typeof body.emailId === 'string' && /^[0-9a-f-]{36}$/i.test(body.emailId) ? body.emailId : null,
    p_note: typeof body.note === 'string' ? body.note.slice(0, 500) : null,
  })
}

async function handle(request: NextRequest, id: string, action: 'add' | 'remove') {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: MESSAGES.not_found }, { status: 404 })
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { data, error } = await step(id, { ...body, action })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const r = data as { result: string; id?: string; email?: string; other_person_id?: string }
  if (r.result !== 'done') {
    const status = r.result === 'not_found' || r.result === 'email_not_found' ? 404
      : r.result === 'already_on_record' || r.result === 'belongs_to_other' ? 409 : 400
    return NextResponse.json(
      { error: MESSAGES[r.result] ?? r.result, result: r.result, otherPersonId: r.other_person_id ?? null },
      { status },
    )
  }
  return NextResponse.json({ ok: true, id: r.id, email: r.email })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handle(request, id, 'add')
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handle(request, id, 'remove')
}
