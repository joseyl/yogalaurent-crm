-- TEST ONLY. Runs migration 007 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 11 of 11 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/007_training_instalments.sql (without its final check).

begin;

-- 007_training_instalments.sql
-- Monthly payment plan instalments for teacher trainings.
-- Run by hand in the Supabase SQL Editor BEFORE the training-instalment webhook
-- goes live. Run supabase/tests/007_training_instalments_test.sql first: it runs
-- all of this plus checks, then undoes everything.
--
-- What it adds:
--   training_payments        one row per paid Stripe plan charge (invoice), so the
--                            same charge can never be counted twice
--   purchases.stripe_subscription_id
--                            the Stripe plan an order belongs to, saved the first
--                            time an instalment matches the order
--   record_training_instalment()  check and write in one locked step (the webhook calls this)
--   apply_training_payment()      matches one saved payment to its order and updates amount paid
--   retry_unmatched_training_payments()  re-tries every "unmatched" payment, e.g. after
--                            linking a plan to its order by hand
--
-- Rules:
--   Order found by orderRef (including -2, -3 copies, picking the buyer's own),
--   else by the plan id saved on the order. Main order row only, never the 0 rows
--   of a 100-hour bundle.
--   Every paid plan charge is added, including the plan's first invoice
--   (billing reason subscription_create): instalment 1 is a separate one-off
--   checkout payment that the training order already counted; the plan starts a
--   month later (confirmed by the website project, 6 Oct 2026).
--   amount_paid_gbp never goes above the order total, never goes down, and is never
--   filled in when it was blank (unknown) before.
--   Anything that cannot be matched stays "unmatched" with a note and shows on the dashboard.
--
-- To remove:
--   drop function if exists public.retry_unmatched_training_payments();
--   drop function if exists public.record_training_instalment(text, text, text, text, uuid, numeric, text, timestamptz, text);
--   drop function if exists public.apply_training_payment(uuid);
--   drop table if exists public.training_payments;
--   alter table public.purchases drop column if exists stripe_subscription_id;

create table if not exists public.training_payments (
  id uuid primary key default gen_random_uuid(),
  stripe_invoice_id text not null,
  stripe_subscription_id text,
  order_ref text,
  email text,
  person_id uuid references public.people(id) on delete set null,
  amount_gbp numeric(10,2) not null,
  currency text,
  paid_at timestamptz,
  billing_reason text,
  purchase_id uuid references public.purchases(id) on delete set null,
  status text not null default 'unmatched'
    check (status in ('applied', 'unmatched')),
  added_gbp numeric(10,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists training_payments_invoice_key
  on public.training_payments (stripe_invoice_id);

alter table public.training_payments enable row level security;
revoke all on public.training_payments from public, anon, authenticated;
grant select, insert, update, delete on public.training_payments to service_role;

alter table public.purchases add column if not exists stripe_subscription_id text;

create or replace function public.apply_training_payment(p_payment_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  t training_payments%rowtype;
  v_ids uuid[];
  v_count int := 0;
  v_pattern text;
  v_purchase purchases%rowtype;
  v_old numeric(10,2);
  v_new numeric(10,2);
  v_added numeric(10,2);
begin
  select * into t from training_payments where id = p_payment_id for update;
  if not found then return 'not_found'; end if;
  if t.status <> 'unmatched' then return 'already_' || t.status; end if;

  if lower(coalesce(t.currency, 'gbp')) <> 'gbp' then
    update training_payments
      set note = 'Currency ' || t.currency || ', not GBP. Not added.', updated_at = now()
      where id = t.id;
    return 'unmatched';
  end if;

  -- 1. By order reference, including the -2, -3 copies of a reused reference
  if coalesce(t.order_ref, '') <> '' then
    v_pattern := '^' || regexp_replace(t.order_ref, '([^A-Za-z0-9])', '\\\1', 'g') || '-[0-9]+$';
    select array_agg(id) into v_ids
      from purchases
      where amount_gbp > 0 and (order_ref = t.order_ref or order_ref ~ v_pattern);
    v_count := coalesce(array_length(v_ids, 1), 0);

    if v_count > 1 and t.person_id is not null then
      select array_agg(id) into v_ids
        from purchases
        where id = any(v_ids) and person_id = t.person_id;
      v_count := coalesce(array_length(v_ids, 1), 0);
    end if;

    if v_count > 1 then
      update training_payments
        set note = 'orderRef ' || t.order_ref || ' matches more than one order and the payer email does not pick one. Link the plan by hand.',
            updated_at = now()
        where id = t.id;
      return 'unmatched';
    end if;
  end if;

  -- 2. By the plan id saved on the order
  if v_count = 0 and t.stripe_subscription_id is not null then
    select array_agg(id) into v_ids
      from purchases
      where amount_gbp > 0 and stripe_subscription_id = t.stripe_subscription_id;
    v_count := coalesce(array_length(v_ids, 1), 0);

    if v_count > 1 then
      update training_payments
        set note = 'This plan is linked to more than one order. Fix the link by hand.', updated_at = now()
        where id = t.id;
      return 'unmatched';
    end if;
  end if;

  if v_count = 0 then
    update training_payments
      set note = case
            when coalesce(t.order_ref, '') = '' then 'No orderRef, and the plan is not linked to an order yet.'
            else 'No order found for orderRef ' || t.order_ref || ', and the plan is not linked to an order yet.'
          end,
          updated_at = now()
      where id = t.id;
    return 'unmatched';
  end if;

  select * into v_purchase from purchases where id = v_ids[1] for update;

  if v_purchase.stripe_subscription_id is not null
     and t.stripe_subscription_id is not null
     and v_purchase.stripe_subscription_id <> t.stripe_subscription_id then
    update training_payments
      set note = 'The order is already linked to a different plan. Check by hand.', updated_at = now()
      where id = t.id;
    return 'unmatched';
  end if;

  if v_purchase.amount_paid_gbp is null then
    update training_payments
      set note = 'The order has no amount paid recorded (unknown). Set it first, then retry.', updated_at = now()
      where id = t.id;
    return 'unmatched';
  end if;

  if v_purchase.stripe_subscription_id is null and t.stripe_subscription_id is not null then
    update purchases set stripe_subscription_id = t.stripe_subscription_id where id = v_purchase.id;
  end if;

  v_old := v_purchase.amount_paid_gbp;
  v_new := greatest(v_old, least(v_purchase.amount_gbp, v_old + t.amount_gbp));
  v_added := v_new - v_old;

  if v_added > 0 then
    update purchases set amount_paid_gbp = v_new where id = v_purchase.id;
  end if;

  update training_payments
    set status = 'applied', purchase_id = v_purchase.id, added_gbp = v_added,
        note = case when v_added < t.amount_gbp
                 then 'Capped at the order total: ' || v_added || ' of ' || t.amount_gbp || ' added.'
                 else null end,
        updated_at = now()
    where id = t.id;

  return case when v_added < t.amount_gbp then 'applied_capped' else 'applied' end;
end;
$$;

create or replace function public.record_training_instalment(
  p_invoice_id text,
  p_subscription_id text,
  p_order_ref text,
  p_email text,
  p_person_id uuid,
  p_amount numeric,
  p_currency text,
  p_paid_at timestamptz,
  p_billing_reason text
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- One instalment at a time, so two copies of the same message cannot both get through
  perform pg_advisory_xact_lock(hashtext('training_instalment'));

  if exists (select 1 from training_payments where stripe_invoice_id = p_invoice_id) then
    return 'duplicate';
  end if;

  insert into training_payments (
    stripe_invoice_id, stripe_subscription_id, order_ref, email, person_id,
    amount_gbp, currency, paid_at, billing_reason, status
  ) values (
    p_invoice_id, nullif(p_subscription_id, ''), nullif(p_order_ref, ''), nullif(p_email, ''), p_person_id,
    p_amount, nullif(p_currency, ''), p_paid_at, nullif(p_billing_reason, ''), 'unmatched'
  )
  returning id into v_id;

  return apply_training_payment(v_id);
end;
$$;

create or replace function public.retry_unmatched_training_payments()
returns table (payment_id uuid, result text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
begin
  perform pg_advisory_xact_lock(hashtext('training_instalment'));
  for r in
    select id from training_payments where status = 'unmatched' order by paid_at nulls last, created_at
  loop
    payment_id := r.id;
    result := apply_training_payment(r.id);
    return next;
  end loop;
end;
$$;

revoke all on function public.apply_training_payment(uuid) from public, anon, authenticated;
revoke all on function public.record_training_instalment(text, text, text, text, uuid, numeric, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.retry_unmatched_training_payments() from public, anon, authenticated;
grant execute on function public.apply_training_payment(uuid) to service_role;
grant execute on function public.record_training_instalment(text, text, text, text, uuid, numeric, text, timestamptz, text) to service_role;
grant execute on function public.retry_unmatched_training_payments() to service_role;


do $$
declare
  v_product uuid := 'ff398371-e528-468c-b5a0-4301007d1a94'; -- 60hr training
  p1 uuid; p2 uuid;
  a uuid; b uuid; c uuid;
  r text;
  fails text := '';
  passed int := 0;
  v numeric;
  s text;
  n int;
begin
  insert into people (email, first_name, last_name, status)
    values ('instalment-test-1@example.invalid', 'Test', 'One', 'client') returning id into p1;
  insert into people (email, first_name, last_name, status)
    values ('instalment-test-2@example.invalid', 'Test', 'Two', 'client') returning id into p2;

  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, purchase_date, order_ref, payment_option, source, notes)
    values (p1, v_product, 1000, 100, current_date, 'TEST-INST-0001', 'instalments', 'stripe', 'TEST') returning id into a;
  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, purchase_date, order_ref, payment_option, source, notes)
    values (p2, v_product, 1000, 100, current_date, 'TEST-INST-0001-2', 'instalments', 'stripe', 'TEST') returning id into b;
  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, purchase_date, order_ref, payment_option, source, notes)
    values (p1, v_product, 800, null, current_date, 'TEST-INST-0003', 'instalments', 'stripe', 'TEST') returning id into c;

  -- 1. First plan invoice (instalment 2, new money): added, plan linked to the order
  r := record_training_instalment('in_test_1', 'sub_test_1', 'TEST-INST-0001', 'instalment-test-1@example.invalid', p1, 100, 'gbp', now(), 'subscription_create');
  select amount_paid_gbp, stripe_subscription_id into v, s from purchases where id = a;
  if r = 'applied' and v = 200 and s = 'sub_test_1' then passed := passed + 1;
  else fails := fails || ' [1 first charge: ' || r || ', paid ' || v || ', plan ' || coalesce(s, 'none') || ']'; end if;

  -- 2. Monthly charge by orderRef, buyer picked out of the -2 copy
  r := record_training_instalment('in_test_2', 'sub_test_1', 'TEST-INST-0001', 'instalment-test-1@example.invalid', p1, 300, 'gbp', now(), 'subscription_cycle');
  select amount_paid_gbp into v from purchases where id = a;
  if r = 'applied' and v = 500 then passed := passed + 1;
  else fails := fails || ' [2 monthly charge: ' || r || ', paid ' || v || ']'; end if;

  -- 3. Same charge sent again: nothing added
  r := record_training_instalment('in_test_2', 'sub_test_1', 'TEST-INST-0001', 'instalment-test-1@example.invalid', p1, 300, 'gbp', now(), 'subscription_cycle');
  select amount_paid_gbp into v from purchases where id = a;
  if r = 'duplicate' and v = 500 then passed := passed + 1;
  else fails := fails || ' [3 repeat: ' || r || ', paid ' || v || ']'; end if;

  -- 4. No orderRef, found by the plan saved on the order
  r := record_training_instalment('in_test_3', 'sub_test_1', null, null, null, 300, 'gbp', now(), 'subscription_cycle');
  select amount_paid_gbp into v from purchases where id = a;
  if r = 'applied' and v = 800 then passed := passed + 1;
  else fails := fails || ' [4 by plan: ' || r || ', paid ' || v || ']'; end if;

  -- 5. Would go over the total: stops at 1000
  r := record_training_instalment('in_test_4', 'sub_test_1', 'TEST-INST-0001', 'instalment-test-1@example.invalid', p1, 500, 'gbp', now(), 'subscription_cycle');
  select amount_paid_gbp into v from purchases where id = a;
  select added_gbp into strict s from training_payments where stripe_invoice_id = 'in_test_4';
  if r = 'applied_capped' and v = 1000 and s::numeric = 200 then passed := passed + 1;
  else fails := fails || ' [5 cap: ' || r || ', paid ' || v || ', added ' || s || ']'; end if;

  -- 6. Unknown orderRef and unknown plan: kept as unmatched
  r := record_training_instalment('in_test_5', 'sub_test_9', 'TEST-INST-9999', null, null, 200, 'gbp', now(), 'subscription_cycle');
  if r = 'unmatched' then passed := passed + 1;
  else fails := fails || ' [6 unknown: ' || r || ']'; end if;

  -- 7. Reused orderRef and no known payer: cannot choose, unmatched, nothing changed
  r := record_training_instalment('in_test_6', 'sub_test_2', 'TEST-INST-0001', null, null, 50, 'gbp', now(), 'subscription_cycle');
  select amount_paid_gbp into v from purchases where id = b;
  if r = 'unmatched' and v = 100 then passed := passed + 1;
  else fails := fails || ' [7 reused ref: ' || r || ', paid ' || v || ']'; end if;

  -- 8. Not GBP: unmatched
  r := record_training_instalment('in_test_7', 'sub_test_1', 'TEST-INST-0001', null, p1, 20, 'eur', now(), 'subscription_cycle');
  if r = 'unmatched' then passed := passed + 1;
  else fails := fails || ' [8 currency: ' || r || ']'; end if;

  -- 9. Order with a blank (unknown) amount paid: left alone
  r := record_training_instalment('in_test_8', 'sub_test_3', 'TEST-INST-0003', null, p1, 100, 'gbp', now(), 'subscription_cycle');
  select amount_paid_gbp into v from purchases where id = c;
  if r = 'unmatched' and v is null then passed := passed + 1;
  else fails := fails || ' [9 blank paid: ' || r || ', paid ' || coalesce(v::text, 'blank') || ']'; end if;

  -- 10. Link plan sub_test_9 to order B by hand, then retry: the waiting 200 is added
  update purchases set stripe_subscription_id = 'sub_test_9' where id = b;
  perform * from retry_unmatched_training_payments();
  select amount_paid_gbp into v from purchases where id = b;
  select status into s from training_payments where stripe_invoice_id = 'in_test_5';
  if v = 300 and s = 'applied' then passed := passed + 1;
  else fails := fails || ' [10 link and retry: paid ' || v || ', status ' || s || ']'; end if;

  -- 11. Three still unmatched (reused ref, not GBP, blank paid); number 6 was fixed by 10
  select count(*) into n from training_payments where status = 'unmatched';
  if n = 3 then passed := passed + 1;
  else fails := fails || ' [11 unmatched left: ' || n || ', expected 3]'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 11 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 11 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
