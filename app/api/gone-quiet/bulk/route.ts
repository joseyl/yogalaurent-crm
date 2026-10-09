import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * One action on many people on the Gone Quiet page (tick boxes), migration 016. Behind the login.
 * The database step gone_quiet_bulk_step saves it all or nothing, in one locked step.
 *
 * Body: { personIds: string[], action, reason?, note?, on? }
 *   contacted    on = contact date (YYYY-MM-DD, default today), note optional (e.g. the campaign);
 *                people already contacted are skipped
 *   uncontacted  removes the contact date and note; people not contacted are skipped
 *   dismiss      reason not_interested, moved_away or other (deceased: one person at a time);
 *                note optional; people already dismissed are skipped
 *   undismiss    Bring back; people not dismissed are skipped
 * Answer: { ok, selected, changed, skipped } or { error } with nothing saved.
 */

const MAX = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function people(n: unknown): string {
  const k = typeof n === 'number' ? n : Number(n)
  return `${k} ${k === 1 ? 'person' : 'people'}`
}

function message(r: { result: string; count?: number }): string {
  switch (r.result) {
    case 'none_selected':
      return 'Nobody ticked.'
    case 'too_many':
      return `Too many ticked (${r.count}). Up to ${MAX} at a time.`
    case 'not_found':
      return `${people(r.count)} ticked ${r.count === 1 ? 'is' : 'are'} no longer on Gone Quiet. Refresh the page. Nothing saved.`
    case 'not_listed':
      return `${people(r.count)} ticked ${r.count === 1 ? 'is' : 'are'} inactive or deceased. Untick them. Nothing saved.`
    case 'dismissed':
      return `${people(r.count)} ticked ${r.count === 1 ? 'is' : 'are'} dismissed. Refresh the page. Nothing saved.`
    case 'future_date':
      return 'The contact date cannot be after today. Nothing saved.'
    case 'bad_date':
      return 'The contact date is more than 60 days ago. Check it. Nothing saved.'
    case 'bad_reason':
      return 'Choose a reason.'
    case 'deceased_one_at_a_time':
      return 'Deceased also changes the client status, so it is one person at a time.'
    case 'bad_action':
      return 'Unknown action.'
    default:
      return r.result
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    personIds?: unknown
    action?: unknown
    reason?: unknown
    note?: unknown
    on?: unknown
  } | null
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }
  if (!Array.isArray(body.personIds) || body.personIds.length === 0) {
    return NextResponse.json({ error: 'Nobody ticked.' }, { status: 400 })
  }
  if (body.personIds.length > MAX) {
    return NextResponse.json({ error: `Too many ticked (${body.personIds.length}). Up to ${MAX} at a time.` }, { status: 400 })
  }
  if (!body.personIds.every(id => typeof id === 'string' && UUID.test(id))) {
    return NextResponse.json({ error: 'Refresh the page and try again.' }, { status: 400 })
  }
  const on = typeof body.on === 'string' && body.on !== '' ? body.on : null
  if (on !== null && !/^\d{4}-\d{2}-\d{2}$/.test(on)) {
    return NextResponse.json({ error: 'Enter the contact date as a date.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('gone_quiet_bulk_step', {
    p_person_ids: body.personIds,
    p_action: body.action,
    p_reason: typeof body.reason === 'string' && body.reason !== '' ? body.reason : null,
    p_note: typeof body.note === 'string' ? body.note.slice(0, 1000) : null,
    p_on: on,
  })
  if (error) {
    return NextResponse.json({ error: `Nothing saved: ${error.message}` }, { status: 500 })
  }

  const r = data as { result: string; count?: number; selected?: number; changed?: number; skipped?: number }
  if (r.result !== 'done') {
    const conflict = ['not_found', 'dismissed'].includes(r.result)
    return NextResponse.json({ error: message(r), result: r.result }, { status: conflict ? 409 : 400 })
  }
  return NextResponse.json({ ok: true, selected: r.selected, changed: r.changed, skipped: r.skipped })
}
