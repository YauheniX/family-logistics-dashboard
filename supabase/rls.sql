-- Row Level Security policies for Family Logistics Dashboard
-- Run this after schema.sql is applied.

-- Trips
DROP POLICY IF EXISTS trips_select_own ON public.trips;
CREATE POLICY trips_select_own
  ON public.trips
  FOR SELECT
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS trips_modify_own ON public.trips;
CREATE POLICY trips_modify_own
  ON public.trips
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS trips_update_own ON public.trips;
CREATE POLICY trips_update_own
  ON public.trips
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS trips_delete_own ON public.trips;
CREATE POLICY trips_delete_own
  ON public.trips
  FOR DELETE
  USING (auth.uid() = created_by);

-- Packing items
DROP POLICY IF EXISTS packing_select_by_owner ON public.packing_items;
CREATE POLICY packing_select_by_owner
  ON public.packing_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS packing_insert_by_owner ON public.packing_items;
CREATE POLICY packing_insert_by_owner
  ON public.packing_items
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS packing_update_by_owner ON public.packing_items;
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
CREATE POLICY packing_delete_by_owner
  ON public.packing_items
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- Documents
DROP POLICY IF EXISTS documents_select_by_owner ON public.documents;
CREATE POLICY documents_select_by_owner
  ON public.documents
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS documents_insert_by_owner ON public.documents;
CREATE POLICY documents_insert_by_owner
  ON public.documents
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS documents_update_by_owner ON public.documents;
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
CREATE POLICY documents_delete_by_owner
  ON public.documents
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- Budget entries
DROP POLICY IF EXISTS budget_select_by_owner ON public.budget_entries;
CREATE POLICY budget_select_by_owner
  ON public.budget_entries
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS budget_insert_by_owner ON public.budget_entries;
CREATE POLICY budget_insert_by_owner
  ON public.budget_entries
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS budget_update_by_owner ON public.budget_entries;
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
CREATE POLICY budget_delete_by_owner
  ON public.budget_entries
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- Timeline events
DROP POLICY IF EXISTS timeline_select_by_owner ON public.timeline_events;
CREATE POLICY timeline_select_by_owner
  ON public.timeline_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS timeline_insert_by_owner ON public.timeline_events;
CREATE POLICY timeline_insert_by_owner
  ON public.timeline_events
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS timeline_update_by_owner ON public.timeline_events;
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
CREATE POLICY timeline_delete_by_owner
  ON public.timeline_events
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- Packing templates
DROP POLICY IF EXISTS templates_select_own ON public.packing_templates;
CREATE POLICY templates_select_own
  ON public.packing_templates
  FOR SELECT
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS templates_insert_own ON public.packing_templates;
CREATE POLICY templates_insert_own
  ON public.packing_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS templates_update_own ON public.packing_templates;
CREATE POLICY templates_update_own
  ON public.packing_templates
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS templates_delete_own ON public.packing_templates;
CREATE POLICY templates_delete_own
  ON public.packing_templates
  FOR DELETE
  USING (auth.uid() = created_by);

-- Packing template items
DROP POLICY IF EXISTS template_items_select_by_owner ON public.packing_template_items;
CREATE POLICY template_items_select_by_owner
  ON public.packing_template_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.packing_templates t
    WHERE t.id = template_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS template_items_insert_by_owner ON public.packing_template_items;
CREATE POLICY template_items_insert_by_owner
  ON public.packing_template_items
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.packing_templates t
    WHERE t.id = template_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS template_items_update_by_owner ON public.packing_template_items;
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
CREATE POLICY template_items_delete_by_owner
  ON public.packing_template_items
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.packing_templates t
    WHERE t.id = template_id AND t.created_by = auth.uid()
  ));

-- Storage object policies
DROP POLICY IF EXISTS storage_insert_user_folder ON storage.objects;
CREATE POLICY storage_insert_user_folder
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() = owner
    AND POSITION(auth.uid()::text || '/' IN name) = 1
  );

DROP POLICY IF EXISTS storage_select_user_folder ON storage.objects;
CREATE POLICY storage_select_user_folder
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid() = owner
    AND POSITION(auth.uid()::text || '/' IN name) = 1
  );

DROP POLICY IF EXISTS storage_delete_user_folder ON storage.objects;
CREATE POLICY storage_delete_user_folder
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid() = owner
    AND POSITION(auth.uid()::text || '/' IN name) = 1
  );
