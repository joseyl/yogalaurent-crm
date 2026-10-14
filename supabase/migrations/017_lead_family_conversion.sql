-- 017: leads convert on any booking in the same product family, and a
-- lead-only "Breathwork Professional Training" product for brochure leads.
--
-- ALREADY APPLIED by hand in the Supabase SQL Editor on 13 Oct 2026.
-- This file is the record. Running it again is harmless (the insert is
-- skipped if the product exists; the function is replaced with itself).
--
-- What changed:
--   1. New product "Breathwork Professional Training" (lead-only, never used
--      for purchases). Live id: 07580454-95a7-4c24-8624-2e3dddde3204.
--      Same family (base_name), category and entity as the 60hr product.
--   2. convert_lead_on_purchase (from 006) now also converts open leads whose
--      product is in the same family (products.base_name) as the product
--      bought. Before, only the exact same product converted a lead.
--      So a 60hr, 40hr, 100hr Bundle or 60hr (Live) booking closes an open
--      "Breathwork Professional Training" lead, and any Yoga Nidra booking
--      closes a Yoga Nidra lead. Products with no base_name only match exactly.
--      Tested 13 Oct 2026 in a self-undoing block on the live database
--      (40hr booking converted the Breathwork lead, left a Yoga Nidra lead open).
--
-- The trigger purchases_convert_lead (from 006) is unchanged.
-- Lead data moves done the same day (guarded scripts, not part of this file):
-- see BUILD_LOG.md, 13 Oct 2026.
--
-- To go back to the exact-product rule: run the function from
-- 006_convert_lead_on_purchase.sql again.

insert into products (name, base_name, category, entity)
select 'Breathwork Professional Training', base_name, category, entity
from products
where id = 'ff398371-e528-468c-b5a0-4301007d1a94'
  and not exists (
    select 1 from products where name = 'Breathwork Professional Training'
  );

create or replace function public.convert_lead_on_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  begin
    update people
    set status = 'client', updated_at = now()
    where id = new.person_id and status = 'lead';

    update leads l
    set status = 'converted', updated_at = now()
    where l.person_id = new.person_id
      and l.status not in ('converted', 'dead')
      and l.date_added <= new.purchase_date
      and (
        l.product_id = new.product_id
        or exists (
          select 1
          from products lp
          join products pp on pp.id = new.product_id
          where lp.id = l.product_id
            and lp.base_name is not null
            and lp.base_name = pp.base_name
        )
      );
  exception when others then
    raise warning 'convert_lead_on_purchase failed for purchase %: %', new.id, sqlerrm;
  end;
  return new;
end;
$fn$;

revoke all on function public.convert_lead_on_purchase() from public, anon, authenticated;
