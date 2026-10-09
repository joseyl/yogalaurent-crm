-- TEST ONLY. Runs migration 013 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 18 of 18 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/013_gone_quiet.sql (without its final check).

begin;

-- 013_gone_quiet.sql
-- Build C of claude/CRM_ROADMAP_2026-10-09.md: the Gone Quiet page. Groups people by time
-- since their last activity, and remembers Contacted and Dismiss per person.
-- Run by hand in the Supabase SQL Editor BEFORE the gone-quiet code goes live.
-- Run supabase/tests/013_gone_quiet_test.sql first: it runs all of this plus checks, then
-- undoes everything.
--
-- What it adds:
--   gone_quiet_actions   one row per person: contacted on, dismissed on, reason, note
--   gone_quiet_people    view, one row per person with at least one class attended:
--                        last class, classes attended, last purchase, last activity, group,
--                        what leaves them out, and whether Contacted and Dismissed still apply
--   gone_quiet_step()    one action by hand from the Gone Quiet page, in one locked step
--
-- Rules (all dates London):
--   Who counts: anyone with at least one class attended (attendance_v2, not cancelled, not a
--   duplicate, dated today or earlier). Last activity = the later of the last class attended
--   and the last purchase (any product, dated today or earlier).
--   Groups by calendar months back from today: under 1 month 'active' (not gone quiet),
--   then '1_to_3_months', '3_to_6_months', '6_to_12_months', 'over_1_year'.
--   Left out: a future booking (not cancelled, dated after today); an active class pass in
--   the latest Momence copy (end date today or later, or no end date yet; linked by client,
--   or by Momence member number through attendance_v2); an OPEN class pass follow-up
--   (Build B, already being handled on Expired with credits); status inactive or deceased;
--   dismissed.
--   Came once: exactly one class attended.
--   Contacted: stays listed, greyed out, while the contact date is on or after the last
--   activity. If the person comes back and goes quiet again, the old contact no longer applies.
--   Dismissed: off the list while there is no class or purchase dated on or after the
--   dismissal. A class or purchase after it brings them back by itself (nothing is written:
--   it is worked out each time the view is read). Reason not_interested, moved_away,
--   deceased (also sets the client status to deceased) or other; note optional.
--   Every change takes the same lock (hashtext('gone_quiet')), one at a time.
--
-- To remove:
--   drop function if exists public.gone_quiet_step(uuid, text, text, text, date);
--   drop view if exists public.gone_quiet_people;
--   drop table if exists public.gone_quiet_actions;

create table if not exists public.gone_quiet_actions (
  person_id uuid primary key references public.people(id),
  contacted_on date,
  dismissed_on date,
  dismiss_reason text check (dismiss_reason in ('not_interested', 'moved_away', 'deceased', 'other')),
  dismiss_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((dismissed_on is null) = (dismiss_reason is null)),
  check (dismissed_on is not null or dismiss_note is null)
);

alter table public.gone_quiet_actions enable row level security;
revoke all on public.gone_quiet_actions from public, anon, authenticated;
grant select, insert, update, delete on public.gone_quiet_actions to service_role;

-- 1. The view ------------------------------------------------------------------------------

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
    and not dismissed) as listed
from grouped;

revoke all on public.gone_quiet_people from public, anon, authenticated;
grant select on public.gone_quiet_people to service_role;

-- 2. One action by hand ----------------------------------------------------------------------
--   contacted    p_on = contact date (default today; not after today, not over 60 days ago)
--   uncontacted  removes the contact date (a mistaken click)
--   dismiss      p_reason required, p_note optional; deceased also sets the client status
--   undismiss    brings a dismissed person back (does not undo a deceased status)

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
    insert into gone_quiet_actions (person_id, contacted_on) values (p_person_id, v_on)
      on conflict (person_id) do update set contacted_on = excluded.contacted_on, updated_at = now();

  elsif p_action = 'uncontacted' then
    if a.person_id is null or a.contacted_on is null then
      return jsonb_build_object('result', 'not_contacted');
    end if;
    update gone_quiet_actions set contacted_on = null, updated_at = now() where person_id = p_person_id;

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


-- ── Checks on made-up people (emails zztest-gq-*@example.invalid) ─────────────────────────
do $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  v_snap date := (select max(snapshot_date) from momence_passes);
  v_product uuid := (select id from products order by name, id limit 1);
  pa uuid; pb uuid; pc uuid; pd uuid; pe uuid; pf uuid; pg uuid; ph uuid; pz uuid;
  fu uuid;
  r record;
  j jsonb;
  t text;
  passed int := 0;
  fails text := '';
begin
  if v_snap is null then raise exception 'TEST CANNOT RUN: momence_passes is empty.'; end if;
  if v_product is null then raise exception 'TEST CANNOT RUN: no products.'; end if;

  insert into people (email, first_name, last_name, status) values ('zztest-gq-a@example.invalid', 'Test', 'GqA', 'client') returning id into pa;
  insert into people (email, first_name, last_name, status) values ('zztest-gq-b@example.invalid', 'Test', 'GqB', 'client') returning id into pb;
  insert into people (email, first_name, last_name, status) values ('zztest-gq-c@example.invalid', 'Test', 'GqC', 'client') returning id into pc;
  insert into people (email, first_name, last_name, status) values ('zztest-gq-d@example.invalid', 'Test', 'GqD', 'lead')   returning id into pd;
  insert into people (email, first_name, last_name, status) values ('zztest-gq-e@example.invalid', 'Test', 'GqE', 'inactive') returning id into pe;
  insert into people (email, first_name, last_name, status) values ('zztest-gq-f@example.invalid', 'Test', 'GqF', 'client') returning id into pf;
  insert into people (email, first_name, last_name, status) values ('zztest-gq-g@example.invalid', 'Test', 'GqG', 'client') returning id into pg;
  insert into people (email, first_name, last_name, status) values ('zztest-gq-h@example.invalid', 'Test', 'GqH', 'client') returning id into ph;

  insert into attendance_v2 (source, source_booking_id, momence_member_id, class_name, class_date, cancelled, duplicate_of_momence, person_id) values
    ('momence', 'ZZTEST-GQ-A1', null,        'TEST class', (v_today - interval '2 months')::date,  false, false, pa),
    ('momence', 'ZZTEST-GQ-B1', null,        'TEST class', (v_today - interval '14 months')::date, false, false, pb),
    ('momence', 'ZZTEST-GQ-B2', null,        'TEST class', (v_today - interval '15 months')::date, false, false, pb),
    ('momence', 'ZZTEST-GQ-C1', null,        'TEST class', (v_today - interval '4 months')::date,  false, false, pc),
    ('momence', 'ZZTEST-GQ-C2', null,        'TEST class', v_today + 5,                            false, false, pc),
    ('momence', 'ZZTEST-GQ-D1', '999999904', 'TEST class', (v_today - interval '4 months')::date,  false, false, pd),
    ('momence', 'ZZTEST-GQ-E1', null,        'TEST class', (v_today - interval '5 months')::date,  false, false, pe),
    ('momence', 'ZZTEST-GQ-F1', null,        'TEST class', v_today - 14,                           false, false, pf),
    ('momence', 'ZZTEST-GQ-G1', null,        'TEST class', (v_today - interval '3 months')::date,  false, false, pg),
    ('momence', 'ZZTEST-GQ-G2', null,        'TEST class', v_today - 7,                            true,  false, pg),
    ('momence', 'ZZTEST-GQ-H1', null,        'TEST class', (v_today - interval '2 months')::date,  false, false, ph);
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes)
    values (pb, v_product, 0, (v_today - interval '7 months')::date, 'TEST 013');
  -- D: an active pass in the latest copy, not linked to a client (found by member number)
  insert into momence_passes (snapshot_date, momence_member_id, momence_bought_membership_id, person_id, name, start_date, end_date, credits_left, credits_total)
    values (v_snap, '999999904', '999999904', null, 'TEST 10 Class Pass', v_today - 20, v_today + 10, 3, 10);
  -- H: an open class pass follow-up
  t := open_pass_followup('ZZTEST-GQ-PF', ph, null, 'TEST 5 Class Pass', v_today - 50, v_today - 5, 2);
  select id into fu from pass_followups where momence_bought_membership_id = 'ZZTEST-GQ-PF';

  -- 1. Table, view and step exist, and the step takes the lock
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'gone_quiet_actions')
     and exists (select 1 from information_schema.views where table_schema = 'public' and table_name = 'gone_quiet_people')
     and pg_get_functiondef('public.gone_quiet_step(uuid, text, text, text, date)'::regprocedure) ilike '%pg_advisory_xact_lock(hashtext(''gone_quiet''))%'
  then passed := passed + 1; else fails := fails || ' [1 objects or lock missing]'; end if;

  -- 2. One class 2 months ago: 1 to 3 months, came once, listed
  select * into r from gone_quiet_people where person_id = pa;
  if r.gap_group = '1_to_3_months' and r.came_once and r.classes_attended = 1 and r.listed
     and r.last_activity = (v_today - interval '2 months')::date
  then passed := passed + 1; else fails := fails || ' [2 one class 2 months: ' || coalesce(r.gap_group, 'missing') || ']'; end if;

  -- 3. Classes 14 and 15 months ago, purchase 7 months ago: last activity is the purchase
  select * into r from gone_quiet_people where person_id = pb;
  if r.gap_group = '6_to_12_months' and not r.came_once and r.classes_attended = 2
     and r.last_activity = (v_today - interval '7 months')::date and r.listed
  then passed := passed + 1; else fails := fails || ' [3 purchase as last activity: ' || coalesce(r.gap_group, 'missing') || ']'; end if;

  -- 4. Future booking: left out, and the future class is not counted as attended
  select * into r from gone_quiet_people where person_id = pc;
  if r.has_future_booking and not r.listed and r.classes_attended = 1 and r.gap_group = '3_to_6_months'
  then passed := passed + 1; else fails := fails || ' [4 future booking]'; end if;

  -- 5. Active pass not linked to a client, found by Momence member number: left out
  select * into r from gone_quiet_people where person_id = pd;
  if r.has_active_pass and not r.listed and r.status = 'lead'
  then passed := passed + 1; else fails := fails || ' [5 active pass]'; end if;

  -- 6. Status inactive: left out
  select * into r from gone_quiet_people where person_id = pe;
  if r.person_id is not null and not r.listed
  then passed := passed + 1; else fails := fails || ' [6 inactive]'; end if;

  -- 7. Class 2 weeks ago: active, not listed
  select * into r from gone_quiet_people where person_id = pf;
  if r.gap_group = 'active' and not r.listed
  then passed := passed + 1; else fails := fails || ' [7 active: ' || coalesce(r.gap_group, 'missing') || ']'; end if;

  -- 8. Exactly 3 months ago goes in 3 to 6 months; a cancelled class does not count
  select * into r from gone_quiet_people where person_id = pg;
  if r.gap_group = '3_to_6_months' and r.classes_attended = 1 and r.listed and not r.has_future_booking
  then passed := passed + 1; else fails := fails || ' [8 boundary or cancelled: ' || coalesce(r.gap_group, 'missing') || ']'; end if;

  -- 9. Open class pass follow-up: left out; listed again once it closes
  select * into r from gone_quiet_people where person_id = ph;
  t := case when r.has_open_pass_followup and not r.listed then 'out' else 'wrong' end;
  perform close_pass_followup_auto(fu, 'booked_class', 'TEST');
  select * into r from gone_quiet_people where person_id = ph;
  if t = 'out' and not r.has_open_pass_followup and r.listed
  then passed := passed + 1; else fails := fails || ' [9 open pass follow-up: ' || t || ']'; end if;

  -- 10. Contacted: date stored, stays listed, greyed out (contacted = true)
  j := gone_quiet_step(pa, 'contacted', null, null, null);
  select * into r from gone_quiet_people where person_id = pa;
  if j->>'result' = 'done' and r.contacted and r.contacted_on = v_today and r.listed
  then passed := passed + 1; else fails := fails || ' [10 contacted: ' || (j->>'result') || ']'; end if;

  -- 11. Contact date checks: not after today, not over 60 days ago; earlier date accepted
  t := ((gone_quiet_step(pa, 'contacted', null, null, v_today + 1))->>'result')
    || ', ' || ((gone_quiet_step(pa, 'contacted', null, null, v_today - 61))->>'result')
    || ', ' || ((gone_quiet_step(pa, 'contacted', null, null, v_today - 3))->>'result');
  if t = 'future_date, bad_date, done' and (select contacted_on from gone_quiet_actions where person_id = pa) = v_today - 3
  then passed := passed + 1; else fails := fails || ' [11 contact dates: ' || t || ']'; end if;

  -- 12. Undo Contacted; a second undo is refused
  t := ((gone_quiet_step(pa, 'uncontacted', null, null, null))->>'result')
    || ', ' || ((gone_quiet_step(pa, 'uncontacted', null, null, null))->>'result');
  select * into r from gone_quiet_people where person_id = pa;
  if t = 'done, not_contacted' and not r.contacted and r.contacted_on is null
  then passed := passed + 1; else fails := fails || ' [12 undo contacted: ' || t || ']'; end if;

  -- 13. Dismiss: reason required; off the list; a repeat and Contacted are refused
  t := ((gone_quiet_step(pa, 'dismiss', null, null, null))->>'result')
    || ', ' || ((gone_quiet_step(pa, 'dismiss', 'bored', null, null))->>'result')
    || ', ' || ((gone_quiet_step(pa, 'dismiss', 'moved_away', '  Moved to Spain  ', null))->>'result')
    || ', ' || ((gone_quiet_step(pa, 'dismiss', 'other', null, null))->>'result')
    || ', ' || ((gone_quiet_step(pa, 'contacted', null, null, null))->>'result');
  select * into r from gone_quiet_people where person_id = pa;
  if t = 'bad_reason, bad_reason, done, already_dismissed, dismissed'
     and r.dismissed and not r.listed and r.dismiss_reason = 'moved_away' and r.dismiss_note = 'Moved to Spain'
     and r.dismissed_on = v_today
  then passed := passed + 1; else fails := fails || ' [13 dismiss: ' || t || ']'; end if;

  -- 14. A dismissed person who buys again comes back by itself (no write needed)
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes) values (pa, v_product, 0, v_today, 'TEST 013');
  select * into r from gone_quiet_people where person_id = pa;
  if not r.dismissed and r.gap_group = 'active'
     and (select dismissed_on from gone_quiet_actions where person_id = pa) = v_today
  then passed := passed + 1; else fails := fails || ' [14 comes back after a purchase]'; end if;

  -- 15. Dismiss as deceased also sets the client status; Bring back does not undo the status
  j := gone_quiet_step(pb, 'dismiss', 'deceased', null, null);
  t := (j->>'result') || ', ' || (select status from people where id = pb);
  j := gone_quiet_step(pb, 'undismiss', null, null, null);
  t := t || ', ' || (j->>'result') || ', ' || (select status from people where id = pb)
    || ', ' || ((gone_quiet_step(pb, 'undismiss', null, null, null))->>'result');
  select * into r from gone_quiet_people where person_id = pb;
  if t = 'done, deceased, done, deceased, not_dismissed' and not r.dismissed and not r.listed
     and (select dismissed_on from gone_quiet_actions where person_id = pb) is null
  then passed := passed + 1; else fails := fails || ' [15 deceased: ' || t || ']'; end if;

  -- 16. Unknown person, unknown action
  t := ((gone_quiet_step(gen_random_uuid(), 'contacted', null, null, null))->>'result')
    || ', ' || ((gone_quiet_step(pa, 'delete', null, null, null))->>'result');
  if t = 'not_found, bad_action' then passed := passed + 1;
  else fails := fails || ' [16 refusals: ' || t || ']'; end if;

  -- 17. A person with a Gone Quiet record cannot be deleted by accident
  -- (a separate made-up person with no classes or purchases, so only this record holds it)
  insert into people (email, first_name, last_name, status) values ('zztest-gq-z@example.invalid', 'Test', 'GqZ', 'client') returning id into pz;
  insert into gone_quiet_actions (person_id, contacted_on) values (pz, v_today);
  begin
    delete from people where id = pz;
    fails := fails || ' [17 client deleted with a Gone Quiet record]';
  exception when foreign_key_violation then
    passed := passed + 1;
  end;

  -- 18. Logged-in browser keys cannot reach the table, the view or the step
  if not has_table_privilege('anon', 'public.gone_quiet_actions', 'select')
     and not has_table_privilege('authenticated', 'public.gone_quiet_actions', 'select')
     and not has_table_privilege('anon', 'public.gone_quiet_people', 'select')
     and not has_table_privilege('authenticated', 'public.gone_quiet_people', 'select')
     and not has_function_privilege('anon', 'public.gone_quiet_step(uuid, text, text, text, date)', 'execute')
     and not has_function_privilege('authenticated', 'public.gone_quiet_step(uuid, text, text, text, date)', 'execute')
  then passed := passed + 1;
  else fails := fails || ' [18 access not locked down]'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 18 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 18 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
