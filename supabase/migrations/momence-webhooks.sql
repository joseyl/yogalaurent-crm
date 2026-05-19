-- Add expiry fields to purchases
alter table purchases add column if not exists expires_at date;
alter table purchases add column if not exists expiry_alert_dismissed boolean not null default false;

-- Webhook log table
create table if not exists webhook_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null check (status in ('success', 'failed', 'skipped')),
  person_id uuid references people(id),
  error_message text,
  created_at timestamptz default now()
);

create index on webhook_log(source);
create index on webhook_log(status);
create index on webhook_log(created_at);
