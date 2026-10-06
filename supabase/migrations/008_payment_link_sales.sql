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

-- Check it worked
select
  (select count(*) from information_schema.tables
     where table_schema = 'public'
       and table_name in ('payment_links', 'payment_link_payments', 'payment_link_refunds')) as tables_added_should_be_3,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('apply_payment_link_payment', 'record_payment_link_sale',
                         'record_payment_link_refund', 'retry_payment_link_payments')) as functions_added_should_be_4,
  (select count(*) from public.payment_link_payments) as payments_rows_should_be_0;
