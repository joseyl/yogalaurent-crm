-- TEST ONLY. Runs migration 008 and checks it on made-up rows, then undoes everything.
-- Paste the whole file into the Supabase SQL Editor and run it.
-- It ALWAYS ends in a red error on purpose: that error is what undoes everything.
-- Read the message: "TEST PASSED: 15 of 15 checks" is good. "TEST FAILED" lists what went wrong.
-- Generated from supabase/migrations/008_payment_link_sales.sql (without its final check).

begin;

-- 008_payment_link_sales.sql
-- Sales made through Stripe payment links on the Terra Training account.
-- Run by hand in the Supabase SQL Editor BEFORE the payment-link webhooks go live.
-- Run supabase/tests/008_payment_link_sales_test.sql first: it runs all of this
-- plus checks, then undoes everything.
--
-- What it adds:
--   payment_links            one row per Stripe payment link: what to do with its sales
--                            sale          creates a purchase under product_id
--                            part_payment  saved only: a deposit or balance of an order the
--                                          CRM already holds (retreats, trainings). No purchase
--                            review        general "pay any amount" link: each sale waits on
--                                          the dashboard until a product is chosen by hand
--                            ignore        saved only (tests and the like)
--   payment_link_payments    one row per paid checkout, unique by Stripe checkout session id,
--                            so the same sale can never be counted twice (webhook or import)
--   payment_link_refunds     one row per refunded payment, holding the running total refunded
--   record_payment_link_sale()    check and save in one locked step (the sale webhook and the
--                                 history import call this)
--   apply_payment_link_payment()  turns one saved payment into a purchase, or leaves it to sort
--   record_payment_link_refund()  lowers the purchase to the amount kept
--   retry_payment_link_payments() re-tries every payment still to sort, e.g. after a
--                                 payment link has been given a product
--
-- Rules:
--   A purchase is dated by the London date of payment, at the pound amount that landed in
--   Stripe before fees, marked paid in full, source payment_link.
--   A link not yet in payment_links is added automatically as review, and its sale waits.
--   One sale can be sorted on its own by filling payment_link_payments.sort_as (and
--   product_id for a sale), then running select * from retry_payment_link_payments();
--   A refund sets the purchase to the amount kept: pounds x (1 - refunded / charged).
--   A full refund leaves the row at 0 with a note. A refund on a part payment or an ignored
--   sale changes nothing. A refund that arrives before its sale is sorted waits and is
--   applied when the sale is recorded.
--
-- To remove:
--   drop function if exists public.retry_payment_link_payments();
--   drop function if exists public.record_payment_link_refund(text, text, text, text, numeric, numeric, timestamptz);
--   drop function if exists public.record_payment_link_sale(text, text, text, text, uuid, text, text, text, int, text, numeric, numeric, text, numeric, timestamptz, text);
--   drop function if exists public.apply_payment_link_payment(uuid);
--   drop table if exists public.payment_link_refunds;
--   drop table if exists public.payment_link_payments;
--   drop table if exists public.payment_links;

create table if not exists public.payment_links (
  stripe_payment_link_id text primary key,
  label text,
  action text not null default 'review'
    check (action in ('sale', 'part_payment', 'review', 'ignore')),
  product_id uuid references public.products(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_links_sale_needs_product check (action <> 'sale' or product_id is not null)
);

create table if not exists public.payment_link_payments (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null,
  stripe_payment_intent_id text,
  stripe_payment_link_id text not null,
  email text,
  person_id uuid references public.people(id) on delete set null,
  payer_name text,
  custom_info text,
  description text,
  quantity int not null default 1,
  currency text,
  amount_original numeric(10,2),
  amount_gbp numeric(10,2),
  discount_code text,
  amount_discount numeric(10,2) not null default 0,
  paid_at timestamptz not null,
  origin text not null default 'webhook' check (origin in ('webhook', 'import')),
  status text not null default 'to_sort'
    check (status in ('recorded', 'part_payment', 'ignored', 'to_sort')),
  sort_as text check (sort_as in ('sale', 'part_payment', 'ignore')),
  product_id uuid references public.products(id),
  purchase_id uuid references public.purchases(id) on delete set null,
  refunded_original numeric(10,2) not null default 0,
  refunded_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_link_payments_session_key
  on public.payment_link_payments (stripe_checkout_session_id);
create unique index if not exists payment_link_payments_intent_key
  on public.payment_link_payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.payment_link_refunds (
  id uuid primary key default gen_random_uuid(),
  stripe_payment_intent_id text not null,
  stripe_charge_id text,
  refund_id text,
  currency text,
  charge_amount_original numeric(10,2),
  refunded_original numeric(10,2) not null,
  refunded_at timestamptz,
  payment_id uuid references public.payment_link_payments(id) on delete set null,
  status text not null default 'unmatched'
    check (status in ('applied', 'waiting', 'not_counted', 'unmatched')),
  kept_gbp numeric(10,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_link_refunds_intent_key
  on public.payment_link_refunds (stripe_payment_intent_id);

alter table public.payment_links enable row level security;
alter table public.payment_link_payments enable row level security;
alter table public.payment_link_refunds enable row level security;
revoke all on public.payment_links from public, anon, authenticated;
revoke all on public.payment_link_payments from public, anon, authenticated;
revoke all on public.payment_link_refunds from public, anon, authenticated;
grant select, insert, update, delete on public.payment_links to service_role;
grant select, insert, update, delete on public.payment_link_payments to service_role;
grant select, insert, update, delete on public.payment_link_refunds to service_role;

-- Turns one saved payment into a purchase, or leaves it to sort with a note.
create or replace function public.apply_payment_link_payment(p_payment_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  t payment_link_payments%rowtype;
  l payment_links%rowtype;
  v_action text;
  v_product uuid;
  v_kept numeric(10,2);
  v_purchase uuid;
  v_notes text;
begin
  select * into t from payment_link_payments where id = p_payment_id for update;
  if not found then return 'not_found'; end if;
  if t.status <> 'to_sort' then return 'already_' || t.status; end if;

  select * into l from payment_links where stripe_payment_link_id = t.stripe_payment_link_id;
  if not found then
    insert into payment_links (stripe_payment_link_id, label, action)
      values (t.stripe_payment_link_id, left(coalesce(t.description, 'Unknown payment link'), 200), 'review')
      on conflict (stripe_payment_link_id) do nothing;
    if t.sort_as is null then
      update payment_link_payments
        set note = 'New payment link, added to payment_links for review. Set what it sells, then retry.',
            updated_at = now()
        where id = t.id;
      update payment_link_refunds set status = 'waiting', payment_id = t.id, updated_at = now()
        where stripe_payment_intent_id = t.stripe_payment_intent_id and status in ('unmatched', 'waiting');
      return 'to_sort';
    end if;
  end if;

  v_action := coalesce(t.sort_as, l.action);
  v_product := coalesce(t.product_id, l.product_id);

  if v_action in ('ignore', 'part_payment') then
    update payment_link_payments
      set status = case when v_action = 'ignore' then 'ignored' else 'part_payment' end,
          note = null, updated_at = now()
      where id = t.id;
    update payment_link_refunds
      set status = 'not_counted', payment_id = t.id, note = null, updated_at = now()
      where stripe_payment_intent_id = t.stripe_payment_intent_id;
    return case when v_action = 'ignore' then 'ignored' else 'part_payment' end;
  end if;

  if v_action = 'review' or v_product is null then
    v_notes := 'General payment link: choose a product for this sale (or mark it a part payment), then retry.';
  elsif t.person_id is null then
    v_notes := 'No client found or created for this email.';
  elsif t.amount_gbp is null then
    v_notes := 'No pound amount (paid in ' || upper(coalesce(t.currency, '?')) || '). Fill in amount_gbp from Stripe, then retry.';
  end if;

  if v_notes is not null then
    update payment_link_payments set note = v_notes, updated_at = now() where id = t.id;
    update payment_link_refunds set status = 'waiting', payment_id = t.id, updated_at = now()
      where stripe_payment_intent_id = t.stripe_payment_intent_id and status in ('unmatched', 'waiting');
    return 'to_sort';
  end if;

  -- A refund that arrived before the sale is taken into account here
  if t.refunded_original > 0 and coalesce(t.amount_original, 0) > 0 then
    v_kept := greatest(0, round(t.amount_gbp * (t.amount_original - least(t.refunded_original, t.amount_original)) / t.amount_original, 2));
  else
    v_kept := t.amount_gbp;
  end if;

  v_notes := concat_ws('. ',
    coalesce(nullif(t.description, ''), 'Payment link sale'),
    case when t.quantity > 1 then 'Quantity ' || t.quantity end,
    nullif(t.custom_info, ''),
    case when coalesce(t.discount_code, '') <> '' then 'Discount code: ' || t.discount_code end,
    case when coalesce(t.currency, 'gbp') <> 'gbp'
         then 'Paid ' || t.amount_original || ' ' || upper(t.currency) end,
    'Stripe payment link',
    case when t.refunded_original > 0
         then 'Refunded ' || t.refunded_original || ' ' || upper(coalesce(t.currency, 'gbp')) || ', kept ' || v_kept end
  );

  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, payment_option,
                         purchase_date, source, notes)
    values (t.person_id, v_product, v_kept, v_kept, 'full',
            (t.paid_at at time zone 'Europe/London')::date, 'payment_link', v_notes)
    returning id into v_purchase;

  update payment_link_payments
    set status = 'recorded', purchase_id = v_purchase, note = null, updated_at = now()
    where id = t.id;

  update payment_link_refunds
    set status = 'applied', payment_id = t.id, kept_gbp = v_kept, note = null, updated_at = now()
    where stripe_payment_intent_id = t.stripe_payment_intent_id;

  return 'recorded';
end;
$$;

create or replace function public.record_payment_link_sale(
  p_session_id text,
  p_payment_intent_id text,
  p_payment_link_id text,
  p_email text,
  p_person_id uuid,
  p_payer_name text,
  p_custom_info text,
  p_description text,
  p_quantity int,
  p_currency text,
  p_amount_original numeric,
  p_amount_gbp numeric,
  p_discount_code text,
  p_amount_discount numeric,
  p_paid_at timestamptz,
  p_origin text
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  r payment_link_refunds%rowtype;
begin
  -- One payment-link message at a time, so two copies of the same sale cannot both get through
  perform pg_advisory_xact_lock(hashtext('payment_link'));

  if exists (select 1 from payment_link_payments where stripe_checkout_session_id = p_session_id) then
    return 'duplicate';
  end if;

  insert into payment_link_payments (
    stripe_checkout_session_id, stripe_payment_intent_id, stripe_payment_link_id, email, person_id,
    payer_name, custom_info, description, quantity, currency, amount_original, amount_gbp,
    discount_code, amount_discount, paid_at, origin
  ) values (
    p_session_id, nullif(p_payment_intent_id, ''), p_payment_link_id, nullif(lower(p_email), ''), p_person_id,
    nullif(p_payer_name, ''), nullif(p_custom_info, ''), nullif(p_description, ''), greatest(coalesce(p_quantity, 1), 1),
    lower(coalesce(nullif(p_currency, ''), 'gbp')), p_amount_original, p_amount_gbp,
    nullif(p_discount_code, ''), coalesce(p_amount_discount, 0), p_paid_at, coalesce(p_origin, 'webhook')
  )
  returning id into v_id;

  -- A refund that arrived first (for example in the history import order)
  if coalesce(p_payment_intent_id, '') <> '' then
    select * into r from payment_link_refunds where stripe_payment_intent_id = p_payment_intent_id;
    if found then
      update payment_link_payments
        set refunded_original = r.refunded_original, refunded_at = r.refunded_at
        where id = v_id;
    end if;
  end if;

  return apply_payment_link_payment(v_id);
end;
$$;

create or replace function public.record_payment_link_refund(
  p_payment_intent_id text,
  p_charge_id text,
  p_refund_id text,
  p_currency text,
  p_charge_amount numeric,
  p_refunded_total numeric,
  p_refunded_at timestamptz
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  r payment_link_refunds%rowtype;
  t payment_link_payments%rowtype;
  v_kept numeric(10,2);
begin
  perform pg_advisory_xact_lock(hashtext('payment_link'));

  select * into r from payment_link_refunds where stripe_payment_intent_id = p_payment_intent_id for update;
  if found and p_refunded_total <= r.refunded_original then
    return 'duplicate';
  end if;

  insert into payment_link_refunds (stripe_payment_intent_id, stripe_charge_id, refund_id, currency,
                                    charge_amount_original, refunded_original, refunded_at, status)
    values (p_payment_intent_id, nullif(p_charge_id, ''), nullif(p_refund_id, ''), lower(coalesce(nullif(p_currency, ''), 'gbp')),
            p_charge_amount, p_refunded_total, p_refunded_at, 'unmatched')
    on conflict (stripe_payment_intent_id) do update
      set stripe_charge_id = excluded.stripe_charge_id, refund_id = excluded.refund_id,
          charge_amount_original = excluded.charge_amount_original,
          refunded_original = excluded.refunded_original, refunded_at = excluded.refunded_at,
          updated_at = now()
    returning * into r;

  select * into t from payment_link_payments where stripe_payment_intent_id = p_payment_intent_id for update;
  if not found then
    update payment_link_refunds
      set status = 'unmatched', note = 'No payment-link sale found for this payment.', updated_at = now()
      where id = r.id;
    return 'unmatched';
  end if;

  update payment_link_payments
    set refunded_original = p_refunded_total, refunded_at = p_refunded_at, updated_at = now()
    where id = t.id;

  if t.status in ('part_payment', 'ignored') then
    update payment_link_refunds set status = 'not_counted', payment_id = t.id, note = null, updated_at = now()
      where id = r.id;
    return 'not_counted';
  end if;

  if t.status = 'to_sort' then
    update payment_link_refunds
      set status = 'waiting', payment_id = t.id,
          note = 'The sale is not sorted yet. The refund is applied when it is.', updated_at = now()
      where id = r.id;
    return 'waiting';
  end if;

  -- status recorded
  if t.purchase_id is null or t.amount_gbp is null then
    update payment_link_refunds
      set status = 'unmatched', payment_id = t.id,
          note = 'The sale''s purchase row no longer exists. Check by hand.', updated_at = now()
      where id = r.id;
    return 'unmatched';
  end if;

  if coalesce(t.amount_original, 0) > 0 then
    v_kept := greatest(0, round(t.amount_gbp * (t.amount_original - least(p_refunded_total, t.amount_original)) / t.amount_original, 2));
  else
    v_kept := 0;
  end if;

  update purchases
    set amount_gbp = v_kept,
        amount_paid_gbp = v_kept,
        notes = concat_ws('. ', nullif(notes, ''),
          'Refunded ' || p_refunded_total || ' ' || upper(coalesce(t.currency, 'gbp')) || ' in total on '
          || to_char(coalesce(p_refunded_at, now()) at time zone 'Europe/London', 'DD Mon YYYY') || ', kept ' || v_kept)
    where id = t.purchase_id;

  update payment_link_refunds
    set status = 'applied', payment_id = t.id, kept_gbp = v_kept, note = null, updated_at = now()
    where id = r.id;

  return case when v_kept = 0 then 'applied_full' else 'applied' end;
end;
$$;

create or replace function public.retry_payment_link_payments()
returns table (payment_id uuid, result text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  x record;
begin
  perform pg_advisory_xact_lock(hashtext('payment_link'));
  for x in
    select id from payment_link_payments where status = 'to_sort' order by paid_at, created_at
  loop
    payment_id := x.id;
    result := apply_payment_link_payment(x.id);
    return next;
  end loop;
end;
$$;

revoke all on function public.apply_payment_link_payment(uuid) from public, anon, authenticated;
revoke all on function public.record_payment_link_sale(text, text, text, text, uuid, text, text, text, int, text, numeric, numeric, text, numeric, timestamptz, text) from public, anon, authenticated;
revoke all on function public.record_payment_link_refund(text, text, text, text, numeric, numeric, timestamptz) from public, anon, authenticated;
revoke all on function public.retry_payment_link_payments() from public, anon, authenticated;
grant execute on function public.apply_payment_link_payment(uuid) to service_role;
grant execute on function public.record_payment_link_sale(text, text, text, text, uuid, text, text, text, int, text, numeric, numeric, text, numeric, timestamptz, text) to service_role;
grant execute on function public.record_payment_link_refund(text, text, text, text, numeric, numeric, timestamptz) to service_role;
grant execute on function public.retry_payment_link_payments() to service_role;


do $$
declare
  v_product uuid := 'ff398371-e528-468c-b5a0-4301007d1a94'; -- any existing product will do; everything is undone
  p1 uuid;
  r text;
  fails text := '';
  passed int := 0;
  v numeric;
  d date;
  s text;
  n int;
begin
  insert into people (email, first_name, last_name, status)
    values ('payment-link-test-1@example.invalid', 'Test', 'One', 'client') returning id into p1;

  insert into payment_links (stripe_payment_link_id, label, action, product_id) values
    ('plink_test_sale', 'TEST sale link', 'sale', v_product),
    ('plink_test_part', 'TEST retreat balance', 'part_payment', null),
    ('plink_test_review', 'TEST pay any amount', 'review', null);

  -- 1. Sale paid 23:30 UTC on 31 Jul: purchase of 75, paid in full, dated 1 Aug (London)
  r := record_payment_link_sale('cs_test_1', 'pi_test_1', 'plink_test_sale', 'payment-link-test-1@example.invalid', p1,
         'Test One', 'Participant: Someone Else', 'TEST workshop', 1, 'gbp', 75, 75, null, 0, '2026-07-31 23:30:00+00', 'webhook');
  select pu.amount_gbp, pu.purchase_date, pu.source into v, d, s
    from purchases pu join payment_link_payments x on x.purchase_id = pu.id
    where x.stripe_checkout_session_id = 'cs_test_1';
  if r = 'recorded' and v = 75 and d = '2026-08-01' and s = 'payment_link' then passed := passed + 1;
  else fails := fails || ' [1 sale: ' || r || ', ' || coalesce(v::text, 'no purchase') || ', ' || coalesce(d::text, '-') || ']'; end if;

  -- 2. Same sale again (Stripe retry or history import): nothing added
  r := record_payment_link_sale('cs_test_1', 'pi_test_1', 'plink_test_sale', 'payment-link-test-1@example.invalid', p1,
         'Test One', null, 'TEST workshop', 1, 'gbp', 75, 75, null, 0, '2026-07-31 23:30:00+00', 'import');
  select count(*) into n from purchases where person_id = p1;
  if r = 'duplicate' and n = 1 then passed := passed + 1;
  else fails := fails || ' [2 repeat: ' || r || ', purchases ' || n || ']'; end if;

  -- 3. Retreat balance link: saved, no purchase
  r := record_payment_link_sale('cs_test_2', 'pi_test_2', 'plink_test_part', 'payment-link-test-1@example.invalid', p1,
         null, null, 'TEST balance', 1, 'gbp', 500, 500, null, 0, now(), 'webhook');
  select count(*) into n from purchases where person_id = p1;
  if r = 'part_payment' and n = 1 then passed := passed + 1;
  else fails := fails || ' [3 part payment: ' || r || ', purchases ' || n || ']'; end if;

  -- 4. Unknown link: waits, and the link is added to payment_links as review
  r := record_payment_link_sale('cs_test_3', 'pi_test_3', 'plink_test_new', 'payment-link-test-1@example.invalid', p1,
         null, null, 'TEST new workshop', 2, 'gbp', 60, 60, null, 0, now(), 'webhook');
  select action into s from payment_links where stripe_payment_link_id = 'plink_test_new';
  if r = 'to_sort' and s = 'review' then passed := passed + 1;
  else fails := fails || ' [4 unknown link: ' || r || ', link ' || coalesce(s, 'not added') || ']'; end if;

  -- 5. General "pay any amount" link: waits
  r := record_payment_link_sale('cs_test_4', 'pi_test_4', 'plink_test_review', 'payment-link-test-1@example.invalid', p1,
         null, null, 'TEST payment to Terra Training', 1, 'gbp', 100, 100, null, 0, now(), 'webhook');
  if r = 'to_sort' then passed := passed + 1;
  else fails := fails || ' [5 review link: ' || r || ']'; end if;

  -- 6. Swiss francs with no pound amount: waits
  r := record_payment_link_sale('cs_test_5', 'pi_test_5', 'plink_test_sale', 'payment-link-test-1@example.invalid', p1,
         null, null, 'TEST Basel', 1, 'chf', 335, null, null, 0, now(), 'webhook');
  if r = 'to_sort' then passed := passed + 1;
  else fails := fails || ' [6 no pounds: ' || r || ']'; end if;

  -- 7. Partial refund of 26 on sale 1: purchase down to 49
  r := record_payment_link_refund('pi_test_1', 'ch_test_1', 're_test_1', 'gbp', 75, 26, now());
  select pu.amount_gbp into v from purchases pu join payment_link_payments x on x.purchase_id = pu.id
    where x.stripe_checkout_session_id = 'cs_test_1';
  if r = 'applied' and v = 49 then passed := passed + 1;
  else fails := fails || ' [7 refund: ' || r || ', ' || v || ']'; end if;

  -- 8. Same refund again: no change
  r := record_payment_link_refund('pi_test_1', 'ch_test_1', 're_test_1', 'gbp', 75, 26, now());
  select pu.amount_gbp into v from purchases pu join payment_link_payments x on x.purchase_id = pu.id
    where x.stripe_checkout_session_id = 'cs_test_1';
  if r = 'duplicate' and v = 49 then passed := passed + 1;
  else fails := fails || ' [8 repeat refund: ' || r || ', ' || v || ']'; end if;

  -- 9. Refund for a payment the CRM does not know: kept as unmatched
  r := record_payment_link_refund('pi_test_99', null, 're_test_99', 'gbp', 40, 40, now());
  if r = 'unmatched' then passed := passed + 1;
  else fails := fails || ' [9 unknown refund: ' || r || ']'; end if;

  -- 10. Refund on a retreat balance: nothing changes
  r := record_payment_link_refund('pi_test_2', null, 're_test_2', 'gbp', 500, 500, now());
  if r = 'not_counted' then passed := passed + 1;
  else fails := fails || ' [10 refund on part payment: ' || r || ']'; end if;

  -- 11. Refund arrives before the review sale is sorted: waits
  r := record_payment_link_refund('pi_test_4', null, 're_test_4', 'gbp', 100, 100, now());
  if r = 'waiting' then passed := passed + 1;
  else fails := fails || ' [11 refund before sorting: ' || r || ']'; end if;

  -- 12. Sort by hand: new link becomes a sale, francs sale given its pounds, review sale given
  --     a product. Retry records all three; the waiting full refund leaves the review sale at 0
  update payment_links set action = 'sale', product_id = v_product where stripe_payment_link_id = 'plink_test_new';
  update payment_link_payments set amount_gbp = 312.50 where stripe_checkout_session_id = 'cs_test_5';
  update payment_link_payments set sort_as = 'sale', product_id = v_product where stripe_checkout_session_id = 'cs_test_4';
  perform * from retry_payment_link_payments();
  select count(*) into n from payment_link_payments
    where stripe_checkout_session_id in ('cs_test_3', 'cs_test_4', 'cs_test_5') and status = 'recorded';
  select pu.amount_gbp into v from purchases pu join payment_link_payments x on x.purchase_id = pu.id
    where x.stripe_checkout_session_id = 'cs_test_4';
  select status into s from payment_link_refunds where stripe_payment_intent_id = 'pi_test_4';
  if n = 3 and v = 0 and s = 'applied' then passed := passed + 1;
  else fails := fails || ' [12 sort and retry: recorded ' || n || ', refunded sale ' || coalesce(v::text, '-') || ', refund ' || coalesce(s, '-') || ']'; end if;

  -- 13. Free (100% discount) sale with no payment id: recorded at 0
  r := record_payment_link_sale('cs_test_6', null, 'plink_test_sale', 'payment-link-test-1@example.invalid', p1,
         null, null, 'TEST free place', 1, 'gbp', 0, 0, 'FREE100', 75, now(), 'webhook');
  if r = 'recorded' then passed := passed + 1;
  else fails := fails || ' [13 free sale: ' || r || ']'; end if;

  -- 14. Sale with no client: waits
  r := record_payment_link_sale('cs_test_7', 'pi_test_7', 'plink_test_sale', 'nobody@example.invalid', null,
         null, null, 'TEST workshop', 1, 'gbp', 75, 75, null, 0, now(), 'webhook');
  if r = 'to_sort' then passed := passed + 1;
  else fails := fails || ' [14 no client: ' || r || ']'; end if;

  -- 15. Totals: 5 purchases for the test client (sale 1, 3 sorted, free), 1 sale to sort,
  --     1 refund unmatched
  select count(*) into n from purchases where person_id = p1;
  if n = 5
     and (select count(*) from payment_link_payments where status = 'to_sort') = 1
     and (select count(*) from payment_link_refunds where status = 'unmatched') = 1
  then passed := passed + 1;
  else fails := fails || ' [15 totals: purchases ' || n || ']'; end if;

  if fails = '' then
    raise exception 'TEST PASSED: % of 15 checks. Everything has been undone (this error is on purpose).', passed;
  else
    raise exception 'TEST FAILED: % of 15 passed. Problems:%. Everything has been undone.', passed, fails;
  end if;
end $$;

rollback;
