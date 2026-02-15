# Multi-Tenant SaaS Architecture

## 1. Architecture Overview

This redesign transforms the family planning app into a scalable multi-tenant SaaS system with:

- **Household-based multi-tenancy**: Complete tenant isolation using PostgreSQL RLS
- **Flexible member model**: Support for users with accounts and soft members (children, etc.)
- **Role-based access control**: Granular permissions with 6 distinct roles
- **Public sharing**: External access to wishlists without authentication
- **Future-proof**: Support for account activation, billing, and enterprise features

### Key Changes from Current Architecture

| Current | New Multi-Tenant |
|---------|------------------|
| `families` table | `households` table (tenant entity) |
| `family_members` (requires user_id) | `members` (optional user_id for soft accounts) |
| Simple owner/member roles | 6-role hierarchy (owner, admin, member, child, viewer, public_guest) |
| User-centric wishlists | Member-centric wishlists (household context) |
| No invitation system | Full invitation flow with pending states |
| No activity tracking | Comprehensive activity logs |

---

## 2. Updated Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth - external)
│  ────────────   │
│  id (PK)        │
│  email          │
└────────┬────────┘
         │
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
│    households        │◄────────│  members            │
│  ─────────────────   │  1:N    │  ────────────────   │
│  id (PK)             │         │  id (PK)            │
│  name                │         │  household_id (FK)  │
│  slug (unique)       │         │  user_id (FK, null) │◄─── Soft member
│  created_by (FK)     │         │  role               │     (no account)
│  created_at          │         │  display_name       │
│  is_active           │         │  date_of_birth      │
│  settings (JSONB)    │         │  is_active          │
└──────────┬───────────┘         │  joined_at          │
           │                     │  invited_by (FK)    │
           │                     └─────────┬───────────┘
           │                               │
           │                               │ 1:N
           │                               ▼
           │                     ┌─────────────────────┐
           │                     │  invitations        │
           │                     │  ────────────────   │
           │                     │  id (PK)            │
           │                     │  household_id (FK)  │
           │                     │  email              │
           │                     │  role               │
           │                     │  invited_by (FK)    │
           │                     │  status             │
           │                     │  token              │
           │                     │  expires_at         │
           │                     │  created_at         │
           │                     └─────────────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────┐
│  shopping_lists      │
│  ─────────────────   │
│  id (PK)             │
│  household_id (FK)   │
│  title               │
│  description         │
│  created_by (FK)     │◄─── Now references members.id
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
│  added_by (FK)       │◄─── Now references members.id
│  purchased_by (FK)   │◄─── Now references members.id
│  created_at          │
└──────────────────────┘


┌──────────────────────┐
│     wishlists        │
│  ─────────────────   │
│  id (PK)             │
│  member_id (FK)      │◄─── Changed from user_id to member_id
│  household_id (FK)   │◄─── New: household context
│  title               │
│  description         │
│  visibility          │◄─── New: private|household|public
│  share_slug          │
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
│  reserved_by_name    │◄─── New field
│  created_at          │
└──────────────────────┘


┌──────────────────────┐
│   activity_logs      │
│  ─────────────────   │
│  id (PK)             │
│  household_id (FK)   │
│  member_id (FK)      │
│  action              │
│  entity_type         │
│  entity_id           │
│  metadata (JSONB)    │
│  created_at          │
└──────────────────────┘
```

---

## 3. Table Definitions

### 3.1 Households (Tenant Entity)

The core multi-tenant table. Each household is a completely isolated tenant.

```sql
create table households (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  slug             text not null unique,
  created_by       uuid not null references auth.users on delete restrict,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  is_active        boolean not null default true,
  settings         jsonb not null default '{}'::jsonb,
  
  constraint households_name_length check (char_length(name) between 1 and 100),
  constraint households_slug_format check (slug ~ '^[a-z0-9-]+$')
);

comment on table households is 'Multi-tenant isolation unit - replaces families';
comment on column households.slug is 'URL-friendly unique identifier for the household';
comment on column households.settings is 'Household-specific settings (timezone, currency, etc.)';

-- Indexes
create index idx_households_created_by on households(created_by);
create index idx_households_slug on households(slug);
create index idx_households_is_active on households(is_active) where is_active = true;
```

### 3.2 Members (Flexible User Association)

Members can exist with or without a user account, enabling soft members (children) and future account activation.

```sql
create table members (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  user_id          uuid references auth.users on delete set null,  -- Nullable for soft members
  role             text not null default 'member' check (role in ('owner', 'admin', 'member', 'child', 'viewer')),
  display_name     text not null,
  date_of_birth    date,
  avatar_url       text,
  is_active        boolean not null default true,
  joined_at        timestamptz not null default now(),
  invited_by       uuid references members(id) on delete set null,
  metadata         jsonb not null default '{}'::jsonb,
  
  constraint members_name_length check (char_length(display_name) between 1 and 100),
  constraint members_unique_user_per_household unique (household_id, user_id),
  constraint members_child_dob check (role != 'child' or date_of_birth is not null)
);

comment on table members is 'Household members with optional user account (supports soft members)';
comment on column members.user_id is 'NULL for soft members (children without accounts)';
comment on column members.role is 'Role-based permissions: owner > admin > member > child > viewer';
comment on column members.metadata is 'Additional member data (preferences, onboarding state, etc.)';

-- Indexes
create index idx_members_household_id on members(household_id);
create index idx_members_user_id on members(user_id) where user_id is not null;
create index idx_members_role on members(role);
create index idx_members_is_active on members(is_active) where is_active = true;

-- Ensure at least one owner per household
create unique index idx_members_household_owner 
  on members(household_id) 
  where role = 'owner' and is_active = true;
```

### 3.3 Invitations

Manage pending invitations with expiration and status tracking.

```sql
create table invitations (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  email            text not null,
  role             text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  invited_by       uuid not null references members(id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  token            text not null unique,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  accepted_at      timestamptz,
  
  constraint invitations_email_format check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  constraint invitations_unique_pending unique (household_id, email, status) 
    where status = 'pending'
);

comment on table invitations is 'Pending invitations to join households';
comment on column invitations.token is 'Secure random token for invitation acceptance';

-- Indexes
create index idx_invitations_household_id on invitations(household_id);
create index idx_invitations_email on invitations(email);
create index idx_invitations_status on invitations(status) where status = 'pending';
create index idx_invitations_token on invitations(token);
create index idx_invitations_expires_at on invitations(expires_at) where status = 'pending';
```

### 3.4 Shopping Lists (Updated)

Now references households and members instead of families and users.

```sql
create table shopping_lists (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  title            text not null,
  description      text,
  created_by       uuid not null references members on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  status           text not null default 'active' check (status in ('active', 'archived')),
  
  constraint shopping_lists_title_length check (char_length(title) between 1 and 200)
);

comment on table shopping_lists is 'Shared shopping lists within a household';
comment on column shopping_lists.created_by is 'References members.id (not user_id)';

-- Indexes
create index idx_shopping_lists_household_id on shopping_lists(household_id);
create index idx_shopping_lists_created_by on shopping_lists(created_by);
create index idx_shopping_lists_status on shopping_lists(status);
```

### 3.5 Shopping Items (Updated)

References members for tracking who added/purchased items.

```sql
create table shopping_items (
  id               uuid primary key default uuid_generate_v4(),
  list_id          uuid not null references shopping_lists on delete cascade,
  title            text not null,
  quantity         integer not null default 1 check (quantity > 0),
  category         text not null default 'General',
  is_purchased     boolean not null default false,
  added_by         uuid not null references members on delete cascade,
  purchased_by     uuid references members on delete set null,
  created_at       timestamptz not null default now(),
  purchased_at     timestamptz,
  
  constraint shopping_items_title_length check (char_length(title) between 1 and 200)
);

comment on table shopping_items is 'Items in shopping lists';
comment on column shopping_items.added_by is 'References members.id';
comment on column shopping_items.purchased_by is 'References members.id';

-- Indexes
create index idx_shopping_items_list_id on shopping_items(list_id);
create index idx_shopping_items_added_by on shopping_items(added_by);
create index idx_shopping_items_purchased_by on shopping_items(purchased_by) where purchased_by is not null;
create index idx_shopping_items_is_purchased on shopping_items(is_purchased);
```

### 3.6 Wishlists (Updated)

Now scoped to households with member ownership and enhanced visibility options.

```sql
create table wishlists (
  id               uuid primary key default uuid_generate_v4(),
  member_id        uuid not null references members on delete cascade,
  household_id     uuid not null references households on delete cascade,
  title            text not null,
  description      text,
  visibility       text not null default 'private' check (visibility in ('private', 'household', 'public')),
  share_slug       text not null unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  
  constraint wishlists_title_length check (char_length(title) between 1 and 200)
);

comment on table wishlists is 'Personal wishlists with household context and multi-level visibility';
comment on column wishlists.member_id is 'Owner member (can be soft member)';
comment on column wishlists.visibility is 'private (owner only), household (all members), public (share link)';

-- Indexes
create index idx_wishlists_member_id on wishlists(member_id);
create index idx_wishlists_household_id on wishlists(household_id);
create index idx_wishlists_share_slug on wishlists(share_slug);
create index idx_wishlists_visibility on wishlists(visibility);
```

### 3.7 Wishlist Items (Updated)

Enhanced with additional reservation metadata.

```sql
create table wishlist_items (
  id                  uuid primary key default uuid_generate_v4(),
  wishlist_id         uuid not null references wishlists on delete cascade,
  title               text not null,
  description         text,
  link                text,
  price               numeric(10, 2),
  currency            text not null default 'USD',
  image_url           text,
  priority            text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_reserved         boolean not null default false,
  reserved_by_email   text,
  reserved_by_name    text,
  reserved_at         timestamptz,
  created_at          timestamptz not null default now(),
  
  constraint wishlist_items_title_length check (char_length(title) between 1 and 200),
  constraint wishlist_items_price_positive check (price is null or price >= 0)
);

comment on table wishlist_items is 'Items in wishlists with public reservation support';
comment on column wishlist_items.reserved_by_name is 'Optional name of person reserving (for public reservations)';

-- Indexes
create index idx_wishlist_items_wishlist_id on wishlist_items(wishlist_id);
create index idx_wishlist_items_is_reserved on wishlist_items(is_reserved);
```

### 3.8 Activity Logs

Track all significant actions for audit trail and activity feeds.

```sql
create table activity_logs (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  member_id        uuid references members on delete set null,
  action           text not null,
  entity_type      text not null,
  entity_id        uuid,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  
  constraint activity_logs_action_length check (char_length(action) between 1 and 100)
);

comment on table activity_logs is 'Audit trail and activity feed for household actions';
comment on column activity_logs.action is 'Action performed (e.g., created, updated, deleted, purchased)';
comment on column activity_logs.entity_type is 'Type of entity (e.g., shopping_list, wishlist_item)';

-- Indexes
create index idx_activity_logs_household_id on activity_logs(household_id);
create index idx_activity_logs_member_id on activity_logs(member_id) where member_id is not null;
create index idx_activity_logs_created_at on activity_logs(created_at desc);
create index idx_activity_logs_entity on activity_logs(entity_type, entity_id);

-- Partitioning by month for scalability (optional but recommended)
-- This can be added later as activity grows
```

---

## 4. Helper Functions

### 4.1 Member Access Functions

```sql
-- Check if a user has a member record in a household
create or replace function user_is_household_member(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from members
    where household_id = p_household_id
      and user_id = p_user_id
      and is_active = true
  );
$$;

-- Get member record for a user in a household
create or replace function get_member_id(p_household_id uuid, p_user_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select id from members
  where household_id = p_household_id
    and user_id = p_user_id
    and is_active = true
  limit 1;
$$;

-- Get member role for a user in a household
create or replace function get_member_role(p_household_id uuid, p_user_id uuid)
returns text
language sql
security definer
stable
as $$
  select role from members
  where household_id = p_household_id
    and user_id = p_user_id
    and is_active = true
  limit 1;
$$;

-- Check if a user has minimum required role
create or replace function has_min_role(
  p_household_id uuid,
  p_user_id uuid,
  p_required_role text
)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  v_role text;
  v_role_hierarchy integer;
  v_required_hierarchy integer;
begin
  -- Role hierarchy: owner=5, admin=4, member=3, child=2, viewer=1
  v_role := get_member_role(p_household_id, p_user_id);
  
  if v_role is null then
    return false;
  end if;
  
  v_role_hierarchy := case v_role
    when 'owner' then 5
    when 'admin' then 4
    when 'member' then 3
    when 'child' then 2
    when 'viewer' then 1
    else 0
  end;
  
  v_required_hierarchy := case p_required_role
    when 'owner' then 5
    when 'admin' then 4
    when 'member' then 3
    when 'child' then 2
    when 'viewer' then 1
    else 0
  end;
  
  return v_role_hierarchy >= v_required_hierarchy;
end;
$$;
```

### 4.2 Slug Generation

```sql
-- Generate unique household slug
create or replace function generate_household_slug(p_name text)
returns text
language plpgsql
as $$
declare
  v_slug text;
  v_counter integer := 0;
  v_exists boolean;
begin
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  
  -- Ensure slug is not empty
  if v_slug = '' then
    v_slug := 'household';
  end if;
  
  -- Check uniqueness and append number if needed
  loop
    select exists(select 1 from households where slug = v_slug) into v_exists;
    
    if not v_exists then
      return v_slug;
    end if;
    
    v_counter := v_counter + 1;
    v_slug := v_slug || '-' || v_counter;
  end loop;
end;
$$;
```

### 4.3 Activity Logging

```sql
-- Log activity
create or replace function log_activity(
  p_household_id uuid,
  p_member_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  insert into activity_logs (
    household_id,
    member_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_household_id,
    p_member_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
end;
$$;
```

---

## 5. Triggers

### 5.1 Updated At Trigger

```sql
-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to relevant tables
create trigger update_households_updated_at
  before update on households
  for each row
  execute function update_updated_at_column();

create trigger update_shopping_lists_updated_at
  before update on shopping_lists
  for each row
  execute function update_updated_at_column();

create trigger update_wishlists_updated_at
  before update on wishlists
  for each row
  execute function update_updated_at_column();
```

### 5.2 Auto-generate Household Slug

```sql
create or replace function auto_generate_household_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := generate_household_slug(new.name);
  end if;
  return new;
end;
$$;

create trigger household_slug_generation
  before insert on households
  for each row
  execute function auto_generate_household_slug();
```

### 5.3 Activity Logging Triggers

```sql
-- Log shopping list creation
create or replace function log_shopping_list_activity()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    perform log_activity(
      new.household_id,
      new.created_by,
      'created',
      'shopping_list',
      new.id,
      jsonb_build_object('title', new.title)
    );
  elsif (TG_OP = 'UPDATE' and old.status != new.status) then
    perform log_activity(
      new.household_id,
      auth.uid(),
      case when new.status = 'archived' then 'archived' else 'unarchived' end,
      'shopping_list',
      new.id,
      jsonb_build_object('title', new.title)
    );
  end if;
  return new;
end;
$$;

create trigger shopping_list_activity_log
  after insert or update on shopping_lists
  for each row
  execute function log_shopping_list_activity();
```

---

## 6. Design Decisions and Rationale

### 6.1 Why Households Instead of Families?

- **Clearer tenant abstraction**: "Household" better represents the multi-tenant unit
- **Scalable naming**: Better aligns with SaaS terminology (organization, workspace, etc.)
- **Flexible billing unit**: Households can have subscription plans attached
- **URL-friendly**: Each household gets a unique slug for branding

### 6.2 Why Separate Members from Users?

- **Soft members**: Children can be members without user accounts
- **Future activation**: Soft members can later activate accounts and maintain history
- **Flexible permissions**: Members have roles independent of authentication
- **Guest access**: External users can interact with public wishlists without being members

### 6.3 Why Three Visibility Levels for Wishlists?

- **Private**: Child's wishlist, visible only to them (if account) or household admins
- **Household**: Family can see each other's wishlists for planning
- **Public**: Share with grandparents, friends via link

### 6.4 Why Activity Logs?

- **Audit trail**: Track all actions for compliance and debugging
- **Activity feed**: Show recent household activity on dashboard
- **Analytics**: Understand usage patterns for future features
- **Troubleshooting**: Debug user-reported issues

---

## 7. Scalability Considerations

### 7.1 Database Performance

- **Proper indexing**: All foreign keys and common query columns indexed
- **Partitioning**: Activity logs can be partitioned by month for long-term growth
- **Connection pooling**: Supabase handles this automatically
- **RLS optimization**: Policies use indexed columns (household_id, user_id)

### 7.2 Multi-Tenancy Best Practices

- **Tenant isolation**: All queries filtered by household_id at RLS level
- **Prevent cross-tenant queries**: No joins across households
- **Tenant-specific settings**: JSONB settings column for flexibility
- **Billing integration ready**: Household-level subscription tracking

### 7.3 Caching Strategy

- **User memberships**: Cache user's household memberships in session
- **Member roles**: Cache roles to avoid repeated lookups
- **Public wishlists**: Can be cached aggressively (CDN-friendly)
- **Activity logs**: Paginate and cache recent entries

### 7.4 Future-Proofing

- **Soft deletes ready**: `is_active` flags support soft deletion
- **Metadata columns**: JSONB for flexible schema evolution
- **Invitation system**: Ready for email workflows
- **Billing hooks**: Household-level subscription can be added

---

## 8. Migration Path from Current Schema

The migration is designed to be **zero-downtime** and **backwards-compatible**. See [migration strategy documentation](./MIGRATION_STRATEGY.md) for details.

Key points:
1. Create new tables alongside existing ones
2. Create views to maintain backward compatibility
3. Migrate data in batches
4. Switch application traffic gradually
5. Deprecate old tables after successful migration
