-- 003_training_orders.sql
-- Run this BEFORE deploying the training-order webhook, otherwise the new
-- columns will not exist and every order will be rejected.
--
-- Safe to run more than once. It only adds things and removes one dead function.
-- It does not change or delete any existing row.

-- 1. Order tracking on purchases -------------------------------------------
-- order_ref        the TT-YYYY-NNNN reference from yogalaurent.com
-- amount_paid_gbp  how much has actually been collected so far
-- payment_option   full | deposit | instalments
-- balance_due_date when the rest is due, for deposit bookings
-- source           where the row came from: stripe, bank_transfer, admin,
--                  momence, import, manual

alter table purchases add column if not exists order_ref text;
alter table purchases add column if not exists amount_paid_gbp numeric(10,2);
alter table purchases add column if not exists payment_option text;
alter table purchases add column if not exists balance_due_date date;
alter table purchases add column if not exists source text;

-- Stops the same order being written twice if Stripe retries or a Make
-- execution is replayed. A 100-hour bundle writes three rows under one order
-- reference, so the key is the pair, not the reference alone.
create unique index if not exists purchases_order_ref_product_key
  on purchases (order_ref, product_id)
  where order_ref is not null;

-- 2. Remove the dead function that broke the Momence pass webhook ----------
-- It referenced an "interests" table that does not exist in this database.
-- The trigger that called it has already gone; this clears the function too
-- so it cannot be reattached by accident.

drop function if exists public.remove_interests_on_purchase();

-- 3. Let webhook_log record the word "error" ------------------------------
-- The class booking route writes status 'error', which the old rule rejected,
-- so those failures were never logged anywhere.

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.webhook_log'::regclass and contype = 'c'
  loop
    execute format('alter table public.webhook_log drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.webhook_log
  add constraint webhook_log_status_check
  check (status in ('success', 'failed', 'skipped', 'error'));

-- 4. Check it worked -------------------------------------------------------
select
  (select count(*) from information_schema.columns
     where table_name = 'purchases'
       and column_name in ('order_ref','amount_paid_gbp','payment_option','balance_due_date','source')
  ) as new_columns_added_should_be_5,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'remove_interests_on_purchase'
  ) as dead_function_left_should_be_0;
