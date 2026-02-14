-- Migration: Improve user lookup by email for invites
-- - Normalize email input (trim + lower)
-- - Set explicit search_path for security-definer functions

create or replace function public.get_user_id_by_email(lookup_email text)
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
    select u.id
    from auth.users u
    where lower(trim(u.email)) = normalized_email
    limit 1
  );
end;
$$;

create or replace function public.get_email_by_user_id(lookup_user_id uuid)
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

  return (
    select u.email
    from auth.users u
    where u.id = lookup_user_id
    limit 1
  );
end;
$$;
