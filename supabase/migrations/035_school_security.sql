-- ============================================================
-- Migration 035: School Security Hardening
-- Tightens RLS policies, removes overly-permissive write grants,
-- adds partial unique indexes and missing constraints introduced
-- by migration 034.
-- ============================================================

-- ─── 1. Remove _manage (FOR ALL) policies; keep only _select ─────────────
-- The sync Edge Function uses the service role key, which bypasses RLS,
-- so client-side FOR ALL grants are unnecessary and dangerous.

drop policy if exists "school_grades_manage"        on public.school_grades;
drop policy if exists "school_timetable_manage"     on public.school_timetable;
drop policy if exists "school_homework_manage"      on public.school_homework;
drop policy if exists "school_attendance_manage"    on public.school_attendance;
drop policy if exists "school_messages_manage"      on public.school_messages;
drop policy if exists "school_announcements_manage" on public.school_announcements;

-- school_homework: allow members to toggle is_done (local-only flag)
create policy "school_homework_update_done"
  on public.school_homework for update
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_homework.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  )
  with check (true);

-- ─── 2. Replace loose school_connections_insert / _update policies ────────
-- Old policies let any active member create/update a connection for
-- any member_id.  New policies verify member_id belongs to the household
-- AND the actor is either the target member or an owner/admin.

drop policy if exists "school_connections_insert" on public.school_connections;
drop policy if exists "school_connections_update" on public.school_connections;

create policy "school_connections_insert"
  on public.school_connections for insert
  with check (
    -- target member must belong to the same household
    exists (
      select 1 from public.members m_target
      where m_target.id = school_connections.member_id
        and m_target.household_id = school_connections.household_id
    )
    and
    -- caller must be that member themselves OR an owner/admin of the household
    (
      exists (
        select 1 from public.members m_self
        where m_self.id = school_connections.member_id
          and m_self.household_id = school_connections.household_id
          and m_self.user_id = auth.uid()
          and m_self.is_active = true
      )
      or
      exists (
        select 1 from public.members m_admin
        where m_admin.household_id = school_connections.household_id
          and m_admin.user_id = auth.uid()
          and m_admin.is_active = true
          and m_admin.role in ('owner', 'admin')
      )
    )
  );

create policy "school_connections_update"
  on public.school_connections for update
  using (
    exists (
      select 1 from public.members m
      where m.household_id = school_connections.household_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    -- target member must still belong to the same household
    exists (
      select 1 from public.members m_target
      where m_target.id = school_connections.member_id
        and m_target.household_id = school_connections.household_id
    )
  );

-- ─── 3. One connection per member/platform ────────────────────────────────
-- Remove any duplicates first (keep the most recently created row per pair).
delete from public.school_connections
where id not in (
  select distinct on (member_id, platform) id
  from public.school_connections
  order by member_id, platform, created_at desc
);

alter table public.school_connections
  add constraint school_connections_member_platform_key
  unique (member_id, platform);

-- ─── 4. Partial unique indexes for external_id columns ───────────────────
-- Replace table-level UNIQUE(connection_id, external_id) (which treats
-- NULL as distinct, allowing infinite NULLs) with partial unique indexes
-- that only enforce uniqueness when external_id IS NOT NULL.
--
-- NOTE (updated): partial unique indexes with a WHERE clause cannot be
-- resolved by PostgREST's column-name onConflict syntax, which would break
-- Edge Function upserts.  Standard UNIQUE constraints already permit
-- multiple NULL external_id rows (PostgreSQL NULL != NULL semantics), so
-- we restore named UNIQUE constraints that PostgREST can resolve.

-- school_grades
alter table public.school_grades drop constraint if exists school_grades_connection_id_external_id_key;
alter table public.school_grades
  add constraint school_grades_connection_id_external_id_key
  unique (connection_id, external_id);

-- school_homework
alter table public.school_homework drop constraint if exists school_homework_connection_id_external_id_key;
alter table public.school_homework
  add constraint school_homework_connection_id_external_id_key
  unique (connection_id, external_id);

-- school_attendance
alter table public.school_attendance drop constraint if exists school_attendance_connection_id_external_id_key;
alter table public.school_attendance
  add constraint school_attendance_connection_id_external_id_key
  unique (connection_id, external_id);

-- school_messages
alter table public.school_messages drop constraint if exists school_messages_connection_id_external_id_key;
alter table public.school_messages
  add constraint school_messages_connection_id_external_id_key
  unique (connection_id, external_id);

-- school_announcements
alter table public.school_announcements drop constraint if exists school_announcements_connection_id_external_id_key;
alter table public.school_announcements
  add constraint school_announcements_connection_id_external_id_key
  unique (connection_id, external_id);

-- school_timetable already uses (connection_id, date, lesson_number) and has
-- no external_id unique constraint, so no change needed there.
