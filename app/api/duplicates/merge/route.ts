import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Merge two client records (Build D, migration 015). Behind the login.
 * The database step merge_people does everything in one locked, all-or-nothing step and logs
 * every moved row so the merge can be undone.
 *
 * Body: { keep, remove, choices: { first_name, last_name, phone, country: 'keep' | 'remove',
 *         notes: 'keep' | 'remove' | 'both' }, note? }
 */

const MESSAGES: Record<string, string> = {
  not_found: 'One of these records no longer exists. Refresh the page.',
  same_record: 'You cannot merge a record into itself.',
  bad_choice: 'Choose a value for every field.',
}

const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)
const FIELDS = ['first_name', 'last_name', 'phone', 'country', 'notes'] as const

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || !isId(body.keep) || !isId(body.remove)) {
    return NextResponse.json({ error: MESSAGES.not_found }, { status: 404 })
  }
  const raw = (body.choices ?? {}) as Record<string, unknown>
  const choices: Record<string, string> = {}
  for (const f of FIELDS) {
    if (typeof raw[f] === 'string') choices[f] = raw[f] as string
  }

  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('merge_people', {
    p_keep: body.keep,
    p_remove: body.remove,
    p_choices: choices,
    p_note: typeof body.note === 'string' ? body.note.slice(0, 1000) : null,
  })
  if (error) {
    // A refusal raised inside the step: everything was undone, nothing changed
    const refused = error.message.startsWith('MERGE REFUSED')
    return NextResponse.json({ error: error.message }, { status: refused ? 409 : 500 })
  }
  const r = data as { result: string }
  if (r.result !== 'done') {
    const status = r.result === 'not_found' ? 404 : 400
    return NextResponse.json({ error: MESSAGES[r.result] ?? r.result, result: r.result }, { status })
  }
  return NextResponse.json({ ok: true, ...data })
}
