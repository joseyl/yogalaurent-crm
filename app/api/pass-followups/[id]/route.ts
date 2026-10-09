import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * One step on a class pass follow-up (Build B, migration 012), from the dashboard card
 * "Class Passes: Expired with credits (decide)". Behind the login. The database step
 * pass_followup_step checks the step and saves it in one locked step; a double click
 * changes nothing.
 *
 * Body: { action, days?, outcome?, note?, on? }
 *   offer         To decide -> Offer extension
 *   back          Offer extension -> To decide
 *   no_extension  To decide -> Closed (No extension), note optional
 *   email_sent    Offer extension -> Follow-up due (7 days after the email); days 1 to 365,
 *                 on = email date (YYYY-MM-DD, not after today), note optional
 *   close         Follow-up due -> Closed; outcome extended, declined or no_reply, note optional
 */

const MESSAGES: Record<string, string> = {
  not_found: 'Follow-up not found.',
  closed: 'This follow-up is already closed.',
  wrong_step: 'This follow-up has moved on. Refresh the page.',
  bad_days: 'Enter the days offered, from 1 to 365.',
  future_date: 'The email date cannot be after today.',
  bad_date: 'The email date is more than 60 days ago. Check it.',
  bad_outcome: 'Choose an outcome: Extended, Declined or No reply.',
  bad_action: 'Unknown step.',
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    action?: unknown
    days?: unknown
    outcome?: unknown
    note?: unknown
    on?: unknown
  } | null
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ error: 'Unknown step.' }, { status: 400 })
  }

  const days = body.days === undefined || body.days === null || body.days === '' ? null : Number(body.days)
  if (days !== null && !Number.isInteger(days)) {
    return NextResponse.json({ error: MESSAGES.bad_days }, { status: 400 })
  }
  const on = typeof body.on === 'string' && body.on !== '' ? body.on : null
  if (on !== null && !/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    return NextResponse.json({ error: 'Enter the email date as a date.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('pass_followup_step', {
    p_id: id,
    p_action: body.action,
    p_days: days,
    p_outcome: typeof body.outcome === 'string' && body.outcome !== '' ? body.outcome : null,
    p_note: typeof body.note === 'string' ? body.note.slice(0, 1000) : null,
    p_on: on,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const r = data as { result: string; status?: string }
  if (r.result !== 'done') {
    const status = r.result === 'not_found' ? 404 : r.result === 'closed' || r.result === 'wrong_step' ? 409 : 400
    return NextResponse.json({ error: MESSAGES[r.result] ?? r.result, result: r.result }, { status })
  }

  return NextResponse.json({ ok: true, status: r.status })
}
