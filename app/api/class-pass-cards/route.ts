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
  isIntroOffer,
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
// Introductory Offers (pass name contains "Introductory Offer") never go on
// these two cards. They have their own pair (Build A, 9 Oct 2026):
//   introNextStep: Intro Offers that ended in the last 30 days, hidden by the
//     same two-part renewal rule as the pass cards (another Intro Offer in
//     Momence does not count as a newer pass).
//   introNeverUsed: Intro Offers bought but never started. A Momence pass only
//     gets a start and end date on its first booked class, and the nightly copy
//     only fetches passes for people who booked a class in the last 120 days, so
//     most of these never reach the copy. Two sources, once per person:
//       - CRM purchase of "Introductory Offer" in the last 60 days, with no class
//         booked (attendance_v2, not cancelled) on or after the purchase date and
//         no class pass bought since (same day or later);
//       - an Intro Offer in the latest copy with no start date and no newer pass.
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
const INTRO_ENDED_DAYS_BACK = 30
const INTRO_BOUGHT_DAYS_BACK = 60

export type RenewalReason = 'ending' | 'low' | 'ending_low' | 'lapsed'
export type IntroReason = 'intro_ended' | 'intro_never_used'

export interface ClassPassCardRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number | null
  hasCreditLimit: boolean
  endDate: string | null
  daysLeft: number | null
  reason: RenewalReason | 'expired' | IntroReason
  lastKnown: boolean
  // Intro Offers bought but never used: the CRM purchase date, if known
  boughtDate: string | null
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
      return NextResponse.json({
        snapshotDate: null,
        renewalDue: [],
        expiredWithCredits: [],
        introNextStep: [],
        introNeverUsed: [],
        hiddenAsRenewed: null,
      })
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
    // For an Intro Offer, another Intro Offer is not a newer pass.
    function renewedInMomence(pass: PassSnapshotRow): boolean {
      if (!pass.momence_member_id) return false
      const start = toLondonDate(pass.start_date)
      const intro = isIntroOffer(pass.name)
      return (latestByMember.get(pass.momence_member_id) ?? []).some(other => {
        if (other.momence_bought_membership_id === pass.momence_bought_membership_id) return false
        if (intro && isIntroOffer(other.name)) return false
        const otherStart = toLondonDate(other.start_date)
        if (otherStart === null) return true // bought ahead, not started yet
        return start !== null && otherStart > start
      })
    }

    type Candidate = { row: PassSnapshotRow; reason: RenewalReason | 'expired' | IntroReason; boughtDate?: string | null }
    const renewalCandidates: Candidate[] = []
    const expiredCandidates: Candidate[] = []
    const introEndedCandidates: Candidate[] = []
    const introUnstartedInCopy: Candidate[] = []
    const introEndedCutoff = addDays(today, -INTRO_ENDED_DAYS_BACK)

    for (const r of lastKnown.values()) {
      const hasLimit = num(r.credits_total) !== null
      const left = num(r.credits_left)
      const end = toLondonDate(r.end_date)

      // Intro Offers: their own cards only
      if (isIntroOffer(r.name)) {
        if (end !== null && end < today) {
          if (end >= introEndedCutoff) introEndedCandidates.push({ row: r, reason: 'intro_ended' })
        } else if (toLondonDate(r.start_date) === null && r.snapshot_date === latestDate) {
          introUnstartedInCopy.push({ row: r, reason: 'intro_never_used' })
        }
        continue
      }
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

    // Intro Offers bought in the CRM in the last INTRO_BOUGHT_DAYS_BACK days
    const introBoughtCutoff = addDays(today, -INTRO_BOUGHT_DAYS_BACK)
    const introBuysRaw = await fetchAll<{
      id: string
      person_id: string | null
      purchase_date: string
      products: { name: string | null } | null
    }>(() =>
      supabaseAdmin
        .from('purchases')
        .select('id, person_id, purchase_date, products!inner(name)')
        .ilike('products.name', '%introductory offer%')
        .gte('purchase_date', introBoughtCutoff)
        .lte('purchase_date', today)
        .order('id'),
    )
    const introBuys = introBuysRaw.filter(b => !!b.person_id && isIntroOffer(b.products?.name))

    const all = [...renewalCandidates, ...expiredCandidates, ...introEndedCandidates, ...introUnstartedInCopy]
    const purchases = await getClassPassPurchases([
      ...all.map(c => c.row.person_id).filter((id): id is string => !!id),
      ...introBuys.map(b => b.person_id as string),
    ])
    const renewed = (c: Candidate) => isRenewed(c.row, purchases) || renewedInMomence(c.row)
    const renewalKept = renewalCandidates.filter(c => !renewed(c))
    const expiredKept = expiredCandidates.filter(c => !renewed(c))
    const introEndedKept = introEndedCandidates.filter(c => !renewed(c))

    // Bought, never used. CRM source first: no class booked on or after the
    // purchase date, and no class pass bought since.
    const introBuyerIds = [...new Set(introBuys.map(b => b.person_id as string))]
    const attendedSince = new Map<string, string>() // person -> latest class date
    if (introBuyerIds.length > 0) {
      const att = await fetchAll<{ person_id: string; class_date: string }>(() =>
        supabaseAdmin
          .from('attendance_v2')
          .select('person_id, class_date')
          .in('person_id', introBuyerIds)
          .eq('cancelled', false)
          .gte('class_date', introBoughtCutoff)
          .order('class_date'),
      )
      for (const a of att) {
        const prev = attendedSince.get(a.person_id)
        if (!prev || a.class_date > prev) attendedSince.set(a.person_id, a.class_date)
      }
    }
    // Latest Intro Offer purchase per person
    const latestIntroBuy = new Map<string, (typeof introBuys)[number]>()
    for (const b of introBuys) {
      const prev = latestIntroBuy.get(b.person_id as string)
      if (!prev || b.purchase_date > prev.purchase_date) latestIntroBuy.set(b.person_id as string, b)
    }
    // People with an Intro Offer in the latest copy that has started (used)
    const introStartedInCopy = new Set(
      latestRows
        .filter(r => isIntroOffer(r.name) && r.person_id && toLondonDate(r.start_date) !== null)
        .map(r => r.person_id as string),
    )
    const neverUsed: Candidate[] = []
    const neverUsedPeople = new Set<string>()
    let hiddenNeverUsed = 0
    for (const [personId, b] of latestIntroBuy) {
      const lastClass = attendedSince.get(personId)
      const used = lastClass !== undefined && lastClass >= b.purchase_date
      const boughtPass = purchases.some(p => p.person_id === personId && p.purchase_date >= b.purchase_date)
      if (used || boughtPass || introStartedInCopy.has(personId)) {
        hiddenNeverUsed++
        continue
      }
      neverUsedPeople.add(personId)
      neverUsed.push({
        row: {
          snapshot_date: latestDate,
          momence_member_id: null,
          momence_bought_membership_id: `crm-${b.id}`,
          person_id: personId,
          name: 'Introductory Offer',
          start_date: null,
          end_date: null,
          credits_left: null,
          credits_total: null,
        },
        reason: 'intro_never_used',
        boughtDate: b.purchase_date,
      })
    }
    // Momence copy source: not started, no newer pass, person not already listed
    for (const c of introUnstartedInCopy) {
      if (c.row.person_id && neverUsedPeople.has(c.row.person_id)) continue
      if (renewedInMomence(c.row)) {
        hiddenNeverUsed++
        continue
      }
      if (c.row.person_id) neverUsedPeople.add(c.row.person_id)
      neverUsed.push({ ...c, boughtDate: null })
    }

    const nameOf = await passHolderNames(
      [...renewalKept, ...expiredKept, ...introEndedKept, ...neverUsed].map(c => c.row),
    )

    function toRow({ row: r, reason, boughtDate }: Candidate): ClassPassCardRow {
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
        boughtDate: boughtDate ?? null,
      }
    }

    // Earliest end date first (lapsed passes come first); no end date last.
    const byEnd = (a: ClassPassCardRow, b: ClassPassCardRow) =>
      (a.endDate ?? '9999-12-31').localeCompare(b.endDate ?? '9999-12-31') || a.name.localeCompare(b.name)

    return NextResponse.json({
      snapshotDate: latestDate,
      renewalDue: renewalKept.map(toRow).sort(byEnd),
      expiredWithCredits: expiredKept.map(toRow).sort(byEnd),
      // Latest end date first: the most recent first visits are the warmest
      introNextStep: introEndedKept.map(toRow).sort((a, b) => -byEnd(a, b)),
      // Earliest purchase first; Momence-only rows (no purchase date) last
      introNeverUsed: neverUsed
        .map(toRow)
        .sort(
          (a, b) =>
            (a.boughtDate ?? '9999-12-31').localeCompare(b.boughtDate ?? '9999-12-31') ||
            a.name.localeCompare(b.name),
        ),
      hiddenAsRenewed: {
        renewalDue: renewalCandidates.length - renewalKept.length,
        expiredWithCredits: expiredCandidates.length - expiredKept.length,
        introNextStep: introEndedCandidates.length - introEndedKept.length,
        introNeverUsed: hiddenNeverUsed,
      },
    })
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Class pass cards failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
