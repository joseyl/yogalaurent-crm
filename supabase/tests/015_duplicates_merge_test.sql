-- TEST ONLY. Runs migration 015 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 14 of 14 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/015_duplicates_merge.sql (without its final check).

begin;

-- 015_duplicates_merge.sql
-- Build D, release 2, of claude/CRM_ROADMAP_2026-10-09.md: possible duplicates, "Not the same
-- person", merge two client records, and undo a merge.
-- Needs migration 014 (person_emails). Run by hand in the Supabase SQL Editor BEFORE the
-- duplicates-merge code goes live. Run supabase/tests/015_duplicates_merge_test.sql first: it
-- runs all of this plus checks, then undoes everything.
--
-- What it adds:
--   duplicate_dismissals     pairs marked "Not the same person" (never shown again; can be undone)
--   duplicate_pairs          view, one row per pair of records that may be the same person,
--                            with the reasons and flags, most likely first
--   duplicate_pair_step()    Not the same person, and its undo (lock hashtext('duplicate_pairs'))
--   person_merges            merge log: kept and removed record, the removed record in full,
--                            the kept record before the merge, the choices, counts per table
--   person_merge_rows        every moved row id, per table and column
--   merge_people()           the merge, all or nothing, in one locked step
--   undo_person_merge()      the undo, all or nothing, in one locked step
--
-- Pair rules (the same as check 1 of 9 Oct 2026):
--   (a) same email: main or alt on one record equals main or alt on the other (lower case,
--       spaces removed).
--   (b) same phone: digits only; a leading 00 dropped, then a leading 44, then a leading 0;
--       at least 9 digits left, or the phone is ignored.
--   (c) same full name (first and last, lower case, trimmed), different emails.
--   (d) same surname and a nickname pair from the fixed list below, or same surname and first
--       name one letter off, or same first name and surname one letter off (one letter changed,
--       added or removed; names of 3 letters or more).
--   Most likely first: (a), then (b), then (c), then (d); more reasons first within each.
--   Flags: more than one Intro Offer across the two records; a deceased record; both records
--   have a Momence member number.
--
-- Merge rules:
--   Refused: a record into itself, an unknown record, an unknown choice.
--   Every table with a person_id column (or any link to people) is found from the database
--   itself at the moment of the merge, not from a list: every row pointing at the removed
--   record moves to the kept record and its id is logged. A table without an id column that
--   holds a row for the removed record makes the merge refuse.
--   gone_quiet_actions (one row per person): the kept record's row stays; if only the removed
--   record has one, it moves. The removed record's row is kept in the log either way.
--   person_emails: the removed record's other emails move to the kept record; its main email and
--   alt_email become other emails of the kept record (source 'merge'), unless already on the
--   kept record, or on a third record (then listed as skipped in the log, never moved silently).
--   Fields: first_name, last_name, phone, country: 'keep' (default) or 'remove' (take the
--   removed record's value). notes: 'keep', 'remove' or 'both'. Email, alt_email, assigned_to,
--   source channel, created date: always the kept record's. Status: a lead merged with a client
--   becomes a client; otherwise the kept record's status. Momence member number: the kept
--   record's; if it has none, the removed record's; the other stays in the log.
--   Before the removed record is deleted, every link to it in every table is counted again; if
--   any is above 0 the whole merge is undone (error, nothing changed). Purchases, old attendance
--   and leads are deleted with a client (ON DELETE CASCADE since 2020), so this check matters.
--   Locks, always in this order: person_merge, person_emails, pass_followup, gone_quiet,
--   order_payment; then both client rows FOR UPDATE, so a feed writing to either record waits.
--   Moving a row touches updated_at on attendance_v2 and leads (their update triggers).
--
-- Undo rules:
--   Refused (nothing changed) when: already undone; the kept record no longer exists (undo the
--   later merge first); the removed record's id or main email is in use again; one of its
--   emails was added by hand to someone since; a moved row was deleted or moved since.
--   Puts back the removed record exactly as it was (same id), moves every logged row back,
--   removes the emails the merge added, moves its other emails back, puts back both Gone Quiet
--   rows as they were before the merge, and puts back the kept record's first and last name,
--   phone, country, notes, status and Momence member number as they were before the merge.
--   Anything recorded on the kept record after the merge stays with the kept record.
--
-- To remove:
--   drop function if exists public.undo_person_merge(uuid);
--   drop function if exists public.merge_people(uuid, uuid, jsonb, text);
--   drop function if exists public.person_link_columns();
--   drop function if exists public.duplicate_pair_step(text, uuid, uuid, text);
--   drop view if exists public.duplicate_pairs;
--   drop table if exists public.person_merge_rows;
--   drop table if exists public.person_merges;
--   drop table if exists public.duplicate_dismissals;

create table if not exists public.duplicate_dismissals (
  person_low uuid not null,
  person_high uuid not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (person_low, person_high),
  check (person_low < person_high)
);

create table if not exists public.person_merges (
  id uuid primary key default gen_random_uuid(),
  kept_id uuid not null,
  removed_id uuid not null,
  removed_person jsonb not null,
  kept_before jsonb not null,
  choices jsonb not null default '{}'::jsonb,
  removed_gone_quiet jsonb,
  gone_quiet_rule text not null default 'none' check (gone_quiet_rule in ('none', 'moved', 'kept_own')),
  emails_added text[] not null default '{}',
  emails_skipped text[] not null default '{}',
  row_counts jsonb not null default '{}'::jsonb,
  note text,
  status text not null default 'merged' check (status in ('merged', 'undone')),
  merged_at timestamptz not null default now(),
  undone_at timestamptz,
  undo_counts jsonb,
  check (kept_id <> removed_id)
);

create table if not exists public.person_merge_rows (
  merge_id uuid not null references public.person_merges(id),
  table_name text not null,
  column_name text not null,
  row_id uuid not null,
  primary key (merge_id, table_name, column_name, row_id)
);

create index if not exists person_merges_kept_idx on public.person_merges (kept_id);
create index if not exists person_merges_removed_idx on public.person_merges (removed_id);

alter table public.duplicate_dismissals enable row level security;
alter table public.person_merges enable row level security;
alter table public.person_merge_rows enable row level security;
revoke all on public.duplicate_dismissals from public, anon, authenticated;
revoke all on public.person_merges from public, anon, authenticated;
revoke all on public.person_merge_rows from public, anon, authenticated;
grant select, insert, update, delete on public.duplicate_dismissals to service_role;
grant select, insert, update, delete on public.person_merges to service_role;
grant select, insert, update, delete on public.person_merge_rows to service_role;

-- 1. The pairs view -------------------------------------------------------------------------

create or replace view public.duplicate_pairs
with (security_invoker = true) as
with
nick(a, b) as (values
 ('bill','william'),('will','william'),('liam','william'),('billy','william'),
 ('bob','robert'),('rob','robert'),('robbie','robert'),('bobby','robert'),('bert','robert'),
 ('liz','elizabeth'),('beth','elizabeth'),('lizzie','elizabeth'),('betty','elizabeth'),('eliza','elizabeth'),('lisa','elizabeth'),
 ('liz','elisabeth'),('lisa','elisabeth'),('beth','bethany'),
 ('kate','katherine'),('katie','katherine'),('kathy','katherine'),('kat','katherine'),
 ('kate','catherine'),('katie','catherine'),('cathy','catherine'),('cath','catherine'),
 ('kate','kathryn'),('katie','kathryn'),('kasia','katarzyna'),
 ('jim','james'),('jimmy','james'),('jamie','james'),
 ('mike','michael'),('mick','michael'),('mikey','michael'),('micky','michael'),
 ('tom','thomas'),('tommy','thomas'),('dave','david'),('davy','david'),
 ('dan','daniel'),('danny','daniel'),('dani','daniela'),('dani','danielle'),
 ('chris','christopher'),('chris','christine'),('chris','christina'),('tina','christina'),('kit','christopher'),
 ('sam','samuel'),('sam','samantha'),('sammy','samantha'),
 ('alex','alexander'),('alex','alexandra'),('alex','alexis'),('sandy','alexandra'),('sasha','alexandra'),('sasha','alexander'),
 ('nick','nicholas'),('nicky','nicola'),('nikki','nicola'),('nicky','nicholas'),
 ('tony','anthony'),('ant','anthony'),('steve','stephen'),('steve','steven'),('stevie','stephanie'),('steph','stephanie'),
 ('matt','matthew'),('andy','andrew'),('drew','andrew'),('ben','benjamin'),('benji','benjamin'),
 ('jen','jennifer'),('jenny','jennifer'),('jenn','jennifer'),('jess','jessica'),('jessie','jessica'),
 ('jo','joanne'),('jo','joanna'),('jo','josephine'),('josie','josephine'),('joe','joseph'),('joey','joseph'),
 ('pat','patricia'),('pat','patrick'),('trish','patricia'),('patty','patricia'),
 ('sue','susan'),('suzy','susan'),('sue','suzanne'),('susie','susan'),
 ('maggie','margaret'),('meg','margaret'),('peggy','margaret'),('marge','margaret'),('mags','margaret'),
 ('fred','frederick'),('freddie','frederick'),('ed','edward'),('eddie','edward'),('ted','edward'),('ned','edward'),
 ('rick','richard'),('dick','richard'),('rich','richard'),('ricky','richard'),('richie','richard'),
 ('charlie','charles'),('chuck','charles'),('charlie','charlotte'),('lottie','charlotte'),
 ('harry','henry'),('hal','henry'),('jack','john'),('johnny','john'),('jon','jonathan'),('jonny','jonathan'),
 ('nat','natalie'),('nat','nathalie'),('nat','natasha'),('tash','natasha'),('tasha','natasha'),
 ('becky','rebecca'),('becca','rebecca'),('vicky','victoria'),('vicki','victoria'),('tori','victoria'),
 ('abby','abigail'),('abi','abigail'),('gill','gillian'),('jill','gillian'),('mandy','amanda'),
 ('debbie','deborah'),('deb','deborah'),('debs','deborah'),('ellie','eleanor'),('nell','eleanor'),('ellie','elena'),('ellie','ellen'),
 ('lou','louise'),('lou','louisa'),('fran','frances'),('fran','francesca'),('frankie','francesca'),('frank','francis'),
 ('pippa','philippa'),('pip','philippa'),('phil','philip'),('phil','phillip'),('tim','timothy'),('greg','gregory'),
 ('geoff','geoffrey'),('jeff','jeffrey'),('ken','kenneth'),('len','leonard'),('leo','leonardo'),('max','maximilian'),
 ('ron','ronald'),('ray','raymond'),('russ','russell'),('stu','stuart'),('theo','theodore'),('val','valerie'),('viv','vivienne'),
 ('carrie','caroline'),('caro','caroline'),('jackie','jacqueline'),('jacky','jacqueline'),('di','diana'),('di','diane'),
 ('emmy','emily'),('millie','amelia'),('milly','camilla'),('rosie','rosemary'),('rosie','rose'),('hattie','harriet'),
 ('izzy','isabel'),('izzy','isabella'),('bella','isabella'),('isa','isabel'),('belle','isabelle'),
 ('pepe','jose'),('paco','francisco'),('lola','dolores'),('manu','manuel'),('rafa','rafael'),('nacho','ignacio'),
 ('gosia','malgorzata'),('ania','anna'),('annie','anna'),('annie','anne'),('nan','nancy'),
 ('cass','cassandra'),('gabi','gabriela'),('gabby','gabrielle'),('gabi','gabriella')
),
nk as (select a, b from nick union select b, a from nick),
p as (
  select pe.id, pe.status, pe.momence_member_id as mm,
    nullif(lower(regexp_replace(pe.email, '\s', '', 'g')), '') as e1,
    nullif(lower(regexp_replace(coalesce(pe.alt_email, ''), '\s', '', 'g')), '') as e2,
    nullif(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(pe.phone, ''), '\D', '', 'g'),
      '^00', ''), '^44', ''), '^0', ''), '') as ph,
    nullif(lower(trim(pe.first_name)), '') as fn,
    nullif(lower(trim(pe.last_name)), '') as ln
  from people pe
),
pr as (
  select x.id as id1, y.id as id2, x.status as s1, y.status as s2, x.mm as mm1, y.mm as mm2,
    coalesce(x.e1 in (y.e1, y.e2) or (x.e2 is not null and x.e2 in (y.e1, y.e2)), false) as r_email,
    coalesce(x.ph is not null and length(x.ph) >= 9 and x.ph = y.ph, false) as r_phone,
    coalesce(x.fn is not null and x.ln is not null and x.fn = y.fn and x.ln = y.ln, false) as r_name,
    coalesce(x.fn is not null and x.ln is not null and y.fn is not null and y.ln is not null and (
        (x.ln = y.ln and x.fn <> y.fn and exists (select 1 from nk where nk.a = x.fn and nk.b = y.fn))
     or (x.ln = y.ln and x.fn <> y.fn and least(length(x.fn), length(y.fn)) >= 3 and (
          (length(x.fn) = length(y.fn) and (select count(*) from generate_series(1, length(x.fn)) i
             where substr(x.fn, i, 1) <> substr(y.fn, i, 1)) = 1)
       or (length(x.fn) = length(y.fn) + 1 and exists (select 1 from generate_series(1, length(x.fn)) i
             where overlay(x.fn placing '' from i for 1) = y.fn))
       or (length(y.fn) = length(x.fn) + 1 and exists (select 1 from generate_series(1, length(y.fn)) i
             where overlay(y.fn placing '' from i for 1) = x.fn))))
     or (x.fn = y.fn and x.ln <> y.ln and least(length(x.ln), length(y.ln)) >= 3 and (
          (length(x.ln) = length(y.ln) and (select count(*) from generate_series(1, length(x.ln)) i
             where substr(x.ln, i, 1) <> substr(y.ln, i, 1)) = 1)
       or (length(x.ln) = length(y.ln) + 1 and exists (select 1 from generate_series(1, length(x.ln)) i
             where overlay(x.ln placing '' from i for 1) = y.ln))
       or (length(y.ln) = length(x.ln) + 1 and exists (select 1 from generate_series(1, length(y.ln)) i
             where overlay(y.ln placing '' from i for 1) = x.ln))))
    ), false) as r_similar
  from p x
  join p y on x.id < y.id
   and ( x.e1 in (y.e1, y.e2) or (x.e2 is not null and x.e2 in (y.e1, y.e2))
      or (x.ph is not null and x.ph = y.ph)
      or x.ln = y.ln or x.fn = y.fn )
),
intro as (
  select pu.person_id, count(*) as cnt
  from purchases pu join products pd on pd.id = pu.product_id
  where pd.name ilike '%introductory offer%'
  group by pu.person_id
)
select
  pr.id1 as person_a,
  pr.id2 as person_b,
  pr.r_email as same_email,
  pr.r_phone as same_phone,
  pr.r_name as same_name,
  pr.r_similar as similar_name,
  (case when pr.r_email then 1 when pr.r_phone then 2 when pr.r_name then 3 else 4 end) as rank,
  (pr.r_email::int + pr.r_phone::int + pr.r_name::int + pr.r_similar::int) as reasons,
  (coalesce(ia.cnt, 0) + coalesce(ib.cnt, 0)) as intro_offers,
  (coalesce(ia.cnt, 0) + coalesce(ib.cnt, 0) > 1) as more_than_one_intro_offer,
  ('deceased' in (pr.s1, pr.s2)) as has_deceased,
  (pr.mm1 is not null and pr.mm2 is not null) as both_momence_numbers,
  (d.person_low is not null) as not_same,
  d.note as not_same_note,
  d.created_at as not_same_at
from pr
left join intro ia on ia.person_id = pr.id1
left join intro ib on ib.person_id = pr.id2
left join duplicate_dismissals d on d.person_low = pr.id1 and d.person_high = pr.id2
where pr.r_email or pr.r_phone or pr.r_name or pr.r_similar;

revoke all on public.duplicate_pairs from public, anon, authenticated;
grant select on public.duplicate_pairs to service_role;

-- 2. Not the same person --------------------------------------------------------------------
--   not_same       remembers the pair (never shown again); note optional
--   undo_not_same  forgets it, so the pair shows again

create or replace function public.duplicate_pair_step(
  p_action text,
  p_a uuid,
  p_b uuid,
  p_note text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_low uuid := least(p_a, p_b);
  v_high uuid := greatest(p_a, p_b);
begin
  perform pg_advisory_xact_lock(hashtext('duplicate_pairs'));

  if p_action is null or p_action not in ('not_same', 'undo_not_same') then
    return jsonb_build_object('result', 'bad_action');
  end if;
  if p_a is null or p_b is null then
    return jsonb_build_object('result', 'not_found');
  end if;
  if p_a = p_b then
    return jsonb_build_object('result', 'same_record');
  end if;

  if p_action = 'not_same' then
    if (select count(*) from people where id in (p_a, p_b)) <> 2 then
      return jsonb_build_object('result', 'not_found');
    end if;
    if exists (select 1 from duplicate_dismissals where person_low = v_low and person_high = v_high) then
      return jsonb_build_object('result', 'already_not_same');
    end if;
    insert into duplicate_dismissals (person_low, person_high, note)
      values (v_low, v_high, nullif(left(trim(coalesce(p_note, '')), 500), ''));
  else
    delete from duplicate_dismissals where person_low = v_low and person_high = v_high;
    if not found then
      return jsonb_build_object('result', 'not_dismissed');
    end if;
  end if;
  return jsonb_build_object('result', 'done');
end;
$$;

-- 3. Every column that points at a client, read from the database itself ---------------------

create or replace function public.person_link_columns()
returns table (table_name text, column_name text, has_uuid_id boolean)
language sql
stable
security invoker
set search_path = public
as $$
  with cols as (
    select c.table_name::text as t, c.column_name::text as col
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public' and tb.table_type = 'BASE TABLE' and c.column_name = 'person_id'
    union
    select cl.relname::text, a.attname::text
    from pg_constraint k
    join pg_class cl on cl.oid = k.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace and ns.nspname = 'public'
    join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any(k.conkey)
    where k.contype = 'f' and k.confrelid = 'public.people'::regclass
  )
  select cols.t, cols.col,
    exists (select 1 from information_schema.columns ic
            where ic.table_schema = 'public' and ic.table_name = cols.t
              and ic.column_name = 'id' and ic.data_type = 'uuid')
  from cols
  order by 1, 2;
$$;

-- 4. The merge ------------------------------------------------------------------------------

create or replace function public.merge_people(
  p_keep uuid,
  p_remove uuid,
  p_choices jsonb,
  p_note text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  k people%rowtype;
  r people%rowtype;
  c jsonb := coalesce(p_choices, '{}'::jsonb);
  v_merge uuid := gen_random_uuid();
  f text;
  t record;
  n int;
  v_counts jsonb := '{}'::jsonb;
  g gone_quiet_actions%rowtype;
  v_rule text := 'none';
  e text;
  v_added text[] := '{}';
  v_skipped text[] := '{}';
  v_left text := '';
begin
  perform pg_advisory_xact_lock(hashtext('person_merge'));
  perform pg_advisory_xact_lock(hashtext('person_emails'));
  perform pg_advisory_xact_lock(hashtext('pass_followup'));
  perform pg_advisory_xact_lock(hashtext('gone_quiet'));
  perform pg_advisory_xact_lock(hashtext('order_payment'));

  if p_keep is null or p_remove is null then
    return jsonb_build_object('result', 'not_found');
  end if;
  if p_keep = p_remove then
    return jsonb_build_object('result', 'same_record');
  end if;
  if jsonb_typeof(c) <> 'object' then
    return jsonb_build_object('result', 'bad_choice');
  end if;
  foreach f in array array['first_name', 'last_name', 'phone', 'country'] loop
    if coalesce(c->>f, 'keep') not in ('keep', 'remove') then
      return jsonb_build_object('result', 'bad_choice', 'field', f);
    end if;
  end loop;
  if coalesce(c->>'notes', 'keep') not in ('keep', 'remove', 'both') then
    return jsonb_build_object('result', 'bad_choice', 'field', 'notes');
  end if;

  -- Both client rows locked: a feed writing to either record waits until the merge is over
  perform 1 from people where id in (p_keep, p_remove) order by id for update;
  select * into k from people where id = p_keep;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  select * into r from people where id = p_remove;
  if not found then return jsonb_build_object('result', 'not_found'); end if;

  insert into person_merges (id, kept_id, removed_id, removed_person, kept_before, choices, note)
    values (v_merge, p_keep, p_remove, to_jsonb(r), to_jsonb(k), c,
            nullif(left(trim(coalesce(p_note, '')), 1000), ''));

  -- Every table that points at a client, except the two with their own rule
  for t in select * from person_link_columns() pl
           where pl.table_name not in ('gone_quiet_actions', 'person_emails') loop
    if not t.has_uuid_id then
      execute format('select count(*) from public.%I where %I = $1', t.table_name, t.column_name)
        into n using p_remove;
      if n > 0 then
        raise exception 'MERGE REFUSED: table % has no id column, so its rows cannot be logged. Nothing changed.', t.table_name;
      end if;
      continue;
    end if;
    execute format(
      'with m as (update public.%I set %I = $1 where %I = $2 returning id) '
      || 'insert into person_merge_rows (merge_id, table_name, column_name, row_id) select $3, %L, %L, id from m',
      t.table_name, t.column_name, t.column_name, t.table_name, t.column_name)
      using p_keep, p_remove, v_merge;
    get diagnostics n = row_count;
    if n > 0 then
      v_counts := v_counts || jsonb_build_object(t.table_name, n);
    end if;
  end loop;

  -- Gone Quiet: one row per person. The kept record's row stays; if only the removed record
  -- has one, it moves. The removed record's row is kept in the log either way.
  select * into g from gone_quiet_actions where person_id = p_remove for update;
  if found then
    if exists (select 1 from gone_quiet_actions where person_id = p_keep) then
      delete from gone_quiet_actions where person_id = p_remove;
      v_rule := 'kept_own';
    else
      update gone_quiet_actions set person_id = p_keep, updated_at = now() where person_id = p_remove;
      v_rule := 'moved';
    end if;
    update person_merges set removed_gone_quiet = to_jsonb(g), gone_quiet_rule = v_rule where id = v_merge;
    v_counts := v_counts || jsonb_build_object('gone_quiet_actions', 1);
  end if;

  -- Other emails of the removed record move to the kept record
  with m as (update person_emails set person_id = p_keep where person_id = p_remove returning id)
  insert into person_merge_rows (merge_id, table_name, column_name, row_id)
    select v_merge, 'person_emails', 'person_id', id from m;
  get diagnostics n = row_count;
  if n > 0 then
    v_counts := v_counts || jsonb_build_object('person_emails', n);
  end if;

  -- The removed record's main email and alt_email become other emails of the kept record
  foreach e in array array[r.email, r.alt_email] loop
    e := nullif(lower(regexp_replace(coalesce(e, ''), '\s', '', 'g')), '');
    continue when e is null or e = any(v_added) or e = any(v_skipped);
    if person_has_email(p_keep, e) then
      continue;
    elsif e !~ '^[^@]+@[^@]+\.[^@]+$'
       or exists (select 1 from person_emails where email = e)
       or exists (select 1 from people where id not in (p_keep, p_remove)
                  and (lower(trim(email)) = e or lower(trim(alt_email)) = e)) then
      v_skipped := v_skipped || e;
    else
      insert into person_emails (person_id, email, source, merge_id, note)
        values (p_keep, e, 'merge', v_merge, 'From a merged record');
      v_added := v_added || e;
    end if;
  end loop;

  -- The kept record's fields, as chosen
  update people set
    first_name = case when c->>'first_name' = 'remove' then r.first_name else k.first_name end,
    last_name  = case when c->>'last_name'  = 'remove' then r.last_name  else k.last_name  end,
    phone      = case when c->>'phone'      = 'remove' then r.phone      else k.phone      end,
    country    = case when c->>'country'    = 'remove' then r.country    else k.country    end,
    notes = case coalesce(c->>'notes', 'keep')
              when 'remove' then r.notes
              when 'both' then nullif(concat_ws(E'\n\n',
                nullif(trim(coalesce(k.notes, '')), ''),
                case when nullif(trim(coalesce(r.notes, '')), '') is not null
                     then 'From merged record: ' || trim(r.notes) end), '')
              else k.notes end,
    status = case when k.status = 'lead' and r.status = 'client' then 'client' else k.status end,
    momence_member_id = coalesce(k.momence_member_id, r.momence_member_id)
  where id = p_keep;

  -- Nothing may still point at the removed record, in any table
  for t in select * from person_link_columns() loop
    execute format('select count(*) from public.%I where %I = $1', t.table_name, t.column_name)
      into n using p_remove;
    if n > 0 then
      v_left := v_left || ' ' || t.table_name || '.' || t.column_name || ' ' || n;
    end if;
  end loop;
  if v_left <> '' then
    raise exception 'MERGE REFUSED: rows still point at the removed record:%. Nothing changed.', v_left;
  end if;

  delete from people where id = p_remove;

  update person_merges
    set row_counts = v_counts, emails_added = v_added, emails_skipped = v_skipped
    where id = v_merge;

  return jsonb_build_object('result', 'done', 'merge_id', v_merge, 'kept_id', p_keep,
                            'removed_id', p_remove, 'counts', v_counts,
                            'emails_added', to_jsonb(v_added), 'emails_skipped', to_jsonb(v_skipped),
                            'gone_quiet_rule', v_rule);
end;
$$;

-- 5. The undo -------------------------------------------------------------------------------

create or replace function public.undo_person_merge(p_merge_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  m person_merges%rowtype;
  t record;
  n int;
  v_counts jsonb := '{}'::jsonb;
  v_email text;
  v_alt text;
  v_kb jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('person_merge'));
  perform pg_advisory_xact_lock(hashtext('person_emails'));
  perform pg_advisory_xact_lock(hashtext('pass_followup'));
  perform pg_advisory_xact_lock(hashtext('gone_quiet'));
  perform pg_advisory_xact_lock(hashtext('order_payment'));

  select * into m from person_merges where id = p_merge_id for update;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if m.status = 'undone' then return jsonb_build_object('result', 'already_undone'); end if;

  perform 1 from people where id = m.kept_id for update;
  if not found then return jsonb_build_object('result', 'kept_missing'); end if;
  if exists (select 1 from people where id = m.removed_id) then
    return jsonb_build_object('result', 'removed_exists');
  end if;

  v_email := lower(regexp_replace(coalesce(m.removed_person->>'email', ''), '\s', '', 'g'));
  v_alt := nullif(lower(regexp_replace(coalesce(m.removed_person->>'alt_email', ''), '\s', '', 'g')), '');
  if exists (select 1 from people where email = m.removed_person->>'email') then
    return jsonb_build_object('result', 'email_in_use');
  end if;
  if exists (select 1 from person_emails
             where email in (v_email, coalesce(v_alt, v_email)) and merge_id is distinct from m.id) then
    return jsonb_build_object('result', 'email_in_use');
  end if;

  -- Every moved row must still exist and still point at the kept record
  for t in select table_name, column_name, array_agg(row_id) as ids, count(*) as cnt
           from person_merge_rows where merge_id = m.id group by table_name, column_name loop
    execute format('select count(*) from public.%I where id = any($1) and %I = $2', t.table_name, t.column_name)
      into n using t.ids, m.kept_id;
    if n <> t.cnt then
      return jsonb_build_object('result', 'rows_changed', 'table', t.table_name,
                                'expected', t.cnt, 'found', n);
    end if;
  end loop;

  -- All checks passed: put everything back
  delete from person_emails where merge_id = m.id;

  insert into people select (jsonb_populate_record(null::people, m.removed_person)).*;

  for t in select table_name, column_name, array_agg(row_id) as ids, count(*) as cnt
           from person_merge_rows where merge_id = m.id group by table_name, column_name loop
    execute format('update public.%I set %I = $1 where id = any($2) and %I = $3',
                   t.table_name, t.column_name, t.column_name)
      using m.removed_id, t.ids, m.kept_id;
    get diagnostics n = row_count;
    if n <> t.cnt then
      raise exception 'UNDO REFUSED: % rows moved back in %, expected %. Nothing changed.', n, t.table_name, t.cnt;
    end if;
    v_counts := v_counts || jsonb_build_object(t.table_name, n);
  end loop;

  if m.gone_quiet_rule = 'moved' then
    delete from gone_quiet_actions where person_id = m.kept_id;
  end if;
  if m.gone_quiet_rule in ('moved', 'kept_own') then
    insert into gone_quiet_actions
      select (jsonb_populate_record(null::gone_quiet_actions, m.removed_gone_quiet)).*;
    v_counts := v_counts || jsonb_build_object('gone_quiet_actions', 1);
  end if;

  v_kb := m.kept_before;
  update people set
    first_name = v_kb->>'first_name',
    last_name = v_kb->>'last_name',
    phone = v_kb->>'phone',
    country = v_kb->>'country',
    notes = v_kb->>'notes',
    status = v_kb->>'status',
    momence_member_id = (v_kb->>'momence_member_id')::bigint
  where id = m.kept_id;

  -- Final check: the restored record is complete
  if not exists (select 1 from people where id = m.removed_id) then
    raise exception 'UNDO REFUSED: the removed record was not put back. Nothing changed.';
  end if;

  update person_merges set status = 'undone', undone_at = now(), undo_counts = v_counts where id = m.id;

  return jsonb_build_object('result', 'done', 'merge_id', m.id, 'kept_id', m.kept_id,
                            'removed_id', m.removed_id, 'counts', v_counts);
end;
$$;

revoke all on function public.duplicate_pair_step(text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.person_link_columns() from public, anon, authenticated;
revoke all on function public.merge_people(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.undo_person_merge(uuid) from public, anon, authenticated;
grant execute on function public.duplicate_pair_step(text, uuid, uuid, text) to service_role;
grant execute on function public.person_link_columns() to service_role;
grant execute on function public.merge_people(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.undo_person_merge(uuid) to service_role;

-- ── Helper for this test only (disappears with the rollback) ───────────────────────────────
create function pg_temp.zz_counts(p uuid) returns jsonb language plpgsql as $f$
declare
  t record;
  n int;
  j jsonb := '{}'::jsonb;
begin
  for t in select * from public.person_link_columns() loop
    execute format('select count(*) from public.%I where %I = $1', t.table_name, t.column_name) into n using p;
    j := j || jsonb_build_object(t.table_name || '.' || t.column_name, n);
  end loop;
  return j;
end $f$;

-- ── Checks on made-up people (emails zztest-mg-*@example.invalid) ──────────────────────────
do $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  v_product uuid := (select id from products order by name, id limit 1);
  v_intro uuid := (select id from products where name ilike '%introductory offer%' order by name, id limit 1);
  pe1 uuid; pe2 uuid; pp1 uuid; pp2 uuid; pn1 uuid; pn2 uuid; pk1 uuid; pk2 uuid;
  mk uuid; mr uuid; mx uuid;
  m1 uuid; m2 uuid; m3 uuid;
  ck jsonb; cr jsonb; ca jsonb; cb jsonb;
  k text;
  ok boolean;
  r record;
  j jsonb;
  t text;
  d text;
  n int;
  passed int := 0;
  fails text := '';
begin
  if v_product is null then raise exception 'TEST CANNOT RUN: no products.'; end if;
  if v_intro is null then raise exception 'TEST CANNOT RUN: no Introductory Offer product.'; end if;

  -- Pairs, one per reason. First names and surnames chosen so they pair with nothing else.
  insert into people (email, alt_email, first_name, last_name, phone, status) values
    ('zztest-mg-e1@example.invalid', null, 'Quillon', 'Zzmgemailone', null, 'client') returning id into pe1;
  insert into people (email, alt_email, first_name, last_name, phone, status) values
    ('zztest-mg-e2@example.invalid', ' ZZTEST-MG-E1@example.invalid', 'Rasmund', 'Zzmgemailtwo', null, 'client') returning id into pe2;
  insert into people (email, first_name, last_name, phone, status) values
    ('zztest-mg-p1@example.invalid', 'Sorvick', 'Zzmgphonealpha', '+44 7700 900 915', 'client') returning id into pp1;
  insert into people (email, first_name, last_name, phone, status) values
    ('zztest-mg-p2@example.invalid', 'Torbelle', 'Zzmgphonebravo', '07700900915', 'lead') returning id into pp2;
  insert into people (email, first_name, last_name, status) values
    ('zztest-mg-n1@example.invalid', 'Ulvarine', 'Zzmgnamesame', 'client') returning id into pn1;
  insert into people (email, first_name, last_name, status) values
    ('zztest-mg-n2@example.invalid', 'Ulvarine', 'Zzmgnamesame', 'client') returning id into pn2;
  insert into people (email, first_name, last_name, status) values
    ('zztest-mg-k1@example.invalid', 'William', 'Zzmgnickname', 'client') returning id into pk1;
  insert into people (email, first_name, last_name, status) values
    ('zztest-mg-k2@example.invalid', 'Bill', 'Zzmgnickname', 'deceased') returning id into pk2;
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes) values
    (pk1, v_intro, 0, v_today - 40, 'TEST 015'), (pk2, v_intro, 0, v_today - 20, 'TEST 015');

  -- 1. Objects exist; merge and undo take every lock, in order, and lock both client rows
  d := pg_get_functiondef('public.merge_people(uuid, uuid, jsonb, text)'::regprocedure)
    || pg_get_functiondef('public.undo_person_merge(uuid)'::regprocedure);
  if (select count(*) from information_schema.tables where table_schema = 'public'
        and table_name in ('duplicate_dismissals', 'person_merges', 'person_merge_rows')) = 3
     and exists (select 1 from information_schema.views where table_schema = 'public' and table_name = 'duplicate_pairs')
     and pg_get_functiondef('public.duplicate_pair_step(text, uuid, uuid, text)'::regprocedure) ilike '%pg_advisory_xact_lock(hashtext(''duplicate_pairs''))%'
     and (length(d) - length(replace(d, 'pg_advisory_xact_lock(hashtext(''person_merge''))', ''))) / length('pg_advisory_xact_lock(hashtext(''person_merge''))') = 2
     and (length(d) - length(replace(d, 'pg_advisory_xact_lock(hashtext(''pass_followup''))', ''))) / length('pg_advisory_xact_lock(hashtext(''pass_followup''))') = 2
     and (length(d) - length(replace(d, 'pg_advisory_xact_lock(hashtext(''gone_quiet''))', ''))) / length('pg_advisory_xact_lock(hashtext(''gone_quiet''))') = 2
     and (length(d) - length(replace(d, 'pg_advisory_xact_lock(hashtext(''person_emails''))', ''))) / length('pg_advisory_xact_lock(hashtext(''person_emails''))') = 2
     and (length(d) - length(replace(d, 'pg_advisory_xact_lock(hashtext(''order_payment''))', ''))) / length('pg_advisory_xact_lock(hashtext(''order_payment''))') = 2
     and position('order by id for update' in d) > 0
  then passed := passed + 1; else fails := fails || ' [1 objects or locks missing]'; end if;

  -- 2. One pair per reason, with rank and flags
  t := '';
  select * into r from duplicate_pairs where person_a = least(pe1, pe2) and person_b = greatest(pe1, pe2);
  t := t || coalesce(r.same_email::text || r.rank, 'missing') || ';';
  select * into r from duplicate_pairs where person_a = least(pp1, pp2) and person_b = greatest(pp1, pp2);
  t := t || coalesce(r.same_phone::text || r.rank, 'missing') || ';';
  select * into r from duplicate_pairs where person_a = least(pn1, pn2) and person_b = greatest(pn1, pn2);
  t := t || coalesce(r.same_name::text || r.rank, 'missing') || ';';
  select * into r from duplicate_pairs where person_a = least(pk1, pk2) and person_b = greatest(pk1, pk2);
  t := t || coalesce(r.similar_name::text || r.rank || r.more_than_one_intro_offer::text || r.has_deceased::text, 'missing');
  if t = 'true1;true2;true3;true4truetrue'
     and (select count(*) from duplicate_pairs where person_a in (pe1, pe2, pp1, pp2, pn1, pn2, pk1, pk2)
            or person_b in (pe1, pe2, pp1, pp2, pn1, pn2, pk1, pk2)) = 4
  then passed := passed + 1; else fails := fails || ' [2 pairs: ' || t || ']'; end if;

  -- 3. Not the same person: remembered, refused twice, undone, refusals
  t := ((duplicate_pair_step('not_same', pn2, pn1, ' twins '))->>'result')
    || ', ' || ((duplicate_pair_step('not_same', pn1, pn2, null))->>'result');
  select * into r from duplicate_pairs where person_a = least(pn1, pn2) and person_b = greatest(pn1, pn2);
  ok := r.not_same and r.not_same_note = 'twins';
  t := t || ', ' || ((duplicate_pair_step('undo_not_same', pn1, pn2, null))->>'result')
    || ', ' || ((duplicate_pair_step('undo_not_same', pn1, pn2, null))->>'result')
    || ', ' || ((duplicate_pair_step('not_same', pn1, pn1, null))->>'result')
    || ', ' || ((duplicate_pair_step('not_same', pn1, gen_random_uuid(), null))->>'result')
    || ', ' || ((duplicate_pair_step('forget', pn1, pn2, null))->>'result');
  select * into r from duplicate_pairs where person_a = least(pn1, pn2) and person_b = greatest(pn1, pn2);
  if ok and not r.not_same
     and t = 'done, already_not_same, done, not_dismissed, same_record, not_found, bad_action'
  then passed := passed + 1; else fails := fails || ' [3 not the same person: ' || t || ']'; end if;

  -- Merge test records: mk (to keep, a lead) and mr (to remove, a client), history on both
  insert into people (email, first_name, last_name, phone, country, status, notes, momence_member_id) values
    ('zztest-mg-k@example.invalid', 'Keepname', 'Zzmgmergekeep', '0111', 'UK', 'lead', 'Kept note', null) returning id into mk;
  insert into people (email, alt_email, first_name, last_name, phone, country, status, notes, momence_member_id) values
    ('zztest-mg-r@example.invalid', 'zztest-mg-r-alt@example.invalid', 'Removename', 'Zzmgmergeremove', '0222', 'Spain',
     'client', 'Removed note', 999999915) returning id into mr;
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes) values
    (mr, v_product, 0, v_today - 30, 'TEST 015'), (mr, v_product, 0, v_today - 60, 'TEST 015');
  -- mk stays a lead: its history is a class, not a purchase (a purchase would make it a client)
  insert into attendance_v2 (source, source_booking_id, momence_member_id, class_name, class_date, cancelled, duplicate_of_momence, person_id)
    values ('momence', 'ZZTEST-MG-K', null, 'TEST class', v_today - 10, false, false, mk);
  insert into attendance (person_id, class_name, class_date) values (mr, 'TEST class', v_today - 30);
  insert into attendance_v2 (source, source_booking_id, momence_member_id, class_name, class_date, cancelled, duplicate_of_momence, person_id)
    values ('momence', 'ZZTEST-MG-1', null, 'TEST class', v_today - 30, false, false, mr);
  insert into leads (person_id, status) values (mr, 'new');
  insert into webhook_log (source, event_type, status, payload, person_id) values ('crm', 'zztest_015', 'success', '{}'::jsonb, mr);
  t := open_pass_followup('ZZTEST-MG-PF', mr, null, 'TEST 5 Class Pass', v_today - 50, v_today - 5, 2);
  insert into gone_quiet_actions (person_id, contacted_on) values (mk, v_today - 2);
  insert into gone_quiet_actions (person_id, dismissed_on, dismiss_reason, dismiss_note) values (mr, v_today - 9, 'other', 'TEST');
  j := person_email_step('add', mr, 'zztest-mg-r-old@example.invalid', null, null);
  ck := pg_temp.zz_counts(mk);
  cr := pg_temp.zz_counts(mr);

  -- 4. Refusals before anything changes: into itself, unknown record, unknown choice
  t := ((merge_people(mk, mk, '{}'::jsonb, null))->>'result')
    || ', ' || ((merge_people(mk, gen_random_uuid(), '{}'::jsonb, null))->>'result')
    || ', ' || ((merge_people(mk, mr, '{"phone":"both"}'::jsonb, null))->>'result')
    || ', ' || ((merge_people(mk, mr, '{"notes":"other"}'::jsonb, null))->>'result');
  if t = 'same_record, not_found, bad_choice, bad_choice'
     and not exists (select 1 from person_merges where kept_id = mk)
     and exists (select 1 from people where id = mr)
  then passed := passed + 1; else fails := fails || ' [4 refusals: ' || t || ']'; end if;

  -- 5. A merge that would leave a row behind is refused and changes nothing
  --    (a made-up table whose rows refuse to move; and a made-up table with no id column)
  create table public.zztest_merge_block (id uuid primary key default gen_random_uuid(), person_id uuid);
  create function pg_temp.zz_block() returns trigger language plpgsql as $b$ begin return null; end $b$;
  create trigger zz_block before update on public.zztest_merge_block for each row execute function pg_temp.zz_block();
  insert into public.zztest_merge_block (person_id) values (mr);
  t := '';
  begin
    j := merge_people(mk, mr, '{}'::jsonb, null);
    t := 'merged';
  exception when others then
    t := case when sqlerrm like 'MERGE REFUSED: rows still point at the removed record:%zztest_merge_block%' then 'refused' else sqlerrm end;
  end;
  drop table public.zztest_merge_block;
  create table public.zztest_merge_noid (person_id uuid);
  insert into public.zztest_merge_noid (person_id) values (mr);
  begin
    j := merge_people(mk, mr, '{}'::jsonb, null);
    t := t || ', merged';
  exception when others then
    t := t || ', ' || case when sqlerrm like 'MERGE REFUSED: table zztest_merge_noid has no id column%' then 'refused' else sqlerrm end;
  end;
  drop table public.zztest_merge_noid;
  if t = 'refused, refused'
     and pg_temp.zz_counts(mk) = ck and pg_temp.zz_counts(mr) = cr
     and not exists (select 1 from person_merges where kept_id = mk)
     and (select first_name from people where id = mk) = 'Keepname'
  then passed := passed + 1; else fails := fails || ' [5 left-behind refusal: ' || t || ']'; end if;

  -- 6. The merge: every row of every table moves; nothing left on the removed record
  j := merge_people(mk, mr,
         '{"first_name":"remove","last_name":"keep","phone":"keep","country":"remove","notes":"both"}'::jsonb, ' TEST merge ');
  m1 := (j->>'merge_id')::uuid;
  ca := pg_temp.zz_counts(mk);
  ok := j->>'result' = 'done' and not exists (select 1 from people where id = mr);
  for k in select jsonb_object_keys(ck) loop
    if k = 'gone_quiet_actions.person_id' then
      ok := ok and (ca->>k)::int = 1;
    elsif k = 'person_emails.person_id' then
      ok := ok and (ca->>k)::int = (ck->>k)::int + (cr->>k)::int + 2;
    else
      ok := ok and (ca->>k)::int = (ck->>k)::int + (cr->>k)::int;
    end if;
    ok := ok and ((pg_temp.zz_counts(mr))->>k)::int = 0;
  end loop;
  if ok and (cr->>'purchases.person_id')::int = 2 and (cr->>'attendance.person_id')::int = 1
     and (cr->>'attendance_v2.person_id')::int = 1 and (cr->>'leads.person_id')::int = 1
     and (cr->>'pass_followups.person_id')::int = 1 and (cr->>'webhook_log.person_id')::int = 1
  then passed := passed + 1; else fails := fails || ' [6 rows moved: ' || coalesce(j->>'result', 'null') || ']'; end if;

  -- 7. Fields as chosen; lead + client = client; Momence member number taken from the removed record
  select * into r from people where id = mk;
  if r.first_name = 'Removename' and r.last_name = 'Zzmgmergekeep' and r.phone = '0111' and r.country = 'Spain'
     and r.notes = E'Kept note\n\nFrom merged record: Removed note' and r.status = 'client'
     and r.momence_member_id = 999999915 and r.email = 'zztest-mg-k@example.invalid'
  then passed := passed + 1; else fails := fails || ' [7 fields]'; end if;

  -- 8. The removed record's emails are other emails of the kept record, and every lookup finds it
  if (select count(*) from person_emails where person_id = mk and source = 'merge' and merge_id = m1
        and email in ('zztest-mg-r@example.invalid', 'zztest-mg-r-alt@example.invalid')) = 2
     and exists (select 1 from person_emails where person_id = mk and email = 'zztest-mg-r-old@example.invalid' and source = 'hand')
     and (select person_id from find_person_by_email('ZZTEST-MG-R@example.invalid')) = mk
     and (select person_id from find_person_by_email('zztest-mg-r-alt@example.invalid')) = mk
     and (select person_id from find_person_by_email('zztest-mg-r-old@example.invalid')) = mk
  then passed := passed + 1; else fails := fails || ' [8 emails]'; end if;

  -- 9. Log: Gone Quiet rule kept_own (kept record's row stays, removed row logged); every moved
  --    row id logged; a second merge of the removed record is refused
  select * into r from person_merges where id = m1;
  n := (select coalesce(sum(value::int), 0) from jsonb_each_text(r.row_counts) where key <> 'gone_quiet_actions');
  if r.gone_quiet_rule = 'kept_own' and r.removed_gone_quiet->>'dismiss_reason' = 'other'
     and (select contacted_on from gone_quiet_actions where person_id = mk) = v_today - 2
     and (select count(*) from person_merge_rows where merge_id = m1) = n and n >= 8
     and r.note = 'TEST merge' and r.status = 'merged'
     and (merge_people(mk, mr, '{}'::jsonb, null))->>'result' = 'not_found'
  then passed := passed + 1; else fails := fails || ' [9 log]'; end if;

  -- 10. Undo puts everything back exactly
  j := undo_person_merge(m1);
  select * into r from person_merges where id = m1;
  ok := j->>'result' = 'done' and r.status = 'undone'
    and (select to_jsonb(p) from people p where p.id = mr) = r.removed_person
    and pg_temp.zz_counts(mk) = ck and pg_temp.zz_counts(mr) = cr
    and (select to_jsonb(g) from gone_quiet_actions g where g.person_id = mr) = r.removed_gone_quiet
    and (select contacted_on from gone_quiet_actions where person_id = mk) = v_today - 2
    and not exists (select 1 from person_emails where merge_id = m1)
    and exists (select 1 from person_emails where person_id = mr and email = 'zztest-mg-r-old@example.invalid')
    and (select person_id from find_person_by_email('zztest-mg-r@example.invalid')) = mr;
  select * into r from people where id = mk;
  if ok and r.first_name = 'Keepname' and r.country = 'UK' and r.notes = 'Kept note' and r.status = 'lead'
     and r.momence_member_id is null
  then passed := passed + 1; else fails := fails || ' [10 undo: ' || coalesce(j->>'result', 'null') || ']'; end if;

  -- 11. Undo twice is refused
  if (undo_person_merge(m1))->>'result' = 'already_undone' and (undo_person_merge(gen_random_uuid()))->>'result' = 'not_found'
  then passed := passed + 1; else fails := fails || ' [11 undo twice]'; end if;

  -- 12. Undo refused, nothing changed, if a moved row was deleted since the merge
  j := merge_people(mk, mr, '{}'::jsonb, null);
  m2 := (j->>'merge_id')::uuid;
  delete from purchases where id = (select row_id from person_merge_rows
                                    where merge_id = m2 and table_name = 'purchases' limit 1);
  ca := pg_temp.zz_counts(mk);
  j := undo_person_merge(m2);
  if j->>'result' = 'rows_changed' and j->>'table' = 'purchases'
     and not exists (select 1 from people where id = mr) and pg_temp.zz_counts(mk) = ca
     and (select status from person_merges where id = m2) = 'merged'
  then passed := passed + 1; else fails := fails || ' [12 undo after a change: ' || coalesce(j->>'result', 'null') || ']'; end if;

  -- 13. Undo refused while the kept record has itself been merged away (undo that one first)
  insert into people (email, first_name, last_name, status) values
    ('zztest-mg-x@example.invalid', 'Xanderly', 'Zzmgmergethird', 'client') returning id into mx;
  j := merge_people(mx, mk, '{}'::jsonb, null);
  m3 := (j->>'merge_id')::uuid;
  t := ((undo_person_merge(m2))->>'result') || ', ' || ((undo_person_merge(m3))->>'result');
  if t = 'kept_missing, done' and exists (select 1 from people where id = mk)
  then passed := passed + 1; else fails := fails || ' [13 chained undo: ' || t || ']'; end if;

  -- 14. Logged-in browser keys cannot reach the tables, the view or the steps
  if not has_table_privilege('anon', 'public.person_merges', 'select')
     and not has_table_privilege('authenticated', 'public.person_merges', 'select')
     and not has_table_privilege('anon', 'public.person_merge_rows', 'select')
     and not has_table_privilege('anon', 'public.duplicate_dismissals', 'select')
     and not has_table_privilege('authenticated', 'public.duplicate_dismissals', 'select')
     and not has_table_privilege('anon', 'public.duplicate_pairs', 'select')
     and not has_table_privilege('authenticated', 'public.duplicate_pairs', 'select')
     and not has_function_privilege('anon', 'public.merge_people(uuid, uuid, jsonb, text)', 'execute')
     and not has_function_privilege('authenticated', 'public.merge_people(uuid, uuid, jsonb, text)', 'execute')
     and not has_function_privilege('anon', 'public.undo_person_merge(uuid)', 'execute')
     and not has_function_privilege('authenticated', 'public.undo_person_merge(uuid)', 'execute')
     and not has_function_privilege('anon', 'public.duplicate_pair_step(text, uuid, uuid, text)', 'execute')
     and not has_function_privilege('anon', 'public.person_link_columns()', 'execute')
  then passed := passed + 1;
  else fails := fails || ' [14 access not locked down]'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 14 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 14 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
