-- Migration: Fix RLS for family creation flow
-- 1) Allow creator to select their own newly-created family
-- 2) Allow creator to add themselves as owner in family_members

drop policy if exists "families_select" on public.families;
create policy "families_select"
  on public.families for select
  using (
    created_by = auth.uid()
    or public.user_is_family_member(id, auth.uid())
  );

drop policy if exists "family_members_insert" on public.family_members;
create policy "family_members_insert"
  on public.family_members for insert
  with check (
    public.user_is_family_owner(family_id, auth.uid())
    or (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1
        from public.families f
        where f.id = family_id
          and f.created_by = auth.uid()
      )
    )
  );
