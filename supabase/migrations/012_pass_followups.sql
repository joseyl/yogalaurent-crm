-- 012_pass_followups.sql
-- Build B of claude/CRM_ROADMAP_2026-10-09.md: a decision trail for
-- "Class Passes: Expired with credits (decide)". One follow-up per Momence pass.
-- Run by hand in the Supabase SQL Editor BEFORE the pass-followups code goes live.
-- Run supabase/tests/012_pass_followups_test.sql first: it runs all of this plus
-- checks, then undoes everything.
--
-- What it adds:
--   pass_followups              one row per pass (momence_bought_membership_id, unique)
--   open_pass_followup()        creates the To decide row for a pass on the card; a repeat
--                               changes nothing (except linking a client if it was missing)
--   pass_followup_step()        one step by hand from the dashboard card
--   close_pass_followup_auto()  closes an open follow-up by itself, with the reason
--
-- Steps (status):
--   to_decide        -> offer (offer_extension)  or  no_extension (closed, outcome no_extension)
--   offer_extension  -> email_sent (followup_due), days offered 1 to 365, email date not after
--                       today, follow-up due 7 days after the email
--                    -> back (to_decide)
--   followup_due     -> close (closed), outcome extended, declined or no_reply
--   Note optional on no_extension, email_sent and close.
--   Closed by itself (any open step): extended (Momence shows a later end date),
--   bought_pass (a class pass bought, or a newer pass in Momence), booked_class (a class
--   booked after the pass ended). The reason is stored in close_reason.
--   Intro Offers never get a follow-up (refused here).
--   A closed follow-up never changes again.
--   Every change takes the same lock (hashtext('pass_followup')), one at a time.
--
-- To remove:
--   drop function if exists public.close_pass_followup_auto(uuid, text, text);
--   drop function if exists public.pass_followup_step(uuid, text, integer, text, text, date);
--   drop function if exists public.open_pass_followup(text, uuid, text, text, date, date, numeric);
--   drop table if exists public.pass_followups;

create table if not exists public.pass_followups (
  id uuid primary key default gen_random_uuid(),
  momence_bought_membership_id text not null,
  person_id uuid references public.people(id),
  momence_member_id text,
  pass_name text,
  pass_start_date date,
  pass_end_date date not null,
  credits_left numeric(10,2),
  status text not null default 'to_decide'
    check (status in ('to_decide', 'offer_extension', 'followup_due', 'closed')),
  email_sent_on date,
  followup_due_on date,
  days_offered integer check (days_offered between 1 and 365),
  outcome text
    check (outcome in ('extended', 'declined', 'no_reply', 'no_extension', 'bought_pass', 'booked_class')),
  closed_automatically boolean not null default false,
  close_reason text,
  closed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'closed') = (outcome is not null and closed_at is not null)),
  check (status not in ('followup_due') or (email_sent_on is not null and followup_due_on is not null and days_offered is not null))
);

create unique index if not exists pass_followups_pass_key
  on public.pass_followups (momence_bought_membership_id);
create index if not exists pass_followups_open_idx
  on public.pass_followups (status) where status <> 'closed';
create index if not exists pass_followups_person_idx
  on public.pass_followups (person_id);

alter table public.pass_followups enable row level security;
revoke all on public.pass_followups from public, anon, authenticated;
grant select, insert, update, delete on public.pass_followups to service_role;

-- 1. Create the To decide row for a pass -------------------------------------------------

create or replace function public.open_pass_followup(
  p_pass_id text,
  p_person_id uuid,
  p_member_id text,
  p_pass_name text,
  p_start date,
  p_end date,
  p_credits numeric
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  f pass_followups%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('pass_followup'));

  if coalesce(trim(p_pass_id), '') = '' then return 'bad_pass'; end if;
  if p_end is null then return 'bad_end_date'; end if;
  if coalesce(p_pass_name, '') ilike '%introductory offer%' then return 'intro_offer'; end if;

  select * into f from pass_followups where momence_bought_membership_id = trim(p_pass_id) for update;
  if found then
    if f.person_id is null and p_person_id is not null
       and exists (select 1 from people where id = p_person_id) then
      update pass_followups set person_id = p_person_id, updated_at = now() where id = f.id;
      return 'linked';
    end if;
    return 'exists';
  end if;

  if p_person_id is not null and not exists (select 1 from people where id = p_person_id) then
    return 'bad_person';
  end if;

  insert into pass_followups (momence_bought_membership_id, person_id, momence_member_id, pass_name,
                              pass_start_date, pass_end_date, credits_left)
    values (trim(p_pass_id), p_person_id, nullif(trim(coalesce(p_member_id, '')), ''),
            nullif(trim(coalesce(p_pass_name, '')), ''), p_start, p_end, p_credits);
  return 'created';
end;
$$;

-- 2. One step by hand --------------------------------------------------------------------

create or replace function public.pass_followup_step(
  p_id uuid,
  p_action text,
  p_days integer,
  p_outcome text,
  p_note text,
  p_on date
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  f pass_followups%rowtype;
  v_today date := (now() at time zone 'Europe/London')::date;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_on date;
begin
  perform pg_advisory_xact_lock(hashtext('pass_followup'));

  select * into f from pass_followups where id = p_id for update;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if f.status = 'closed' then return jsonb_build_object('result', 'closed', 'status', f.status); end if;

  if p_action = 'offer' then
    if f.status <> 'to_decide' then return jsonb_build_object('result', 'wrong_step', 'status', f.status); end if;
    update pass_followups set status = 'offer_extension', updated_at = now() where id = f.id;

  elsif p_action = 'back' then
    if f.status <> 'offer_extension' then return jsonb_build_object('result', 'wrong_step', 'status', f.status); end if;
    update pass_followups set status = 'to_decide', updated_at = now() where id = f.id;

  elsif p_action = 'no_extension' then
    if f.status <> 'to_decide' then return jsonb_build_object('result', 'wrong_step', 'status', f.status); end if;
    update pass_followups
      set status = 'closed', outcome = 'no_extension', closed_at = now(),
          note = coalesce(v_note, note), updated_at = now()
      where id = f.id;

  elsif p_action = 'email_sent' then
    if f.status <> 'offer_extension' then return jsonb_build_object('result', 'wrong_step', 'status', f.status); end if;
    if p_days is null or p_days < 1 or p_days > 365 then return jsonb_build_object('result', 'bad_days'); end if;
    v_on := coalesce(p_on, v_today);
    if v_on > v_today then return jsonb_build_object('result', 'future_date'); end if;
    if v_on < v_today - 60 then return jsonb_build_object('result', 'bad_date'); end if;
    update pass_followups
      set status = 'followup_due', email_sent_on = v_on, followup_due_on = v_on + 7,
          days_offered = p_days, note = coalesce(v_note, note), updated_at = now()
      where id = f.id;

  elsif p_action = 'close' then
    if f.status <> 'followup_due' then return jsonb_build_object('result', 'wrong_step', 'status', f.status); end if;
    if p_outcome is null or p_outcome not in ('extended', 'declined', 'no_reply') then
      return jsonb_build_object('result', 'bad_outcome');
    end if;
    update pass_followups
      set status = 'closed', outcome = p_outcome, closed_at = now(),
          note = coalesce(v_note, note), updated_at = now()
      where id = f.id;

  else
    return jsonb_build_object('result', 'bad_action');
  end if;

  select * into f from pass_followups where id = p_id;
  return jsonb_build_object('result', 'done', 'status', f.status, 'outcome', f.outcome,
                            'followup_due_on', f.followup_due_on);
end;
$$;

-- 3. Closed by itself ----------------------------------------------------------------------

create or replace function public.close_pass_followup_auto(
  p_id uuid,
  p_outcome text,
  p_reason text
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  f pass_followups%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('pass_followup'));

  if p_outcome is null or p_outcome not in ('extended', 'bought_pass', 'booked_class') then
    return 'bad_outcome';
  end if;
  if coalesce(trim(p_reason), '') = '' then return 'no_reason'; end if;

  select * into f from pass_followups where id = p_id for update;
  if not found then return 'not_found'; end if;
  if f.status = 'closed' then return 'already_closed'; end if;

  update pass_followups
    set status = 'closed', outcome = p_outcome, closed_automatically = true,
        close_reason = trim(p_reason), closed_at = now(), updated_at = now()
    where id = f.id;
  return 'closed';
end;
$$;

revoke all on function public.open_pass_followup(text, uuid, text, text, date, date, numeric) from public, anon, authenticated;
revoke all on function public.pass_followup_step(uuid, text, integer, text, text, date) from public, anon, authenticated;
revoke all on function public.close_pass_followup_auto(uuid, text, text) from public, anon, authenticated;
grant execute on function public.open_pass_followup(text, uuid, text, text, date, date, numeric) to service_role;
grant execute on function public.pass_followup_step(uuid, text, integer, text, text, date) to service_role;
grant execute on function public.close_pass_followup_auto(uuid, text, text) to service_role;

-- Check it worked
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'pass_followups') as table_added_should_be_1,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('open_pass_followup', 'pass_followup_step', 'close_pass_followup_auto')) as functions_added_should_be_3,
  (select count(*) from public.pass_followups) as rows_should_be_0;
