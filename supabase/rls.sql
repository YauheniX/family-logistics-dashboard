-- Row Level Security policies for Family Logistics Dashboard
-- Run this after schema.sql is applied.

-- Trips: users can only see and modify their own trips
create policy if not exists "trips_select_own"
  on public.trips
  for select
  using (auth.uid() = created_by);

create policy if not exists "trips_modify_own"
  on public.trips
  for insert
  with check (auth.uid() = created_by);

create policy if not exists "trips_update_own"
  on public.trips
  for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy if not exists "trips_delete_own"
  on public.trips
  for delete
  using (auth.uid() = created_by);

-- Packing items: inherit ownership from parent trip via trip_id
create policy if not exists "packing_select_by_owner"
  on public.packing_items
  for select
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "packing_insert_by_owner"
  on public.packing_items
  for insert
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "packing_update_by_owner"
  on public.packing_items
  for update
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "packing_delete_by_owner"
  on public.packing_items
  for delete
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

-- Documents: inherit ownership via trip_id
create policy if not exists "documents_select_by_owner"
  on public.documents
  for select
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "documents_insert_by_owner"
  on public.documents
  for insert
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "documents_update_by_owner"
  on public.documents
  for update
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "documents_delete_by_owner"
  on public.documents
  for delete
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

-- Budget entries: inherit ownership via trip_id
create policy if not exists "budget_select_by_owner"
  on public.budget_entries
  for select
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "budget_insert_by_owner"
  on public.budget_entries
  for insert
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "budget_update_by_owner"
  on public.budget_entries
  for update
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "budget_delete_by_owner"
  on public.budget_entries
  for delete
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

-- Timeline events: inherit ownership via trip_id
create policy if not exists "timeline_select_by_owner"
  on public.timeline_events
  for select
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "timeline_insert_by_owner"
  on public.timeline_events
  for insert
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "timeline_update_by_owner"
  on public.timeline_events
  for update
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

create policy if not exists "timeline_delete_by_owner"
  on public.timeline_events
  for delete
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.created_by = auth.uid()
  ));

-- Storage: lock documents bucket to user-owned paths
-- We rely on file path naming: objects.name must start with the user's UID followed by '/'.
create policy if not exists "storage_insert_user_folder"
  on storage.objects
  for insert
  with check (
    bucket_id = 'documents'
    and auth.uid() = owner
    and position(auth.uid()::text || '/' in name) = 1
  );

create policy if not exists "storage_select_user_folder"
  on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and auth.uid() = owner
    and position(auth.uid()::text || '/' in name) = 1
  );

create policy if not exists "storage_delete_user_folder"
  on storage.objects
  for delete
  using (
    bucket_id = 'documents'
    and auth.uid() = owner
    and position(auth.uid()::text || '/' in name) = 1
  );
