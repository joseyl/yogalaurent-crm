-- TABLES

create table people (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  alt_email text,
  first_name text,
  last_name text,
  phone text,
  country text,
  status text not null default 'client' check (status in ('client','lead','inactive','deceased')),
  assigned_to text not null default 'Jose' check (assigned_to in ('Jose','Laurent')),
  source_channel text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('classes','training','retreat','workshop','private','other')),
  created_at timestamptz default now()
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  product_id uuid not null references products(id),
  amount_gbp numeric(10,2) not null default 0,
  purchase_date date not null,
  notes text,
  created_at timestamptz default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  class_name text not null,
  class_date date not null,
  pass_used text,
  created_at timestamptz default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  product_id uuid references products(id),
  status text not null default 'new' check (status in ('new','contacted','quoted','converted','dead')),
  assigned_to text not null default 'Jose' check (assigned_to in ('Jose','Laurent')),
  date_added date not null default current_date,
  last_followup_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES

create index on purchases(person_id);
create index on purchases(product_id);
create index on attendance(person_id);
create index on attendance(class_date);
create index on leads(person_id);
create index on leads(status);
create index on leads(assigned_to);
create index on people(status);
create index on people(assigned_to);

-- TRIGGERS

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger people_updated_at
  before update on people
  for each row execute function update_updated_at();

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- SEED: PRODUCT CATALOGUE

insert into products (name, category) values
('Online Yoga Class', 'classes'),
('Online Breathwork Class', 'classes'),
('Online Specialist Class', 'classes'),
('Free Class or Event', 'classes'),
('5 Class Pass', 'classes'),
('6 Class Pass', 'classes'),
('10 Class Pass', 'classes'),
('12 Class Pass', 'classes'),
('Unlimited Pass', 'classes'),
('Introductory Offer', 'classes'),
('Private Class Pack', 'private'),
('Breathwork Professional Training - 60hr', 'training'),
('Breathwork Professional Training - 40hr', 'training'),
('Breathwork Professional Training - 100hr Bundle', 'training'),
('Breathwork Professional Training - Session Pack', 'training'),
('Yoga Nidra Teacher Training', 'training'),
('One Day Workshop', 'workshop'),
('One Day Immersive Retreat', 'workshop'),
('One Day Immersive Retreat - Clapham 2026', 'workshop'),
('Two-Day Immersive Retreat - Basel 2026', 'workshop'),
('Retreat', 'retreat'),
('Corporate', 'other');
