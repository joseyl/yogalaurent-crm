-- 006: when a purchase is added, convert the buyer from lead to client and
-- close any open lead entry for that exact product.
-- Run by hand in the Supabase SQL Editor. Applies to every new purchase,
-- whatever wrote it (Momence webhooks, training webhook, Make, hand SQL).
--
-- Rules:
--   people: status 'lead' becomes 'client'. Inactive and deceased are never touched.
--   leads:  open entries (not converted or dead) for the same person and the
--           exact same product, added on or before the purchase date, become 'converted'.
--           Buying a different product (even in the same category) leaves the lead open.
--
-- Safety: any error inside is turned into a warning, so the purchase itself is
-- always saved. Worst case, a lead is not converted and can be fixed by hand.
--
-- To remove:
--   drop trigger if exists purchases_convert_lead on public.purchases;
--   drop function if exists public.convert_lead_on_purchase();

create or replace function public.convert_lead_on_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    update people
    set status = 'client', updated_at = now()
    where id = new.person_id and status = 'lead';

    update leads
    set status = 'converted', updated_at = now()
    where person_id = new.person_id
      and product_id = new.product_id
      and status not in ('converted', 'dead')
      and date_added <= new.purchase_date;
  exception when others then
    raise warning 'convert_lead_on_purchase failed for purchase %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.convert_lead_on_purchase() from public, anon, authenticated;

drop trigger if exists purchases_convert_lead on public.purchases;
create trigger purchases_convert_lead
after insert on public.purchases
for each row execute function public.convert_lead_on_purchase();
