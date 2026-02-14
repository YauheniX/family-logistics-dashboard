-- Migration: Fix family_members select policy for INSERT ... RETURNING
-- The app inserts with .insert(...).select().single(), so the inserted row must be selectable.

drop policy if exists "family_members_select" on public.family_members;

create policy "family_members_select"
  on public.family_members for select
  using (
    user_id = auth.uid()
    or public.user_is_family_member(family_id, auth.uid())
  );
