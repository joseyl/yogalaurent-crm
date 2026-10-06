-- Records one paid Momence class booking as a purchase, safely.
-- Run once in the Supabase SQL Editor before deploying the class booking webhook change.
--
-- Why a database function: when a client books a Momence course, Momence sends one
-- message for the course and one per session, all within about a second, each carrying
-- the full course price. Checking and writing in two separate steps let several through.
-- Here the check and the write happen together while holding a lock for that client.
--
-- Returns:
--   'created'    a new purchase row was written
--   'duplicate'  this exact booking was already recorded (a retry)
--   'same_order' another paid booking for this client at the same amount was recorded
--                in the last 15 seconds, so this message is part of the same checkout

create or replace function public.record_momence_class_payment(
  p_person_id uuid,
  p_product_id uuid,
  p_amount numeric,
  p_purchase_date date,
  p_notes text
) returns text
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('momence_class_payment:' || p_person_id::text));

  if exists (
    select 1 from purchases
    where person_id = p_person_id
      and product_id = p_product_id
      and notes = p_notes
  ) then
    return 'duplicate';
  end if;

  if exists (
    select 1 from purchases
    where person_id = p_person_id
      and product_id = p_product_id
      and amount_gbp = p_amount
      and notes like 'Drop-in payment via Momence webhook%'
      and created_at >= clock_timestamp() - interval '15 seconds'
  ) then
    return 'same_order';
  end if;

  insert into purchases (person_id, product_id, amount_gbp, purchase_date, notes, source)
  values (p_person_id, p_product_id, p_amount, p_purchase_date, p_notes, 'momence');

  return 'created';
end;
$$;

-- Only the server (service role) may call it. The browser key may not.
revoke all on function public.record_momence_class_payment(uuid, uuid, numeric, date, text) from public, anon, authenticated;
grant execute on function public.record_momence_class_payment(uuid, uuid, numeric, date, text) to service_role;
