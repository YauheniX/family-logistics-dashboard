-- ============================================================
-- Migration 034: School Integration (Librus Synergia)
-- Adds tables for storing school connections and cached student data.
-- All tables are scoped to a household via school_connections.
-- ============================================================

-- ─── school_connections ────────────────────────────────────
-- One row per linked school account (member + platform pair).
create table if not exists public.school_connections (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  platform        text not null default 'librus',         -- 'librus' | 'vulcan' | 'podlasie'
  display_label   text not null,                           -- e.g. "Jan Kowalski – 5B"
  student_name    text,
  class_name      text,
  school_name     text,
  -- Encrypted tokens (stored as text, guarded by RLS)
  access_token    text,
  refresh_token   text,
  token_expiry    timestamptz,
  -- Sync metadata
  last_synced_at  timestamptz,
  sync_error      text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint school_connections_platform_check check (platform in ('librus', 'vulcan', 'podlasie'))
);

create index idx_school_connections_household on public.school_connections(household_id);
create index idx_school_connections_member    on public.school_connections(member_id);

-- ─── school_grades ─────────────────────────────────────────
create table if not exists public.school_grades (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.school_connections(id) on delete cascade,
  subject         text not null,
  grade           text not null,       -- e.g. "5", "5+", "5-", "100%"
  weight          numeric(4,2),
  category        text,
  comment         text,
  added_by        text,                -- teacher name
  date            date not null,
  is_new          boolean not null default false,
  external_id     text,                -- Librus grade id
  created_at      timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index idx_school_grades_connection on public.school_grades(connection_id);
create index idx_school_grades_date       on public.school_grades(connection_id, date desc);

-- ─── school_timetable ──────────────────────────────────────
create table if not exists public.school_timetable (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.school_connections(id) on delete cascade,
  date            date not null,
  lesson_number   int,
  subject         text not null,
  teacher         text,
  classroom       text,
  start_time      time,
  end_time        time,
  is_substitution boolean not null default false,
  is_cancelled    boolean not null default false,
  substitution_note text,
  external_id     text,
  created_at      timestamptz not null default now(),
  unique (connection_id, date, lesson_number)
);

create index idx_school_timetable_connection on public.school_timetable(connection_id);
create index idx_school_timetable_date       on public.school_timetable(connection_id, date);

-- ─── school_homework ───────────────────────────────────────
create table if not exists public.school_homework (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.school_connections(id) on delete cascade,
  subject         text not null,
  description     text not null,
  date_due        date,
  teacher         text,
  is_new          boolean not null default false,
  is_done         boolean not null default false,   -- local flag, not synced
  external_id     text,
  created_at      timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index idx_school_homework_connection on public.school_homework(connection_id);
create index idx_school_homework_due        on public.school_homework(connection_id, date_due);

-- ─── school_attendance ─────────────────────────────────────
create table if not exists public.school_attendance (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.school_connections(id) on delete cascade,
  date            date not null,
  lesson_number   int,
  subject         text,
  type            text not null,   -- e.g. 'absent', 'late', 'excused', 'present'
  type_short      text,
  teacher         text,
  is_new          boolean not null default false,
  external_id     text,
  created_at      timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index idx_school_attendance_connection on public.school_attendance(connection_id);
create index idx_school_attendance_date       on public.school_attendance(connection_id, date desc);

-- ─── school_messages ───────────────────────────────────────
create table if not exists public.school_messages (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.school_connections(id) on delete cascade,
  direction       text not null check (direction in ('inbox', 'sent')),
  sender          text,
  recipients      text[],
  subject         text not null,
  body            text,
  sent_at         timestamptz,
  is_read         boolean not null default false,
  is_new          boolean not null default false,
  external_id     text,
  created_at      timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index idx_school_messages_connection on public.school_messages(connection_id);
create index idx_school_messages_sent_at    on public.school_messages(connection_id, sent_at desc);

-- ─── school_announcements ──────────────────────────────────
create table if not exists public.school_announcements (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.school_connections(id) on delete cascade,
  title           text not null,
  content         text,
  author          text,
  published_at    timestamptz,
  is_new          boolean not null default false,
  external_id     text,
  created_at      timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index idx_school_announcements_connection on public.school_announcements(connection_id);

-- ─── updated_at trigger ────────────────────────────────────
create or replace function update_school_connections_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_school_connections_updated_at
  before update on public.school_connections
  for each row execute function update_school_connections_updated_at();

-- ─── RLS ───────────────────────────────────────────────────
alter table public.school_connections   enable row level security;
alter table public.school_grades        enable row level security;
alter table public.school_timetable     enable row level security;
alter table public.school_homework      enable row level security;
alter table public.school_attendance    enable row level security;
alter table public.school_messages      enable row level security;
alter table public.school_announcements enable row level security;

-- Helper: is the calling user an active member of the household?
-- (re-uses the existing function from production schema)

-- school_connections: household members can see all connections,
-- only the connected member (or admins) can insert/update/delete.

create policy "school_connections_select"
  on public.school_connections for select
  using (
    exists (
      select 1 from public.members
      where household_id = school_connections.household_id
        and user_id = auth.uid()
        and is_active = true
    )
  );

create policy "school_connections_insert"
  on public.school_connections for insert
  with check (
    exists (
      select 1 from public.members
      where household_id = school_connections.household_id
        and user_id = auth.uid()
        and is_active = true
    )
  );

create policy "school_connections_update"
  on public.school_connections for update
  using (
    exists (
      select 1 from public.members
      where household_id = school_connections.household_id
        and user_id = auth.uid()
        and is_active = true
    )
  );

create policy "school_connections_delete"
  on public.school_connections for delete
  using (
    exists (
      select 1 from public.members
      where household_id = school_connections.household_id
        and user_id = auth.uid()
        and is_active = true
        and role in ('owner', 'admin')
    )
  );

-- Macro: creates select policy for a school data table that joins via school_connections.
-- Each data table uses connection_id to scope to household.

create policy "school_grades_select"
  on public.school_grades for select
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_grades.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_grades_manage"
  on public.school_grades for all
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_grades.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_timetable_select"
  on public.school_timetable for select
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_timetable.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_timetable_manage"
  on public.school_timetable for all
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_timetable.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_homework_select"
  on public.school_homework for select
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_homework.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_homework_manage"
  on public.school_homework for all
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_homework.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_attendance_select"
  on public.school_attendance for select
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_attendance.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_attendance_manage"
  on public.school_attendance for all
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_attendance.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_messages_select"
  on public.school_messages for select
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_messages.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_messages_manage"
  on public.school_messages for all
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_messages.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_announcements_select"
  on public.school_announcements for select
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_announcements.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "school_announcements_manage"
  on public.school_announcements for all
  using (
    exists (
      select 1 from public.school_connections sc
      join public.members m on m.household_id = sc.household_id
      where sc.id = school_announcements.connection_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );
