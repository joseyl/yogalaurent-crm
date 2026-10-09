import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAll } from '@/lib/fetchAll'
import {
  getClassPassPurchases,
  toLondonDate,
  addDays,
  num,
  RENEWAL_MIN_DAYS_AFTER_START,
  PASS_SNAPSHOT_COLUMNS,
  type PassSnapshotRow,
} from '@/lib/passRenewals'

// Build B (claude/CRM_ROADMAP_2026-10-09.md): a decision trail for
// "Class Passes: Expired with credits (decide)". Table pass_followups,
// migration 012. Every change goes through a locked database step:
//   open_pass_followup()        To decide row for a pass on the card
//   pass_followup_step()        one step by hand (app/api/pass-followups/[id])
//   close_pass_followup_auto()  closed by itself, with the reason
//
// syncPassFollowups runs each time the dashboard loads the class pass cards:
//   1. every pass on Expired with credits gets a To decide row (a repeat changes nothing);
//   2. every open follow-up (any age) is closed by itself when, checked in this order:
//      - extended:     the pass is back in the Momence copy with a later end date. Only
//                      works for people who booked in the last 120 days (the nightly copy
//                      only fetches their passes, lib/momenceSync.ts step f);
//      - bought_pass:  a class pass bought (same rule as the pass cards: getClassPassPurchases,
//                      no drop-ins, no Intro Offers, dated 2 or more days after the pass
//                      started), or Momence shows a newer pass for the same member;
//      - booked_class: a class booked (not cancelled) dated after the pass ended, past or
//                      future, even a one-off. The nightly copy holds bookings up to 90 days
//                      ahead (count check 9 Oct 2026: 25 future bookings).
// A closed follow-up never comes back: the follow-up is unique per pass.

export type FollowupStatus = 'to_decide' | 'offer_extension' | 'followup_due' | 'closed'
export type FollowupOutcome =
  | 'extended'
  | 'declined'
  | 'no_reply'
  | 'no_extension'
  | 'bought_pass'
  | 'booked_class'

export interface PassFollowup {
  id: string
  momence_bought_membership_id: string
  person_id: string | null
  momence_member_id: string | null
  pass_name: string | null
  pass_start_date: string | null
  pass_end_date: string
  credits_left: number | string | null
  status: FollowupStatus
  email_sent_on: string | null
  followup_due_on: string | null
  days_offered: number | null
  outcome: FollowupOutcome | null
  closed_automatically: boolean
  close_reason: string | null
  closed_at: string | null
  note: string | null
  created_at: string
}

export const FOLLOWUP_COLUMNS =
  'id, momence_bought_membership_id, person_id, momence_member_id, pass_name, pass_start_date, pass_end_date, credits_left, status, email_sent_on, followup_due_on, days_offered, outcome, closed_automatically, close_reason, closed_at, note, created_at'

const THIS_YEAR = new Date().getFullYear()
function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(d.getUTCFullYear() !== THIS_YEAR ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

function rpcError(e: unknown): string {
  return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'unknown error'
}

export interface SyncResult {
  open: PassFollowup[]
  created: number
  closed: number
  errors: string[]
}

export async function syncPassFollowups(opts: {
  today: string
  // Passes on Expired with credits after the renewed-hiding rule (last known copy)
  toOpen: PassSnapshotRow[]
  // Every pass in the latest Momence copy
  latestRows: PassSnapshotRow[]
}): Promise<SyncResult> {
  const { today, toOpen, latestRows } = opts
  const errors: string[] = []
  let created = 0
  let closed = 0

  // 1. To decide rows for passes on the card. Only call the database step for passes
  //    with no row yet, or a row still missing its client.
  const ids = toOpen.map(r => r.momence_bought_membership_id)
  const existing = new Map<string, { person_id: string | null }>()
  if (ids.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('pass_followups')
      .select('momence_bought_membership_id, person_id')
      .in('momence_bought_membership_id', ids)
    if (error) throw error
    for (const r of data ?? []) existing.set(r.momence_bought_membership_id as string, { person_id: r.person_id as string | null })
  }
  for (const r of toOpen) {
    const ex = existing.get(r.momence_bought_membership_id)
    if (ex && (ex.person_id || !r.person_id)) continue
    const end = toLondonDate(r.end_date)
    if (!end) continue
    const { data, error } = await supabaseAdmin.rpc('open_pass_followup', {
      p_pass_id: r.momence_bought_membership_id,
      p_person_id: r.person_id,
      p_member_id: r.momence_member_id,
      p_pass_name: r.name,
      p_start: toLondonDate(r.start_date),
      p_end: end,
      p_credits: num(r.credits_left),
    })
    if (error) errors.push(`open ${r.momence_bought_membership_id}: ${rpcError(error)}`)
    else if (data === 'created') created++
    else if (!['exists', 'linked', 'intro_offer'].includes(String(data))) {
      errors.push(`open ${r.momence_bought_membership_id}: ${String(data)}`)
    }
  }

  // 2. Every open follow-up, any age
  const open = await fetchAll<PassFollowup>(() =>
    supabaseAdmin.from('pass_followups').select(FOLLOWUP_COLUMNS).neq('status', 'closed').order('id'),
  )
  if (open.length === 0) return { open, created, closed, errors }

  // Momence pass ids are whole numbers in momence_passes (bigint). Anything else (made-up
  // test passes) cannot be in the copy, and would make the lookup fail.
  const openIds = open.map(f => f.momence_bought_membership_id).filter(id => /^\d+$/.test(id))
  const personIds = [...new Set(open.map(f => f.person_id).filter((id): id is string => !!id))]
  const memberIds = [...new Set(open.map(f => f.momence_member_id).filter((id): id is string => !!id))]
  const earliestEnd = open.map(f => f.pass_end_date).sort()[0]

  const [copies, purchases, byPerson, byMember] = await Promise.all([
    // Every copy of these passes, newest first (the newest decides the current end date)
    openIds.length
      ? fetchAll<PassSnapshotRow>(() =>
          supabaseAdmin
            .from('momence_passes')
            .select(PASS_SNAPSHOT_COLUMNS)
            .in('momence_bought_membership_id', openIds)
            .order('snapshot_date', { ascending: false })
            .order('momence_bought_membership_id'),
        )
      : Promise.resolve([] as PassSnapshotRow[]),
    getClassPassPurchases(personIds),
    personIds.length
      ? fetchAll<{ person_id: string | null; momence_member_id: string | null; class_date: string }>(() =>
          supabaseAdmin
            .from('attendance_v2')
            .select('person_id, momence_member_id, class_date')
            .in('person_id', personIds)
            .eq('cancelled', false)
            .gt('class_date', earliestEnd)
            .order('class_date')
            .order('id'),
        )
      : Promise.resolve([]),
    memberIds.length
      ? fetchAll<{ person_id: string | null; momence_member_id: string | null; class_date: string }>(() =>
          supabaseAdmin
            .from('attendance_v2')
            .select('person_id, momence_member_id, class_date')
            .in('momence_member_id', memberIds)
            .eq('cancelled', false)
            .gt('class_date', earliestEnd)
            .order('class_date')
            .order('id'),
        )
      : Promise.resolve([]),
  ])

  const newestCopy = new Map<string, PassSnapshotRow>()
  for (const c of copies) {
    const prev = newestCopy.get(c.momence_bought_membership_id)
    if (!prev || c.snapshot_date > prev.snapshot_date) newestCopy.set(c.momence_bought_membership_id, c)
  }
  const bookings = [...byPerson, ...byMember]

  const stillOpen: PassFollowup[] = []
  for (const f of open) {
    let outcome: 'extended' | 'bought_pass' | 'booked_class' | null = null
    let reason = ''

    // Extended: Momence shows the pass with a later end date
    const copy = newestCopy.get(f.momence_bought_membership_id)
    const copyEnd = copy ? toLondonDate(copy.end_date) : null
    if (copyEnd && copyEnd > f.pass_end_date) {
      outcome = 'extended'
      reason = `Momence shows the pass running to ${shortDate(copyEnd)}`
    }

    // Bought a class pass (CRM purchase), or a newer pass in Momence
    if (!outcome && f.person_id) {
      const threshold = f.pass_start_date
        ? addDays(f.pass_start_date, RENEWAL_MIN_DAYS_AFTER_START)
        : addDays(f.pass_end_date, 1)
      const buy = purchases
        .filter(p => p.person_id === f.person_id && p.purchase_date >= threshold)
        .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))[0]
      if (buy) {
        outcome = 'bought_pass'
        reason = `Bought a class pass on ${shortDate(buy.purchase_date)}`
      }
    }
    if (!outcome && f.momence_member_id) {
      const newer = latestRows.find(o => {
        if (o.momence_member_id !== f.momence_member_id) return false
        if (o.momence_bought_membership_id === f.momence_bought_membership_id) return false
        const oStart = toLondonDate(o.start_date)
        if (oStart === null) return true // bought ahead, not started yet
        return f.pass_start_date !== null && oStart > f.pass_start_date
      })
      if (newer) {
        outcome = 'bought_pass'
        reason = `Momence shows a newer pass${newer.name ? ` (${newer.name})` : ''}`
      }
    }

    // A class booked after the pass ended, past or future
    if (!outcome) {
      const booked = bookings
        .filter(
          b =>
            b.class_date > f.pass_end_date &&
            ((f.person_id && b.person_id === f.person_id) ||
              (f.momence_member_id && b.momence_member_id === f.momence_member_id)),
        )
        .sort((a, b) => a.class_date.localeCompare(b.class_date))[0]
      if (booked) {
        outcome = 'booked_class'
        reason =
          booked.class_date >= today
            ? `Class booked for ${shortDate(booked.class_date)}`
            : `Came to a class on ${shortDate(booked.class_date)}`
      }
    }

    if (!outcome) {
      stillOpen.push(f)
      continue
    }
    const { data, error } = await supabaseAdmin.rpc('close_pass_followup_auto', {
      p_id: f.id,
      p_outcome: outcome,
      p_reason: reason,
    })
    if (error) {
      errors.push(`close ${f.id}: ${rpcError(error)}`)
      stillOpen.push(f)
    } else if (data === 'closed' || data === 'already_closed') {
      closed++
    } else {
      errors.push(`close ${f.id}: ${String(data)}`)
      stillOpen.push(f)
    }
  }

  return { open: stillOpen, created, closed, errors }
}
