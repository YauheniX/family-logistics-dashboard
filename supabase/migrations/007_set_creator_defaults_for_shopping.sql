-- Migration: Ensure shopping creator columns are auto-filled from auth user
-- Prevent null violations when client omits created_by / added_by.

alter table public.shopping_lists
  alter column created_by set default auth.uid();

alter table public.shopping_items
  alter column added_by set default auth.uid();
