-- =============================================================================
-- Row Level Security (RLS) Policies for Family Logistics Dashboard
-- =============================================================================
-- Run this after schema.sql is applied.
--
-- Policy principles:
--   1. Users can CRUD only their own trips (auth.uid() = created_by).
--   2. Related tables (packing_items, documents, budget_entries, timeline_events)
--      inherit access via the owning trip: the requesting user must own the
--      trip referenced by trip_id.
--   3. Packing templates and their items follow the same ownership model.
--   4. Supabase Storage restricts uploads/reads to folders prefixed with the
--      authenticated user's ID.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trips — users can SELECT, INSERT, UPDATE, DELETE only their own trips.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS trips_select_own ON public.trips;
-- Allow users to read only trips they created.
CREATE POLICY trips_select_own
  ON public.trips
  FOR SELECT
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS trips_modify_own ON public.trips;
-- Allow users to insert trips only when created_by matches their uid.
CREATE POLICY trips_modify_own
  ON public.trips
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS trips_update_own ON public.trips;
-- Allow users to update only their own trips.
CREATE POLICY trips_update_own
  ON public.trips
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS trips_delete_own ON public.trips;
-- Allow users to delete only their own trips.
CREATE POLICY trips_delete_own
  ON public.trips
  FOR DELETE
  USING (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- Packing items — access is granted when the user owns the parent trip.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS packing_select_by_owner ON public.packing_items;
-- Allow users to read packing items belonging to their trips.
CREATE POLICY packing_select_by_owner
  ON public.packing_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS packing_insert_by_owner ON public.packing_items;
-- Allow users to insert packing items only for their own trips.
CREATE POLICY packing_insert_by_owner
  ON public.packing_items
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS packing_update_by_owner ON public.packing_items;
-- Allow users to update packing items only for their own trips.
CREATE POLICY packing_update_by_owner
  ON public.packing_items
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS packing_delete_by_owner ON public.packing_items;
-- Allow users to delete packing items only for their own trips.
CREATE POLICY packing_delete_by_owner
  ON public.packing_items
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Documents — access is granted when the user owns the parent trip.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS documents_select_by_owner ON public.documents;
-- Allow users to read documents belonging to their trips.
CREATE POLICY documents_select_by_owner
  ON public.documents
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS documents_insert_by_owner ON public.documents;
-- Allow users to insert documents only for their own trips.
CREATE POLICY documents_insert_by_owner
  ON public.documents
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS documents_update_by_owner ON public.documents;
-- Allow users to update documents only for their own trips.
CREATE POLICY documents_update_by_owner
  ON public.documents
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS documents_delete_by_owner ON public.documents;
-- Allow users to delete documents only for their own trips.
CREATE POLICY documents_delete_by_owner
  ON public.documents
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Budget entries — access is granted when the user owns the parent trip.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS budget_select_by_owner ON public.budget_entries;
-- Allow users to read budget entries belonging to their trips.
CREATE POLICY budget_select_by_owner
  ON public.budget_entries
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS budget_insert_by_owner ON public.budget_entries;
-- Allow users to insert budget entries only for their own trips.
CREATE POLICY budget_insert_by_owner
  ON public.budget_entries
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS budget_update_by_owner ON public.budget_entries;
-- Allow users to update budget entries only for their own trips.
CREATE POLICY budget_update_by_owner
  ON public.budget_entries
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS budget_delete_by_owner ON public.budget_entries;
-- Allow users to delete budget entries only for their own trips.
CREATE POLICY budget_delete_by_owner
  ON public.budget_entries
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Timeline events — access is granted when the user owns the parent trip.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS timeline_select_by_owner ON public.timeline_events;
-- Allow users to read timeline events belonging to their trips.
CREATE POLICY timeline_select_by_owner
  ON public.timeline_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS timeline_insert_by_owner ON public.timeline_events;
-- Allow users to insert timeline events only for their own trips.
CREATE POLICY timeline_insert_by_owner
  ON public.timeline_events
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS timeline_update_by_owner ON public.timeline_events;
-- Allow users to update timeline events only for their own trips.
CREATE POLICY timeline_update_by_owner
  ON public.timeline_events
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS timeline_delete_by_owner ON public.timeline_events;
-- Allow users to delete timeline events only for their own trips.
CREATE POLICY timeline_delete_by_owner
  ON public.timeline_events
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Packing templates — users can CRUD only their own templates.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS templates_select_own ON public.packing_templates;
-- Allow users to read only templates they created.
CREATE POLICY templates_select_own
  ON public.packing_templates
  FOR SELECT
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS templates_insert_own ON public.packing_templates;
-- Allow users to insert templates only when created_by matches their uid.
CREATE POLICY templates_insert_own
  ON public.packing_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS templates_update_own ON public.packing_templates;
-- Allow users to update only their own templates.
CREATE POLICY templates_update_own
  ON public.packing_templates
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS templates_delete_own ON public.packing_templates;
-- Allow users to delete only their own templates.
CREATE POLICY templates_delete_own
  ON public.packing_templates
  FOR DELETE
  USING (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- Packing template items — access is granted when the user owns the template.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS template_items_select_by_owner ON public.packing_template_items;
-- Allow users to read template items belonging to their templates.
CREATE POLICY template_items_select_by_owner
  ON public.packing_template_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.packing_templates t
    WHERE t.id = template_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS template_items_insert_by_owner ON public.packing_template_items;
-- Allow users to insert template items only for their own templates.
CREATE POLICY template_items_insert_by_owner
  ON public.packing_template_items
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.packing_templates t
    WHERE t.id = template_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS template_items_update_by_owner ON public.packing_template_items;
-- Allow users to update template items only for their own templates.
CREATE POLICY template_items_update_by_owner
  ON public.packing_template_items
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.packing_templates t
    WHERE t.id = template_id AND t.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.packing_templates t
    WHERE t.id = template_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS template_items_delete_by_owner ON public.packing_template_items;
-- Allow users to delete template items only for their own templates.
CREATE POLICY template_items_delete_by_owner
  ON public.packing_template_items
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.packing_templates t
    WHERE t.id = template_id AND t.created_by = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Storage policies — users can upload to and read from their own folder only.
-- Folder structure: <user_uuid>/filename
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS storage_insert_user_folder ON storage.objects;
-- Allow users to upload files only into their own folder (uid/...).
CREATE POLICY storage_insert_user_folder
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() = owner
    AND POSITION(auth.uid()::text || '/' IN name) = 1
  );

DROP POLICY IF EXISTS storage_select_user_folder ON storage.objects;
-- Allow users to read files only from their own folder.
CREATE POLICY storage_select_user_folder
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid() = owner
    AND POSITION(auth.uid()::text || '/' IN name) = 1
  );

DROP POLICY IF EXISTS storage_delete_user_folder ON storage.objects;
-- Allow users to delete files only from their own folder.
CREATE POLICY storage_delete_user_folder
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid() = owner
    AND POSITION(auth.uid()::text || '/' IN name) = 1
  );
