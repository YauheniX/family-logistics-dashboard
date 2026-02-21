-- Rollback for 016_finalize_household_rename.sql
begin;

-- Drop new RLS policies
drop policy if exists households_select on public.households;
drop policy if exists households_insert on public.households;
drop policy if exists households_update on public.households;
drop policy if exists households_delete on public.households;
drop policy if exists members_select on public.members;
drop policy if exists members_insert on public.members;
drop policy if exists members_delete on public.members;

-- Drop new helper functions
drop function if exists public.user_is_household_member(uuid, uuid);
drop function if exists public.user_is_household_owner(uuid, uuid);

-- Restore foreign keys to old names before renaming tables
alter table if exists public.members
  drop constraint if exists members_household_id_fkey,
  add constraint family_members_family_id_fkey foreign key (household_id) references public.households(id) on delete cascade;

alter table if exists public.shopping_lists
  drop constraint if exists shopping_lists_household_id_fkey,
  add constraint shopping_lists_family_id_fkey foreign key (household_id) references public.households(id) on delete cascade;

-- Rename columns back
alter table if exists public.shopping_lists
  rename column household_id to family_id;

-- Rename constraints back
alter table if exists public.members
  rename constraint members_pkey to family_members_pkey;

alter table if exists public.members
  rename constraint members_household_id_user_id_key to family_members_family_id_user_id_key;

alter table if exists public.households
  rename constraint households_pkey to families_pkey;

-- Rename tables back
alter table if exists public.members rename to family_members;
alter table if exists public.households rename to families;

-- Rename column back
alter table if exists public.family_members
  rename column household_id to family_id;

-- Update foreign keys after table rename
alter table if exists public.family_members
  drop constraint if exists family_members_family_id_fkey,
  add constraint family_members_family_id_fkey foreign key (family_id) references public.families(id) on delete cascade;

alter table if exists public.shopping_lists
  drop constraint if exists shopping_lists_family_id_fkey,
  add constraint shopping_lists_family_id_fkey foreign key (family_id) references public.families(id) on delete cascade;

-- Restore indexes
drop index if exists public.idx_members_user_id;
drop index if exists public.idx_members_household_id;
drop index if exists public.idx_shopping_lists_household_id;

create index if not exists idx_family_members_user_id on public.family_members(user_id);
create index if not exists idx_family_members_family_id on public.family_members(family_id);
create index if not exists idx_shopping_lists_family_id on public.shopping_lists(family_id);

-- Restore old helper functions
create or replace function public.user_is_family_member(p_family_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = p_user_id
  );
$$;

create or replace function public.user_is_family_owner(p_family_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = p_user_id
      and fm.role = 'owner'
  );
$$;

-- Restore old RLS policies
create policy "families_select"
  on families for select
  using (
    created_by = auth.uid()
    or user_is_family_member(id, auth.uid())
  );

create policy "families_insert"
  on families for insert
  with check (auth.uid() is not null);

create policy "families_update"
  on families for update
  using (user_is_family_owner(id, auth.uid()));

create policy "families_delete"
  on families for delete
  using (
    created_by = auth.uid()
    or user_is_family_owner(id, auth.uid())
  );

create policy "family_members_select"
  on family_members for select
  using (
    user_id = auth.uid()
    or user_is_family_member(family_id, auth.uid())
  );

create policy "family_members_insert"
  on family_members for insert
  with check (
    user_is_family_owner(family_id, auth.uid())
    or user_id = auth.uid()
  );

create policy "family_members_delete"
  on family_members for delete
  using (
    user_is_family_owner(family_id, auth.uid())
    or user_id = auth.uid()
  );

alter table if exists public.families rename to households;
alter table if exists public.family_members rename to members;

alter table if exists public.shopping_lists
  rename column family_id to household_id;

alter table if exists public.households
  rename constraint families_pkey to households_pkey;

alter table if exists public.members
  rename constraint family_members_pkey to members_pkey;

alter table if exists public.members
  rename constraint family_members_family_id_user_id_key to members_household_id_user_id_key;

alter table if exists public.members
  drop constraint if exists family_members_family_id_fkey,
  add constraint members_household_id_fkey foreign key (household_id) references public.households(id) on delete cascade;

alter table if exists public.shopping_lists
  drop constraint if exists shopping_lists_family_id_fkey,
  add constraint shopping_lists_household_id_fkey foreign key (household_id) references public.households(id) on delete cascade;

drop index if exists public.idx_family_members_user_id;
drop index if exists public.idx_family_members_family_id;
drop index if exists public.idx_shopping_lists_family_id;

create index if not exists idx_members_user_id on public.members(user_id);
create index if not exists idx_members_household_id on public.members(household_id);
create index if not exists idx_shopping_lists_household_id on public.shopping_lists(household_id);

-- RLS policies
alter table if exists public.households enable row level security;
alter table if exists public.members enable row level security;

create or replace function public.user_is_household_member(p_household_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.household_id = p_household_id
      and m.user_id = p_user_id
      and m.is_active = true
  );
$$;

create or replace function public.user_is_household_owner(p_household_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.household_id = p_household_id
      and m.user_id = p_user_id
      and m.role = 'owner'
      and m.is_active = true
  );
$$;

drop policy if exists households_select on public.households;
create policy households_select on public.households for select
using (
  public.user_is_household_member(id, auth.uid())
  or created_by = auth.uid()
);

drop policy if exists households_insert on public.households;
create policy households_insert on public.households for insert
with check (created_by = auth.uid());

drop policy if exists households_update on public.households;
create policy households_update on public.households for update
using (public.user_is_household_owner(id, auth.uid()));

drop policy if exists households_delete on public.households;
create policy households_delete on public.households for delete
using (public.user_is_household_owner(id, auth.uid()));

drop policy if exists members_select on public.members;
create policy members_select on public.members for select
using (public.user_is_household_member(household_id, auth.uid()));

drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert
with check (
  public.user_is_household_owner(household_id, auth.uid())
  or exists (
    select 1 from public.households
    where id = household_id and created_by = auth.uid()
  )
);

drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete
using (
  (
    select
      -- Owner can delete other members (but not themselves to prevent orphaned households)
      (is_owner and user_id != auth.uid())
      -- Non-owner members can delete themselves
      or (user_id = auth.uid() and not is_owner)
    from (
      select public.user_is_household_owner(household_id, auth.uid()) as is_owner
    ) owner_status
  )
);

commit;

