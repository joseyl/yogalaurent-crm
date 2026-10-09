-- TEST ONLY. Runs migration 012 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 18 of 18 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/012_pass_followups.sql (without its final check).

begin;

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

do $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  p1 uuid;
  f1 uuid;   -- pass ZZTEST-PF-1: offer, email sent, closed by hand
  f2 uuid;   -- pass ZZTEST-PF-2: no extension
  f3 uuid;   -- pass ZZTEST-PF-3: closed by itself
  f4 uuid;   -- pass ZZTEST-PF-4: not linked to a client at first
  j jsonb;
  t text;
  fails text := '';
  passed int := 0;
  n int;
  r pass_followups%rowtype;
  ok boolean;
begin
  insert into people (email, first_name, last_name, status)
    values ('pass-followup-test-1@example.invalid', 'Test', 'PassFollowup', 'client') returning id into p1;

  -- 1. A new pass gets a To decide row
  t := open_pass_followup('ZZTEST-PF-1', p1, 'm-test-1', '10 Class Pass', v_today - 40, v_today - 5, 3);
  select * into r from pass_followups where momence_bought_membership_id = 'ZZTEST-PF-1';
  f1 := r.id;
  if t = 'created' and r.status = 'to_decide' and r.person_id = p1 and r.pass_end_date = v_today - 5
     and r.credits_left = 3 and r.outcome is null then passed := passed + 1;
  else fails := fails || ' [1 create: ' || coalesce(t, 'null') || ']'; end if;

  -- 2. Same pass again: nothing changes, still one row
  t := open_pass_followup('ZZTEST-PF-1', p1, 'm-test-1', '10 Class Pass', v_today - 40, v_today - 1, 9);
  select count(*) into n from pass_followups where momence_bought_membership_id = 'ZZTEST-PF-1';
  select * into r from pass_followups where id = f1;
  if t = 'exists' and n = 1 and r.pass_end_date = v_today - 5 and r.credits_left = 3 then passed := passed + 1;
  else fails := fails || ' [2 repeat: ' || t || ', rows ' || n || ']'; end if;

  -- 3. Intro Offer refused, no row
  t := open_pass_followup('ZZTEST-PF-INTRO', p1, 'm-test-1', 'Introductory Offer - 2 weeks', v_today - 20, v_today - 3, 1);
  select count(*) into n from pass_followups where momence_bought_membership_id = 'ZZTEST-PF-INTRO';
  if t = 'intro_offer' and n = 0 then passed := passed + 1;
  else fails := fails || ' [3 intro: ' || t || ', rows ' || n || ']'; end if;

  -- 4. Bad input refused: blank pass, no end date, unknown client
  if open_pass_followup('  ', p1, null, 'X', null, v_today, 1) = 'bad_pass'
     and open_pass_followup('ZZTEST-PF-BAD', p1, null, 'X', null, null, 1) = 'bad_end_date'
     and open_pass_followup('ZZTEST-PF-BAD', gen_random_uuid(), null, 'X', null, v_today, 1) = 'bad_person'
     and not exists (select 1 from pass_followups where momence_bought_membership_id = 'ZZTEST-PF-BAD')
  then passed := passed + 1;
  else fails := fails || ' [4 bad input]'; end if;

  -- 5. Steps out of order refused: email sent and close at To decide
  j := pass_followup_step(f1, 'email_sent', 14, null, null, null);
  t := pass_followup_step(f1, 'close', null, 'extended', null, null)->>'result';
  select * into r from pass_followups where id = f1;
  if j->>'result' = 'wrong_step' and t = 'wrong_step' and r.status = 'to_decide' then passed := passed + 1;
  else fails := fails || ' [5 order: ' || j::text || ', ' || t || ']'; end if;

  -- 6. Offer extension, then back to To decide, then offer again; a double click is harmless
  if pass_followup_step(f1, 'offer', null, null, null, null)->>'status' = 'offer_extension'
     and pass_followup_step(f1, 'back', null, null, null, null)->>'status' = 'to_decide'
     and pass_followup_step(f1, 'offer', null, null, null, null)->>'status' = 'offer_extension'
     and pass_followup_step(f1, 'offer', null, null, null, null)->>'result' = 'wrong_step'
  then passed := passed + 1;
  else fails := fails || ' [6 offer and back]'; end if;

  -- 7. Email sent refused without days, with 0 days, with 366 days, and with a future date
  ok := pass_followup_step(f1, 'email_sent', null, null, null, null)->>'result' = 'bad_days'
     and pass_followup_step(f1, 'email_sent', 0, null, null, null)->>'result' = 'bad_days'
     and pass_followup_step(f1, 'email_sent', 366, null, null, null)->>'result' = 'bad_days'
     and pass_followup_step(f1, 'email_sent', 14, null, null, v_today + 1)->>'result' = 'future_date';
  -- the row is read in its own statement, after the calls above
  if ok and (select status from pass_followups where id = f1) = 'offer_extension'
  then passed := passed + 1;
  else fails := fails || ' [7 email refused]'; end if;

  -- 8. Email sent 2 days ago with 14 days offered: Follow-up due 7 days after the email
  j := pass_followup_step(f1, 'email_sent', 14, null, '  offered two weeks  ', v_today - 2);
  select * into r from pass_followups where id = f1;
  if j->>'result' = 'done' and r.status = 'followup_due' and r.email_sent_on = v_today - 2
     and r.followup_due_on = v_today + 5 and r.days_offered = 14 and r.note = 'offered two weeks' then passed := passed + 1;
  else fails := fails || ' [8 email sent: ' || j::text || ']'; end if;

  -- 9. Close refused with a bad outcome, or an outcome kept for closing by itself
  ok := pass_followup_step(f1, 'close', null, 'maybe', null, null)->>'result' = 'bad_outcome'
     and pass_followup_step(f1, 'close', null, 'booked_class', null, null)->>'result' = 'bad_outcome'
     and pass_followup_step(f1, 'close', null, null, null, null)->>'result' = 'bad_outcome';
  -- the row is read in its own statement, after the calls above
  if ok and (select status from pass_followups where id = f1) = 'followup_due'
  then passed := passed + 1;
  else fails := fails || ' [9 close refused]'; end if;

  -- 10. Close as Extended with a note: closed, outcome and date set, by hand
  j := pass_followup_step(f1, 'close', null, 'extended', 'extended in Momence', null);
  select * into r from pass_followups where id = f1;
  if j->>'result' = 'done' and r.status = 'closed' and r.outcome = 'extended' and r.closed_at is not null
     and r.closed_automatically = false and r.note = 'extended in Momence' and r.days_offered = 14 then passed := passed + 1;
  else fails := fails || ' [10 close: ' || j::text || ']'; end if;

  -- 11. A closed follow-up never changes again (by hand or by itself)
  ok := pass_followup_step(f1, 'offer', null, null, null, null)->>'result' = 'closed'
     and close_pass_followup_auto(f1, 'bought_pass', 'Bought a class pass') = 'already_closed';
  -- the row is read in its own statement, after the calls above
  if ok and (select outcome from pass_followups where id = f1) = 'extended'
  then passed := passed + 1;
  else fails := fails || ' [11 closed stays closed]'; end if;

  -- 12. No extension straight from To decide, with a note
  perform open_pass_followup('ZZTEST-PF-2', p1, 'm-test-1', '5 Class Pass', v_today - 30, v_today - 10, 1);
  select id into f2 from pass_followups where momence_bought_membership_id = 'ZZTEST-PF-2';
  j := pass_followup_step(f2, 'no_extension', null, null, 'already had one', null);
  select * into r from pass_followups where id = f2;
  if j->>'result' = 'done' and r.status = 'closed' and r.outcome = 'no_extension'
     and r.note = 'already had one' and r.days_offered is null then passed := passed + 1;
  else fails := fails || ' [12 no extension: ' || j::text || ']'; end if;

  -- 13. No extension refused once an extension is offered
  perform open_pass_followup('ZZTEST-PF-3', p1, 'm-test-1', '10 Class Pass', v_today - 50, v_today - 20, 2);
  select id into f3 from pass_followups where momence_bought_membership_id = 'ZZTEST-PF-3';
  perform pass_followup_step(f3, 'offer', null, null, null, null);
  ok := pass_followup_step(f3, 'no_extension', null, null, null, null)->>'result' = 'wrong_step';
  -- the row is read in its own statement, after the calls above
  if ok and (select status from pass_followups where id = f3) = 'offer_extension'
  then passed := passed + 1;
  else fails := fails || ' [13 no extension after offer]'; end if;

  -- 14. Closing by itself refused with a hand outcome or no reason
  ok := close_pass_followup_auto(f3, 'declined', 'x') = 'bad_outcome'
     and close_pass_followup_auto(f3, 'bought_pass', '  ') = 'no_reason'
     and close_pass_followup_auto(gen_random_uuid(), 'bought_pass', 'x') = 'not_found';
  -- the row is read in its own statement, after the calls above
  if ok and (select status from pass_followups where id = f3) = 'offer_extension'
  then passed := passed + 1;
  else fails := fails || ' [14 auto refused]'; end if;

  -- 15. Closed by itself from an open step, reason stored
  t := close_pass_followup_auto(f3, 'bought_pass', 'Bought a class pass on 12 Oct');
  select * into r from pass_followups where id = f3;
  if t = 'closed' and r.status = 'closed' and r.outcome = 'bought_pass' and r.closed_automatically
     and r.close_reason = 'Bought a class pass on 12 Oct' and r.closed_at is not null then passed := passed + 1;
  else fails := fails || ' [15 auto close: ' || t || ']'; end if;

  -- 16. A pass not linked to a client: row created, then linked on a later run (never re-linked)
  t := open_pass_followup('ZZTEST-PF-4', null, 'm-test-4', '10 Class Pass', v_today - 40, v_today - 2, 4);
  select id into f4 from pass_followups where momence_bought_membership_id = 'ZZTEST-PF-4';
  if (select person_id from pass_followups where id = f4) is not null then t := t || ', linked too early'; end if;
  t := t || ', ' || open_pass_followup('ZZTEST-PF-4', p1, 'm-test-4', '10 Class Pass', null, v_today - 2, 4);
  if (select person_id from pass_followups where id = f4) is distinct from p1 then t := t || ', not linked'; end if;
  t := t || ', ' || open_pass_followup('ZZTEST-PF-4', gen_random_uuid(), 'm-test-4', '10 Class Pass', null, v_today - 2, 4);
  if (select person_id from pass_followups where id = f4) is distinct from p1 then t := t || ', re-linked'; end if;
  if t = 'created, linked, exists' then passed := passed + 1;
  else fails := fails || ' [16 link: ' || t || ']'; end if;

  -- 17. A client with follow-ups cannot be deleted by accident (history is kept)
  begin
    delete from people where id = p1;
    fails := fails || ' [17 client deleted with follow-ups]';
  exception when foreign_key_violation then
    passed := passed + 1;
  end;

  -- 18. Logged-in browser keys cannot reach the table or the functions
  if not has_table_privilege('anon', 'public.pass_followups', 'select')
     and not has_table_privilege('authenticated', 'public.pass_followups', 'select')
     and not has_function_privilege('anon', 'public.open_pass_followup(text, uuid, text, text, date, date, numeric)', 'execute')
     and not has_function_privilege('authenticated', 'public.pass_followup_step(uuid, text, integer, text, text, date)', 'execute')
     and not has_function_privilege('authenticated', 'public.close_pass_followup_auto(uuid, text, text)', 'execute')
  then passed := passed + 1;
  else fails := fails || ' [18 access not locked down]'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 18 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 18 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
