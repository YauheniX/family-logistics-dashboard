-- Finalize tenant rename: families -> households, family_members -> members, family_id -> household_id
begin;

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
