import { NextRequest, NextResponse } from 'next/server'
import { runMomenceSync } from '@/lib/momenceSync'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

async function ping(suffix = '', body?: string): Promise<void> {
  const base = process.env.HEALTHCHECKS_PING_URL
  if (!base) return
  try {
    await fetch(base + suffix, {
      method: body ? 'POST' : 'GET',
      body,
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    // ping failures must never break the run
  }
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ping('/start')

  try {
    const result = await runMomenceSync('cron')
    await ping()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await ping('/fail', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
