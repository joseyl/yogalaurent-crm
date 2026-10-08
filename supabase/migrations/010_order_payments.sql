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

-- Check it worked
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'order_payments') as table_added_should_be_1,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('record_order_payment', 'delete_order_payment')) as functions_added_should_be_2,
  (select count(*) from public.order_payments) as payment_rows_should_be_0;
