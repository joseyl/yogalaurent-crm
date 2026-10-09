-- TEST ONLY. Runs migration 011 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 17 of 17 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/011_balance_payments.sql (without its final check).

begin;

-- 011_balance_payments.sql
-- Balance payments made through Stripe on yogalaurent.com (messages 5 and 6 of the
-- site-to-CRM rulebook, project doc claude/SITE_TO_CRM_MESSAGES.md, draft 2).
-- Run by hand in the Supabase SQL Editor BEFORE the balance-payment routes go live.
-- Run supabase/tests/011_balance_payments_test.sql first: it runs all of this plus
-- checks, then undoes everything.
--
-- What it adds:
--   balance_payments          one row per Stripe balance payment, unique by stripe_payment_id
--                             (a repeat is a duplicate and changes nothing)
--   balance_refunds           one row per refunded balance payment, holding the running
--                             total refunded (Stripe sends the total, never the change)
--   order_payments            gains source (hand or stripe), stripe_payment_id, initiated_at,
--                             refunded_gbp, and the method bacs
--   record_balance_payment()  check and save in one locked step (the balance-payment route)
--   apply_balance_payment()   matches one saved payment to an order, or leaves it to match
--   record_balance_refund()   saves the running total refunded and applies it
--   apply_balance_refund()    lowers amount paid by the change in the refunded total
--   retry_balance_payments()  re-tries every payment still to match, after a hand fix
--   delete_order_payment()    now refuses Stripe payments
--
-- Matching (never guessed):
--   1. A purchase chosen by hand on the row (purchase_id filled on a to_match row).
--   2. Exactly one main order row (amount above 0) with exactly this order number.
--   3. Otherwise the plain number and its -N copies (main rows only), picked by the client
--      whose email or alt_email equals the email sent. Exactly one, or nothing.
--   4. Otherwise status to_match: shown on the dashboard as "payment to match".
--   Email mismatch on an exact match: matched and flagged (email_differs), never rejected.
--
-- Rules:
--   A matched payment becomes a row in order_payments: source stripe, method card or bacs,
--   paid_on = London date of paidAt (for Bacs the clearing date), initiated_at stored too.
--   The FULL amount is added to purchases.amount_paid_gbp. Money received is never refused:
--   above what is owed it is recorded and flagged (overpaid_gbp).
--   Every balance payment is "invoice to raise" until invoice_raised_at is filled (Done).
--   Refunds: SET TO the running total (repeats harmless). Amount paid goes down by the change;
--   the order total (revenue) is never touched. A refund that arrives before its payment, or
--   before the payment is matched, waits and is applied on matching.
--   Same lock as record_order_payment (hashtext('order_payment')), so hand and Stripe
--   payments never collide.
--
-- Hand fix for a payment to match:
--   update balance_payments set purchase_id = '<order id>' where id = '<payment id>' and status = 'to_match';
--   select * from retry_balance_payments();
--
-- To remove:
--   drop function if exists public.retry_balance_payments();
--   drop function if exists public.record_balance_refund(text, text, text, numeric, timestamptz, text);
--   drop function if exists public.apply_balance_refund(uuid);
--   drop function if exists public.record_balance_payment(text, text, text, numeric, timestamptz, timestamptz, text, text, text, text);
--   drop function if exists public.apply_balance_payment(uuid);
--   drop table if exists public.balance_refunds;
--   drop table if exists public.balance_payments;
--   then run migration 010's delete_order_payment again, and drop the new order_payments columns.

-- 1. order_payments: Stripe rows alongside hand-recorded ones ---------------------------

alter table public.order_payments add column if not exists source text not null default 'hand';
alter table public.order_payments add column if not exists stripe_payment_id text;
alter table public.order_payments add column if not exists initiated_at timestamptz;
alter table public.order_payments add column if not exists refunded_gbp numeric(10,2) not null default 0;

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.order_payments'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) ilike '%method%' or pg_get_constraintdef(oid) ilike '%source%')
  loop
    execute format('alter table public.order_payments drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.order_payments
  add constraint order_payments_method_check
  check (method in ('bank_transfer', 'card', 'cash', 'other', 'bacs'));
alter table public.order_payments
  add constraint order_payments_source_check
  check (source in ('hand', 'stripe'));

create unique index if not exists order_payments_stripe_payment_key
  on public.order_payments (stripe_payment_id)
  where stripe_payment_id is not null;

-- 2. balance_payments and balance_refunds -------------------------------------------------

create table if not exists public.balance_payments (
  id uuid primary key default gen_random_uuid(),
  stripe_payment_id text not null,
  order_ref text not null,
  programme text,
  amount_gbp numeric(10,2) not null check (amount_gbp > 0),
  paid_at timestamptz not null,
  initiated_at timestamptz,
  method text not null check (method in ('card', 'bacs')),
  email text,
  collection text not null check (collection in ('link', 'checkout')),
  link_id text,
  status text not null default 'to_match' check (status in ('matched', 'to_match')),
  purchase_id uuid references public.purchases(id) on delete set null,
  order_payment_id uuid references public.order_payments(id) on delete set null,
  matched_order_ref text,
  email_differs boolean not null default false,
  overpaid_gbp numeric(10,2),
  refunded_gbp numeric(10,2) not null default 0,
  refund_applied_gbp numeric(10,2) not null default 0,
  refunded_at timestamptz,
  invoice_raised_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists balance_payments_stripe_payment_key
  on public.balance_payments (stripe_payment_id);
create index if not exists balance_payments_to_match_idx
  on public.balance_payments (status) where status = 'to_match';
create index if not exists balance_payments_invoice_idx
  on public.balance_payments (paid_at) where invoice_raised_at is null;
create index if not exists balance_payments_purchase_idx
  on public.balance_payments (purchase_id);

create table if not exists public.balance_refunds (
  id uuid primary key default gen_random_uuid(),
  stripe_payment_id text not null,
  order_ref text,
  stripe_refund_id text,
  refunded_gbp numeric(10,2) not null check (refunded_gbp > 0),
  refunded_at timestamptz,
  email text,
  balance_payment_id uuid references public.balance_payments(id) on delete set null,
  status text not null default 'waiting' check (status in ('applied', 'waiting', 'unmatched')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists balance_refunds_stripe_payment_key
  on public.balance_refunds (stripe_payment_id);

alter table public.balance_payments enable row level security;
alter table public.balance_refunds enable row level security;
revoke all on public.balance_payments from public, anon, authenticated;
revoke all on public.balance_refunds from public, anon, authenticated;
grant select, insert, update, delete on public.balance_payments to service_role;
grant select, insert, update, delete on public.balance_refunds to service_role;

-- 3. Refunds: amount paid goes down by the change in the running total ---------------------

create or replace function public.apply_balance_refund(p_payment_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  t balance_payments%rowtype;
  r balance_refunds%rowtype;
  v_target numeric(10,2);
  v_change numeric(10,2);
  v_total numeric(10,2);
  v_paid numeric(10,2);
begin
  select * into t from balance_payments where id = p_payment_id for update;
  if not found then return 'not_found'; end if;

  select * into r from balance_refunds where stripe_payment_id = t.stripe_payment_id for update;
  if not found then return 'no_refund'; end if;

  update balance_payments set refunded_gbp = r.refunded_gbp, refunded_at = r.refunded_at, updated_at = now()
    where id = t.id;

  if t.status = 'to_match' then
    update balance_refunds
      set status = 'waiting', balance_payment_id = t.id,
          note = 'The payment is not matched to an order yet. The refund is applied when it is.',
          updated_at = now()
      where id = r.id;
    return 'waiting';
  end if;

  if t.purchase_id is null or t.order_payment_id is null
     or not exists (select 1 from purchases where id = t.purchase_id) then
    update balance_refunds
      set status = 'unmatched', balance_payment_id = t.id,
          note = 'The order or its payment row no longer exists. Check by hand.', updated_at = now()
      where id = r.id;
    return 'unmatched';
  end if;

  v_target := least(r.refunded_gbp, t.amount_gbp);
  v_change := v_target - t.refund_applied_gbp;

  select amount_gbp, amount_paid_gbp into v_total, v_paid from purchases where id = t.purchase_id for update;

  if v_change <> 0 then
    v_paid := greatest(0, coalesce(v_paid, 0) - v_change);
    update purchases set amount_paid_gbp = v_paid where id = t.purchase_id;
  end if;

  update order_payments set refunded_gbp = v_target where id = t.order_payment_id;

  update balance_payments
    set refund_applied_gbp = v_target,
        overpaid_gbp = nullif(greatest(0, coalesce(v_paid, 0) - v_total), 0),
        updated_at = now()
    where id = t.id;

  update balance_refunds
    set status = 'applied', balance_payment_id = t.id,
        note = case when r.refunded_gbp > t.amount_gbp
                    then 'Refund above the payment amount; only the payment amount was taken off.' end,
        updated_at = now()
    where id = r.id;

  return case when v_target = t.amount_gbp then 'applied_full' else 'applied' end;
end;
$$;

-- 4. Matching one saved payment to an order --------------------------------------------

create or replace function public.apply_balance_payment(p_payment_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  t balance_payments%rowtype;
  v_purchase purchases%rowtype;
  v_pid uuid;
  v_n int;
  v_base text;
  v_note text;
  v_old numeric(10,2);
  v_new numeric(10,2);
  v_differs boolean;
  v_op uuid;
begin
  select * into t from balance_payments where id = p_payment_id for update;
  if not found then return 'not_found'; end if;
  if t.status <> 'to_match' then return 'already_' || t.status; end if;

  if t.purchase_id is not null then
    -- 1. Chosen by hand
    v_pid := t.purchase_id;
  else
    -- 2. Exact order number, main rows only
    select count(*), (array_agg(id))[1] into v_n, v_pid
      from purchases
      where upper(trim(order_ref)) = t.order_ref and amount_gbp > 0;

    if v_n > 1 then
      v_pid := null;
      v_note := 'More than one order with this number. Choose one by hand, then retry.';
    elsif v_n = 0 then
      -- 3. The plain number and its -N copies, picked by email
      v_base := coalesce(substring(t.order_ref from '^(TT-[0-9]{4}-[A-Z0-9]+)-[0-9]+$'), t.order_ref);
      select count(*), (array_agg(pu.id))[1] into v_n, v_pid
        from purchases pu
        join people pe on pe.id = pu.person_id
        where pu.amount_gbp > 0
          and (upper(trim(pu.order_ref)) = v_base
               or upper(trim(pu.order_ref)) ~ ('^' || v_base || '-[0-9]+$'))
          and t.email is not null
          and (lower(trim(pe.email)) = t.email or lower(trim(coalesce(pe.alt_email, ''))) = t.email);
      if v_n = 0 then
        v_pid := null;
        v_note := 'No order with this number for this email. Choose the order by hand, then retry.';
      elsif v_n > 1 then
        v_pid := null;
        v_note := 'Several orders with this number for this email. Choose one by hand, then retry.';
      end if;
    end if;
  end if;

  if v_pid is not null then
    select * into v_purchase from purchases where id = v_pid for update;
    if not found then
      v_pid := null;
      v_note := 'The order chosen for this payment no longer exists. Choose another, then retry.';
    end if;
  end if;

  if v_pid is null then
    update balance_payments set purchase_id = null, note = v_note, updated_at = now() where id = t.id;
    perform apply_balance_refund(t.id);
    return 'to_match';
  end if;

  v_differs := t.email is null or not exists (
    select 1 from people pe
    where pe.id = v_purchase.person_id
      and (lower(trim(pe.email)) = t.email or lower(trim(coalesce(pe.alt_email, ''))) = t.email));

  v_old := coalesce(v_purchase.amount_paid_gbp, 0);
  v_new := v_old + t.amount_gbp;

  insert into order_payments (purchase_id, amount_gbp, paid_on, method, note, started_from_blank,
                              source, stripe_payment_id, initiated_at)
    values (v_pid, t.amount_gbp, (t.paid_at at time zone 'Europe/London')::date, t.method,
            concat_ws('. ',
              case when t.collection = 'checkout' then 'Stripe Bacs booking cleared' else 'Stripe balance' end,
              nullif(t.programme, ''),
              case when t.link_id is not null then 'Link ' || t.link_id end),
            v_purchase.amount_paid_gbp is null, 'stripe', t.stripe_payment_id, t.initiated_at)
    returning id into v_op;

  update purchases set amount_paid_gbp = v_new where id = v_pid;

  update balance_payments
    set status = 'matched', purchase_id = v_pid, order_payment_id = v_op,
        matched_order_ref = v_purchase.order_ref, email_differs = v_differs,
        overpaid_gbp = nullif(greatest(0, v_new - v_purchase.amount_gbp), 0),
        note = null, updated_at = now()
    where id = t.id;

  -- A refund that arrived first
  perform apply_balance_refund(t.id);

  return 'matched';
end;
$$;

-- 5. Entry points for the routes --------------------------------------------------------

create or replace function public.record_balance_payment(
  p_stripe_payment_id text,
  p_order_ref text,
  p_programme text,
  p_amount numeric,
  p_paid_at timestamptz,
  p_initiated_at timestamptz,
  p_method text,
  p_email text,
  p_collection text,
  p_link_id text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_ref text := upper(trim(coalesce(p_order_ref, '')));
  v_result text;
  b balance_payments%rowtype;
begin
  -- Same lock as record_order_payment: hand and Stripe payments never collide
  perform pg_advisory_xact_lock(hashtext('order_payment'));

  if coalesce(trim(p_stripe_payment_id), '') = '' then
    return jsonb_build_object('result', 'bad_message', 'reason', 'no stripePaymentId');
  end if;
  if v_ref = '' or v_ref !~ '^[A-Z0-9-]+$' then
    return jsonb_build_object('result', 'bad_message', 'reason', 'bad orderRef');
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    return jsonb_build_object('result', 'bad_message', 'reason', 'bad amountGBP');
  end if;
  if p_paid_at is null then
    return jsonb_build_object('result', 'bad_message', 'reason', 'no paidAt');
  end if;
  if p_method is null or p_method not in ('card', 'bacs') then
    return jsonb_build_object('result', 'bad_message', 'reason', 'bad method');
  end if;
  if p_collection is null or p_collection not in ('link', 'checkout') then
    return jsonb_build_object('result', 'bad_message', 'reason', 'bad collection');
  end if;

  if exists (select 1 from balance_payments where stripe_payment_id = trim(p_stripe_payment_id))
     or exists (select 1 from order_payments where stripe_payment_id = trim(p_stripe_payment_id)) then
    return jsonb_build_object('result', 'duplicate');
  end if;

  insert into balance_payments (stripe_payment_id, order_ref, programme, amount_gbp, paid_at, initiated_at,
                                method, email, collection, link_id)
    values (trim(p_stripe_payment_id), v_ref, nullif(trim(coalesce(p_programme, '')), ''), p_amount, p_paid_at,
            coalesce(p_initiated_at, p_paid_at), p_method, nullif(lower(trim(coalesce(p_email, ''))), ''),
            p_collection, nullif(trim(coalesce(p_link_id, '')), ''))
    returning id into v_id;

  v_result := apply_balance_payment(v_id);
  select * into b from balance_payments where id = v_id;

  return jsonb_build_object(
    'result', v_result,
    'payment_id', v_id,
    'matched_order_ref', b.matched_order_ref,
    'email_differs', b.email_differs,
    'overpaid', b.overpaid_gbp,
    'note', b.note
  );
end;
$$;

create or replace function public.record_balance_refund(
  p_stripe_payment_id text,
  p_order_ref text,
  p_refund_id text,
  p_refunded_total numeric,
  p_refunded_at timestamptz,
  p_email text
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  r balance_refunds%rowtype;
  v_pay uuid;
begin
  perform pg_advisory_xact_lock(hashtext('order_payment'));

  if coalesce(trim(p_stripe_payment_id), '') = '' then return 'bad_message'; end if;
  if p_refunded_total is null or p_refunded_total <= 0 or p_refunded_total <> round(p_refunded_total, 2) then
    return 'bad_message';
  end if;

  select * into r from balance_refunds where stripe_payment_id = trim(p_stripe_payment_id) for update;
  if found and p_refunded_total <= r.refunded_gbp then
    return 'duplicate';
  end if;

  insert into balance_refunds (stripe_payment_id, order_ref, stripe_refund_id, refunded_gbp, refunded_at, email)
    values (trim(p_stripe_payment_id), nullif(upper(trim(coalesce(p_order_ref, ''))), ''),
            nullif(trim(coalesce(p_refund_id, '')), ''), p_refunded_total, coalesce(p_refunded_at, now()),
            nullif(lower(trim(coalesce(p_email, ''))), ''))
    on conflict (stripe_payment_id) do update
      set stripe_refund_id = excluded.stripe_refund_id, refunded_gbp = excluded.refunded_gbp,
          refunded_at = excluded.refunded_at, updated_at = now();

  select id into v_pay from balance_payments where stripe_payment_id = trim(p_stripe_payment_id);
  if v_pay is null then
    update balance_refunds
      set status = 'waiting', note = 'The payment has not arrived yet. The refund is applied when it is matched.',
          updated_at = now()
      where stripe_payment_id = trim(p_stripe_payment_id);
    return 'waiting';
  end if;

  return apply_balance_refund(v_pay);
end;
$$;

create or replace function public.retry_balance_payments()
returns table (payment_id uuid, result text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  x record;
begin
  perform pg_advisory_xact_lock(hashtext('order_payment'));
  for x in
    select id from balance_payments where status = 'to_match' order by paid_at, created_at
  loop
    payment_id := x.id;
    result := apply_balance_payment(x.id);
    return next;
  end loop;
end;
$$;

-- 6. delete_order_payment: Stripe payments cannot be deleted from the client page --------

create or replace function public.delete_order_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  t order_payments%rowtype;
  v_purchase purchases%rowtype;
  v_new numeric(10,2);
begin
  perform pg_advisory_xact_lock(hashtext('order_payment'));

  select * into t from order_payments where id = p_payment_id;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  if t.source = 'stripe' then
    return jsonb_build_object('result', 'stripe_payment');
  end if;

  select * into v_purchase from purchases where id = t.purchase_id for update;

  delete from order_payments where id = t.id;

  v_new := greatest(0, coalesce(v_purchase.amount_paid_gbp, 0) - t.amount_gbp);

  -- Put the blank back if this payment started the count and nothing else has been paid since
  if t.started_from_blank and v_new = 0
     and not exists (select 1 from order_payments where purchase_id = t.purchase_id)
     and not exists (select 1 from training_payments
                       where purchase_id = t.purchase_id and status = 'applied' and added_gbp > 0) then
    update purchases set amount_paid_gbp = null where id = t.purchase_id;
    return jsonb_build_object('result', 'deleted', 'amount_paid', null,
                              'outstanding', null);
  end if;

  update purchases set amount_paid_gbp = v_new where id = t.purchase_id;

  return jsonb_build_object('result', 'deleted', 'amount_paid', v_new,
                            'outstanding', greatest(0, v_purchase.amount_gbp - v_new));
end;
$$;

revoke all on function public.apply_balance_refund(uuid) from public, anon, authenticated;
revoke all on function public.apply_balance_payment(uuid) from public, anon, authenticated;
revoke all on function public.record_balance_payment(text, text, text, numeric, timestamptz, timestamptz, text, text, text, text) from public, anon, authenticated;
revoke all on function public.record_balance_refund(text, text, text, numeric, timestamptz, text) from public, anon, authenticated;
revoke all on function public.retry_balance_payments() from public, anon, authenticated;
revoke all on function public.delete_order_payment(uuid) from public, anon, authenticated;
grant execute on function public.apply_balance_refund(uuid) to service_role;
grant execute on function public.apply_balance_payment(uuid) to service_role;
grant execute on function public.record_balance_payment(text, text, text, numeric, timestamptz, timestamptz, text, text, text, text) to service_role;
grant execute on function public.record_balance_refund(text, text, text, numeric, timestamptz, text) to service_role;
grant execute on function public.retry_balance_payments() to service_role;
grant execute on function public.delete_order_payment(uuid) to service_role;

do $$
declare
  v_product uuid := (select id from products where category = 'training' order by created_at, id limit 1); -- any training product; everything is undone
  v_today date := (now() at time zone 'Europe/London')::date;
  pA uuid; pB uuid; pC uuid;
  o_dep uuid;     -- TT-2026-ZZQA001, 500, 200 paid, person A
  o_b2 uuid;      -- TT-2026-ZZQB001-2, 400, person B (no main row with the plain number)
  o_b3 uuid;      -- TT-2026-ZZQB001-3, 400, person C
  o_bacs uuid;    -- TT-2026-ZZQC001, 600, 0 paid, Bacs training booking, person A
  o_hand uuid;    -- TT-2026-ZZQD001, 300, blank, person A (for hand payments and the hand fix)
  j jsonb;
  t text;
  fails text := '';
  passed int := 0;
  v numeric;
  n int;
  bp1 uuid;
  bp_unknown uuid;
  hand1 uuid;
  rec record;
begin
  insert into people (email, alt_email, first_name, last_name, status)
    values ('balance-test-a@example.invalid', null, 'Test', 'BalanceA', 'client') returning id into pA;
  insert into people (email, alt_email, first_name, last_name, status)
    values ('balance-test-b@example.invalid', 'balance-test-b-alt@example.invalid', 'Test', 'BalanceB', 'client') returning id into pB;
  insert into people (email, first_name, last_name, status)
    values ('balance-test-c@example.invalid', 'Test', 'BalanceC', 'client') returning id into pC;

  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, payment_option, purchase_date, order_ref, source, notes)
    values (pA, v_product, 500, 200, 'deposit', v_today - 30, 'TT-2026-ZZQA001', 'stripe', 'TEST deposit') returning id into o_dep;
  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, payment_option, purchase_date, order_ref, source, notes)
    values (pB, v_product, 400, 100, 'deposit', v_today - 30, 'TT-2026-ZZQB001-2', 'stripe', 'TEST copy 2') returning id into o_b2;
  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, payment_option, purchase_date, order_ref, source, notes)
    values (pC, v_product, 400, 100, 'deposit', v_today - 30, 'TT-2026-ZZQB001-3', 'stripe', 'TEST copy 3') returning id into o_b3;
  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, payment_option, purchase_date, order_ref, source, notes)
    values (pA, v_product, 600, 0, 'full', v_today - 3, 'TT-2026-ZZQC001', 'stripe', 'TEST bacs') returning id into o_bacs;
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, order_ref, notes)
    values (pA, v_product, 300, v_today - 60, 'TT-2026-ZZQD001', 'TEST hand') returning id into o_hand;

  -- 1. Exact order number, card, email matches: matched, full amount added, Stripe row in order_payments
  j := record_balance_payment('pi_test_001', 'tt-2026-zzqa001', 'Breathwork 40h', 300, '2026-10-09T09:00:00Z', null,
                              'card', 'Balance-Test-A@example.invalid', 'link', 'bl_test_1');
  bp1 := (j->>'payment_id')::uuid;
  select amount_paid_gbp into v from purchases where id = o_dep;
  select count(*) into n from order_payments
    where purchase_id = o_dep and source = 'stripe' and method = 'card' and amount_gbp = 300
      and paid_on = date '2026-10-09' and stripe_payment_id = 'pi_test_001' and note like 'Stripe balance%bl_test_1';
  if j->>'result' = 'matched' and v = 500 and n = 1 and (j->>'email_differs')::boolean = false
     and j->>'overpaid' is null and j->>'matched_order_ref' = 'TT-2026-ZZQA001' then passed := passed + 1;
  else fails := fails || ' [1 exact: ' || j::text || ', paid ' || coalesce(v::text, 'blank') || ', rows ' || n || ']'; end if;

  -- 2. Same Stripe payment again: duplicate, nothing changes
  j := record_balance_payment('pi_test_001', 'TT-2026-ZZQA001', null, 300, '2026-10-09T09:00:00Z', null,
                              'card', 'balance-test-a@example.invalid', 'link', 'bl_test_1');
  select amount_paid_gbp into v from purchases where id = o_dep;
  select count(*) into n from balance_payments where stripe_payment_id = 'pi_test_001';
  if j->>'result' = 'duplicate' and v = 500 and n = 1 then passed := passed + 1;
  else fails := fails || ' [2 duplicate: ' || j::text || ', paid ' || v || ']'; end if;

  -- 3. More than owed: recorded in full and flagged overpaid by 50; email differs flagged, never rejected
  j := record_balance_payment('pi_test_002', 'TT-2026-ZZQA001', null, 50, '2026-10-09T10:00:00Z', null,
                              'card', 'someone-else@example.invalid', 'link', 'bl_test_2');
  select amount_paid_gbp into v from purchases where id = o_dep;
  if j->>'result' = 'matched' and v = 550 and (j->>'overpaid')::numeric = 50
     and (j->>'email_differs')::boolean = true then passed := passed + 1;
  else fails := fails || ' [3 overpaid and email: ' || j::text || ', paid ' || v || ']'; end if;

  -- 4. No main row with the plain number: the -N copy picked by alt_email (B), not C's copy
  j := record_balance_payment('pi_test_003', 'TT-2026-ZZQB001', null, 300, '2026-10-09T10:00:00Z', null,
                              'card', 'balance-test-b-alt@example.invalid', 'link', 'bl_test_3');
  if j->>'result' = 'matched' and j->>'matched_order_ref' = 'TT-2026-ZZQB001-2'
     and (select amount_paid_gbp from purchases where id = o_b2) = 400
     and (select amount_paid_gbp from purchases where id = o_b3) = 100
     and (j->>'email_differs')::boolean = false then passed := passed + 1;
  else fails := fails || ' [4 copy by email: ' || j::text || ']'; end if;

  -- 5. Copies exist but no email matches: payment to match, nothing added anywhere
  j := record_balance_payment('pi_test_004', 'TT-2026-ZZQB001', null, 20, '2026-10-09T10:00:00Z', null,
                              'card', 'nobody@example.invalid', 'link', 'bl_test_4');
  if j->>'result' = 'to_match' and j->>'note' like 'No order with this number for this email%'
     and (select amount_paid_gbp from purchases where id = o_b2) = 400
     and (select amount_paid_gbp from purchases where id = o_b3) = 100
     and not exists (select 1 from order_payments where stripe_payment_id = 'pi_test_004') then passed := passed + 1;
  else fails := fails || ' [5 copies, no email: ' || j::text || ']'; end if;

  -- 6. Unknown order number: payment to match
  j := record_balance_payment('pi_test_005', 'TT-2026-ZZQX999', 'Yoga Nidra', 120, '2026-10-09T11:00:00Z', null,
                              'card', 'balance-test-a@example.invalid', 'link', 'bl_test_5');
  bp_unknown := (j->>'payment_id')::uuid;
  if j->>'result' = 'to_match' and (select status from balance_payments where id = bp_unknown) = 'to_match'
     and not exists (select 1 from order_payments where stripe_payment_id = 'pi_test_005') then passed := passed + 1;
  else fails := fails || ' [6 unknown: ' || j::text || ']'; end if;

  -- 7. Refund on a payment still to match: waits, nothing changes
  t := record_balance_refund('pi_test_005', 'TT-2026-ZZQX999', 're_test_5', 20, '2026-10-09T12:00:00Z', null);
  if t = 'waiting' and (select status from balance_refunds where stripe_payment_id = 'pi_test_005') = 'waiting'
     and (select amount_paid_gbp from purchases where id = o_hand) is null then passed := passed + 1;
  else fails := fails || ' [7 refund on to_match: ' || t || ']'; end if;

  -- 8. Hand fix then retry: matched to the chosen order (blank start), waiting refund of 20 applied: 100 paid
  update balance_payments set purchase_id = o_hand where id = bp_unknown;
  n := 0;
  for rec in select * from retry_balance_payments() loop
    if rec.payment_id = bp_unknown and rec.result = 'matched' then n := n + 1; end if;
  end loop;
  select amount_paid_gbp into v from purchases where id = o_hand;
  if n = 1 and v = 100
     and (select status from balance_refunds where stripe_payment_id = 'pi_test_005') = 'applied'
     and (select refunded_gbp from order_payments where stripe_payment_id = 'pi_test_005') = 20
     and (select status from balance_payments where stripe_payment_id = 'pi_test_004') = 'to_match' then passed := passed + 1;
  else fails := fails || ' [8 hand fix and retry: matched ' || n || ', paid ' || coalesce(v::text, 'blank') || ']'; end if;

  -- 9. Refund running totals, SET TO: 100 then 100 again (duplicate) then 300 (full); order total never touched
  t := record_balance_refund('pi_test_001', 'TT-2026-ZZQA001', 're_test_1', 100, '2026-10-10T09:00:00Z', 'balance-test-a@example.invalid');
  select amount_paid_gbp into v from purchases where id = o_dep;
  if t = 'applied' and v = 450 then
    t := record_balance_refund('pi_test_001', 'TT-2026-ZZQA001', 're_test_1', 100, '2026-10-10T09:00:00Z', null);
    select amount_paid_gbp into v from purchases where id = o_dep;
    if t = 'duplicate' and v = 450 then
      t := record_balance_refund('pi_test_001', 'TT-2026-ZZQA001', 're_test_1b', 300, '2026-10-11T09:00:00Z', null);
      select amount_paid_gbp into v from purchases where id = o_dep;
      if t = 'applied_full' and v = 250 and (select amount_gbp from purchases where id = o_dep) = 500
         and (select refunded_gbp from order_payments where stripe_payment_id = 'pi_test_001') = 300
         and (select overpaid_gbp from balance_payments where id = bp1) is null then passed := passed + 1;
      else fails := fails || ' [9c full refund: ' || t || ', paid ' || v || ']'; end if;
    else fails := fails || ' [9b repeat: ' || t || ', paid ' || v || ']'; end if;
  else fails := fails || ' [9a first refund: ' || t || ', paid ' || v || ']'; end if;

  -- 10. Refund before its payment arrives: waits; the Bacs booking clears (checkout, no link):
  --     paid_on is the London date of paidAt (clearing), both dates stored, refund of 50 applied on matching
  t := record_balance_refund('pi_test_006', 'TT-2026-ZZQC001', 'pyr_test_6', 50, '2026-10-12T09:00:00Z', null);
  j := record_balance_payment('pi_test_006', 'TT-2026-ZZQC001', '40h', 600, '2026-10-09T23:30:00Z', '2026-10-05T08:00:00Z',
                              'bacs', 'balance-test-a@example.invalid', 'checkout', null);
  select amount_paid_gbp into v from purchases where id = o_bacs;
  select count(*) into n from order_payments
    where stripe_payment_id = 'pi_test_006' and method = 'bacs' and paid_on = date '2026-10-10'
      and initiated_at = timestamptz '2026-10-05T08:00:00Z' and note like 'Stripe Bacs booking cleared%' and refunded_gbp = 50;
  if t = 'waiting' and j->>'result' = 'matched' and v = 550 and n = 1
     and (select status from balance_refunds where stripe_payment_id = 'pi_test_006') = 'applied'
     and (select link_id from balance_payments where stripe_payment_id = 'pi_test_006') is null then passed := passed + 1;
  else fails := fails || ' [10 refund first, Bacs checkout: ' || t || ' ' || j::text || ', paid ' || coalesce(v::text, 'blank') || ', rows ' || n || ']'; end if;

  -- 11. Bad messages refused, nothing saved
  n := 0;
  if record_balance_payment('pi_bad_1', 'TT-2026-ZZQA001', null, 0, now(), null, 'card', null, 'link', null)->>'result' = 'bad_message' then n := n + 1; end if;
  if record_balance_payment('pi_bad_2', 'TT-2026-ZZQA001', null, 10.001, now(), null, 'card', null, 'link', null)->>'result' = 'bad_message' then n := n + 1; end if;
  if record_balance_payment('pi_bad_3', 'TT-2026-ZZQA001', null, 10, now(), null, 'cash', null, 'link', null)->>'result' = 'bad_message' then n := n + 1; end if;
  if record_balance_payment('pi_bad_4', 'TT-2026-ZZQA001', null, 10, now(), null, 'card', null, 'invoice', null)->>'result' = 'bad_message' then n := n + 1; end if;
  if record_balance_payment('pi_bad_5', '', null, 10, now(), null, 'card', null, 'link', null)->>'result' = 'bad_message' then n := n + 1; end if;
  if record_balance_payment('pi_bad_6', 'TT 2026 ZZQA001', null, 10, now(), null, 'card', null, 'link', null)->>'result' = 'bad_message' then n := n + 1; end if;
  if record_balance_payment('', 'TT-2026-ZZQA001', null, 10, now(), null, 'card', null, 'link', null)->>'result' = 'bad_message' then n := n + 1; end if;
  if record_balance_payment('pi_bad_8', 'TT-2026-ZZQA001', null, 10, null, null, 'card', null, 'link', null)->>'result' = 'bad_message' then n := n + 1; end if;
  if record_balance_refund('pi_test_001', null, null, 0, now(), null) = 'bad_message' then n := n + 1; end if;
  if n = 9 and not exists (select 1 from balance_payments where stripe_payment_id like 'pi_bad%' or stripe_payment_id = '')
     and (select amount_paid_gbp from purchases where id = o_dep) = 250 then passed := passed + 1;
  else fails := fails || ' [11 bad messages: ' || n || ' of 9 refused]'; end if;

  -- 12. Stripe payments cannot be deleted; hand payments still can, and record_order_payment still works
  j := delete_order_payment((select id from order_payments where stripe_payment_id = 'pi_test_002'));
  if j->>'result' = 'stripe_payment' and (select amount_paid_gbp from purchases where id = o_dep) = 250 then
    j := record_order_payment(o_hand, 50, v_today, 'bank_transfer', 'hand part');
    hand1 := (j->>'payment_id')::uuid;
    select amount_paid_gbp into v from purchases where id = o_hand;
    if j->>'result' = 'recorded' and v = 150
       and (select source from order_payments where id = hand1) = 'hand' then
      j := delete_order_payment(hand1);
      select amount_paid_gbp into v from purchases where id = o_hand;
      if j->>'result' = 'deleted' and v = 100 then passed := passed + 1;
      else fails := fails || ' [12c hand delete: ' || j::text || ']'; end if;
    else fails := fails || ' [12b hand payment: ' || j::text || ']'; end if;
  else fails := fails || ' [12a stripe delete: ' || j::text || ']'; end if;

  -- 13. Bacs is not a hand method; Stripe payment ids unique in order_payments
  n := 0;
  if record_order_payment(o_hand, 10, v_today, 'bacs', null)->>'result' = 'bad_method' then n := n + 1; end if;
  begin
    insert into order_payments (purchase_id, amount_gbp, paid_on, method, source, stripe_payment_id)
      values (o_hand, 1, v_today, 'card', 'stripe', 'pi_test_001');
  exception when unique_violation then n := n + 1;
  end;
  if n = 2 then passed := passed + 1;
  else fails := fails || ' [13 method and unique: ' || n || ' of 2]'; end if;

  -- 14. Every balance payment is "invoice to raise" until ticked
  select count(*) into n from balance_payments where invoice_raised_at is null;
  if n = (select count(*) from balance_payments) and n = 6 then passed := passed + 1;
  else fails := fails || ' [14 invoice to raise: ' || n || ']'; end if;

  -- 15. Order totals (revenue) never changed
  if (select sum(amount_gbp) from purchases where person_id in (pA, pB, pC)) = 2200 then passed := passed + 1;
  else fails := fails || ' [15 order totals changed]'; end if;

  -- 16. Deleting an order: its Stripe order_payments go, balance_payments keep the record (order cleared)
  delete from purchases where id = o_b2;
  if not exists (select 1 from order_payments where stripe_payment_id = 'pi_test_003')
     and (select purchase_id from balance_payments where stripe_payment_id = 'pi_test_003') is null then
    t := record_balance_refund('pi_test_003', null, 're_test_3', 10, now(), null);
    if t = 'unmatched' then passed := passed + 1;
    else fails := fails || ' [16b refund after order deleted: ' || t || ']'; end if;
  else fails := fails || ' [16a order deleted]'; end if;

  -- 17. Browser keys cannot reach the tables or the functions
  if not has_table_privilege('anon', 'public.balance_payments', 'select')
     and not has_table_privilege('authenticated', 'public.balance_refunds', 'select')
     and not has_function_privilege('anon', 'public.record_balance_payment(text, text, text, numeric, timestamptz, timestamptz, text, text, text, text)', 'execute')
     and not has_function_privilege('authenticated', 'public.record_balance_refund(text, text, text, numeric, timestamptz, text)', 'execute')
     and not has_function_privilege('anon', 'public.retry_balance_payments()', 'execute')
     and not has_function_privilege('authenticated', 'public.delete_order_payment(uuid)', 'execute')
  then passed := passed + 1;
  else fails := fails || ' [17 access not locked down]'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 17 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 17 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
