import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAll } from '@/lib/fetchAll'
import { login, getTotalSales, type MomenceSaleLine } from '@/lib/momence'
import { MomencePeople, momenceImportSettings } from '@/lib/momencePeople'

/**
 * Momence sales import (replaces the Zapier purchase webhooks).
 *
 * Reads Momence's Total Sales report for the last 35 days (95 on Sundays, to catch late
 * changes) and hands every line to the database function record_momence_sale
 * (supabase/migrations/009_momence_sales.sql), which saves each line once and decides
 * what it becomes, according to the switch in momence_import_settings:
 *   off          nothing is read
 *   record_only  lines saved and marked with what they would do; no purchases, no new people
 *   live         purchases from the start date; new people created from Momence
 * Also: private sessions (appointments) become attendance rows, and lines saved before
 * that are no longer in the report are flagged "missing" on the dashboard.
 */

export interface SalesResult {
  mode: string
  lines_read: number
  new_lines: number
  recorded: number
  to_sort: number
  refunds_seen: number
  missing: number
  people_created: number
  private_sessions: number
}

function londonDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(d)
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function saleKey(r: MomenceSaleLine): string | null {
  if (num(r.saleItemId) != null) return String(r.saleItemId)
  if (num(r.paymentTransactionId) != null) return `tx-${r.paymentTransactionId}`
  return null
}

export async function runMomenceSales(trigger: 'cron' | 'manual'): Promise<SalesResult> {
  const settings = await momenceImportSettings()

  const { data: runRow, error: runErr } = await supabaseAdmin
    .from('momence_sales_runs')
    .insert({ trigger, mode: settings.mode, status: settings.mode === 'off' ? 'skipped' : 'running' })
    .select('id')
    .single()
  if (runErr || !runRow) throw new Error(`Could not create momence_sales_runs row: ${runErr?.message ?? 'no data'}`)
  const runId = runRow.id as number

  const result: SalesResult = {
    mode: settings.mode, lines_read: 0, new_lines: 0, recorded: 0, to_sort: 0,
    refunds_seen: 0, missing: 0, people_created: 0, private_sessions: 0,
  }

  if (settings.mode === 'off') {
    await supabaseAdmin.from('momence_sales_runs').update({ finished_at: new Date().toISOString() }).eq('id', runId)
    return result
  }

  try {
    const runStart = new Date()
    const today = londonDate(runStart)
    const isSunday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short' }).format(runStart) === 'Sun'
    const from = addDays(today, isSunday ? -95 : -35)
    const live = settings.mode === 'live'

    const people = await MomencePeople.load()
    await login()
    const lines = await getTotalSales(from, today)
    result.lines_read = lines.length

    // Lines already saved in this window, so "new" counts only lines never seen before
    const known = new Set(
      (await fetchAll<{ sale_key: string }>(() =>
        supabaseAdmin
          .from('momence_sales')
          .select('sale_key')
          .gte('payment_date', `${from}T00:00:00.000Z`)
          .lte('payment_date', `${today}T23:59:59.999Z`),
      )).map(r => r.sale_key),
    )

    const privateRows: Record<string, unknown>[] = []

    for (const r of lines) {
      if (String(r.paymentStatus ?? '').toLowerCase() !== 'succeeded') continue
      const key = saleKey(r)
      if (!key || !r.paymentDate) continue

      const payer = {
        memberId: r.payingMemberId ?? r.memberId,
        email: r.payingCustomerEmail || r.customerEmail,
        name: r.payingCustomerName || r.customerName,
      }
      const personId = live ? await people.matchOrCreate(payer) : people.match(payer)

      const { data: outcome, error } = await supabaseAdmin.rpc('record_momence_sale', {
        p: {
          sale_key: key,
          sale_item_id: num(r.saleItemId),
          payment_transaction_id: num(r.paymentTransactionId),
          category: r.paymentCategory ?? null,
          item: (r.paymentItem ?? '').trim() || null,
          event_type: r.eventType ?? null,
          payment_date: r.paymentDate,
          service_date: r.serviceDate ?? null,
          value: num(r.paymentValue) ?? 0,
          credits: num(r.paidInMoneyCredits) ?? 0,
          refunded: num(r.refunded) ?? 0,
          payment_method: r.paymentMethod ?? null,
          member_id: num(r.memberId),
          paying_member_id: num(r.payingMemberId),
          email: r.payingCustomerEmail ?? null,
          customer_email: r.customerEmail ?? null,
          person_id: personId,
          session_booking_id: num(r.details?.sessionBookingId),
          bought_membership_id: num(r.details?.boughtMembershipId),
          appointment_reservation_id: num(r.details?.appointmentReservationId),
        },
      })
      if (error) throw new Error(`record_momence_sale failed on line ${key}: ${error.message}`)

      const o = String(outcome)
      if (!known.has(key)) {
        result.new_lines++
        known.add(key)
      }
      if (o === 'recorded') result.recorded++
      if (o === 'to_sort') result.to_sort++
      if (o === 'refund_seen') result.refunds_seen++

      // Private session: one attendance row per appointment (the class copy never sees these)
      const apptId = num(r.details?.appointmentReservationId)
      if (r.paymentCategory === 'appointment' && apptId != null && r.serviceDate) {
        const attendee = { memberId: r.memberId, email: r.customerEmail, name: r.customerName }
        const attendeeId = live ? await people.matchOrCreate(attendee) : people.match(attendee)
        const [first, ...rest] = String(r.customerName ?? '').trim().split(/\s+/)
        privateRows.push({
          source: 'momence',
          source_booking_id: `appt-${apptId}`,
          momence_member_id: num(r.memberId),
          class_name: (r.paymentItem ?? '').trim() || 'Private session',
          class_date: londonDate(new Date(r.serviceDate)),
          class_start: new Date(r.serviceDate).toISOString(),
          email: (r.customerEmail ?? '').toLowerCase().trim() || null,
          first_name: first || null,
          last_name: rest.join(' ') || null,
          cancelled: (num(r.refunded) ?? 0) > 0,
          person_id: attendeeId,
        })
      }
    }

    if (privateRows.length > 0) {
      const { error } = await supabaseAdmin.from('attendance_v2').upsert(privateRows, { onConflict: 'source,source_booking_id' })
      if (error) throw new Error(`Private sessions upsert failed: ${error.message}`)
    }
    result.private_sessions = privateRows.length

    // Lines saved earlier, inside this window, that Momence no longer lists
    const { data: gone, error: goneErr } = await supabaseAdmin
      .from('momence_sales')
      .update({ missing_since: runStart.toISOString(), checked_at: null })
      .gte('payment_date', `${from}T00:00:00.000Z`)
      .lte('payment_date', `${today}T23:59:59.999Z`)
      .lt('last_seen_at', runStart.toISOString())
      .is('missing_since', null)
      .select('id')
    if (goneErr) throw new Error(`Missing-line check failed: ${goneErr.message}`)
    result.missing = gone?.length ?? 0

    await people.saveMemberNumbers()
    result.people_created = people.created

    await supabaseAdmin
      .from('momence_sales_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        date_from: from,
        date_to: today,
        ...Object.fromEntries(Object.entries(result).filter(([k]) => k !== 'mode')),
      })
      .eq('id', runId)
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabaseAdmin
      .from('momence_sales_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error: msg.slice(0, 500) })
      .eq('id', runId)
    throw err
  }
}
