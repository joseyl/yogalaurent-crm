-- 016_gone_quiet_bulk.sql
-- Gone Quiet, follow-up to Build C (migration 013): a contact note, and actions on many people
-- at once (tick boxes on the Gone Quiet page).
-- Run by hand in the Supabase SQL Editor BEFORE the code that uses it goes live.
-- Run supabase/tests/016_gone_quiet_bulk_test.sql first: it runs all of this plus checks, then
-- undoes everything.
--
-- What it adds or changes:
--   gone_quiet_actions.contact_note   short note saved with Contacted (for example the campaign
--                                     name). Cleared by Undo contacted.
--   gone_quiet_people                 the same view as 013, with contact_note added at the end
--   gone_quiet_step()                 the same one-person step as 013; Contacted now saves the
--                                     note (p_note) and Undo contacted clears it
--   gone_quiet_bulk_step()            one action on up to 1,000 people, all or nothing, in one
--                                     locked step (same lock as gone_quiet_step)
--
-- Bulk rules:
--   contacted    date (default today; not after today, not over 60 days ago) and an optional
--                note for everyone ticked. People already contacted are skipped (their date and
--                note stay). Refused, nothing saved, if anyone ticked is dismissed, inactive or
--                deceased.
--   uncontacted  removes the date and note. People with no contact date are skipped.
--   dismiss      reason not_interested, moved_away or other, optional note. Deceased is refused
--                in bulk (it also changes the client status: one person at a time). People
--                already dismissed are skipped.
--   undismiss    Bring back. People not dismissed are skipped.
--   Refused, nothing saved: no one ticked, more than 1,000, or anyone ticked not found on
--   Gone Quiet. A person ticked twice counts once.
--
-- To remove (back to 013): run the gone_quiet_step and view sections of 013 again, then
--   drop function if exists public.gone_quiet_bulk_step(uuid[], text, text, text, date);
--   alter table public.gone_quiet_actions drop column if exists contact_note;
-- (the view must be put back first, because it reads contact_note)

-- 1. The contact note ------------------------------------------------------------------------

alter table public.gone_quiet_actions add column if not exists contact_note text;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.gone_quiet_actions'::regclass
                   and conname = 'gone_quiet_actions_contact_note_check') then
    alter table public.gone_quiet_actions
      add constraint gone_quiet_actions_contact_note_check
      check (contacted_on is not null or contact_note is null);
  end if;
end $$;

-- 2. The view, as in 013, with contact_note added at the end ---------------------------------

create or replace view public.gone_quiet_people
with (security_invoker = true) as
with t as (
  select (now() at time zone 'Europe/London')::date as d
),
cls as (
  select a.person_id, max(a.class_date) as last_class, count(*) as classes_attended
  from attendance_v2 a, t
  where a.cancelled = false and a.duplicate_of_momence = false and a.person_id is not null
    and a.class_date <= t.d
  group by a.person_id
),
buy as (
  select pu.person_id, max(pu.purchase_date) as last_purchase
  from purchases pu, t
  where pu.person_id is not null and pu.purchase_date <= t.d
  group by pu.person_id
),
fut as (
  select distinct a.person_id
  from attendance_v2 a, t
  where a.cancelled = false and a.person_id is not null and a.class_date > t.d
),
latest as (
  select max(snapshot_date) as s from momence_passes
),
act_pass as (
  select distinct coalesce(mp.person_id, m.person_id) as person_id
  from momence_passes mp
  join latest on mp.snapshot_date = latest.s
  cross join t
  left join lateral (
    select a.person_id from attendance_v2 a
    where a.momence_member_id = mp.momence_member_id and a.person_id is not null
    order by a.class_date desc
    limit 1
  ) m on mp.person_id is null
  where mp.end_date is null
     or (mp.end_date::timestamptz at time zone 'Europe/London')::date >= t.d
),
open_fu as (
  select distinct person_id from pass_followups
  where status <> 'closed' and person_id is not null
),
base as (
  select
    p.id as person_id,
    p.first_name,
    p.last_name,
    p.email,
    p.status,
    c.classes_attended,
    c.last_class,
    b.last_purchase,
    greatest(c.last_class, b.last_purchase) as last_activity,
    (f.person_id is not null) as has_future_booking,
    (ap.person_id is not null) as has_active_pass,
    (o.person_id is not null) as has_open_pass_followup,
    ga.contacted_on,
    ga.dismissed_on,
    ga.dismiss_reason,
    ga.dismiss_note,
    ga.contact_note,
    t.d as today
  from people p
  join cls c on c.person_id = p.id
  cross join t
  left join buy b on b.person_id = p.id
  left join fut f on f.person_id = p.id
  left join act_pass ap on ap.person_id = p.id
  left join open_fu o on o.person_id = p.id
  left join gone_quiet_actions ga on ga.person_id = p.id
),
grouped as (
  select base.*,
    case
      when last_activity > (today - interval '1 month')::date  then 'active'
      when last_activity > (today - interval '3 months')::date then '1_to_3_months'
      when last_activity > (today - interval '6 months')::date then '3_to_6_months'
      when last_activity > (today - interval '12 months')::date then '6_to_12_months'
      else 'over_1_year'
    end as gap_group,
    (today - last_activity) as days_since,
    (classes_attended = 1) as came_once,
    (dismissed_on is not null and last_activity < dismissed_on) as dismissed,
    (contacted_on is not null and contacted_on >= last_activity) as contacted
  from base
)
select
  person_id, first_name, last_name, email, status,
  classes_attended, came_once, last_class, last_purchase, last_activity, days_since, gap_group,
  has_future_booking, has_active_pass, has_open_pass_followup,
  contacted_on, contacted, dismissed_on, dismiss_reason, dismiss_note, dismissed,
  (gap_group <> 'active'
    and not has_future_booking and not has_active_pass and not has_open_pass_followup
    and status not in ('inactive', 'deceased')
    and not dismissed) as listed,
  contact_note
from grouped;

revoke all on public.gone_quiet_people from public, anon, authenticated;
grant select on public.gone_quiet_people to service_role;

-- 3. One action by hand (as in 013; Contacted saves the note, Undo contacted clears it) --------

create or replace function public.gone_quiet_step(
  p_person_id uuid,
  p_action text,
  p_reason text,
  p_note text,
  p_on date
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  g record;
  a gone_quiet_actions%rowtype;
  v_today date := (now() at time zone 'Europe/London')::date;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 1000), '');
  v_on date;
begin
  perform pg_advisory_xact_lock(hashtext('gone_quiet'));

  if p_action is null or p_action not in ('contacted', 'uncontacted', 'dismiss', 'undismiss') then
    return jsonb_build_object('result', 'bad_action');
  end if;

  select * into g from gone_quiet_people where person_id = p_person_id;
  if not found then return jsonb_build_object('result', 'not_found'); end if;

  select * into a from gone_quiet_actions where person_id = p_person_id for update;

  if p_action = 'contacted' then
    if g.status in ('inactive', 'deceased') then return jsonb_build_object('result', 'not_listed'); end if;
    if g.dismissed then return jsonb_build_object('result', 'dismissed'); end if;
    v_on := coalesce(p_on, v_today);
    if v_on > v_today then return jsonb_build_object('result', 'future_date'); end if;
    if v_on < v_today - 60 then return jsonb_build_object('result', 'bad_date'); end if;
    insert into gone_quiet_actions (person_id, contacted_on, contact_note) values (p_person_id, v_on, v_note)
      on conflict (person_id) do update
        set contacted_on = excluded.contacted_on, contact_note = excluded.contact_note, updated_at = now();

  elsif p_action = 'uncontacted' then
    if a.person_id is null or a.contacted_on is null then
      return jsonb_build_object('result', 'not_contacted');
    end if;
    update gone_quiet_actions set contacted_on = null, contact_note = null, updated_at = now()
      where person_id = p_person_id;

  elsif p_action = 'dismiss' then
    if g.dismissed then return jsonb_build_object('result', 'already_dismissed'); end if;
    if p_reason is null or p_reason not in ('not_interested', 'moved_away', 'deceased', 'other') then
      return jsonb_build_object('result', 'bad_reason');
    end if;
    insert into gone_quiet_actions (person_id, dismissed_on, dismiss_reason, dismiss_note)
      values (p_person_id, v_today, p_reason, v_note)
      on conflict (person_id) do update
        set dismissed_on = excluded.dismissed_on, dismiss_reason = excluded.dismiss_reason,
            dismiss_note = excluded.dismiss_note, updated_at = now();
    if p_reason = 'deceased' then
      update people set status = 'deceased' where id = p_person_id and status <> 'deceased';
    end if;

  elsif p_action = 'undismiss' then
    if a.person_id is null or a.dismissed_on is null then
      return jsonb_build_object('result', 'not_dismissed');
    end if;
    update gone_quiet_actions
      set dismissed_on = null, dismiss_reason = null, dismiss_note = null, updated_at = now()
      where person_id = p_person_id;
  end if;

  select * into g from gone_quiet_people where person_id = p_person_id;
  return jsonb_build_object('result', 'done', 'contacted', g.contacted, 'contacted_on', g.contacted_on,
                            'dismissed', g.dismissed, 'listed', g.listed, 'status', g.status);
end;
$$;

revoke all on function public.gone_quiet_step(uuid, text, text, text, date) from public, anon, authenticated;
grant execute on function public.gone_quiet_step(uuid, text, text, text, date) to service_role;

-- 4. One action on many people, all or nothing -----------------------------------------------
-- Returns { result: 'done', selected, changed, skipped } or a refusal with nothing saved:
--   bad_action, none_selected, too_many, not_found (count), not_listed (count),
--   dismissed (count), future_date, bad_date, bad_reason, deceased_one_at_a_time.

create or replace function public.gone_quiet_bulk_step(
  p_person_ids uuid[],
  p_action text,
  p_reason text,
  p_note text,
  p_on date
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 1000), '');
  v_on date;
  v_ids uuid[];
  v_n int;
  v_found int;
  v_not_listed int;
  v_dismissed int;
  v_changed int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('gone_quiet'));

  if p_action is null or p_action not in ('contacted', 'uncontacted', 'dismiss', 'undismiss') then
    return jsonb_build_object('result', 'bad_action');
  end if;

  select coalesce(array_agg(distinct x), '{}'::uuid[]) into v_ids
    from unnest(coalesce(p_person_ids, '{}'::uuid[])) as x where x is not null;
  v_n := cardinality(v_ids);
  if v_n = 0 then return jsonb_build_object('result', 'none_selected'); end if;
  if v_n > 1000 then return jsonb_build_object('result', 'too_many', 'count', v_n); end if;

  select count(*),
         count(*) filter (where g.status in ('inactive', 'deceased')),
         count(*) filter (where g.dismissed)
    into v_found, v_not_listed, v_dismissed
    from gone_quiet_people g where g.person_id = any(v_ids);
  if v_found < v_n then
    return jsonb_build_object('result', 'not_found', 'count', v_n - v_found);
  end if;

  -- The rows of everyone ticked, locked for the rest of the step
  perform 1 from gone_quiet_actions where person_id = any(v_ids) for update;

  if p_action = 'contacted' then
    if v_not_listed > 0 then return jsonb_build_object('result', 'not_listed', 'count', v_not_listed); end if;
    if v_dismissed > 0 then return jsonb_build_object('result', 'dismissed', 'count', v_dismissed); end if;
    v_on := coalesce(p_on, v_today);
    if v_on > v_today then return jsonb_build_object('result', 'future_date'); end if;
    if v_on < v_today - 60 then return jsonb_build_object('result', 'bad_date'); end if;
    insert into gone_quiet_actions (person_id, contacted_on, contact_note)
      select g.person_id, v_on, v_note from gone_quiet_people g
      where g.person_id = any(v_ids) and not g.contacted
      on conflict (person_id) do update
        set contacted_on = excluded.contacted_on, contact_note = excluded.contact_note, updated_at = now();
    get diagnostics v_changed = row_count;

  elsif p_action = 'uncontacted' then
    update gone_quiet_actions set contacted_on = null, contact_note = null, updated_at = now()
      where person_id = any(v_ids) and contacted_on is not null;
    get diagnostics v_changed = row_count;

  elsif p_action = 'dismiss' then
    if p_reason = 'deceased' then return jsonb_build_object('result', 'deceased_one_at_a_time'); end if;
    if p_reason is null or p_reason not in ('not_interested', 'moved_away', 'other') then
      return jsonb_build_object('result', 'bad_reason');
    end if;
    insert into gone_quiet_actions (person_id, dismissed_on, dismiss_reason, dismiss_note)
      select g.person_id, v_today, p_reason, v_note from gone_quiet_people g
      where g.person_id = any(v_ids) and not g.dismissed
      on conflict (person_id) do update
        set dismissed_on = excluded.dismissed_on, dismiss_reason = excluded.dismiss_reason,
            dismiss_note = excluded.dismiss_note, updated_at = now();
    get diagnostics v_changed = row_count;

  elsif p_action = 'undismiss' then
    update gone_quiet_actions
      set dismissed_on = null, dismiss_reason = null, dismiss_note = null, updated_at = now()
      where person_id = any(v_ids) and dismissed_on is not null;
    get diagnostics v_changed = row_count;
  end if;

  return jsonb_build_object('result', 'done', 'selected', v_n, 'changed', v_changed,
                            'skipped', v_n - v_changed);
end;
$$;

revoke all on function public.gone_quiet_bulk_step(uuid[], text, text, text, date) from public, anon, authenticated;
grant execute on function public.gone_quiet_bulk_step(uuid[], text, text, text, date) to service_role;

-- Check it worked
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'gone_quiet_actions' and column_name = 'contact_note') as column_added_should_be_1,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'gone_quiet_people' and column_name = 'contact_note') as view_column_should_be_1,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('gone_quiet_step', 'gone_quiet_bulk_step')) as functions_should_be_2,
  (select count(*) from public.gone_quiet_actions where contact_note is not null) as notes_should_be_0;
