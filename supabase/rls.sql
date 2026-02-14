-- =============================================================================
-- Row Level Security (RLS) Policies for Family Logistics Dashboard
-- =============================================================================
-- Run this after schema.sql is applied.
--
-- Policy principles:
--   1. Users can CRUD their own trips (auth.uid() = created_by)
--      OR access trips they are a member of via trip_members.
--   2. Related tables (packing_items, documents, budget_entries, timeline_events)
--      inherit access via the owning trip: the requesting user must own the
--      trip referenced by trip_id OR be a member.
--   3. Packing templates and their items follow the same ownership model.
--   4. Supabase Storage restricts uploads/reads to folders prefixed with the
--      authenticated user's ID.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: check if a user has access to a trip (owner OR member).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_trip_access(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = p_trip_id AND t.created_by = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = p_trip_id AND tm.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Helper: check if a user can write to a trip (owner OR editor member).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_edit_trip(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = p_trip_id AND t.created_by = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id AND tm.user_id = p_user_id AND tm.role = 'editor'
  );
$$;

-- ---------------------------------------------------------------------------
-- Trips — users can SELECT own trips + trips they are members of.
--          INSERT/UPDATE/DELETE restricted to owner only.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS trips_select_own ON public.trips;
-- Allow users to read trips they created or are a member of.
CREATE POLICY trips_select_own
  ON public.trips
  FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trips_modify_own ON public.trips;
-- Allow users to insert trips only when created_by matches their uid.
CREATE POLICY trips_modify_own
  ON public.trips
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS trips_update_own ON public.trips;
-- Allow owners and editor members to update trips.
CREATE POLICY trips_update_own
  ON public.trips
  FOR UPDATE
  USING (public.user_can_edit_trip(id, auth.uid()))
  WITH CHECK (public.user_can_edit_trip(id, auth.uid()));

DROP POLICY IF EXISTS trips_delete_own ON public.trips;
-- Allow only the creator to delete trips.
CREATE POLICY trips_delete_own
  ON public.trips
  FOR DELETE
  USING (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- Trip members — owners can manage, members can read their own membership.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS trip_members_select ON public.trip_members;
-- Allow users to read memberships for trips they have access to.
CREATE POLICY trip_members_select
  ON public.trip_members
  FOR SELECT
  USING (public.user_has_trip_access(trip_id, auth.uid()));

DROP POLICY IF EXISTS trip_members_insert ON public.trip_members;
-- Only the trip owner can add members.
CREATE POLICY trip_members_insert
  ON public.trip_members
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS trip_members_update ON public.trip_members;
-- Only the trip owner can update member roles.
CREATE POLICY trip_members_update
  ON public.trip_members
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS trip_members_delete ON public.trip_members;
-- Only the trip owner can remove members.
CREATE POLICY trip_members_delete
  ON public.trip_members
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id AND t.created_by = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Packing items — access via trip ownership or membership.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS packing_select_by_owner ON public.packing_items;
-- Allow users to read packing items for trips they have access to.
CREATE POLICY packing_select_by_owner
  ON public.packing_items
  FOR SELECT
  USING (public.user_has_trip_access(trip_id, auth.uid()));

DROP POLICY IF EXISTS packing_insert_by_owner ON public.packing_items;
-- Allow users to insert packing items for trips they can edit.
CREATE POLICY packing_insert_by_owner
  ON public.packing_items
  FOR INSERT
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS packing_update_by_owner ON public.packing_items;
-- Allow users to update packing items for trips they can edit.
CREATE POLICY packing_update_by_owner
  ON public.packing_items
  FOR UPDATE
  USING (public.user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS packing_delete_by_owner ON public.packing_items;
-- Allow users to delete packing items for trips they can edit.
CREATE POLICY packing_delete_by_owner
  ON public.packing_items
  FOR DELETE
  USING (public.user_can_edit_trip(trip_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Documents — access via trip ownership or membership.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS documents_select_by_owner ON public.documents;
-- Allow users to read documents for trips they have access to.
CREATE POLICY documents_select_by_owner
  ON public.documents
  FOR SELECT
  USING (public.user_has_trip_access(trip_id, auth.uid()));

DROP POLICY IF EXISTS documents_insert_by_owner ON public.documents;
-- Allow users to insert documents for trips they can edit.
CREATE POLICY documents_insert_by_owner
  ON public.documents
  FOR INSERT
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS documents_update_by_owner ON public.documents;
-- Allow users to update documents for trips they can edit.
CREATE POLICY documents_update_by_owner
  ON public.documents
  FOR UPDATE
  USING (public.user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS documents_delete_by_owner ON public.documents;
-- Allow users to delete documents for trips they can edit.
CREATE POLICY documents_delete_by_owner
  ON public.documents
  FOR DELETE
  USING (public.user_can_edit_trip(trip_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Budget entries — access via trip ownership or membership.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS budget_select_by_owner ON public.budget_entries;
-- Allow users to read budget entries for trips they have access to.
CREATE POLICY budget_select_by_owner
  ON public.budget_entries
  FOR SELECT
  USING (public.user_has_trip_access(trip_id, auth.uid()));

DROP POLICY IF EXISTS budget_insert_by_owner ON public.budget_entries;
-- Allow users to insert budget entries for trips they can edit.
CREATE POLICY budget_insert_by_owner
  ON public.budget_entries
  FOR INSERT
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS budget_update_by_owner ON public.budget_entries;
-- Allow users to update budget entries for trips they can edit.
CREATE POLICY budget_update_by_owner
  ON public.budget_entries
  FOR UPDATE
  USING (public.user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS budget_delete_by_owner ON public.budget_entries;
-- Allow users to delete budget entries for trips they can edit.
CREATE POLICY budget_delete_by_owner
  ON public.budget_entries
  FOR DELETE
  USING (public.user_can_edit_trip(trip_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Timeline events — access via trip ownership or membership.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS timeline_select_by_owner ON public.timeline_events;
-- Allow users to read timeline events for trips they have access to.
CREATE POLICY timeline_select_by_owner
  ON public.timeline_events
  FOR SELECT
  USING (public.user_has_trip_access(trip_id, auth.uid()));

DROP POLICY IF EXISTS timeline_insert_by_owner ON public.timeline_events;
-- Allow users to insert timeline events for trips they can edit.
CREATE POLICY timeline_insert_by_owner
  ON public.timeline_events
  FOR INSERT
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS timeline_update_by_owner ON public.timeline_events;
-- Allow users to update timeline events for trips they can edit.
CREATE POLICY timeline_update_by_owner
  ON public.timeline_events
  FOR UPDATE
  USING (public.user_can_edit_trip(trip_id, auth.uid()))
  WITH CHECK (public.user_can_edit_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS timeline_delete_by_owner ON public.timeline_events;
-- Allow users to delete timeline events for trips they can edit.
CREATE POLICY timeline_delete_by_owner
  ON public.timeline_events
  FOR DELETE
  USING (public.user_can_edit_trip(trip_id, auth.uid()));

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
-- Folder structure: <user_id>/<trip_id>/filename
-- This allows organizing documents by trip within each user's folder
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS storage_insert_user_folder ON storage.objects;
-- Allow users to upload files only into their own folder (user_id/trip_id/...).
-- Files must be organized as: <user_id>/<trip_id>/<filename>
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

DROP POLICY IF EXISTS storage_update_user_folder ON storage.objects;
-- Allow users to update files only in their own folder.
CREATE POLICY storage_update_user_folder
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND auth.uid() = owner
    AND POSITION(auth.uid()::text || '/' IN name) = 1
  )
  WITH CHECK (
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
