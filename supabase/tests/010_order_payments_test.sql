-- TEST ONLY. Runs migration 010 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 14 of 14 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/010_order_payments.sql (without its final check).

begin;

-- 010_order_payments.sql
-- Payments recorded by hand against an order (purchase): bank transfers, card on the
-- day, cash and anything else that does not arrive through Stripe automatically.
-- Run by hand in the Supabase SQL Editor BEFORE the record-payments code goes live.
-- Run supabase/tests/010_order_payments_test.sql first: it runs all of this plus
-- checks, then undoes everything.
--
-- What it adds:
--   order_payments          one row per payment recorded by hand: amount, date, method, note.
--                           Partial payments allowed. Rows go when their order is deleted.
--   record_order_payment()  check and save in one locked step, and add the amount to
--                           purchases.amount_paid_gbp
--   delete_order_payment()  removes a mistaken payment and takes its amount back off
--
-- Rules:
--   Amount above 0, in pounds and pence. Method: bank_transfer, card, cash or other.
--   Date not after today (London).
--   Refuses an amount above what is still owed (order total minus amount paid) and
--   says how much is owed. Refuses orders at 0 or below (free places, refunds).
--   If amount paid was blank (old orders), it starts from 0; the row is marked
--   started_from_blank so that deleting it, when nothing else was paid, puts the blank back.
--   Revenue is not touched: it counts order totals (amount_gbp), never amount paid.
--   Stripe instalments (training_payments) and payment-link sales work as before.
--
-- To remove:
--   drop function if exists public.delete_order_payment(uuid);
--   drop function if exists public.record_order_payment(uuid, numeric, date, text, text);
--   drop table if exists public.order_payments;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  amount_gbp numeric(10,2) not null check (amount_gbp > 0),
  paid_on date not null,
  method text not null check (method in ('bank_transfer', 'card', 'cash', 'other')),
  note text,
  started_from_blank boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists order_payments_purchase_idx on public.order_payments (purchase_id);

alter table public.order_payments enable row level security;
revoke all on public.order_payments from public, anon, authenticated;
grant select, insert, update, delete on public.order_payments to service_role;

create or replace function public.record_order_payment(
  p_purchase_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_method text,
  p_note text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_purchase purchases%rowtype;
  v_old numeric(10,2);
  v_owed numeric(10,2);
  v_id uuid;
begin
  -- One payment at a time, so two clicks cannot both get through
  perform pg_advisory_xact_lock(hashtext('order_payment'));

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    return jsonb_build_object('result', 'bad_amount');
  end if;
  if p_method is null or p_method not in ('bank_transfer', 'card', 'cash', 'other') then
    return jsonb_build_object('result', 'bad_method');
  end if;
  if p_paid_on is null then
    return jsonb_build_object('result', 'bad_date');
  end if;
  if p_paid_on > (now() at time zone 'Europe/London')::date then
    return jsonb_build_object('result', 'future_date');
  end if;

  select * into v_purchase from purchases where id = p_purchase_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  if coalesce(v_purchase.amount_gbp, 0) <= 0 then
    return jsonb_build_object('result', 'nothing_owed');
  end if;

  v_old := coalesce(v_purchase.amount_paid_gbp, 0);
  v_owed := v_purchase.amount_gbp - v_old;

  if v_owed <= 0 then
    return jsonb_build_object('result', 'paid_in_full', 'amount_paid', v_old, 'outstanding', 0);
  end if;

  if p_amount > v_owed then
    return jsonb_build_object('result', 'too_much', 'amount_paid', v_old, 'outstanding', v_owed);
  end if;

  insert into order_payments (purchase_id, amount_gbp, paid_on, method, note, started_from_blank)
    values (p_purchase_id, p_amount, p_paid_on, p_method, nullif(trim(coalesce(p_note, '')), ''),
            v_purchase.amount_paid_gbp is null)
    returning id into v_id;

  update purchases set amount_paid_gbp = v_old + p_amount where id = p_purchase_id;

  return jsonb_build_object(
    'result', 'recorded',
    'payment_id', v_id,
    'started_from_blank', v_purchase.amount_paid_gbp is null,
    'amount_paid', v_old + p_amount,
    'outstanding', v_owed - p_amount
  );
end;
$$;

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

revoke all on function public.record_order_payment(uuid, numeric, date, text, text) from public, anon, authenticated;
revoke all on function public.delete_order_payment(uuid) from public, anon, authenticated;
grant execute on function public.record_order_payment(uuid, numeric, date, text, text) to service_role;
grant execute on function public.delete_order_payment(uuid) to service_role;

do $$
declare
  v_product uuid := 'ff398371-e528-468c-b5a0-4301007d1a94'; -- any existing product will do; everything is undone
  v_today date := (now() at time zone 'Europe/London')::date;
  p1 uuid;
  o_blank uuid;   -- 500 order, amount paid blank (old order)
  o_dep uuid;     -- 500 order, 200 deposit already recorded
  o_refund uuid;  -- refund row at -50
  o_free uuid;    -- free place at 0
  pay1 uuid;
  pay2 uuid;
  pay3 uuid;
  j jsonb;
  fails text := '';
  passed int := 0;
  v numeric;
  n int;
  b boolean;
begin
  insert into people (email, first_name, last_name, status)
    values ('order-payment-test-1@example.invalid', 'Test', 'Payments', 'client') returning id into p1;
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes)
    values (p1, v_product, 500, v_today - 30, 'TEST blank') returning id into o_blank;
  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, payment_option, purchase_date, notes)
    values (p1, v_product, 500, 200, 'deposit', v_today - 30, 'TEST deposit') returning id into o_dep;
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes)
    values (p1, v_product, -50, v_today - 5, 'TEST refund') returning id into o_refund;
  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes)
    values (p1, v_product, 0, v_today - 5, 'TEST free place') returning id into o_free;

  -- 1. First payment on an old order with amount paid blank: starts from 0
  j := record_order_payment(o_blank, 100, v_today - 10, 'bank_transfer', '  first part  ');
  pay1 := (j->>'payment_id')::uuid;
  select amount_paid_gbp into v from purchases where id = o_blank;
  select started_from_blank into b from order_payments where id = pay1;
  if j->>'result' = 'recorded' and v = 100 and b and (j->>'outstanding')::numeric = 400
     and (select note from order_payments where id = pay1) = 'first part' then passed := passed + 1;
  else fails := fails || ' [1 blank start: ' || j::text || ', paid ' || coalesce(v::text, 'blank') || ']'; end if;

  -- 2. More than is owed: refused, says 400 owed, nothing changes
  j := record_order_payment(o_blank, 450, v_today, 'bank_transfer', null);
  select amount_paid_gbp into v from purchases where id = o_blank;
  select count(*) into n from order_payments where purchase_id = o_blank;
  if j->>'result' = 'too_much' and (j->>'outstanding')::numeric = 400 and v = 100 and n = 1 then passed := passed + 1;
  else fails := fails || ' [2 too much: ' || j::text || ', paid ' || v || ', rows ' || n || ']'; end if;

  -- 3. Exactly what is owed, by card: paid in full
  j := record_order_payment(o_blank, 400, v_today, 'card', null);
  pay2 := (j->>'payment_id')::uuid;
  select amount_paid_gbp into v from purchases where id = o_blank;
  select started_from_blank into b from order_payments where id = pay2;
  if j->>'result' = 'recorded' and v = 500 and not b and (j->>'outstanding')::numeric = 0 then passed := passed + 1;
  else fails := fails || ' [3 balance: ' || j::text || ', paid ' || v || ']'; end if;

  -- 4. Paid in full: any further payment refused
  j := record_order_payment(o_blank, 1, v_today, 'cash', null);
  if j->>'result' = 'paid_in_full' then passed := passed + 1;
  else fails := fails || ' [4 paid in full: ' || j::text || ']'; end if;

  -- 5. Bad input refused, nothing saved: 0, below 0, a fraction of a penny, unknown method, future date, no date
  n := 0;
  if record_order_payment(o_dep, 0, v_today, 'cash', null)->>'result' = 'bad_amount' then n := n + 1; end if;
  if record_order_payment(o_dep, -5, v_today, 'cash', null)->>'result' = 'bad_amount' then n := n + 1; end if;
  if record_order_payment(o_dep, 10.001, v_today, 'cash', null)->>'result' = 'bad_amount' then n := n + 1; end if;
  if record_order_payment(o_dep, 10, v_today, 'cheque', null)->>'result' = 'bad_method' then n := n + 1; end if;
  if record_order_payment(o_dep, 10, v_today + 1, 'cash', null)->>'result' = 'future_date' then n := n + 1; end if;
  if record_order_payment(o_dep, 10, null, 'cash', null)->>'result' = 'bad_date' then n := n + 1; end if;
  if n = 6 and (select count(*) from order_payments where purchase_id = o_dep) = 0
     and (select amount_paid_gbp from purchases where id = o_dep) = 200 then passed := passed + 1;
  else fails := fails || ' [5 bad input: ' || n || ' of 6 refused]'; end if;

  -- 6. Refund row and free place: nothing owed
  if record_order_payment(o_refund, 10, v_today, 'cash', null)->>'result' = 'nothing_owed'
     and record_order_payment(o_free, 10, v_today, 'cash', null)->>'result' = 'nothing_owed' then passed := passed + 1;
  else fails := fails || ' [6 nothing owed]'; end if;

  -- 7. Unknown order and unknown payment
  if record_order_payment(gen_random_uuid(), 10, v_today, 'cash', null)->>'result' = 'not_found'
     and delete_order_payment(gen_random_uuid())->>'result' = 'not_found' then passed := passed + 1;
  else fails := fails || ' [7 not found]'; end if;

  -- 8. Delete the 400 card payment: amount paid back to 100
  j := delete_order_payment(pay2);
  select amount_paid_gbp into v from purchases where id = o_blank;
  if j->>'result' = 'deleted' and v = 100 and not exists (select 1 from order_payments where id = pay2) then passed := passed + 1;
  else fails := fails || ' [8 delete: ' || j::text || ', paid ' || coalesce(v::text, 'blank') || ']'; end if;

  -- 9. Delete the first payment too (it started from blank, nothing else paid): blank again
  j := delete_order_payment(pay1);
  select amount_paid_gbp into v from purchases where id = o_blank;
  if j->>'result' = 'deleted' and v is null then passed := passed + 1;
  else fails := fails || ' [9 back to blank: ' || j::text || ', paid ' || coalesce(v::text, 'blank') || ']'; end if;

  -- 10. Same payment deleted twice: second time not found, nothing changes
  j := delete_order_payment(pay1);
  select amount_paid_gbp into v from purchases where id = o_blank;
  if j->>'result' = 'not_found' and v is null then passed := passed + 1;
  else fails := fails || ' [10 delete twice: ' || j::text || ']'; end if;

  -- 11. Deposit order (200 already paid): balance of 300 by bank, then deleted, back to 200 (not blank)
  j := record_order_payment(o_dep, 300, v_today, 'bank_transfer', 'balance');
  pay3 := (j->>'payment_id')::uuid;
  select amount_paid_gbp into v from purchases where id = o_dep;
  if j->>'result' = 'recorded' and v = 500 then
    j := delete_order_payment(pay3);
    select amount_paid_gbp into v from purchases where id = o_dep;
    if j->>'result' = 'deleted' and v = 200 then passed := passed + 1;
    else fails := fails || ' [11 deposit delete: ' || j::text || ', paid ' || coalesce(v::text, 'blank') || ']'; end if;
  else fails := fails || ' [11 deposit balance: ' || j::text || ']'; end if;

  -- 12. Order totals (revenue) never changed
  if (select amount_gbp from purchases where id = o_blank) = 500
     and (select amount_gbp from purchases where id = o_dep) = 500
     and (select sum(amount_gbp) from purchases where person_id = p1) = 950 then passed := passed + 1;
  else fails := fails || ' [12 order totals changed]'; end if;

  -- 13. Deleting an order removes its payments
  j := record_order_payment(o_dep, 50, v_today, 'other', null);
  delete from purchases where id = o_dep;
  select count(*) into n from order_payments where purchase_id = o_dep;
  if j->>'result' = 'recorded' and n = 0 then passed := passed + 1;
  else fails := fails || ' [13 order deleted: ' || j::text || ', rows left ' || n || ']'; end if;

  -- 14. Logged-in browser keys cannot reach the table or the functions
  if not has_table_privilege('anon', 'public.order_payments', 'select')
     and not has_table_privilege('authenticated', 'public.order_payments', 'select')
     and not has_function_privilege('anon', 'public.record_order_payment(uuid, numeric, date, text, text)', 'execute')
     and not has_function_privilege('authenticated', 'public.delete_order_payment(uuid)', 'execute')
  then passed := passed + 1;
  else fails := fails || ' [14 access not locked down]'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 14 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 14 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
