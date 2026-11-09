-- =============================================================================
-- KKN SPACE — PROFILE BIO, MULTI-PHOTO DOCUMENTATION ALBUMS & STORAGE RLS
-- Project ID: scslevzuxxkfcuvwbtty
-- Purpose:
--   1. Add personal biography (`bio`) column to `public.members` while keeping
--      position, division, nim, and system_role strictly admin-managed.
--   2. Create `public.documentation_albums` and `public.documentation_photos`
--      tables to store multi-photo activity documentation albums and photo items.
--   3. Configure Row Level Security (RLS) for albums, photos, and Supabase
--      Storage bucket `kkn-space` so public visitors only see published content.
-- =============================================================================

-- 1. Member Personal Profile Enhancement
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS avatar_storage_path text DEFAULT '';

-- Trigger to prevent non-super_admin users from escalating their own role, division, position, or NIM
CREATE OR REPLACE FUNCTION public.enforce_member_self_edit_boundaries()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    -- Preserve admin-managed fields
    NEW.name := OLD.name;
    NEW.role := OLD.role;
    NEW.division := OLD.division;
    NEW.nim := OLD.nim;
    NEW.system_role := OLD.system_role;
    NEW.account_status := OLD.account_status;
    NEW.email := OLD.email;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_self_edit_boundaries ON public.members;
CREATE TRIGGER trg_member_self_edit_boundaries
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.enforce_member_self_edit_boundaries();

-- 2. Multi-Photo Documentation Albums Schema
CREATE TABLE IF NOT EXISTS public.documentation_albums (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  date text NOT NULL,
  dusun text NOT NULL DEFAULT 'Dusun Gubuk Lauk',
  location text NOT NULL DEFAULT 'Desa Pringgasela Selatan',
  address_detail text DEFAULT '',
  category text NOT NULL DEFAULT 'Program Kerja',
  photographer text NOT NULL DEFAULT 'Divisi PDD',
  cover_photo_url text DEFAULT '',
  verification_status text NOT NULL DEFAULT 'verified',
  is_published boolean NOT NULL DEFAULT false,
  program_id text,
  survey_id text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentation_photos (
  id text PRIMARY KEY,
  album_id text NOT NULL REFERENCES public.documentation_albums(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text DEFAULT '',
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  size_formatted text DEFAULT '',
  uploaded_by text DEFAULT '',
  is_approved_for_public boolean NOT NULL DEFAULT true,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentation_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_photos ENABLE ROW LEVEL SECURITY;

-- Super Admin Full CRUD on Albums & Photos
DROP POLICY IF EXISTS super_admin_full_access_albums ON public.documentation_albums;
CREATE POLICY super_admin_full_access_albums ON public.documentation_albums
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS super_admin_full_access_album_photos ON public.documentation_photos;
CREATE POLICY super_admin_full_access_album_photos ON public.documentation_photos
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Active KKN Members can read and manage workspace albums
DROP POLICY IF EXISTS active_member_collab_albums ON public.documentation_albums;
CREATE POLICY active_member_collab_albums ON public.documentation_albums
  FOR ALL TO authenticated
  USING (public.is_active_member())
  WITH CHECK (public.is_active_member());

DROP POLICY IF EXISTS active_member_collab_album_photos ON public.documentation_photos;
CREATE POLICY active_member_collab_album_photos ON public.documentation_photos
  FOR ALL TO authenticated
  USING (public.is_active_member())
  WITH CHECK (public.is_active_member());

-- DPL Read Access
DROP POLICY IF EXISTS dpl_read_albums ON public.documentation_albums;
CREATE POLICY dpl_read_albums ON public.documentation_albums
  FOR SELECT TO authenticated
  USING (public.is_dpl());

DROP POLICY IF EXISTS dpl_read_album_photos ON public.documentation_photos;
CREATE POLICY dpl_read_album_photos ON public.documentation_photos
  FOR SELECT TO authenticated
  USING (public.is_dpl());

-- Public Website Visitors: Read ONLY published albums and approved photos
DROP POLICY IF EXISTS public_read_published_albums ON public.documentation_albums;
CREATE POLICY public_read_published_albums ON public.documentation_albums
  FOR SELECT TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS public_read_approved_album_photos ON public.documentation_photos;
CREATE POLICY public_read_approved_album_photos ON public.documentation_photos
  FOR SELECT TO anon
  USING (
    is_approved_for_public = true
    AND EXISTS (
      SELECT 1 FROM public.documentation_albums a
      WHERE a.id = documentation_photos.album_id
        AND a.is_published = true
    )
  );

-- 3. Supabase Storage Bucket & Policies (`kkn-space`)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kkn-space', 'kkn-space', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS storage_public_read_kkn_space ON storage.objects;
CREATE POLICY storage_public_read_kkn_space ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'kkn-space');

DROP POLICY IF EXISTS storage_authenticated_upload_kkn_space ON storage.objects;
CREATE POLICY storage_authenticated_upload_kkn_space ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kkn-space' AND (public.is_active_member() OR public.is_super_admin()));

DROP POLICY IF EXISTS storage_authenticated_update_kkn_space ON storage.objects;
CREATE POLICY storage_authenticated_update_kkn_space ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kkn-space' AND (public.is_active_member() OR public.is_super_admin()));

DROP POLICY IF EXISTS storage_authenticated_delete_kkn_space ON storage.objects;
CREATE POLICY storage_authenticated_delete_kkn_space ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kkn-space' AND (public.is_active_member() OR public.is_super_admin()));
