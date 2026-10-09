-- TEST ONLY. Runs migration 016 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 14 of 14 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/016_gone_quiet_bulk.sql (without its final check).

begin;

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

-- ── Checks on made-up people (emails zztest-gqb-*@example.invalid) ────────────────────────
do $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  pa uuid; pb uuid; pc uuid; pd uuid; pe uuid; pk uuid; pr uuid;
  r record;
  j jsonb;
  t text;
  m uuid;
  big uuid[];
  passed int := 0;
  fails text := '';
begin
  insert into people (email, first_name, last_name, status) values ('zztest-gqb-a@example.invalid', 'Test', 'GqbA', 'client') returning id into pa;
  insert into people (email, first_name, last_name, status) values ('zztest-gqb-b@example.invalid', 'Test', 'GqbB', 'client') returning id into pb;
  insert into people (email, first_name, last_name, status) values ('zztest-gqb-c@example.invalid', 'Test', 'GqbC', 'lead')   returning id into pc;
  insert into people (email, first_name, last_name, status) values ('zztest-gqb-d@example.invalid', 'Test', 'GqbD', 'client') returning id into pd;
  insert into people (email, first_name, last_name, status) values ('zztest-gqb-e@example.invalid', 'Test', 'GqbE', 'inactive') returning id into pe;
  insert into people (email, first_name, last_name, status) values ('zztest-gqb-k@example.invalid', 'Test', 'GqbKeep', 'client') returning id into pk;
  insert into people (email, first_name, last_name, status) values ('zztest-gqb-r@example.invalid', 'Test', 'GqbRemove', 'client') returning id into pr;

  insert into attendance_v2 (source, source_booking_id, momence_member_id, class_name, class_date, cancelled, duplicate_of_momence, person_id) values
    ('momence', 'ZZTEST-GQB-A1', null, 'TEST class', (v_today - interval '14 months')::date, false, false, pa),
    ('momence', 'ZZTEST-GQB-B1', null, 'TEST class', (v_today - interval '15 months')::date, false, false, pb),
    ('momence', 'ZZTEST-GQB-C1', null, 'TEST class', (v_today - interval '16 months')::date, false, false, pc),
    ('momence', 'ZZTEST-GQB-D1', null, 'TEST class', (v_today - interval '17 months')::date, false, false, pd),
    ('momence', 'ZZTEST-GQB-E1', null, 'TEST class', (v_today - interval '18 months')::date, false, false, pe),
    ('momence', 'ZZTEST-GQB-K1', null, 'TEST class', (v_today - interval '19 months')::date, false, false, pk),
    ('momence', 'ZZTEST-GQB-R1', null, 'TEST class', (v_today - interval '20 months')::date, false, false, pr);

  -- 1. Column, view column and bulk step exist; the bulk step takes the Gone Quiet lock
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gone_quiet_actions' and column_name = 'contact_note')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gone_quiet_people' and column_name = 'contact_note')
     and pg_get_functiondef('public.gone_quiet_bulk_step(uuid[], text, text, text, date)'::regprocedure) ilike '%pg_advisory_xact_lock(hashtext(''gone_quiet''))%'
  then passed := passed + 1; else fails := fails || ' [1 objects or lock missing]'; end if;

  -- 2. One person: Contacted saves the note (trimmed); Undo contacted clears it
  j := gone_quiet_step(pa, 'contacted', null, '  Personal email  ', v_today - 2);
  select * into r from gone_quiet_people where person_id = pa;
  t := (j->>'result') || ', ' || coalesce(r.contact_note, 'null');
  j := gone_quiet_step(pa, 'uncontacted', null, null, null);
  select * into r from gone_quiet_people where person_id = pa;
  if t = 'done, Personal email' and j->>'result' = 'done' and r.contact_note is null and r.contacted_on is null
  then passed := passed + 1; else fails := fails || ' [2 single note: ' || t || ']'; end if;

  -- 3. Bulk Contacted: A already contacted is skipped and keeps its date and note; B and C saved
  perform gone_quiet_step(pa, 'contacted', null, 'Old note', v_today - 5);
  j := gone_quiet_bulk_step(array[pa, pb, pc, pb], 'contacted', null, 'Mailchimp: autumn win-back', v_today - 1);
  if j->>'result' = 'done' and (j->>'selected')::int = 3 and (j->>'changed')::int = 2 and (j->>'skipped')::int = 1
     and (select contacted_on from gone_quiet_actions where person_id = pa) = v_today - 5
     and (select contact_note from gone_quiet_actions where person_id = pa) = 'Old note'
     and (select count(*) from gone_quiet_people where person_id in (pb, pc) and contacted
            and contacted_on = v_today - 1 and contact_note = 'Mailchimp: autumn win-back' and listed) = 2
  then passed := passed + 1; else fails := fails || ' [3 bulk contacted: ' || j::text || ']'; end if;

  -- 4. Bulk Contacted refused, nothing saved, when one ticked person is dismissed
  perform gone_quiet_step(pd, 'dismiss', 'other', null, null);
  insert into people (email, first_name, last_name, status) values ('zztest-gqb-f@example.invalid', 'Test', 'GqbF', 'client') returning id into m;
  insert into attendance_v2 (source, source_booking_id, class_name, class_date, cancelled, duplicate_of_momence, person_id)
    values ('momence', 'ZZTEST-GQB-F1', 'TEST class', (v_today - interval '13 months')::date, false, false, m);
  j := gone_quiet_bulk_step(array[m, pd], 'contacted', null, 'X', null);
  if j->>'result' = 'dismissed' and (j->>'count')::int = 1
     and not exists (select 1 from gone_quiet_actions where person_id = m)
  then passed := passed + 1; else fails := fails || ' [4 dismissed refuses: ' || j::text || ']'; end if;

  -- 5. Bulk Contacted refused for an inactive person, a future date, a date over 60 days ago
  t := ((gone_quiet_bulk_step(array[m, pe], 'contacted', null, null, null))->>'result')
    || ', ' || ((gone_quiet_bulk_step(array[m], 'contacted', null, null, v_today + 1))->>'result')
    || ', ' || ((gone_quiet_bulk_step(array[m], 'contacted', null, null, v_today - 61))->>'result');
  if t = 'not_listed, future_date, bad_date' and not exists (select 1 from gone_quiet_actions where person_id = m)
  then passed := passed + 1; else fails := fails || ' [5 contacted refusals: ' || t || ']'; end if;

  -- 6. Unknown person among the ticked: refused, nothing saved
  j := gone_quiet_bulk_step(array[m, gen_random_uuid()], 'dismiss', 'other', null, null);
  if j->>'result' = 'not_found' and (j->>'count')::int = 1
     and not exists (select 1 from gone_quiet_actions where person_id = m)
  then passed := passed + 1; else fails := fails || ' [6 not found: ' || j::text || ']'; end if;

  -- 7. Bulk Dismiss: deceased refused, unknown reason refused, nothing saved
  t := ((gone_quiet_bulk_step(array[m], 'dismiss', 'deceased', null, null))->>'result')
    || ', ' || ((gone_quiet_bulk_step(array[m], 'dismiss', null, null, null))->>'result')
    || ', ' || ((gone_quiet_bulk_step(array[m], 'dismiss', 'bored', null, null))->>'result');
  if t = 'deceased_one_at_a_time, bad_reason, bad_reason'
     and not exists (select 1 from gone_quiet_actions where person_id = m)
     and (select status from people where id = m) = 'client'
  then passed := passed + 1; else fails := fails || ' [7 dismiss refusals: ' || t || ']'; end if;

  -- 8. Bulk Dismiss: D already dismissed is skipped (keeps its reason); M, B saved with note,
  --    off the list; B keeps its contact date and note
  j := gone_quiet_bulk_step(array[m, pb, pd], 'dismiss', 'not_interested', '  Came once, no reply  ', null);
  if j->>'result' = 'done' and (j->>'changed')::int = 2 and (j->>'skipped')::int = 1
     and (select dismiss_reason from gone_quiet_actions where person_id = pd) = 'other'
     and (select count(*) from gone_quiet_people where person_id in (m, pb) and dismissed and not listed
            and dismiss_reason = 'not_interested' and dismiss_note = 'Came once, no reply' and dismissed_on = v_today) = 2
     and (select contact_note from gone_quiet_actions where person_id = pb) = 'Mailchimp: autumn win-back'
  then passed := passed + 1; else fails := fails || ' [8 bulk dismiss: ' || j::text || ']'; end if;

  -- 9. Bulk Bring back: M, B, D back; C (not dismissed) skipped
  j := gone_quiet_bulk_step(array[m, pb, pd, pc], 'undismiss', null, null, null);
  if j->>'result' = 'done' and (j->>'changed')::int = 3 and (j->>'skipped')::int = 1
     and (select count(*) from gone_quiet_people where person_id in (m, pb, pd) and not dismissed and listed
            and dismiss_reason is null and dismiss_note is null) = 3
  then passed := passed + 1; else fails := fails || ' [9 bulk bring back: ' || j::text || ']'; end if;

  -- 10. Bulk Undo contacted: A, B, C cleared (dates and notes); M (never contacted) skipped
  j := gone_quiet_bulk_step(array[pa, pb, pc, m], 'uncontacted', null, null, null);
  if j->>'result' = 'done' and (j->>'changed')::int = 3 and (j->>'skipped')::int = 1
     and (select count(*) from gone_quiet_actions where person_id in (pa, pb, pc, m)
            and (contacted_on is not null or contact_note is not null)) = 0
  then passed := passed + 1; else fails := fails || ' [10 bulk undo contacted: ' || j::text || ']'; end if;

  -- 11. Nothing ticked, more than 1,000, unknown action
  select array_agg(gen_random_uuid()) into big from generate_series(1, 1001);
  t := ((gone_quiet_bulk_step('{}'::uuid[], 'contacted', null, null, null))->>'result')
    || ', ' || ((gone_quiet_bulk_step(null, 'contacted', null, null, null))->>'result')
    || ', ' || ((gone_quiet_bulk_step(big, 'contacted', null, null, null))->>'result')
    || ', ' || ((gone_quiet_bulk_step(array[m], 'delete', null, null, null))->>'result');
  if t = 'none_selected, none_selected, too_many, bad_action'
  then passed := passed + 1; else fails := fails || ' [11 refusals: ' || t || ']'; end if;

  -- 12. A note cannot exist without a contact date
  begin
    insert into gone_quiet_actions (person_id, contact_note) values (pc, 'stray')
      on conflict (person_id) do update set contact_note = 'stray', contacted_on = null;
    fails := fails || ' [12 note without date accepted]';
  exception when check_violation then
    passed := passed + 1;
  end;

  -- 13. Merge (Build D) moves the contact note with the Gone Quiet row; undo puts it back
  perform gone_quiet_step(pr, 'contacted', null, 'Merge test note', v_today);
  j := merge_people(pk, pr, '{}'::jsonb, null);
  t := (j->>'result') || ', ' || coalesce(j->>'gone_quiet_rule', 'null') || ', '
    || coalesce((select contact_note from gone_quiet_actions where person_id = pk), 'null');
  j := undo_person_merge((j->>'merge_id')::uuid);
  t := t || ', ' || (j->>'result') || ', '
    || coalesce((select contact_note from gone_quiet_actions where person_id = pr), 'null') || ', '
    || (select count(*) from gone_quiet_actions where person_id = pk)::text;
  if t = 'done, moved, Merge test note, done, Merge test note, 0'
  then passed := passed + 1; else fails := fails || ' [13 merge and undo: ' || t || ']'; end if;

  -- 14. Logged-in browser keys cannot reach the bulk step or the one-person step
  if not has_function_privilege('anon', 'public.gone_quiet_bulk_step(uuid[], text, text, text, date)', 'execute')
     and not has_function_privilege('authenticated', 'public.gone_quiet_bulk_step(uuid[], text, text, text, date)', 'execute')
     and not has_function_privilege('anon', 'public.gone_quiet_step(uuid, text, text, text, date)', 'execute')
     and not has_function_privilege('authenticated', 'public.gone_quiet_step(uuid, text, text, text, date)', 'execute')
     and not has_table_privilege('authenticated', 'public.gone_quiet_people', 'select')
  then passed := passed + 1;
  else fails := fails || ' [14 access not locked down]'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 14 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 14 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
