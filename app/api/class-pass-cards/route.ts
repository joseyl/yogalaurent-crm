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

// Read-only. The two class pass cards on the dashboard, built from the nightly
// Momence pass copy (momence_passes). Each pass is judged on its LAST KNOWN copy
// (Momence stops listing a pass once it ends) and lands on ONE card only:
//
//   renewalDue (action: renewal reminder), any of:
//     ending  - not ended, has a credit limit, ends within the next 15 days
//     low     - not ended, has a credit limit, 1.5 credits or fewer left, in the
//               latest copy (as the old Running low list), whatever the end date
//     lapsed  - ended in the last 30 days with 0 credits left, no credit limit,
//               or credits left unknown
//   expiredWithCredits (action: extension decision):
//     ended in the last 60 days with credits left above 0
//
// "Ended" means the London end date is before today (a pass ending today still
// counts as ending). Both cards hide a pass as renewed when EITHER:
//   - the person has bought another class pass (not a drop-in) since the pass
//     started (CRM purchases, isRenewed in lib/passRenewals.ts), or
//   - the same Momence member has another pass in the latest copy that started
//     later or has not started yet (renewedInMomence below). This catches
//     automatic Momence renewals, such as the Unlimited Pass, which never reach
//     the CRM as a purchase (seen 9 Oct 2026).

const DAYS_AHEAD = 15
const LAPSED_DAYS_BACK = 30
const EXPIRED_DAYS_BACK = 60
const LOW_CREDITS = 1.5

export type RenewalReason = 'ending' | 'low' | 'ending_low' | 'lapsed'

export interface ClassPassCardRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number | null
  hasCreditLimit: boolean
  endDate: string | null
  daysLeft: number | null
  reason: RenewalReason | 'expired'
  lastKnown: boolean
}

export async function GET() {
  try {
    const today = londonToday()
    const expiredCutoff = addDays(today, -EXPIRED_DAYS_BACK)
    const lapsedCutoff = addDays(today, -LAPSED_DAYS_BACK)
    const endingLimit = addDays(today, DAYS_AHEAD)

    const { data: latest, error: latestErr } = await supabaseAdmin
      .from('momence_passes')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestErr) throw latestErr
    if (!latest) {
      return NextResponse.json({ snapshotDate: null, renewalDue: [], expiredWithCredits: [], hiddenAsRenewed: null })
    }
    const latestDate = latest.snapshot_date as string

    // Every pass in the latest copy, plus the ids of passes from older copies
    // that ended recently or end later. The one-day margin allows for end dates
    // stored as UTC timestamps; the exact London date check is done below.
    const [latestRows, nearRows] = await Promise.all([
      fetchAll<PassSnapshotRow>(() =>
        supabaseAdmin
          .from('momence_passes')
          .select(PASS_SNAPSHOT_COLUMNS)
          .eq('snapshot_date', latestDate)
          .order('momence_bought_membership_id'),
      ),
      fetchAll<{ momence_bought_membership_id: string }>(() =>
        supabaseAdmin
          .from('momence_passes')
          .select('momence_bought_membership_id')
          .lt('snapshot_date', latestDate)
          .not('end_date', 'is', null)
          .gte('end_date', addDays(expiredCutoff, -1))
          .order('momence_bought_membership_id'),
      ),
    ])

    const lastKnown = new Map<string, PassSnapshotRow>()
    for (const r of latestRows) lastKnown.set(r.momence_bought_membership_id, r)

    // Passes no longer in the latest copy: find their last known copy (its end
    // date may have moved since, for example if the pass was extended).
    const olderIds = [...new Set(nearRows.map(r => r.momence_bought_membership_id))].filter(
      id => !lastKnown.has(id),
    )
    if (olderIds.length > 0) {
      const olderCopies = await fetchAll<PassSnapshotRow>(() =>
        supabaseAdmin
          .from('momence_passes')
          .select(PASS_SNAPSHOT_COLUMNS)
          .in('momence_bought_membership_id', olderIds)
          .order('snapshot_date')
          .order('momence_bought_membership_id'),
      )
      for (const r of olderCopies) {
        const prev = lastKnown.get(r.momence_bought_membership_id)
        if (!prev || r.snapshot_date > prev.snapshot_date) lastKnown.set(r.momence_bought_membership_id, r)
      }
    }

    // Passes in the latest copy by Momence member, for renewedInMomence
    const latestByMember = new Map<string, PassSnapshotRow[]>()
    for (const r of latestRows) {
      if (!r.momence_member_id) continue
      const list = latestByMember.get(r.momence_member_id) ?? []
      list.push(r)
      latestByMember.set(r.momence_member_id, list)
    }
    function renewedInMomence(pass: PassSnapshotRow): boolean {
      if (!pass.momence_member_id) return false
      const start = toLondonDate(pass.start_date)
      return (latestByMember.get(pass.momence_member_id) ?? []).some(other => {
        if (other.momence_bought_membership_id === pass.momence_bought_membership_id) return false
        const otherStart = toLondonDate(other.start_date)
        if (otherStart === null) return true // bought ahead, not started yet
        return start !== null && otherStart > start
      })
    }

    type Candidate = { row: PassSnapshotRow; reason: RenewalReason | 'expired' }
    const renewalCandidates: Candidate[] = []
    const expiredCandidates: Candidate[] = []

    for (const r of lastKnown.values()) {
      const hasLimit = num(r.credits_total) !== null
      const left = num(r.credits_left)
      const end = toLondonDate(r.end_date)
      // Ended: London end date before today
      if (end !== null && end < today) {
        if (end < expiredCutoff) continue
        if (left !== null && left > 0) {
          expiredCandidates.push({ row: r, reason: 'expired' })
        } else if (end >= lapsedCutoff) {
          renewalCandidates.push({ row: r, reason: 'lapsed' })
        }
        continue
      }

      if (!hasLimit) continue
      const ending = end !== null && end <= endingLimit
      const low = r.snapshot_date === latestDate && left !== null && left <= LOW_CREDITS
      if (ending && low) renewalCandidates.push({ row: r, reason: 'ending_low' })
      else if (ending) renewalCandidates.push({ row: r, reason: 'ending' })
      else if (low) renewalCandidates.push({ row: r, reason: 'low' })
    }

    const all = [...renewalCandidates, ...expiredCandidates]
    const purchases = await getClassPassPurchases(
      all.map(c => c.row.person_id).filter((id): id is string => !!id),
    )
    const renewed = (c: Candidate) => isRenewed(c.row, purchases) || renewedInMomence(c.row)
    const renewalKept = renewalCandidates.filter(c => !renewed(c))
    const expiredKept = expiredCandidates.filter(c => !renewed(c))

    const nameOf = await passHolderNames([...renewalKept, ...expiredKept].map(c => c.row))

    function toRow({ row: r, reason }: Candidate): ClassPassCardRow {
      const endDate = toLondonDate(r.end_date)
      return {
        passId: r.momence_bought_membership_id,
        personId: r.person_id,
        name: nameOf(r),
        passName: r.name,
        creditsLeft: num(r.credits_left),
        hasCreditLimit: num(r.credits_total) !== null,
        endDate,
        daysLeft: endDate ? daysBetween(today, endDate) : null,
        reason,
        lastKnown: r.snapshot_date !== latestDate,
      }
    }

    // Earliest end date first (lapsed passes come first); no end date last.
    const byEnd = (a: ClassPassCardRow, b: ClassPassCardRow) =>
      (a.endDate ?? '9999-12-31').localeCompare(b.endDate ?? '9999-12-31') || a.name.localeCompare(b.name)

    return NextResponse.json({
      snapshotDate: latestDate,
      renewalDue: renewalKept.map(toRow).sort(byEnd),
      expiredWithCredits: expiredKept.map(toRow).sort(byEnd),
      hiddenAsRenewed: {
        renewalDue: renewalCandidates.length - renewalKept.length,
        expiredWithCredits: expiredCandidates.length - expiredKept.length,
      },
    })
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Class pass cards failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
