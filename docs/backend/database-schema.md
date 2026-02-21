# 🗄️ Database Schema

Complete database schema documentation for the Family Logistics Dashboard.

**Last Updated**: February 21, 2026  
**Database**: PostgreSQL (via Supabase)  
**Schema Version**: Current (families-based, migrating to households)

---

## Overview

The application uses **PostgreSQL** via Supabase with:

- ✅ UUID primary keys
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Foreign key relationships with CASCADE deletes
- ✅ Timestamp tracking (created_at, updated_at)
- ✅ Type-safe enums via CHECK constraints
- ✅ Audit trail support

**Schema File**: [`supabase/schema.sql`](../../supabase/schema.sql)

---

## Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth - managed)
│  ────────────   │
│  id (PK)        │
│  email          │
└────────┬────────┘
         │ 1:1
         ▼
┌─────────────────┐
│ user_profiles   │
│  ────────────   │
│  id (PK, FK)    │
│  display_name   │
│  avatar_url     │
│  created_at     │
└─────────────────┘


┌──────────────────────┐         ┌─────────────────────┐
│    families          │◄────────│  family_members     │
│  ─────────────────   │  1:N    │  ────────────────   │
│  id (PK)             │         │  id (PK)            │
│  name                │         │  family_id (FK)     │
│  created_by (FK)     │         │  user_id (FK)       │
│  created_at          │         │  role               │
└──────────┬───────────┘         │  joined_at          │
           │                     └─────────────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────┐
│  shopping_lists      │
│  ─────────────────   │
│  id (PK)             │
│  family_id (FK)      │
│  title               │
│  description         │
│  created_by (FK)     │
│  created_at          │
│  status              │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐
│  shopping_items      │
│  ─────────────────   │
│  id (PK)             │
│  list_id (FK)        │
│  title               │
│  quantity            │
│  category            │
│  is_purchased        │
│  added_by (FK)       │
│  purchased_by (FK)   │
│  created_at          │
└──────────────────────┘


┌──────────────────────┐
│     wishlists        │
│  ─────────────────   │
│  id (PK)             │
│  user_id (FK)        │
│  title               │
│  description         │
│  is_public           │
│  share_slug (unique) │
│  created_at          │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐
│  wishlist_items      │
│  ─────────────────   │
│  id (PK)             │
│  wishlist_id (FK)    │
│  title               │
│  description         │
│  link                │
│  price               │
│  currency            │
│  image_url           │
│  priority            │
│  is_reserved         │
│  reserved_by_email   │
│  created_at          │
└──────────────────────┘
```

---

## Tables

### 1. user_profiles

Extended user profile information linked to Supabase Auth.

```sql
create table if not exists user_profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
```

**Purpose**: Stores additional user information beyond what Supabase Auth provides.

**Key Points**:

- `id` matches `auth.users.id` (1:1 relationship)
- Auto-created via trigger when user signs up
- Display name extracted from OAuth provider or email

**Relationships**:

- `id` → `auth.users.id` (1:1)

---

### 2. families

Family groups that contain members and shopping lists.

```sql
create table if not exists families (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_by  uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now()
);
```

**Purpose**: Top-level organizational unit for grouping family members.

**Key Points**:

- Creator becomes owner automatically
- Deleting a family cascades to members and shopping lists

**Relationships**:

- `created_by` → `auth.users.id` (N:1)
- Has many `family_members`
- Has many `shopping_lists`

**Status**: 🔄 Being migrated to `households` table (see [Migration Guide](../migration/families-to-households.md))

---

### 3. family_members

Members of a family with role-based access.

```sql
create table if not exists family_members (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  unique (family_id, user_id)
);
```

**Purpose**: Maps users to families with roles.

**Roles**:

- `owner` - Full control, cannot be removed
- `member` - Can create/edit content

**Key Points**:

- One user can belong to multiple families
- One user can only have one role per family (unique constraint)
- `user_id` is required (cannot add members without accounts)

**Relationships**:

- `family_id` → `families.id` (N:1, CASCADE)
- `user_id` → `auth.users.id` (N:1, CASCADE)

**Status**: 🔄 Being replaced by `members` table with nullable `user_id`

---

### 4. shopping_lists

Shared shopping lists within a family.

```sql
create table if not exists shopping_lists (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families on delete cascade,
  title       text not null,
  description text,
  created_by  uuid not null default auth.uid() references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  status      text not null default 'active' check (status in ('active', 'archived'))
);
```

**Purpose**: Shared shopping lists for family collaboration.

**Status Values**:

- `active` - List is in use
- `archived` - List is completed/archived

**Key Points**:

- Tied to a family (all members can view)
- Creator tracked via `created_by`
- Can be archived but not deleted (soft delete)

**Relationships**:

- `family_id` → `families.id` (N:1, CASCADE)
- `created_by` → `auth.users.id` (N:1, CASCADE)
- Has many `shopping_items`

---

### 5. shopping_items

Items in a shopping list.

```sql
create table if not exists shopping_items (
  id            uuid primary key default uuid_generate_v4(),
  list_id       uuid not null references shopping_lists on delete cascade,
  title         text not null,
  quantity      integer not null default 1,
  category      text not null default 'General',
  is_purchased  boolean not null default false,
  added_by      uuid not null default auth.uid() references auth.users on delete cascade,
  purchased_by  uuid references auth.users on delete set null,
  created_at    timestamptz not null default now()
);
```

**Purpose**: Individual items in shopping lists with purchase tracking.

**Key Points**:

- Tracks who added and who purchased the item
- Category for organization
- Quantity for bulk purchases
- `purchased_by` is nullable (not purchased yet)

**Relationships**:

- `list_id` → `shopping_lists.id` (N:1, CASCADE)
- `added_by` → `auth.users.id` (N:1, CASCADE)
- `purchased_by` → `auth.users.id` (N:1, SET NULL)

**Common Categories**:

- General, Groceries, Household, Electronics, Clothing, etc.

---

### 6. wishlists

Personal wishlists that can be publicly shared.

```sql
create table if not exists wishlists (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null,
  description text,
  is_public   boolean not null default false,
  share_slug  text not null unique,
  created_at  timestamptz not null default now()
);
```

**Purpose**: Personal wish lists that can be shared publicly via unique URLs.

**Key Points**:

- Each wishlist has a unique `share_slug` for public access
- `is_public` controls if it can be viewed via share link
- No family association (personal to user)

**Relationships**:

- `user_id` → `auth.users.id` (N:1, CASCADE)
- Has many `wishlist_items`

**Sharing**:

- Public URL: `/w/:share_slug`
- Anyone can view (no login required)
- Visitors can reserve items

**Status**: 🔄 Future enhancement will add household context

---

### 7. wishlist_items

Items in a wishlist with reservation support.

```sql
create table if not exists wishlist_items (
  id                uuid primary key default uuid_generate_v4(),
  wishlist_id       uuid not null references wishlists on delete cascade,
  title             text not null,
  description       text,
  link              text,
  price             numeric(10, 2),
  currency          text not null default 'USD',
  image_url         text,
  priority          text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_reserved       boolean not null default false,
  reserved_by_email text,
  created_at        timestamptz not null default now()
);
```

**Purpose**: Items in wishlists with reservation tracking (gift planning).

**Priority Levels**:

- `low` - Nice to have
- `medium` - Would like to have
- `high` - Really want

**Key Points**:

- Visitors can reserve items (without login)
- Reservation tracked by email only
- Price and currency for gift planning
- External link to product page
- Image URL for visual reference

**Relationships**:

- `wishlist_id` → `wishlists.id` (N:1, CASCADE)

---

## Indexes

Performance optimization via strategic indexes:

```sql
-- Family member lookups
create index idx_family_members_user_id on family_members (user_id);
create index idx_family_members_family_id on family_members (family_id);

-- Shopping list lookups
create index idx_shopping_lists_family_id on shopping_lists (family_id);
create index idx_shopping_items_list_id on shopping_items (list_id);

-- Wishlist lookups
create index idx_wishlists_user_id on wishlists (user_id);
create index idx_wishlists_share_slug on wishlists (share_slug);
create index idx_wishlist_items_wishlist_id on wishlist_items (wishlist_id);
```

**Performance Impact**:

- User's families: Fast lookup via `user_id` index
- Family shopping lists: Fast lookup via `family_id` index
- Public wishlist access: Fast lookup via `share_slug` index

---

## Database Functions

Helper functions for common operations:

### user_is_family_member

Check if a user belongs to a specific family.

```sql
create or replace function user_is_family_member(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = p_family_id
      and user_id = p_user_id
  );
$$;
```

**Usage**: Used in RLS policies to check membership.

### user_is_family_owner

Check if a user is the owner of a specific family.

```sql
create or replace function user_is_family_owner(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = p_family_id
      and user_id = p_user_id
      and role = 'owner'
  );
$$;
```

**Usage**: Used in RLS policies to check owner permissions.

### get_user_id_by_email

Look up user ID by email (for invitations).

```sql
create or replace function get_user_id_by_email(lookup_email text)
returns uuid
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  normalized_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  normalized_email := lower(trim(lookup_email));

  if normalized_email is null or normalized_email = '' then
    return null;
  end if;

  return (
    select id
    from auth.users
    where lower(trim(email)) = normalized_email
    limit 1
  );
end;
$$;
```

**Usage**: Frontend calls this to find users when inviting by email.

**Security**: Requires authentication, normalizes email.

### get_email_by_user_id

Look up email by user ID (for displaying member info).

```sql
create or replace function get_email_by_user_id(lookup_user_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  return (select email from auth.users where id = lookup_user_id limit 1);
end;
$$;
```

**Usage**: Display member emails in UI.

**Security**: Requires authentication.

---

## Triggers

### Auto-create user profile on signup

```sql
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
```

**Purpose**: Automatically create user profile when user signs up.

**Logic**:

1. Try `full_name` from OAuth metadata
2. Fallback to `name` from metadata
3. Fallback to email prefix
4. Extract avatar URL from OAuth if available

---

## Storage

### Buckets

**wishlist-images** (public):

- Stores wishlist item images
- Public read access
- Authenticated write access
- Image files only (jpg, png, gif, webp)

**Setup**:

```sql
-- Run in Supabase dashboard or via API
insert into storage.buckets (id, name, public)
values ('wishlist-images', 'wishlist-images', true);
```

**Usage**:

- Upload via Supabase Storage API
- Returns public URL for `image_url` column
- Cleanup on wishlist item deletion (manual or via edge function)

---

## Row Level Security (RLS)

All tables have RLS enabled. See [RLS Policies](rls-policies.md) for complete policy documentation.

**Key Principles**:

1. Users can only see families they belong to
2. Shopping lists visible to all family members
3. Wishlist items respect `is_public` flag
4. Anonymous users can reserve wishlist items on public lists

---

## Migration Status

### Current Schema: families-based

The current production schema uses `families`, `family_members` tables.

### Future Schema: households-based

Migration in progress to:

- `households` - Replacement for families with enhanced features
- `members` - Flexible membership (nullable `user_id` for children)
- `invitations` - Formal invitation system
- `activity_logs` - Audit trail

**See**: [Migration Guide](../migration/families-to-households.md)

---

## Schema Evolution

### Version History

| Version | Date    | Changes                             |
| ------- | ------- | ----------------------------------- |
| 1.0     | Initial | Basic families, shopping, wishlists |
| 1.1     | 2024-Q3 | Added RLS policies                  |
| 1.2     | 2024-Q4 | Wishlist public sharing             |
| 2.0     | 2026-Q1 | (In Progress) Households migration  |

### Migration Files

Located in `supabase/migrations/`:

- `000_bootstrap_schema_rls.sql` - Initial schema
- `001-009_*.sql` - Bug fixes and enhancements
- `010_create_households_schema.sql` - New multi-tenant tables
- `011_migrate_families_to_households.sql` - Data migration
- `012-018_*.sql` - Schema updates for new architecture

---

## Development Tips

### Local Setup

1. Apply schema:

   ```bash
   docker exec -i supabase_db_family-logistics-dashboard psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/schema.sql
   ```

2. Apply RLS:
   ```bash
   docker exec -i supabase_db_family-logistics-dashboard psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/rls.sql
   ```

### Generating Types

Generate TypeScript types from schema:

```bash
npx supabase gen types typescript --local > src/features/shared/infrastructure/database.types.ts
```

### Testing Queries

Use Supabase SQL Editor or local psql:

```bash
docker exec -it supabase_db_family-logistics-dashboard psql -U postgres -d postgres
```

---

## Related Documentation

- [RLS Policies](rls-policies.md) - Row-Level Security implementation
- [Migrations](migrations.md) - Database migration guide
- [Domain Model](../domain/overview.md) - Entity relationships
- [Repository Pattern](../development/repository-pattern.md) - Data access layer

---

**Last Updated**: February 21, 2026
