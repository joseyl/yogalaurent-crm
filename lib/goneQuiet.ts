import { createServerClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/fetchAll'

// Build C (claude/CRM_ROADMAP_2026-10-09.md): the Gone Quiet page. All the rules live in
// the database view gone_quiet_people (supabase/migrations/013_gone_quiet.sql), so the
// page, the dashboard card, the export and count-only SQL always agree:
//   last activity = the later of the last class attended and the last purchase;
//   groups by calendar months back from today (London);
//   left out: future booking, active class pass, open class pass follow-up,
//   status inactive or deceased, dismissed (until they attend or buy again).
// Changes go through the locked database step gone_quiet_step (app/api/gone-quiet/[personId]).

import { GROUPS, type GapGroup, type GoneQuietRow } from '@/lib/goneQuietShared'

export { GROUPS, DISMISS_REASONS, isGapGroup } from '@/lib/goneQuietShared'
export type { GapGroup, DismissReason, GoneQuietRow } from '@/lib/goneQuietShared'

const COLUMNS =
  'person_id, first_name, last_name, email, status, classes_attended, came_once, last_class, last_purchase, last_activity, days_since, gap_group, contacted_on, contacted, dismissed_on, dismiss_reason, dismiss_note, dismissed, listed'

// Everyone listed plus everyone dismissed (for the Dismissed view). Paged, no cap.
// Sorted longest gap first, then surname.
export async function getGoneQuiet(): Promise<GoneQuietRow[]> {
  const supabase = createServerClient()
  const rows = await fetchAll<GoneQuietRow>(() =>
    supabase.from('gone_quiet_people').select(COLUMNS).or('listed.eq.true,dismissed.eq.true').order('person_id'),
  )
  return rows.sort(
    (a, b) =>
      a.last_activity.localeCompare(b.last_activity) ||
      (a.last_name ?? '').localeCompare(b.last_name ?? '') ||
      (a.first_name ?? '').localeCompare(b.first_name ?? ''),
  )
}

// Counts per group for the dashboard card (listed only). Throws if the view is missing.
export async function getGoneQuietCounts(): Promise<Record<GapGroup, number>> {
  const supabase = createServerClient()
  const results = await Promise.all(
    GROUPS.map(g =>
      supabase
        .from('gone_quiet_people')
        .select('person_id', { count: 'exact', head: true })
        .eq('listed', true)
        .eq('gap_group', g.key),
    ),
  )
  const out = {} as Record<GapGroup, number>
  GROUPS.forEach((g, i) => {
    const { count, error } = results[i]
    if (error || count === null) throw error ?? new Error('count unavailable')
    out[g.key] = count
  })
  return out
}
