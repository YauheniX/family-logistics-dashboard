begin;

alter table if exists public.shopping_lists
  rename column household_id to family_id;

alter table if exists public.members rename to family_members;
alter table if exists public.households rename to families;

drop index if exists public.idx_members_user_id;
drop index if exists public.idx_members_household_id;
drop index if exists public.idx_shopping_lists_household_id;

create index if not exists idx_family_members_user_id on public.family_members(user_id);
create index if not exists idx_family_members_family_id on public.family_members(family_id);
create index if not exists idx_shopping_lists_family_id on public.shopping_lists(family_id);

commit;
