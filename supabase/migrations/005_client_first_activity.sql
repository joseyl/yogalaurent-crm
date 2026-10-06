-- One "became client" date per client, for the dashboard's New Clients line.
-- Run once in the Supabase SQL Editor (done 6 Oct 2026).
--
-- people.created_at is the date a person was loaded into the CRM, so the May 2026
-- import put almost every client in May. This dates each client by their first
-- purchase, failing that their first class attended (attendance_v2, then the old
-- attendance table), failing that the load date. Nothing is stored; it is worked
-- out each time it is read. Only the server (service role) can read it.

create or replace view public.client_first_activity
with (security_invoker = true) as
select
  p.id as person_id,
  coalesce(fp.d, least(a2.d, a1.d), p.created_at::date) as became_client,
  case
    when fp.d is not null then 'first purchase'
    when coalesce(a2.d, a1.d) is not null then 'first class'
    else 'load date only'
  end as dated_by
from people p
left join (
  select person_id, min(purchase_date) as d from purchases group by person_id
) fp on fp.person_id = p.id
left join (
  select person_id, min(class_date) as d from attendance_v2
  where cancelled = false and duplicate_of_momence = false and person_id is not null
  group by person_id
) a2 on a2.person_id = p.id
left join (
  select person_id, min(class_date) as d from attendance group by person_id
) a1 on a1.person_id = p.id
where p.status = 'client';

revoke all on public.client_first_activity from public, anon, authenticated;
grant select on public.client_first_activity to service_role;
