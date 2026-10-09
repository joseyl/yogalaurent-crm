import { createServerClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/fetchAll'
import type { MergeRow, PairRow, PersonSummary } from '@/lib/duplicatesShared'

// Build D, release 2 (claude/CRM_ROADMAP_2026-10-09.md): the Possible duplicates page and the
// merge screen. Pair rules live in the database view duplicate_pairs; merge and undo are the
// locked steps merge_people and undo_person_merge (supabase/migrations/015_duplicates_merge.sql).

const PAIR_COLUMNS =
  'person_a, person_b, same_email, same_phone, same_name, similar_name, rank, reasons, intro_offers, more_than_one_intro_offer, has_deceased, both_momence_numbers, not_same, not_same_note, not_same_at'

export async function getPairs(): Promise<PairRow[]> {
  const supabase = createServerClient()
  const rows = await fetchAll<PairRow>(() =>
    supabase.from('duplicate_pairs').select(PAIR_COLUMNS).order('person_a').order('person_b'),
  )
  return rows
}

// One summary per person: details, other emails, and how much history each record holds
export async function getPersonSummaries(ids: string[]): Promise<Map<string, PersonSummary>> {
  const out = new Map<string, PersonSummary>()
  const unique = [...new Set(ids)]
  if (unique.length === 0) return out
  const supabase = createServerClient()

  const [people, purchases, classes, leads, others] = await Promise.all([
    fetchAll<{
      id: string; first_name: string | null; last_name: string | null; email: string; alt_email: string | null
      phone: string | null; country: string | null; status: string; notes: string | null
      source_channel: string | null; momence_member_id: number | null; created_at: string | null
    }>(() =>
      supabase
        .from('people')
        .select('id, first_name, last_name, email, alt_email, phone, country, status, notes, source_channel, momence_member_id, created_at')
        .in('id', unique)
        .order('id'),
    ),
    fetchAll<{ id: string; person_id: string; amount_gbp: number | string | null; purchase_date: string | null; products: { name: string | null } | null }>(() =>
      supabase.from('purchases').select('id, person_id, amount_gbp, purchase_date, products(name)').in('person_id', unique).order('id'),
    ),
    fetchAll<{ id: string; person_id: string; class_date: string }>(() =>
      supabase
        .from('attendance_v2')
        .select('id, person_id, class_date')
        .in('person_id', unique)
        .eq('cancelled', false)
        .eq('duplicate_of_momence', false)
        .order('id'),
    ),
    fetchAll<{ id: string; person_id: string }>(() =>
      supabase.from('leads').select('id, person_id').in('person_id', unique).order('id'),
    ),
    fetchAll<{ id: string; person_id: string; email: string }>(() =>
      supabase.from('person_emails').select('id, person_id, email').in('person_id', unique).order('id'),
    ),
  ])

  const today = new Date().toISOString().slice(0, 10)
  for (const p of people) {
    out.set(p.id, {
      ...p,
      other_emails: [],
      purchases: 0,
      spend: 0,
      intro_offers: 0,
      classes: 0,
      leads: 0,
      last_activity: null,
    })
  }
  const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)
  for (const pu of purchases) {
    const s = out.get(pu.person_id)
    if (!s) continue
    s.purchases++
    s.spend += Number(pu.amount_gbp ?? 0)
    if ((pu.products?.name ?? '').toLowerCase().includes('introductory offer')) s.intro_offers++
    if (pu.purchase_date && pu.purchase_date <= today) s.last_activity = later(s.last_activity, pu.purchase_date)
  }
  for (const c of classes) {
    const s = out.get(c.person_id)
    if (!s) continue
    s.classes++
    if (c.class_date <= today) s.last_activity = later(s.last_activity, c.class_date)
  }
  for (const l of leads) {
    const s = out.get(l.person_id)
    if (s) s.leads++
  }
  for (const o of others) out.get(o.person_id)?.other_emails.push(o.email)
  return out
}

// The merge log, newest first
export async function getMerges(limit = 100): Promise<MergeRow[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('person_merges')
    .select('id, kept_id, removed_id, removed_person, row_counts, emails_added, emails_skipped, gone_quiet_rule, note, status, merged_at, undone_at')
    .order('merged_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = (data ?? []) as {
    id: string; kept_id: string; removed_id: string
    removed_person: { first_name?: string | null; last_name?: string | null; email?: string }
    row_counts: Record<string, number> | null; emails_added: string[] | null; emails_skipped: string[] | null
    gone_quiet_rule: string; note: string | null; status: 'merged' | 'undone'; merged_at: string; undone_at: string | null
  }[]
  const keptIds = [...new Set(rows.map(r => r.kept_id))]
  const { data: kept } = keptIds.length
    ? await supabase.from('people').select('id, first_name, last_name, email').in('id', keptIds)
    : { data: [] as { id: string; first_name: string | null; last_name: string | null; email: string }[] }
  const keptById = new Map((kept ?? []).map(k => [k.id as string, k]))
  return rows.map(r => {
    const k = keptById.get(r.kept_id)
    return {
      id: r.id,
      kept_id: r.kept_id,
      removed_id: r.removed_id,
      removed_name: [r.removed_person.first_name, r.removed_person.last_name].filter(Boolean).join(' ') || (r.removed_person.email ?? ''),
      removed_email: r.removed_person.email ?? '',
      kept_name: k ? [k.first_name, k.last_name].filter(Boolean).join(' ') || (k.email as string) : null,
      kept_exists: !!k,
      row_counts: r.row_counts ?? {},
      emails_added: r.emails_added ?? [],
      emails_skipped: r.emails_skipped ?? [],
      gone_quiet_rule: r.gone_quiet_rule,
      note: r.note,
      status: r.status,
      merged_at: r.merged_at,
      undone_at: r.undone_at,
    }
  })
}

// Most likely first: same email, same phone, same name, nickname; more reasons first
export function sortPairs(pairs: PairRow[], people: Map<string, PersonSummary>): PairRow[] {
  const nm = (id: string) => {
    const p = people.get(id)
    return `${p?.last_name ?? ''} ${p?.first_name ?? ''}`.toLowerCase()
  }
  return [...pairs].sort((a, b) => a.rank - b.rank || b.reasons - a.reasons || nm(a.person_a).localeCompare(nm(b.person_a)))
}
