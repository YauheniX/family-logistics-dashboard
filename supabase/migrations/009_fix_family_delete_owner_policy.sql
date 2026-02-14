-- Migration: Allow family creator to delete family
-- Some legacy families may miss owner membership rows; creator must still be able to delete.

drop policy if exists "families_delete" on public.families;

create policy "families_delete"
  on public.families for delete
  using (
    created_by = auth.uid()
    or public.user_is_family_owner(id, auth.uid())
  );
