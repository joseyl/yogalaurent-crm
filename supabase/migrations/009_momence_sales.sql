-- 009_momence_sales.sql
-- Momence sales from the Momence Total Sales report (API), replacing Zapier.
-- Run by hand in the Supabase SQL Editor. Run supabase/tests/009_momence_sales_test.sql
-- first: it runs all of this plus checks, then undoes everything.
--
-- What it adds:
--   momence_import_settings  one row: mode (off, record_only, live), start date, and the
--                            products used for classes, whole series and private sessions
--   momence_items            Momence item (category and name) to CRM product: sale with a
--                            product, not_sale, or to_sort (waits on the dashboard)
--   momence_sales            one row per Momence sale line, unique by sale_key (saleItemId,
--                            else the payment id), so a line can never be counted twice
--   momence_sales_runs       one row per import run (nightly or Refresh now)
--   people.momence_member_id the person's Momence member number, saved when first matched
--   products                 10 Class Pass - Autorenew, Online Series, Class Credit Top-up
--   record_momence_sale()    check and save one line in one locked step
--   apply_momence_sale()     turns one saved line into a purchase, or explains why not
--   retry_momence_sales()    re-tries every line not yet recorded, e.g. after mapping an
--                            item or switching the mode to live
--
-- Rules:
--   Money = sale value minus the part paid in Momence credits. A line with no money (paid
--   in credits, for example a private session from a pack) never becomes a purchase.
--   Item table first. Then: events are Drop-in Class, or Online Series when the whole
--   series was bought; private sessions paid in money are Private 1-2-1 Session. Anything
--   else new is added to momence_items as to_sort and waits.
--   mode off: nothing happens. record_only: lines are saved and marked with what they would
--   do (preview), no purchases. live: purchases from start_date (London payment date) on;
--   earlier lines are saved as before_start and never become purchases.
--   Purchase: London payment date, money amount, paid in full, source momence.
--   Refunds: the import has never seen one (no refunds in the 12 months to 8 Oct 2026), so a
--   refund is saved and listed on the dashboard to check by hand, never applied on its own.
--
-- To remove:
--   drop function if exists public.retry_momence_sales();
--   drop function if exists public.record_momence_sale(jsonb);
--   drop function if exists public.apply_momence_sale(uuid);
--   drop table if exists public.momence_sales_runs;
--   drop table if exists public.momence_sales;
--   drop table if exists public.momence_items;
--   drop table if exists public.momence_import_settings;
--   alter table public.people drop column if exists momence_member_id;
--   (the three new products stay; archive them by hand if not wanted)

-- New products (skipped if a product of that name already exists)
insert into public.products (name, category, base_name, entity)
values
  ('10 Class Pass - Autorenew', 'classes', 'Class Passes', 'Laurent Roure'),
  ('Online Series', 'classes', 'Online Series', 'Laurent Roure'),
  ('Class Credit Top-up', 'classes', 'Class Credit', 'Laurent Roure')
on conflict (name) do nothing;

alter table public.people add column if not exists momence_member_id bigint;
create index if not exists people_momence_member_id_idx on public.people (momence_member_id);

create table if not exists public.momence_import_settings (
  id int primary key default 1 check (id = 1),
  mode text not null default 'off' check (mode in ('off', 'record_only', 'live')),
  start_date date,
  dropin_product_id uuid references public.products(id),
  series_product_id uuid references public.products(id),
  private_session_product_id uuid references public.products(id),
  updated_at timestamptz not null default now(),
  constraint momence_import_live_needs_start check (mode <> 'live' or start_date is not null)
);

insert into public.momence_import_settings (id, mode, dropin_product_id, series_product_id, private_session_product_id)
values (
  1, 'off',
  (select id from public.products where name = 'Drop-in Class'),
  (select id from public.products where name = 'Online Series'),
  (select id from public.products where name = 'Private 1-2-1 Session')
)
on conflict (id) do nothing;

create table if not exists public.momence_items (
  category text not null,
  item text not null,
  action text not null default 'to_sort' check (action in ('sale', 'not_sale', 'to_sort')),
  product_id uuid references public.products(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category, item),
  constraint momence_items_sale_needs_product check (action <> 'sale' or product_id is not null)
);

insert into public.momence_items (category, item, action, product_id)
select v.category, v.item, 'sale', p.id
from (values
  ('membership', '10 Class Pass', '10 Class Pass'),
  ('membership', '10 Class Pass - Autorenew', '10 Class Pass - Autorenew'),
  ('membership', '5 Class Pass', '5 Class Pass'),
  ('membership', 'Introductory Offer', 'Introductory Offer'),
  ('membership', 'Standard Unlimited Pass - Regular Online Classes', 'Unlimited Pass'),
  ('membership', '3 Private Online Sessions', 'Private Class Pack'),
  ('membership', '10 Online Private Classes', 'Private Class Pack'),
  ('membership', 'money-credit', 'Class Credit Top-up')
) as v(category, item, product_name)
join public.products p on p.name = v.product_name
on conflict (category, item) do nothing;

create table if not exists public.momence_sales (
  id uuid primary key default gen_random_uuid(),
  sale_key text not null,
  sale_item_id bigint,
  payment_transaction_id bigint,
  category text not null,
  item text not null,
  event_type text,
  payment_date timestamptz not null,
  service_date timestamptz,
  value_gbp numeric(10,2) not null default 0,
  credits_gbp numeric(10,2) not null default 0,
  money_gbp numeric(10,2) not null default 0,
  refunded_gbp numeric(10,2) not null default 0,
  payment_method text,
  member_id bigint,
  paying_member_id bigint,
  email text,
  customer_email text,
  person_id uuid references public.people(id) on delete set null,
  session_booking_id bigint,
  bought_membership_id bigint,
  appointment_reservation_id bigint,
  status text not null default 'new'
    check (status in ('new', 'preview', 'recorded', 'no_money', 'before_start', 'not_sale', 'to_sort')),
  product_id uuid references public.products(id),
  purchase_id uuid references public.purchases(id) on delete set null,
  refund_seen_at timestamptz,
  missing_since timestamptz,
  checked_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists momence_sales_sale_key on public.momence_sales (sale_key);
create index if not exists momence_sales_payment_date_idx on public.momence_sales (payment_date);
create index if not exists momence_sales_status_idx on public.momence_sales (status);

create table if not exists public.momence_sales_runs (
  id bigint generated always as identity primary key,
  trigger text not null check (trigger in ('cron', 'manual')),
  status text not null default 'running' check (status in ('running', 'success', 'failed', 'skipped')),
  mode text,
  date_from date,
  date_to date,
  lines_read int,
  new_lines int,
  recorded int,
  to_sort int,
  refunds_seen int,
  missing int,
  people_created int,
  private_sessions int,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.momence_import_settings enable row level security;
alter table public.momence_items enable row level security;
alter table public.momence_sales enable row level security;
alter table public.momence_sales_runs enable row level security;
revoke all on public.momence_import_settings from public, anon, authenticated;
revoke all on public.momence_items from public, anon, authenticated;
revoke all on public.momence_sales from public, anon, authenticated;
revoke all on public.momence_sales_runs from public, anon, authenticated;
grant select, insert, update, delete on public.momence_import_settings to service_role;
grant select, insert, update, delete on public.momence_items to service_role;
grant select, insert, update, delete on public.momence_sales to service_role;
grant select, insert, update, delete on public.momence_sales_runs to service_role;

-- Turns one saved line into a purchase, or saves why not.
create or replace function public.apply_momence_sale(p_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  s momence_sales%rowtype;
  cfg momence_import_settings%rowtype;
  it momence_items%rowtype;
  v_action text;
  v_product uuid;
  v_date date;
  v_kept numeric(10,2);
  v_purchase uuid;
  v_notes text;
begin
  select * into s from momence_sales where id = p_id for update;
  if not found then return 'not_found'; end if;
  if s.status in ('recorded', 'no_money', 'before_start') then return 'already_' || s.status; end if;

  select * into cfg from momence_import_settings where id = 1;
  if not found or cfg.mode = 'off' then return 'off'; end if;

  v_date := (s.payment_date at time zone 'Europe/London')::date;

  if s.money_gbp <= 0 then
    update momence_sales
      set status = 'no_money', product_id = null,
          note = case when s.credits_gbp > 0 then 'Paid in Momence credits: not counted as money.'
                      else 'No money taken.' end,
          updated_at = now()
      where id = s.id;
    return 'no_money';
  end if;

  select * into it from momence_items where category = s.category and item = s.item;
  if found then
    v_action := it.action;
    v_product := it.product_id;
  elsif s.category = 'event' then
    v_action := 'sale';
    v_product := case when s.event_type = 'course' then cfg.series_product_id else cfg.dropin_product_id end;
  elsif s.category = 'appointment' then
    v_action := 'sale';
    v_product := cfg.private_session_product_id;
  else
    insert into momence_items (category, item, action) values (s.category, s.item, 'to_sort')
      on conflict (category, item) do nothing;
    v_action := 'to_sort';
  end if;

  if v_action = 'sale' and v_product is null then v_action := 'to_sort'; end if;

  if v_action = 'not_sale' then
    update momence_sales
      set status = 'not_sale', product_id = null, note = 'Item marked not a sale in momence_items.', updated_at = now()
      where id = s.id;
    return 'not_sale';
  end if;

  if v_action = 'to_sort' then
    update momence_sales
      set status = 'to_sort', product_id = null,
          note = 'New Momence item: choose a CRM product for it in momence_items, then retry.', updated_at = now()
      where id = s.id;
    return 'to_sort';
  end if;

  if s.person_id is null then
    update momence_sales
      set status = 'to_sort', product_id = v_product, note = 'No client found or created for this payer.', updated_at = now()
      where id = s.id;
    return 'to_sort';
  end if;

  if cfg.mode = 'record_only' then
    update momence_sales set status = 'preview', product_id = v_product, note = null, updated_at = now()
      where id = s.id;
    return 'preview';
  end if;

  if v_date < cfg.start_date then
    update momence_sales
      set status = 'before_start', product_id = v_product,
          note = 'Paid before the import start date ' || to_char(cfg.start_date, 'DD Mon YYYY') || ': not imported.',
          updated_at = now()
      where id = s.id;
    return 'before_start';
  end if;

  v_kept := s.money_gbp;
  v_notes := concat_ws('. ',
    s.item,
    case when s.category = 'event' and s.service_date is not null
         then 'Class date ' || to_char((s.service_date at time zone 'Europe/London')::date, 'YYYY-MM-DD') end,
    case when s.category = 'appointment' and s.service_date is not null
         then 'Session date ' || to_char((s.service_date at time zone 'Europe/London')::date, 'YYYY-MM-DD') end,
    case when s.credits_gbp > 0 then 'Part paid in Momence credits: ' || s.credits_gbp end,
    'Momence sale ' || coalesce(s.sale_item_id::text, s.sale_key)
  );

  insert into purchases (person_id, product_id, amount_gbp, amount_paid_gbp, payment_option,
                         purchase_date, source, notes)
    values (s.person_id, v_product, v_kept, v_kept, 'full', v_date, 'momence', v_notes)
    returning id into v_purchase;

  update momence_sales
    set status = 'recorded', product_id = v_product, purchase_id = v_purchase, note = null, updated_at = now()
    where id = s.id;

  return 'recorded';
end;
$$;

-- Saves one line from the report in one locked step. A line seen before is only updated:
-- last seen, person (if found later), refund (saved and flagged, never applied).
create or replace function public.record_momence_sale(p jsonb)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  s momence_sales%rowtype;
  v_id uuid;
  v_value numeric(10,2);
  v_credits numeric(10,2);
  v_refunded numeric(10,2);
  v_person uuid;
begin
  perform pg_advisory_xact_lock(hashtext('momence_sale'));

  if coalesce(p->>'sale_key', '') = '' or coalesce(p->>'payment_date', '') = '' then
    return 'invalid';
  end if;

  v_value := coalesce(nullif(p->>'value', '')::numeric, 0);
  v_credits := least(coalesce(nullif(p->>'credits', '')::numeric, 0), v_value);
  v_refunded := coalesce(nullif(p->>'refunded', '')::numeric, 0);
  v_person := nullif(p->>'person_id', '')::uuid;

  select * into s from momence_sales where sale_key = p->>'sale_key' for update;

  if found then
    update momence_sales
      set last_seen_at = now(),
          missing_since = null,
          person_id = coalesce(person_id, v_person),
          updated_at = now()
      where id = s.id;

    if v_refunded > s.refunded_gbp then
      update momence_sales
        set refunded_gbp = v_refunded, refund_seen_at = now(), checked_at = null,
            note = concat_ws('. ', nullif(note, ''), 'Momence shows a refund of ' || v_refunded || ': check the purchase by hand'),
            updated_at = now()
        where id = s.id;
      return 'refund_seen';
    end if;

    -- Not recorded yet: try again (mode may now be live, the item mapped, or the payer found)
    if s.status in ('new', 'preview', 'to_sort') then
      return apply_momence_sale(s.id);
    end if;

    return 'seen';
  end if;

  insert into momence_sales (
    sale_key, sale_item_id, payment_transaction_id, category, item, event_type,
    payment_date, service_date, value_gbp, credits_gbp, money_gbp, refunded_gbp,
    payment_method, member_id, paying_member_id, email, customer_email, person_id,
    session_booking_id, bought_membership_id, appointment_reservation_id,
    refund_seen_at, note
  ) values (
    p->>'sale_key', nullif(p->>'sale_item_id', '')::bigint, nullif(p->>'payment_transaction_id', '')::bigint,
    coalesce(nullif(p->>'category', ''), '?'), coalesce(nullif(p->>'item', ''), '?'), nullif(p->>'event_type', ''),
    (p->>'payment_date')::timestamptz, nullif(p->>'service_date', '')::timestamptz,
    v_value, v_credits, greatest(v_value - v_credits, 0), v_refunded,
    nullif(p->>'payment_method', ''), nullif(p->>'member_id', '')::bigint, nullif(p->>'paying_member_id', '')::bigint,
    nullif(lower(p->>'email'), ''), nullif(lower(p->>'customer_email'), ''), v_person,
    nullif(p->>'session_booking_id', '')::bigint, nullif(p->>'bought_membership_id', '')::bigint,
    nullif(p->>'appointment_reservation_id', '')::bigint,
    case when v_refunded > 0 then now() end,
    case when v_refunded > 0 then 'Momence shows a refund of ' || v_refunded || ': check the purchase by hand' end
  )
  returning id into v_id;

  return apply_momence_sale(v_id);
end;
$$;

create or replace function public.retry_momence_sales()
returns table (sale_id uuid, result text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  x record;
begin
  perform pg_advisory_xact_lock(hashtext('momence_sale'));
  for x in
    select id from momence_sales
    where status in ('new', 'preview', 'to_sort', 'not_sale')
    order by payment_date, created_at
  loop
    sale_id := x.id;
    result := apply_momence_sale(x.id);
    return next;
  end loop;
end;
$$;

revoke all on function public.apply_momence_sale(uuid) from public, anon, authenticated;
revoke all on function public.record_momence_sale(jsonb) from public, anon, authenticated;
revoke all on function public.retry_momence_sales() from public, anon, authenticated;
grant execute on function public.apply_momence_sale(uuid) to service_role;
grant execute on function public.record_momence_sale(jsonb) to service_role;
grant execute on function public.retry_momence_sales() to service_role;

-- Check it worked
select
  (select count(*) from information_schema.tables
     where table_schema = 'public'
       and table_name in ('momence_import_settings', 'momence_items', 'momence_sales', 'momence_sales_runs')) as tables_added_should_be_4,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('apply_momence_sale', 'record_momence_sale', 'retry_momence_sales')) as functions_added_should_be_3,
  (select count(*) from public.products
     where name in ('10 Class Pass - Autorenew', 'Online Series', 'Class Credit Top-up')) as new_products_should_be_3,
  (select count(*) from public.momence_items where action = 'sale') as items_mapped_should_be_8,
  (select count(*) from public.momence_import_settings
     where mode = 'off' and dropin_product_id is not null and series_product_id is not null
       and private_session_product_id is not null) as settings_ready_should_be_1;
