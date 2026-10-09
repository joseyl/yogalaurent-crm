import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * One action on a person on the Gone Quiet page (Build C, migration 013). Behind the login.
 * The database step gone_quiet_step checks and saves it in one locked step; a double click
 * changes nothing.
 *
 * Body: { action, reason?, note?, on? }
 *   contacted    on = contact date (YYYY-MM-DD, default today; not after today, not over 60 days ago)
 *   uncontacted  removes the contact date
 *   dismiss      reason not_interested, moved_away, deceased (also sets the client status) or other;
 *                note optional
 *   undismiss    brings a dismissed person back (does not undo a deceased status)
 */

const MESSAGES: Record<string, string> = {
  not_found: 'This person is not on Gone Quiet.',
  not_listed: 'This client is inactive or deceased.',
  dismissed: 'This person is dismissed. Bring them back first.',
  already_dismissed: 'Already dismissed. Refresh the page.',
  not_contacted: 'No contact date to remove. Refresh the page.',
  not_dismissed: 'Not dismissed. Refresh the page.',
  future_date: 'The contact date cannot be after today.',
  bad_date: 'The contact date is more than 60 days ago. Check it.',
  bad_reason: 'Choose a reason.',
  bad_action: 'Unknown action.',
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(personId)) {
    return NextResponse.json({ error: MESSAGES.not_found }, { status: 404 })
  }
  const body = (await request.json().catch(() => null)) as {
    action?: unknown
    reason?: unknown
    note?: unknown
    on?: unknown
  } | null
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ error: MESSAGES.bad_action }, { status: 400 })
  }
  const on = typeof body.on === 'string' && body.on !== '' ? body.on : null
  if (on !== null && !/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    return NextResponse.json({ error: 'Enter the contact date as a date.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('gone_quiet_step', {
    p_person_id: personId,
    p_action: body.action,
    p_reason: typeof body.reason === 'string' && body.reason !== '' ? body.reason : null,
    p_note: typeof body.note === 'string' ? body.note.slice(0, 1000) : null,
    p_on: on,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const r = data as { result: string }
  if (r.result !== 'done') {
    const conflict = ['already_dismissed', 'not_contacted', 'not_dismissed', 'dismissed'].includes(r.result)
    const status = r.result === 'not_found' ? 404 : conflict ? 409 : 400
    return NextResponse.json({ error: MESSAGES[r.result] ?? r.result, result: r.result }, { status })
  }
  return NextResponse.json({ ok: true, ...data })
}
