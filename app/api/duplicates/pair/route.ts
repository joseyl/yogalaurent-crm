import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Not the same person, and its undo (Build D, migration 015). Behind the login.
 * Body: { action: 'not_same' | 'undo_not_same', a, b, note? }
 */

const MESSAGES: Record<string, string> = {
  not_found: 'One of these records no longer exists. Refresh the page.',
  same_record: 'That is the same record twice.',
  already_not_same: 'Already marked as not the same person. Refresh the page.',
  not_dismissed: 'This pair is not marked. Refresh the page.',
  bad_action: 'Unknown action.',
}

const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ error: MESSAGES.bad_action }, { status: 400 })
  }
  if (!isId(body.a) || !isId(body.b)) {
    return NextResponse.json({ error: MESSAGES.not_found }, { status: 404 })
  }
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('duplicate_pair_step', {
    p_action: body.action,
    p_a: body.a,
    p_b: body.b,
    p_note: typeof body.note === 'string' ? body.note.slice(0, 500) : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const r = data as { result: string }
  if (r.result !== 'done') {
    const status = r.result === 'not_found' ? 404 : r.result === 'bad_action' || r.result === 'same_record' ? 400 : 409
    return NextResponse.json({ error: MESSAGES[r.result] ?? r.result, result: r.result }, { status })
  }
  return NextResponse.json({ ok: true })
}
