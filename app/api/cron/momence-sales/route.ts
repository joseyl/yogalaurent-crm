import { NextRequest, NextResponse } from 'next/server'
import { runMomenceSales } from '@/lib/momenceSales'

// Nightly Momence sales import (lib/momenceSales.ts), 30 minutes after the class copy.
// Pings its own Healthchecks check (HEALTHCHECKS_SALES_PING_URL); skipped when not set.

export const maxDuration = 300
export const dynamic = 'force-dynamic'

async function ping(suffix = '', body?: string): Promise<void> {
  const base = process.env.HEALTHCHECKS_SALES_PING_URL
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
    const result = await runMomenceSales('cron')
    await ping()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await ping('/fail', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
