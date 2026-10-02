import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAll } from '@/lib/fetchAll'
import {
  login,
  getSessions,
  getBookings,
  getActivePasses,
  type MomenceBooking,
} from '@/lib/momence'

export interface SyncResult {
  sessions_fetched: number
  bookings_upserted: number
  passes_saved: number
  new_class_names: number
}

function londonDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(date)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBatched(table: string, rows: any[], onConflict: string, ignoreDuplicates = false) {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabaseAdmin
      .from(table)
      .upsert(rows.slice(i, i + BATCH), { onConflict, ignoreDuplicates })
    if (error) throw new Error(`Upsert ${table} batch failed: ${error.message}`)
  }
}

export async function runMomenceSync(trigger: 'cron' | 'manual'): Promise<SyncResult> {
  const runStart = Date.now()
  const DEADLINE = runStart + 250_000

  function checkDeadline() {
    if (Date.now() >= DEADLINE) throw new Error('Ran out of time')
  }

  // Step a: Create sync_runs row
  const { data: runRow, error: runInsertErr } = await supabaseAdmin
    .from('sync_runs')
    .insert({ status: 'running', trigger })
    .select('id')
    .single()

  if (runInsertErr || !runRow) {
    throw new Error(`Failed to create sync_runs row: ${runInsertErr?.message ?? 'no data'}`)
  }
  const runId = runRow.id as number

  async function failRun(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabaseAdmin
      .from('sync_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error: msg.slice(0, 500) })
      .eq('id', runId)
  }

  try {
    const stepMs: Record<string, number> = {}

    // Step b: Load people for email matching
    const t0 = Date.now()
    const people = await fetchAll<{ id: string; email: string | null; alt_email: string | null }>(
      () => supabaseAdmin.from('people').select('id,email,alt_email'),
    )
    const byEmail = new Map<string, string>()
    const byAltEmail = new Map<string, string>()
    for (const p of people) {
      if (p.email) byEmail.set(p.email.toLowerCase().trim(), p.id)
      if (p.alt_email) byAltEmail.set(p.alt_email.toLowerCase().trim(), p.id)
    }
    function matchPerson(email: string | null | undefined): string | null {
      if (!email) return null
      const e = email.toLowerCase().trim()
      return byEmail.get(e) ?? byAltEmail.get(e) ?? null
    }
    stepMs.people_load = Date.now() - t0

    // Step c: Login and fetch sessions (7 days ago → 90 days ahead)
    checkDeadline()
    const t1 = Date.now()
    await login()
    const now = new Date()
    const startAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const startBefore = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
    const sessions = await getSessions(startAfter, startBefore)
    stepMs.sessions = Date.now() - t1

    // Fetch bookings for each session
    const t2 = Date.now()
    const allPairs: Array<{
      sessionId: number
      sessionName: string
      sessionStartsAt: string
      booking: MomenceBooking
    }> = []
    for (const session of sessions) {
      checkDeadline()
      const bookings = await getBookings(session.id)
      for (const booking of bookings) {
        allPairs.push({
          sessionId: session.id,
          sessionName: session.name,
          sessionStartsAt: session.startsAt,
          booking,
        })
      }
    }
    stepMs.bookings = Date.now() - t2

    // Step d: Upsert attendance_v2 (omit pass_used and duplicate_of_momence)
    const t3 = Date.now()
    const attendanceRows = allPairs.map(({ sessionId, sessionName, sessionStartsAt, booking }) => {
      const member = booking.member ?? {}
      const email = (member.email ?? '').toLowerCase().trim()
      const classDate = sessionStartsAt ? londonDate(new Date(sessionStartsAt)) : null
      return {
        source: 'momence',
        source_booking_id: String(booking.id),
        momence_session_id: sessionId ? String(sessionId) : null,
        momence_member_id: member.id ? String(member.id) : null,
        class_name: (sessionName ?? '').trim() || null,
        class_date: classDate,
        class_start: sessionStartsAt ? new Date(sessionStartsAt).toISOString() : null,
        email: email || null,
        first_name: (member.firstName ?? '').trim() || null,
        last_name: (member.lastName ?? '').trim() || null,
        cancelled: !!(booking.cancelledAt),
        cancelled_at: booking.cancelledAt ?? null,
        checked_in: !!booking.checkedIn,
        person_id: matchPerson(email),
      }
    })
    await upsertBatched('attendance_v2', attendanceRows, 'source,source_booking_id')
    stepMs.attendance_upsert = Date.now() - t3

    // Step e: Insert new class names into class_labels with label 'unlabelled'
    const t4 = Date.now()
    const classNameSet = new Set<string>()
    for (const { sessionName } of allPairs) {
      const name = (sessionName ?? '').trim()
      if (name) classNameSet.add(name)
    }
    const classNamesArr = [...classNameSet]
    let newClassNamesCount = 0
    if (classNamesArr.length > 0) {
      const existing = await fetchAll<{ class_name: string }>(
        () =>
          supabaseAdmin
            .from('class_labels')
            .select('class_name')
            .in('class_name', classNamesArr),
      )
      const existingSet = new Set(existing.map(r => r.class_name))
      newClassNamesCount = classNamesArr.filter(n => !existingSet.has(n)).length
      await upsertBatched(
        'class_labels',
        classNamesArr.map(class_name => ({ class_name, label: 'unlabelled' })),
        'class_name',
        true,
      )
    }
    stepMs.class_labels = Date.now() - t4

    // Step f: Active passes for members who attended in the last 120 days
    const t5 = Date.now()
    const cutoff = londonDate(new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000))
    const memberRows = await fetchAll<{
      momence_member_id: string | null
      person_id: string | null
    }>(
      () =>
        supabaseAdmin
          .from('attendance_v2')
          .select('momence_member_id,person_id')
          .eq('source', 'momence')
          .eq('cancelled', false)
          .gte('class_date', cutoff)
          .not('momence_member_id', 'is', null),
    )
    // Build member → person_id map, keeping first non-null person_id per member
    const memberPersonMap = new Map<string, string | null>()
    for (const row of memberRows) {
      if (!row.momence_member_id) continue
      if (!memberPersonMap.has(row.momence_member_id) || !memberPersonMap.get(row.momence_member_id)) {
        memberPersonMap.set(row.momence_member_id, row.person_id)
      }
    }
    stepMs.passes_query = Date.now() - t5

    const t6 = Date.now()
    const snapshotDate = londonDate(now)
    // Map keyed on momence_bought_membership_id — last write wins, deduplicating within the batch
    const passRowMap = new Map<string, Record<string, unknown>>()
    let skippedPasses = 0
    for (const [memberId, personId] of memberPersonMap) {
      checkDeadline()
      const passes = await getActivePasses(memberId)
      for (const item of passes) {
        if (!item.id) { skippedPasses++; continue }
        const boughtId = String(item.id)
        passRowMap.set(boughtId, {
          snapshot_date: snapshotDate,
          momence_member_id: memberId,          // from the request, not the response item
          momence_bought_membership_id: boughtId,
          person_id: personId ?? null,
          name: item.membership?.name ?? null,
          type: item.type ?? null,
          start_date: item.startDate ?? null,
          end_date: item.endDate ?? null,
          credits_left: item.eventCreditsLeft ?? null,   // numeric; can be decimal
          credits_total: item.eventCreditsTotal ?? null,
          frozen: item.isFrozen ?? false,
          raw: item,
        })
      }
    }
    const passRows = [...passRowMap.values()]
    if (passRows.length > 0) {
      await upsertBatched('momence_passes', passRows, 'snapshot_date,momence_bought_membership_id')
    }
    stepMs.passes_upsert = Date.now() - t6
    if (skippedPasses > 0) stepMs.passes_skipped = skippedPasses
    stepMs.total = Date.now() - runStart

    // Step g: Mark run as success
    const result: SyncResult = {
      sessions_fetched: sessions.length,
      bookings_upserted: allPairs.length,
      passes_saved: passRows.length,
      new_class_names: newClassNamesCount,
    }
    await supabaseAdmin
      .from('sync_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        sessions_fetched: result.sessions_fetched,
        bookings_upserted: result.bookings_upserted,
        passes_saved: result.passes_saved,
        new_class_names: result.new_class_names,
        details: { step_ms: stepMs },
      })
      .eq('id', runId)

    return result
  } catch (err) {
    // Step h: Mark run as failed, then rethrow
    await failRun(err)
    throw err
  }
}
