import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Undo a merge (Build D, migration 015). Behind the login.
 * The database step undo_person_merge checks first and changes nothing if it refuses.
 * Body: { mergeId }
 */

const MESSAGES: Record<string, string> = {
  not_found: 'This merge no longer exists. Refresh the page.',
  already_undone: 'This merge is already undone. Refresh the page.',
  kept_missing: 'The kept record has since been merged into another record. Undo that merge first.',
  removed_exists: 'A record with the removed record\'s id exists again. Nothing changed.',
  email_in_use: 'The removed record\'s email is in use again (on another client, or added by hand since). Nothing changed.',
  rows_changed: 'Something moved by this merge has been deleted or moved since. Nothing changed.',
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { mergeId?: unknown } | null
  if (!body || typeof body.mergeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.mergeId)) {
    return NextResponse.json({ error: MESSAGES.not_found }, { status: 404 })
  }
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('undo_person_merge', { p_merge_id: body.mergeId })
  if (error) {
    const refused = error.message.startsWith('UNDO REFUSED')
    return NextResponse.json({ error: error.message }, { status: refused ? 409 : 500 })
  }
  const r = data as { result: string; table?: string }
  if (r.result !== 'done') {
    const msg = MESSAGES[r.result] ?? r.result
    return NextResponse.json(
      { error: r.table ? `${msg} (${r.table})` : msg, result: r.result },
      { status: r.result === 'not_found' ? 404 : 409 },
    )
  }
  return NextResponse.json({ ok: true, ...data })
}
