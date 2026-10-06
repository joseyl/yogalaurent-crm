import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAll } from '@/lib/fetchAll'
import {
  getClassPassPurchases,
  londonToday,
  toLondonDate,
  addDays,
  num,
  isRenewed,
  passHolderNames,
  PASS_SNAPSHOT_COLUMNS as COLUMNS,
  type PassSnapshotRow,
} from '@/lib/passRenewals'

export const dynamic = 'force-dynamic'

// Read-only. Two lists built from the nightly Momence pass snapshots (momence_passes):
//   runningLow:      latest snapshot, pass with a credit limit, 1.5 credits or fewer, not expired
//   expiredWithCredits: pass whose last snapshot had credits left, has expired in the
//                    last 60 days, and is no longer in the latest snapshot
// Both hide anyone who has bought another class pass since the pass started.

const LOW_CREDITS = 1.5
const EXPIRED_WINDOW_DAYS = 60

export interface PassListRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number
  endDate: string | null
}

export async function GET() {
  try {
    const today = londonToday()
    const expiredCutoff = addDays(today, -EXPIRED_WINDOW_DAYS)

    // Latest snapshot date
    const { data: latest, error: latestErr } = await supabaseAdmin
      .from('momence_passes')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestErr) throw latestErr
    if (!latest) {
      return NextResponse.json({ snapshotDate: null, runningLow: [], expiredWithCredits: [] })
    }
    const latestDate = latest.snapshot_date as string

    const [latestRows, olderRows] = await Promise.all([
      fetchAll<PassSnapshotRow>(() =>
        supabaseAdmin
          .from('momence_passes')
          .select(COLUMNS)
          .eq('snapshot_date', latestDate)
          .order('momence_bought_membership_id'),
      ),
      // Older snapshots of passes that ended recently. The +1 day margin allows for
      // end dates stored as UTC timestamps; the exact London-date check is below.
      fetchAll<PassSnapshotRow>(() =>
        supabaseAdmin
          .from('momence_passes')
          .select(COLUMNS)
          .lt('snapshot_date', latestDate)
          .not('end_date', 'is', null)
          .gte('end_date', addDays(expiredCutoff, -1))
          .order('snapshot_date')
          .order('momence_bought_membership_id'),
      ),
    ])

    // Passes running low
    const lowCandidates = latestRows.filter(r => {
      const total = num(r.credits_total)
      const left = num(r.credits_left)
      if (total === null || left === null) return false
      if (left > LOW_CREDITS) return false
      const end = toLondonDate(r.end_date)
      return end === null || end >= today
    })

    // Expired with credits left: last known snapshot of each pass not in the latest one
    const inLatest = new Set(latestRows.map(r => r.momence_bought_membership_id))
    const lastKnown = new Map<string, PassSnapshotRow>()
    for (const r of olderRows) {
      if (inLatest.has(r.momence_bought_membership_id)) continue
      const prev = lastKnown.get(r.momence_bought_membership_id)
      if (!prev || r.snapshot_date > prev.snapshot_date) lastKnown.set(r.momence_bought_membership_id, r)
    }
    const expiredCandidates = [...lastKnown.values()].filter(r => {
      const left = num(r.credits_left)
      if (left === null || left <= 0) return false
      const end = toLondonDate(r.end_date)
      return end !== null && end < today && end >= expiredCutoff
    })

    // Renewal rule
    const allCandidates = [...lowCandidates, ...expiredCandidates]
    const purchases = await getClassPassPurchases(
      allCandidates.map(r => r.person_id).filter((id): id is string => !!id),
    )
    const lowKept = lowCandidates.filter(r => !isRenewed(r, purchases))
    const expiredKept = expiredCandidates.filter(r => !isRenewed(r, purchases))

    // Names: CRM client name when linked, otherwise the name Momence gave on bookings
    const nameOf = await passHolderNames([...lowKept, ...expiredKept])

    function toRow(r: PassSnapshotRow): PassListRow {
      return {
        passId: r.momence_bought_membership_id,
        personId: r.person_id,
        name: nameOf(r),
        passName: r.name,
        creditsLeft: num(r.credits_left) ?? 0,
        endDate: toLondonDate(r.end_date),
      }
    }

    const byEnd = (a: PassListRow, b: PassListRow) =>
      (a.endDate ?? '9999-12-31').localeCompare(b.endDate ?? '9999-12-31')

    return NextResponse.json({
      snapshotDate: latestDate,
      runningLow: lowKept.map(toRow).sort(byEnd),
      expiredWithCredits: expiredKept.map(toRow).sort(byEnd),
      hiddenAsRenewed: {
        runningLow: lowCandidates.length - lowKept.length,
        expiredWithCredits: expiredCandidates.length - expiredKept.length,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Pass lists failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
