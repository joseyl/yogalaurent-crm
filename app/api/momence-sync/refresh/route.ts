import { NextResponse } from 'next/server'
import { runMomenceSync } from '@/lib/momenceSync'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Refresh now: runs the nightly Momence copy on demand from the dashboard.
 *
 * Behind the login (not a public route in middleware.ts). Same work as the nightly job,
 * recorded in sync_runs with trigger "manual". It does not ping Healthchecks, so the
 * alert keeps watching only the nightly job. Refuses while another run is going.
 */

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const RUNNING_WINDOW_MS = 10 * 60 * 1000

export async function POST() {
  const since = new Date(Date.now() - RUNNING_WINDOW_MS).toISOString()
  const { data: running, error: runningError } = await supabaseAdmin
    .from('sync_runs')
    .select('started_at')
    .eq('status', 'running')
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(1)

  if (runningError) {
    return NextResponse.json({ error: `Could not check for a running copy: ${runningError.message}` }, { status: 500 })
  }

  if (running && running.length > 0) {
    const started = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(running[0].started_at as string))
    return NextResponse.json(
      { error: `A Momence copy is already running (started ${started}). Try again in a few minutes.` },
      { status: 409 },
    )
  }

  try {
    const result = await runMomenceSync('manual')
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
