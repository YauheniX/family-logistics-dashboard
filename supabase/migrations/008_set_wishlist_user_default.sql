-- Migration: Ensure wishlist owner is auto-filled from auth context

alter table public.wishlists
  alter column user_id set default auth.uid();
