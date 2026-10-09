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

-- Check it worked
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'gone_quiet_actions') as table_added_should_be_1,
  (select count(*) from information_schema.views
     where table_schema = 'public' and table_name = 'gone_quiet_people') as view_added_should_be_1,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'gone_quiet_step') as functions_added_should_be_1,
  (select count(*) from public.gone_quiet_actions) as rows_should_be_0;
