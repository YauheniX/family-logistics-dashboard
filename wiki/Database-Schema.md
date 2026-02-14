# 🗄️ Database Schema

Complete database schema documentation for the Family Logistics Dashboard.

---

## Overview

The application uses **PostgreSQL** (via Supabase) with the following characteristics:

- UUID primary keys
- Row Level Security (RLS) enabled on all tables
- Foreign key relationships with CASCADE deletes
- Timestamp tracking
- Type-safe enums via CHECK constraints

---

## Tables

### 1. Trips

Main table for trip management.

```sql
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  status text check (status in ('planning','booked','ready','done')) default 'planning',
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default now()
);
```

**Fields:**

- `id` - Unique trip identifier
- `name` - Trip name/title
- `start_date` - Trip start date (optional)
- `end_date` - Trip end date (optional)
- `status` - Trip status (planning → booked → ready → done)
- `created_by` - User who created the trip (foreign key to auth.users)
- `created_at` - Creation timestamp

**Status Flow:**

1. `planning` - Initial state, gathering ideas
2. `booked` - Accommodations/flights booked
3. `ready` - Packed and ready to go
4. `done` - Trip completed

---

### 2. Packing Items

Items to pack for each trip.

```sql
create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  category text check (category in ('adult','kid','baby','roadtrip','custom')) default 'custom',
  is_packed boolean default false
);
```

**Fields:**

- `id` - Unique item identifier
- `trip_id` - Associated trip (CASCADE delete when trip is deleted)
- `title` - Item name/description
- `category` - Item category for organization
- `is_packed` - Whether the item is packed (for progress tracking)

**Categories:**

- `adult` - Adult-specific items
- `kid` - Children's items
- `baby` - Baby/infant items
- `roadtrip` - Road trip essentials
- `custom` - User-defined items

---

### 3. Documents

Trip-related document storage (references files in Supabase Storage).

```sql
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  created_at timestamp with time zone default now()
);
```

**Fields:**

- `id` - Unique document identifier
- `trip_id` - Associated trip (CASCADE delete)
- `title` - Document title/name
- `description` - Optional description
- `file_url` - URL to file in Supabase Storage
- `created_at` - Upload timestamp

**Use Cases:**

- Booking confirmations
- Travel insurance documents
- Tickets and reservations
- Passport/visa scans
- Itineraries

---

### 4. Budget Entries

Expense tracking for trips.

```sql
create table if not exists public.budget_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  category text not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  is_planned boolean not null default false,
  created_at timestamp with time zone default now()
);
```

**Fields:**

- `id` - Unique entry identifier
- `trip_id` - Associated trip (CASCADE delete)
- `category` - Expense category (e.g., "Accommodation", "Food", "Transport")
- `amount` - Expense amount
- `currency` - Currency code (ISO 4217)
- `is_planned` - Whether it's a planned expense or actual
- `created_at` - Entry timestamp

**Budget Categories (Examples):**

- Accommodation
- Transportation
- Food & Dining
- Activities
- Shopping
- Emergency Fund

---

### 5. Timeline Events

Trip itinerary and schedule.

```sql
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  date_time timestamp with time zone not null,
  notes text
);
```

**Fields:**

- `id` - Unique event identifier
- `trip_id` - Associated trip (CASCADE delete)
- `title` - Event title/name
- `date_time` - Scheduled date and time
- `notes` - Additional notes/details

**Event Types (Examples):**

- Flight departure/arrival
- Hotel check-in/check-out
- Restaurant reservations
- Activity bookings
- Meeting points

---

### 6. Packing Templates

Reusable packing list templates.

```sql
create table if not exists public.packing_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text check (category in ('adult','kid','baby','roadtrip','custom')) default 'custom',
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default now()
);
```

**Fields:**

- `id` - Unique template identifier
- `name` - Template name
- `category` - Template category (same as packing items)
- `created_by` - User who created the template
- `created_at` - Creation timestamp

---

### 7. Packing Template Items

Items within packing templates.

```sql
create table if not exists public.packing_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.packing_templates(id) on delete cascade,
  title text not null
);
```

**Fields:**

- `id` - Unique item identifier
- `template_id` - Associated template (CASCADE delete)
- `title` - Item name

---

### 8. Trip Members

Trip sharing and collaboration (role-based access).

```sql
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner','editor','viewer')) not null default 'viewer',
  created_at timestamp with time zone default now(),
  unique (trip_id, user_id)
);
```

**Fields:**

- `id` - Unique membership identifier
- `trip_id` - Associated trip (CASCADE delete)
- `user_id` - User being granted access (CASCADE delete)
- `role` - Access level
- `created_at` - Invitation timestamp
- **Constraint:** `unique (trip_id, user_id)` - Prevents duplicate memberships

**Roles:**

- `owner` - Full control (set automatically for trip creator)
- `editor` - Can modify trip data
- `viewer` - Read-only access

---

## Database Functions

### get_user_id_by_email

Looks up a user ID by email (used for trip sharing invitations).

```sql
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT id FROM auth.users WHERE email = lookup_email);
END;
$$;
```

**Security:**

- `SECURITY DEFINER` - Runs with elevated privileges
- Restricted to authenticated users only (via RLS)
- Allows email → user ID lookup without exposing auth.users table

---

## Row Level Security (RLS)

All tables have RLS enabled to ensure users can only access their own data or data shared with them.

### Helper Functions

#### user_has_trip_access

Checks if a user has access to a trip (owner OR member).

```sql
CREATE OR REPLACE FUNCTION public.user_has_trip_access(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = p_trip_id AND t.created_by = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = p_trip_id AND tm.user_id = p_user_id
  );
$$;
```

#### user_can_edit_trip

Checks if a user can edit a trip (owner OR editor member).

```sql
CREATE OR REPLACE FUNCTION public.user_can_edit_trip(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = p_trip_id AND t.created_by = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id AND tm.user_id = p_user_id AND tm.role = 'editor'
  );
$$;
```

### RLS Policies

#### Trips Table

**SELECT Policy** - Read own trips + trips you're a member of

```sql
CREATE POLICY trips_select_own
  ON public.trips
  FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = id AND tm.user_id = auth.uid()
    )
  );
```

**INSERT Policy** - Create trips only with yourself as creator

```sql
CREATE POLICY trips_modify_own
  ON public.trips
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);
```

**UPDATE Policy** - Update if owner or editor member

```sql
CREATE POLICY trips_update_own
  ON public.trips
  FOR UPDATE
  USING (public.user_can_edit_trip(id, auth.uid()))
  WITH CHECK (public.user_can_edit_trip(id, auth.uid()));
```

**DELETE Policy** - Delete only if owner

```sql
CREATE POLICY trips_delete_own
  ON public.trips
  FOR DELETE
  USING (auth.uid() = created_by);
```

#### Child Tables (Packing Items, Documents, Budget, Timeline)

All child tables follow the same pattern:

**SELECT** - Access if you have trip access

```sql
CREATE POLICY <table>_select
  ON public.<table>
  FOR SELECT
  USING (public.user_has_trip_access(trip_id, auth.uid()));
```

**INSERT/UPDATE** - Modify if you can edit the trip

```sql
CREATE POLICY <table>_modify
  ON public.<table>
  FOR INSERT/UPDATE
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));
```

**DELETE** - Delete if you can edit the trip

```sql
CREATE POLICY <table>_delete
  ON public.<table>
  FOR DELETE
  USING (public.user_can_edit_trip(trip_id, auth.uid()));
```

#### Trip Members Table

**SELECT** - Read memberships for trips you have access to

```sql
CREATE POLICY trip_members_select
  ON public.trip_members
  FOR SELECT
  USING (public.user_has_trip_access(trip_id, auth.uid()));
```

**INSERT/DELETE** - Manage memberships only if you're the trip owner

```sql
CREATE POLICY trip_members_modify
  ON public.trip_members
  FOR INSERT/DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.created_by = auth.uid()
    )
  );
```

#### Packing Templates

**SELECT** - Read your own templates

```sql
CREATE POLICY templates_select_own
  ON public.packing_templates
  FOR SELECT
  USING (auth.uid() = created_by);
```

**INSERT/UPDATE/DELETE** - Manage your own templates

```sql
CREATE POLICY templates_modify_own
  ON public.packing_templates
  FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
```

---

## Indexes

Performance indexes are added via migration `002_architecture_refactoring.sql`:

```sql
-- Speed up trip lookups by user
CREATE INDEX IF NOT EXISTS idx_trips_created_by ON public.trips(created_by);

-- Speed up trip member lookups
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON public.trip_members(user_id);

-- Speed up packing item lookups
CREATE INDEX IF NOT EXISTS idx_packing_items_trip_id ON public.packing_items(trip_id);

-- Speed up document lookups
CREATE INDEX IF NOT EXISTS idx_documents_trip_id ON public.documents(trip_id);

-- Speed up budget entry lookups
CREATE INDEX IF NOT EXISTS idx_budget_entries_trip_id ON public.budget_entries(trip_id);

-- Speed up timeline event lookups
CREATE INDEX IF NOT EXISTS idx_timeline_events_trip_id ON public.timeline_events(trip_id);
```

---

## Storage Buckets

### Documents Bucket

Supabase Storage bucket for trip documents:

**Bucket Name:** `documents`

**RLS Policies:**

- Users can upload to their own folder: `{user_id}/*`
- Users can read from their own folder: `{user_id}/*`
- Documents are private by default

**Configuration:**

```javascript
// Storage path format
const path = `${userId}/${tripId}/${fileName}`;

// Upload example
await supabase.storage.from('documents').upload(path, file);
```

---

## Setup Instructions

### 1. Apply Schema

Run in Supabase SQL Editor:

```bash
supabase/schema.sql
```

### 2. Apply RLS Policies

Run in Supabase SQL Editor:

```bash
supabase/rls.sql
```

### 3. Apply Migrations

Run in Supabase SQL Editor:

```bash
supabase/migrations/002_architecture_refactoring.sql
```

### 4. Verify

Check that:

- ✅ All tables exist
- ✅ RLS is enabled on all tables
- ✅ Policies are created
- ✅ Indexes are created
- ✅ Functions exist

---

## Database Type Safety

The app uses **auto-generated TypeScript types** from the Supabase schema.

### Generate Types

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/features/shared/infrastructure/database.types.ts
```

### Usage

```typescript
import type { Database } from '@/features/shared/infrastructure/database.types';

// Typed Supabase client
const supabase = createClient<Database>(url, key);

// Type-safe queries
const { data } = await supabase.from('trips').select('*');
// data is typed as Database['public']['Tables']['trips']['Row'][]
```

---

## Entity-Relationship Diagram

```
┌──────────────┐
│  auth.users  │
│  (Supabase)  │
└──────┬───────┘
       │
       │ created_by
       ▼
┌─────────────────┐
│     trips       │◄──────────────┐
│─────────────────│               │
│ id (PK)         │               │
│ name            │               │
│ start_date      │               │
│ end_date        │               │
│ status          │               │
│ created_by (FK) │               │
└────────┬────────┘               │
         │                        │
         │ trip_id                │
         ▼                        │
┌─────────────────────┐           │
│  packing_items      │           │
│  documents          │           │
│  budget_entries     │           │ trip_id
│  timeline_events    │           │
└─────────────────────┘           │
                                  │
┌─────────────────────┐           │
│   trip_members      │───────────┘
│─────────────────────│
│ id (PK)             │
│ trip_id (FK)        │
│ user_id (FK)        │
│ role                │
└─────────────────────┘

┌─────────────────────┐
│ packing_templates   │
│─────────────────────│
│ id (PK)             │
│ name                │
│ category            │
│ created_by (FK)     │
└──────────┬──────────┘
           │
           │ template_id
           ▼
┌──────────────────────────┐
│ packing_template_items   │
└──────────────────────────┘
```

---

## Next Steps

- [Authentication Setup](Authentication.md) - Configure user auth
- [Features Guide](Features.md) - How features use the database
- [Testing](Testing.md) - Database mocking in tests
