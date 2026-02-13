-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Trips table
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  status text check (status in ('planning','booked','ready','done')) default 'planning',
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default now()
);

-- Packing items
create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  category text check (category in ('adult','kid','baby','roadtrip','custom')) default 'custom',
  is_packed boolean default false
);

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  created_at timestamp with time zone default now()
);

-- Budget entries
create table if not exists public.budget_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  category text not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  created_at timestamp with time zone default now()
);

-- Timeline events
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  date_time timestamp with time zone not null,
  notes text
);

-- Enable RLS
alter table public.trips enable row level security;
alter table public.packing_items enable row level security;
alter table public.documents enable row level security;
alter table public.budget_entries enable row level security;
alter table public.timeline_events enable row level security;

-- RLS policies: trips
create policy if not exists "Users can manage their trips"
  on public.trips
  for all
  using (auth.uid() = created_by);

-- RLS policies: child tables (inherit trip ownership)
create policy if not exists "Trip owners manage packing"
  on public.packing_items
  for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.created_by = auth.uid()));

create policy if not exists "Trip owners manage documents"
  on public.documents
  for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.created_by = auth.uid()));

create policy if not exists "Trip owners manage budgets"
  on public.budget_entries
  for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.created_by = auth.uid()));

create policy if not exists "Trip owners manage timeline"
  on public.timeline_events
  for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.created_by = auth.uid()));

-- Storage bucket for documents
select storage.create_bucket('documents', true);

-- Storage policies: allow authenticated users CRUD within their folder
create policy if not exists "Users can upload their files"
  on storage.objects
  for insert
  with check ((bucket_id = 'documents') and (auth.uid() = (owner))); -- owner automatically set to auth.uid()

create policy if not exists "Users can read their files"
  on storage.objects
  for select
  using ((bucket_id = 'documents') and (auth.uid() = owner));

create policy if not exists "Users can delete their files"
  on storage.objects
  for delete
  using ((bucket_id = 'documents') and (auth.uid() = owner));
