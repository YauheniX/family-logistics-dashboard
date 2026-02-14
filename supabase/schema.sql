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
  is_planned boolean not null default false,
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

-- Packing templates
create table if not exists public.packing_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text check (category in ('adult','kid','baby','roadtrip','custom')) default 'custom',
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default now()
);

-- Packing template items
create table if not exists public.packing_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.packing_templates(id) on delete cascade,
  title text not null
);

-- Enable RLS on template tables
alter table public.packing_templates enable row level security;
alter table public.packing_template_items enable row level security;

-- Trip members (sharing)
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner','editor','viewer')) not null default 'viewer',
  created_at timestamp with time zone default now(),
  unique (trip_id, user_id)
);

alter table public.trip_members enable row level security;

-- Function to look up a user id by email (used for trip sharing invitations).
-- SECURITY DEFINER so the authenticated role can resolve emails to user ids
-- without having direct access to auth.users. Restricted to authenticated users.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  RETURN (SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1);
END;
$$;

-- Function to look up a user email by id (used for displaying trip member emails).
-- Only returns the email if the caller shares a trip with the target user.
CREATE OR REPLACE FUNCTION public.get_email_by_user_id(lookup_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  -- Only allow lookup if caller shares at least one trip with the target user
  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = auth.uid() AND tm2.user_id = lookup_user_id
  ) AND NOT EXISTS (
    -- Also allow if caller owns a trip the target is a member of
    SELECT 1 FROM public.trips t
    JOIN public.trip_members tm ON tm.trip_id = t.id
    WHERE t.created_by = auth.uid() AND tm.user_id = lookup_user_id
  ) AND NOT EXISTS (
    -- Also allow if target owns a trip the caller is a member of
    SELECT 1 FROM public.trips t
    JOIN public.trip_members tm ON tm.trip_id = t.id
    WHERE t.created_by = lookup_user_id AND tm.user_id = auth.uid()
  ) THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT email FROM auth.users WHERE id = lookup_user_id LIMIT 1);
END;
$$;

-- Storage bucket for documents (policies live in rls.sql)
do $$
begin
  perform storage.create_bucket('documents', true);
exception
  when duplicate_object then
    null;
end;
$$;
