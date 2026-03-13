-- Migration 036: add content_hash column to school_grades
-- Used by librus-sync to skip rows whose content hasn't changed since the last sync.

alter table public.school_grades
  add column if not exists content_hash text;

comment on column public.school_grades.content_hash is
  'djb2 hash of the grade fields (excluding id, connection_id, external_id, timestamps). '
  'Computed by librus-sync to avoid unnecessary upserts.';

-- Covering index: the sync query selects (external_id, content_hash) filtered by connection_id.
-- Using INCLUDE avoids heap lookups without adding content_hash to the btree key.
-- The existing UNIQUE(connection_id, external_id) already handles point lookups;
-- this index handles the full-scan-by-connection pattern efficiently.
create index if not exists idx_school_grades_hash
  on public.school_grades(connection_id)
  include (external_id, content_hash);
