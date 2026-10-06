import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAll } from '@/lib/fetchAll'
import {
  getClassPassPurchases,
  londonToday,
  toLondonDate,
  addDays,
  daysBetween,
  num,
  isRenewed,
  passHolderNames,
  PASS_SNAPSHOT_COLUMNS,
  type PassSnapshotRow,
} from '@/lib/passRenewals'

export const dynamic = 'force-dynamic'

// Read-only. Class passes ending within the next 15 days or ended in the last
// 30 days, using Momence's own end date from the nightly pass copy
// (momence_passes), not purchases.expires_at. A pass starts on its first
// booked class, so the CRM's purchase date plus a fixed number of days is
// wrong whenever someone buys ahead. Nothing about pass length is hardcoded.
//
// Each pass is judged on its LAST KNOWN copy: Momence stops listing a pass once
// it expires, and the nightly copy only covers people found in recent bookings.
// Only passes with a credit limit are listed (the Unlimited Pass renews by itself).
// Hidden if the person has bought another class pass (not a drop-in) dated
// 2 or more days after this pass started (same rule as the other pass lists).

const DAYS_AHEAD = 15
const DAYS_BACK = 30

export interface ExpiringPassRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number | null
  endDate: string
  daysLeft: number
  missingFromLatest: boolean
}

export async function GET() {
  try {
    const today = londonToday()
    const from = addDays(today, -DAYS_BACK)
    const to = addDays(today, DAYS_AHEAD)

    const { data: latest, error: latestErr } = await supabaseAdmin
      .from('momence_passes')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestErr) throw latestErr
    if (!latest) {
      return NextResponse.json({ snapshotDate: null, passes: [], hiddenAsRenewed: 0 })
    }
    const latestDate = latest.snapshot_date as string

    // Passes that had an end date near the window in any copy. The one-day
    // margins allow for end dates stored as UTC timestamps; the exact London
    // date check is done below on each pass's last known copy.
    const nearRows = await fetchAll<{ momence_bought_membership_id: string }>(() =>
      supabaseAdmin
        .from('momence_passes')
        .select('momence_bought_membership_id')
        .not('end_date', 'is', null)
        .gte('end_date', addDays(from, -1))
        .lte('end_date', addDays(to, 2))
        .order('momence_bought_membership_id'),
    )
    const passIds = [...new Set(nearRows.map(r => r.momence_bought_membership_id))]
    if (passIds.length === 0) {
      return NextResponse.json({ snapshotDate: latestDate, passes: [], hiddenAsRenewed: 0 })
    }

    // Every copy of those passes, to find the last known one (its end date may
    // have moved since, for example if the pass was extended).
    const allCopies = await fetchAll<PassSnapshotRow>(() =>
      supabaseAdmin
        .from('momence_passes')
        .select(PASS_SNAPSHOT_COLUMNS)
        .in('momence_bought_membership_id', passIds)
        .order('snapshot_date')
        .order('momence_bought_membership_id'),
    )
    const lastKnown = new Map<string, PassSnapshotRow>()
    for (const r of allCopies) {
      const prev = lastKnown.get(r.momence_bought_membership_id)
      if (!prev || r.snapshot_date > prev.snapshot_date) lastKnown.set(r.momence_bought_membership_id, r)
    }

    const candidates = [...lastKnown.values()].filter(r => {
      if (num(r.credits_total) === null) return false
      const end = toLondonDate(r.end_date)
      return end !== null && end >= from && end <= to
    })

    const purchases = await getClassPassPurchases(
      candidates.map(r => r.person_id).filter((id): id is string => !!id),
    )
    const kept = candidates.filter(r => !isRenewed(r, purchases))

    const nameOf = await passHolderNames(kept)

    const passes: ExpiringPassRow[] = kept
      .map(r => {
        const endDate = toLondonDate(r.end_date) as string
        return {
          passId: r.momence_bought_membership_id,
          personId: r.person_id,
          name: nameOf(r),
          passName: r.name,
          creditsLeft: num(r.credits_left),
          endDate,
          daysLeft: daysBetween(today, endDate),
          missingFromLatest: r.snapshot_date !== latestDate,
        }
      })
      .sort((a, b) => a.endDate.localeCompare(b.endDate))

    return NextResponse.json({
      snapshotDate: latestDate,
      passes,
      hiddenAsRenewed: candidates.length - kept.length,
    })
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Expiring passes failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
