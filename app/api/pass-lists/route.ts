import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAll } from '@/lib/fetchAll'
import {
  getClassPassPurchases,
  londonToday,
  toLondonDate,
  addDays,
  type ClassPassPurchase,
} from '@/lib/passRenewals'

export const dynamic = 'force-dynamic'

// Read-only. Two lists built from the nightly Momence pass snapshots (momence_passes):
//   runningLow:      latest snapshot, pass with a credit limit, 1.5 credits or fewer, not expired
//   expiredWithCredits: pass whose last snapshot had credits left, has expired in the
//                    last 60 days, and is no longer in the latest snapshot
// Both hide anyone who has bought another class pass since the pass started.

const LOW_CREDITS = 1.5
const EXPIRED_WINDOW_DAYS = 60
// A purchase only counts as a renewal if it is dated this many days or more
// after the pass's start date. This stops a pass's own purchase counting as
// its renewal (Momence start dates are UTC timestamps, so a pass bought just
// after midnight UK time can start "the day before" its CRM purchase date).
const RENEWAL_MIN_DAYS_AFTER_START = 2

interface PassSnapshotRow {
  snapshot_date: string
  momence_member_id: string | null
  momence_bought_membership_id: string
  person_id: string | null
  name: string | null
  start_date: string | null
  end_date: string | null
  credits_left: number | string | null
  credits_total: number | string | null
}

export interface PassListRow {
  passId: string
  personId: string | null
  name: string
  passName: string | null
  creditsLeft: number
  endDate: string | null
}

const COLUMNS =
  'snapshot_date, momence_member_id, momence_bought_membership_id, person_id, name, start_date, end_date, credits_left, credits_total'

function num(v: number | string | null): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function isRenewed(pass: PassSnapshotRow, purchases: ClassPassPurchase[]): boolean {
  if (!pass.person_id) return false
  const start = toLondonDate(pass.start_date)
  if (!start) return false
  const threshold = addDays(start, RENEWAL_MIN_DAYS_AFTER_START)
  return purchases.some(p => p.person_id === pass.person_id && p.purchase_date >= threshold)
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
    const personIds = [...new Set([...lowKept, ...expiredKept].map(r => r.person_id).filter((id): id is string => !!id))]
    const unlinkedMemberIds = [
      ...new Set(
        [...lowKept, ...expiredKept]
          .filter(r => !r.person_id && r.momence_member_id)
          .map(r => r.momence_member_id as string),
      ),
    ]

    const [peopleRes, memberNames] = await Promise.all([
      personIds.length
        ? supabaseAdmin.from('people').select('id, first_name, last_name').in('id', personIds)
        : Promise.resolve({ data: [], error: null }),
      unlinkedMemberIds.length
        ? fetchAll<{ momence_member_id: string; first_name: string | null; last_name: string | null }>(() =>
            supabaseAdmin
              .from('attendance_v2')
              .select('momence_member_id, first_name, last_name')
              .in('momence_member_id', unlinkedMemberIds)
              .order('class_date', { ascending: false }),
          )
        : Promise.resolve([]),
    ])
    if (peopleRes.error) throw peopleRes.error

    const personName = new Map<string, string>()
    for (const p of peopleRes.data ?? []) {
      personName.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(' '))
    }
    const memberName = new Map<string, string>()
    for (const m of memberNames) {
      if (memberName.has(m.momence_member_id)) continue
      const n = [m.first_name, m.last_name].filter(Boolean).join(' ')
      if (n) memberName.set(m.momence_member_id, n)
    }

    function toRow(r: PassSnapshotRow): PassListRow {
      const name = r.person_id
        ? personName.get(r.person_id) || 'Unknown'
        : (r.momence_member_id && memberName.get(r.momence_member_id)) || 'Unknown Momence member'
      return {
        passId: r.momence_bought_membership_id,
        personId: r.person_id,
        name,
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
