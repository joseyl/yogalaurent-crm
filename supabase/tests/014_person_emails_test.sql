-- TEST ONLY. Runs migration 014 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 15 of 15 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/014_person_emails.sql (without its final check).

begin;

-- 014_person_emails.sql
-- Build D, release 1, of claude/CRM_ROADMAP_2026-10-09.md: "other emails" per person, and every
-- lookup by email checks them, so a merged duplicate is not recreated by the next purchase.
-- No existing data changes. Merging comes in release 2 (migration 015).
-- Run by hand in the Supabase SQL Editor BEFORE the duplicates-emails code goes live.
-- Run supabase/tests/014_person_emails_test.sql first: it runs all of this plus checks, then
-- undoes everything.
--
-- What it adds:
--   person_emails            other emails of a person, many per person. One address belongs
--                            to one person only. Stored lower case, no spaces.
--   find_person_by_email()   the one lookup every feed uses: main email, then alt_email, then
--                            other emails (lower case, spaces ignored). Returns the person
--                            found first, where it was found, and how many people matched at
--                            that step (more than 1 = ambiguous; strict feeds then match nobody).
--   person_has_email()       true if an email is this person's main, alt or other email.
--   person_email_step()      add or remove an other email by hand, in one locked step
--                            (lock hashtext('person_emails')).
--   people_email_guard       trigger: a main or alt email cannot be set to another person's
--                            other email (error 23505, like the existing unique email rule).
--   apply_balance_payment()  (migration 011) rebuilt from the LIVE definition with its two
--                            "email or alt_email" checks replaced by person_has_email(), so a
--                            balance payment also matches by other emails. Refuses unless the
--                            old check is found exactly twice.
--
-- Rules:
--   Email is normalised as lower case with all spaces removed; it must look like a@b.c.
--   Adding is refused if the address is already this person's main, alt or other email
--   ('already_on_record'), or any other person's ('belongs_to_other', with that person's id,
--   so the page can point to the possible duplicate). Never moved silently.
--   person_emails has no cascade: a client with other emails cannot be deleted by accident.
--   source 'hand' (added on the client page) or 'merge' (added by a merge, release 2).
--
-- To remove (put apply_balance_payment back first by re-running its block from 011):
--   drop trigger if exists people_email_guard on public.people;
--   drop function if exists public.people_email_guard();
--   drop function if exists public.person_email_step(text, uuid, text, uuid, text);
--   drop function if exists public.person_has_email(uuid, text);
--   drop function if exists public.find_person_by_email(text);
--   drop table if exists public.person_emails;

create table if not exists public.person_emails (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id),
  email text not null unique
    check (email = lower(email) and email !~ '\s' and email ~ '^[^@]+@[^@]+\.[^@]+$'),
  source text not null default 'hand' check (source in ('hand', 'merge')),
  merge_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists person_emails_person_id_idx on public.person_emails (person_id);
create index if not exists people_email_norm_idx on public.people (lower(trim(email)));
create index if not exists people_alt_email_norm_idx on public.people (lower(trim(alt_email)));

alter table public.person_emails enable row level security;
revoke all on public.person_emails from public, anon, authenticated;
grant select, insert, update, delete on public.person_emails to service_role;

-- 1. The lookup ----------------------------------------------------------------------------

create or replace function public.find_person_by_email(p_email text)
returns table (person_id uuid, matched_on text, matches int)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v text := lower(regexp_replace(coalesce(p_email, ''), '\s', '', 'g'));
  v_ids uuid[];
begin
  if v = '' or position('@' in v) = 0 then
    return;
  end if;

  select array_agg(id order by created_at, id) into v_ids
    from people where lower(trim(email)) = v;
  if coalesce(array_length(v_ids, 1), 0) > 0 then
    return query select v_ids[1], 'email'::text, array_length(v_ids, 1);
    return;
  end if;

  select array_agg(id order by created_at, id) into v_ids
    from people where lower(trim(alt_email)) = v;
  if coalesce(array_length(v_ids, 1), 0) > 0 then
    return query select v_ids[1], 'alt_email'::text, array_length(v_ids, 1);
    return;
  end if;

  return query
    select pe.person_id, 'other_email'::text, 1
    from person_emails pe where pe.email = v;
end;
$$;

create or replace function public.person_has_email(p_person_id uuid, p_email text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(nullif(lower(regexp_replace(coalesce(p_email, ''), '\s', '', 'g')), '') is not null
    and (
      exists (select 1 from people p where p.id = p_person_id
              and (lower(trim(p.email)) = lower(regexp_replace(p_email, '\s', '', 'g'))
                   or lower(trim(p.alt_email)) = lower(regexp_replace(p_email, '\s', '', 'g'))))
      or exists (select 1 from person_emails e where e.person_id = p_person_id
              and e.email = lower(regexp_replace(p_email, '\s', '', 'g')))
    ), false);
$$;

-- 2. Add or remove an other email by hand --------------------------------------------------
--   add     p_person_id, p_email, p_note optional
--   remove  p_id (the person_emails row), p_person_id must match it

create or replace function public.person_email_step(
  p_action text,
  p_person_id uuid,
  p_email text,
  p_id uuid,
  p_note text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v text := lower(regexp_replace(coalesce(p_email, ''), '\s', '', 'g'));
  v_other uuid;
  v_id uuid;
  r person_emails%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('person_emails'));

  if p_action is null or p_action not in ('add', 'remove') then
    return jsonb_build_object('result', 'bad_action');
  end if;
  if p_person_id is null or not exists (select 1 from people where id = p_person_id) then
    return jsonb_build_object('result', 'not_found');
  end if;

  if p_action = 'add' then
    if v !~ '^[^@]+@[^@]+\.[^@]+$' or length(v) > 320 then
      return jsonb_build_object('result', 'bad_email');
    end if;
    if person_has_email(p_person_id, v) then
      return jsonb_build_object('result', 'already_on_record');
    end if;
    select id into v_other from people
      where id <> p_person_id and (lower(trim(email)) = v or lower(trim(alt_email)) = v)
      order by created_at, id limit 1;
    if v_other is null then
      select person_id into v_other from person_emails where email = v and person_id <> p_person_id;
    end if;
    if v_other is not null then
      return jsonb_build_object('result', 'belongs_to_other', 'other_person_id', v_other);
    end if;
    insert into person_emails (person_id, email, source, note)
      values (p_person_id, v, 'hand', nullif(left(trim(coalesce(p_note, '')), 500), ''))
      returning id into v_id;
    return jsonb_build_object('result', 'done', 'id', v_id, 'email', v);

  else
    select * into r from person_emails where id = p_id for update;
    if not found or r.person_id <> p_person_id then
      return jsonb_build_object('result', 'email_not_found');
    end if;
    delete from person_emails where id = p_id;
    return jsonb_build_object('result', 'done', 'id', p_id, 'email', r.email);
  end if;
end;
$$;

-- 3. Guard: a main or alt email cannot be another person's other email ----------------------

create or replace function public.people_email_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (select 1 from person_emails e
             where e.person_id <> new.id
               and (e.email = lower(regexp_replace(coalesce(new.email, ''), '\s', '', 'g'))
                    or e.email = lower(regexp_replace(coalesce(new.alt_email, ''), '\s', '', 'g')))) then
    raise exception 'This email is already an other email of another client.' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists people_email_guard on public.people;
create trigger people_email_guard
  before insert or update of email, alt_email on public.people
  for each row execute function public.people_email_guard();

-- 4. Balance payments (011) match by other emails too --------------------------------------
-- Rebuilt from the live definition, so nothing else in the function changes.

do $$
declare
  v_old constant text := 'lower(trim(pe.email)) = t.email or lower(trim(coalesce(pe.alt_email, ''''))) = t.email';
  v_new constant text := 'public.person_has_email(pe.id, t.email)';
  d text := pg_get_functiondef('public.apply_balance_payment(uuid)'::regprocedure);
  n int;
begin
  if position(v_new in d) > 0 and position(v_old in d) = 0 then
    return; -- already done (safe to run this migration twice)
  end if;
  n := (length(d) - length(replace(d, v_old, ''))) / length(v_old);
  if n <> 2 then
    raise exception 'apply_balance_payment: expected the email check twice, found % times. Nothing changed.', n;
  end if;
  execute replace(d, v_old, v_new);
end $$;

revoke all on function public.find_person_by_email(text) from public, anon, authenticated;
revoke all on function public.person_has_email(uuid, text) from public, anon, authenticated;
revoke all on function public.person_email_step(text, uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.people_email_guard() from public, anon, authenticated;
revoke all on function public.apply_balance_payment(uuid) from public, anon, authenticated;
grant execute on function public.find_person_by_email(text) to service_role;
grant execute on function public.person_has_email(uuid, text) to service_role;
grant execute on function public.person_email_step(text, uuid, text, uuid, text) to service_role;
grant execute on function public.apply_balance_payment(uuid) to service_role;

-- ── Checks on made-up people (emails zztest-pe-*@example.invalid) ─────────────────────────
do $$
declare
  v_product uuid := (select id from products order by name, id limit 1);
  pa uuid; pb uuid; pc uuid; pd uuid; pz uuid;
  e1 uuid;
  r record;
  j jsonb;
  t text;
  d text;
  passed int := 0;
  fails text := '';
begin
  if v_product is null then raise exception 'TEST CANNOT RUN: no products.'; end if;

  insert into people (email, alt_email, first_name, last_name, status) values ('zztest-pe-a@example.invalid', null, 'Test', 'PeA', 'client') returning id into pa;
  insert into people (email, alt_email, first_name, last_name, status) values ('zztest-pe-b@example.invalid', 'zztest-pe-b-alt@example.invalid', 'Test', 'PeB', 'client') returning id into pb;
  insert into people (email, alt_email, first_name, last_name, status) values ('zztest-pe-c@example.invalid', 'zztest-pe-shared@example.invalid', 'Test', 'PeC', 'client') returning id into pc;
  insert into people (email, alt_email, first_name, last_name, status) values ('zztest-pe-d@example.invalid', 'zztest-pe-shared@example.invalid', 'Test', 'PeD', 'client') returning id into pd;

  -- 1. Table, functions, trigger exist; the step takes its lock
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'person_emails')
     and to_regprocedure('public.find_person_by_email(text)') is not null
     and to_regprocedure('public.person_has_email(uuid, text)') is not null
     and exists (select 1 from pg_trigger where tgname = 'people_email_guard' and not tgisinternal)
     and pg_get_functiondef('public.person_email_step(text, uuid, text, uuid, text)'::regprocedure) ilike '%pg_advisory_xact_lock(hashtext(''person_emails''))%'
  then passed := passed + 1; else fails := fails || ' [1 objects or lock missing]'; end if;

  -- 2. Main email found, ignoring case and spaces
  select * into r from find_person_by_email('  ZZTest-PE-A@Example.INVALID ');
  if r.person_id = pa and r.matched_on = 'email' and r.matches = 1
  then passed := passed + 1; else fails := fails || ' [2 main email]'; end if;

  -- 3. alt_email found
  select * into r from find_person_by_email('zztest-pe-b-alt@example.invalid');
  if r.person_id = pb and r.matched_on = 'alt_email' and r.matches = 1
  then passed := passed + 1; else fails := fails || ' [3 alt email]'; end if;

  -- 4. Add an other email (stored lower case, no spaces); found by the lookup
  j := person_email_step('add', pa, ' ZZTest-PE-A-Old@Example.Invalid', null, ' old address ');
  e1 := (j->>'id')::uuid;
  select * into r from find_person_by_email('zztest-pe-a-old@example.invalid');
  if j->>'result' = 'done' and j->>'email' = 'zztest-pe-a-old@example.invalid'
     and r.person_id = pa and r.matched_on = 'other_email'
     and (select note from person_emails where id = e1) = 'old address'
  then passed := passed + 1; else fails := fails || ' [4 add other email: ' || coalesce(j->>'result', 'null') || ']'; end if;

  -- 5. Refusals: bad email, already on this record (main, again), another person's (main, alt,
  --    other), unknown person, unknown action
  t := ((person_email_step('add', pa, 'not-an-email', null, null))->>'result')
    || ', ' || ((person_email_step('add', pa, 'zztest-pe-a@example.invalid', null, null))->>'result')
    || ', ' || ((person_email_step('add', pa, 'zztest-pe-a-old@example.invalid', null, null))->>'result')
    || ', ' || ((person_email_step('add', pa, 'zztest-pe-b@example.invalid', null, null))->>'result')
    || ', ' || ((person_email_step('add', pa, 'zztest-pe-b-alt@example.invalid', null, null))->>'result')
    || ', ' || ((person_email_step('add', pb, 'zztest-pe-a-old@example.invalid', null, null))->>'result')
    || ', ' || ((person_email_step('add', gen_random_uuid(), 'zztest-pe-x@example.invalid', null, null))->>'result')
    || ', ' || ((person_email_step('merge', pa, 'zztest-pe-x@example.invalid', null, null))->>'result');
  j := person_email_step('add', pa, 'zztest-pe-b@example.invalid', null, null);
  if t = 'bad_email, already_on_record, already_on_record, belongs_to_other, belongs_to_other, belongs_to_other, not_found, bad_action'
     and (j->>'other_person_id')::uuid = pb
     and (select count(*) from person_emails where person_id in (pa, pb)) = 1
  then passed := passed + 1; else fails := fails || ' [5 refusals: ' || t || ']'; end if;

  -- 6. person_has_email: main, alt and other emails of the right person only
  if person_has_email(pa, 'ZZTEST-PE-A@example.invalid') and person_has_email(pa, 'zztest-pe-a-old@example.invalid')
     and person_has_email(pb, 'zztest-pe-b-alt@example.invalid')
     and not person_has_email(pb, 'zztest-pe-a-old@example.invalid')
     and not person_has_email(pa, null) and not person_has_email(pa, '')
  then passed := passed + 1; else fails := fails || ' [6 person_has_email]'; end if;

  -- 7. Guard: another person's main or alt email cannot become this other email; a new person
  --    cannot be created with it either (error 23505)
  t := '';
  begin
    update people set alt_email = 'zztest-pe-a-old@example.invalid' where id = pb;
    t := t || 'alt allowed;';
  exception when unique_violation then t := t || 'alt refused;'; end;
  begin
    insert into people (email, first_name, status) values ('ZZTEST-pe-a-old@example.invalid', 'Test', 'client');
    t := t || 'insert allowed';
  exception when unique_violation then t := t || 'insert refused'; end;
  if t = 'alt refused;insert refused' then passed := passed + 1;
  else fails := fails || ' [7 guard: ' || t || ']'; end if;

  -- 8. Two people share an alt_email: found first, matches = 2 (strict feeds then match nobody)
  select * into r from find_person_by_email('zztest-pe-shared@example.invalid');
  if r.person_id in (pc, pd) and r.matched_on = 'alt_email' and r.matches = 2
  then passed := passed + 1; else fails := fails || ' [8 ambiguous alt email]'; end if;

  -- 9. Unknown and blank emails find nobody
  if not exists (select 1 from find_person_by_email('zztest-pe-nobody@example.invalid'))
     and not exists (select 1 from find_person_by_email(''))
     and not exists (select 1 from find_person_by_email(null))
  then passed := passed + 1; else fails := fails || ' [9 nobody]'; end if;

  -- 10. A client with an other email cannot be deleted by accident
  insert into people (email, first_name, last_name, status) values ('zztest-pe-z@example.invalid', 'Test', 'PeZ', 'client') returning id into pz;
  j := person_email_step('add', pz, 'zztest-pe-z-old@example.invalid', null, null);
  begin
    delete from people where id = pz;
    fails := fails || ' [10 client deleted with an other email]';
  exception when foreign_key_violation then
    passed := passed + 1;
  end;

  -- 11. Balance payments (011) now check person_has_email, and the old check is gone
  d := pg_get_functiondef('public.apply_balance_payment(uuid)'::regprocedure);
  if (length(d) - length(replace(d, 'person_has_email(pe.id, t.email)', ''))) / length('person_has_email(pe.id, t.email)') = 2
     and position('pe.alt_email' in d) = 0
  then passed := passed + 1; else fails := fails || ' [11 balance function not rebuilt]'; end if;

  -- 12. A balance payment sent with an OTHER email matches the order by that email, and is not
  --     flagged "email differs"; a stranger's email still goes to "payment to match"
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes, order_ref)
    values (pa, v_product, 500, current_date, 'TEST 014', 'TT-2099-ZZPE14-2');
  j := record_balance_payment('pi_ZZTEST_014_A', 'TT-2099-ZZPE14', 'TEST', 10, now(), now(), 'card',
                              'zztest-pe-a-old@example.invalid', 'link', null);
  t := (j->>'result') || ', ' || coalesce(j->>'email_differs', 'null');
  j := record_balance_payment('pi_ZZTEST_014_B', 'TT-2099-ZZPE14', 'TEST', 10, now(), now(), 'card',
                              'zztest-pe-stranger@example.invalid', 'link', null);
  t := t || ', ' || (j->>'result');
  if t = 'matched, false, to_match'
  then passed := passed + 1; else fails := fails || ' [12 balance payment by other email: ' || t || ']'; end if;

  -- 13. Remove: wrong person refused; right person removes it; then nobody is found
  t := ((person_email_step('remove', pb, null, e1, null))->>'result')
    || ', ' || ((person_email_step('remove', pa, null, e1, null))->>'result')
    || ', ' || ((person_email_step('remove', pa, null, e1, null))->>'result');
  if t = 'email_not_found, done, email_not_found'
     and not exists (select 1 from find_person_by_email('zztest-pe-a-old@example.invalid'))
  then passed := passed + 1; else fails := fails || ' [13 remove: ' || t || ']'; end if;

  -- 14. Stored emails must be lower case with no spaces (table rule, not only the step)
  begin
    insert into person_emails (person_id, email) values (pa, 'ZZTEST-PE-UPPER@example.invalid');
    fails := fails || ' [14 upper case stored]';
  exception when check_violation then
    passed := passed + 1;
  end;

  -- 15. Logged-in browser keys cannot reach the table or the functions
  if not has_table_privilege('anon', 'public.person_emails', 'select')
     and not has_table_privilege('authenticated', 'public.person_emails', 'select')
     and not has_function_privilege('anon', 'public.find_person_by_email(text)', 'execute')
     and not has_function_privilege('authenticated', 'public.find_person_by_email(text)', 'execute')
     and not has_function_privilege('anon', 'public.person_has_email(uuid, text)', 'execute')
     and not has_function_privilege('authenticated', 'public.person_email_step(text, uuid, text, uuid, text)', 'execute')
     and not has_function_privilege('anon', 'public.person_email_step(text, uuid, text, uuid, text)', 'execute')
     and not has_function_privilege('anon', 'public.apply_balance_payment(uuid)', 'execute')
  then passed := passed + 1;
  else fails := fails || ' [15 access not locked down]'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 15 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 15 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
