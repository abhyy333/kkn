-- ============================================================================
-- KKN SPACE — SELF-SERVICE MEMBER PROFILE & STRICT FIELD-LEVEL RLS MIGRATION
-- Target Project: scslevzuxxkfcuvwbtty
-- Purpose:
--   1. Allow authenticated members to edit ONLY their own membership & profile
--      fields (name, role/position, division, nim, major, faculty, avatar,
--      phone, emergency_contact, bio, responsibilities).
--   2. Strictly prevent non-super_admin users from modifying protected fields:
--      - system_role / authorization privileges
--      - member_access.role / member_access.system_role
--      - admin_accounts.role
--      - registered_emails.system_role
--      - auth_user_id, id, account_status, activated_at, disabled_at, email
--   3. Provide a secure field-specific RPC `public.update_own_member_profile`
--      that validates ownership via `auth.uid()`, updates permitted columns,
--      syncs non-privileged profile metadata across linked tables, and writes
--      an audit trail in `public.admin_activity_logs`.
--   4. Preserve `public.public_feedback` historical table & data while UI
--      feature "Kanal Aspirasi & Saran" is retired.
-- ============================================================================

-- 1. Ensure `public.admin_accounts` table exists and is strictly locked to super_admin
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'dpl')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_accounts_select_authenticated" ON public.admin_accounts;
CREATE POLICY "admin_accounts_select_authenticated"
  ON public.admin_accounts
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR auth_user_id = auth.uid()
    OR lower(email) = public.current_jwt_email()
  );

DROP POLICY IF EXISTS "admin_accounts_super_admin_manage" ON public.admin_accounts;
CREATE POLICY "admin_accounts_super_admin_manage"
  ON public.admin_accounts
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Ensure `public.member_access` has both `role` and `system_role` columns protected by super_admin
ALTER TABLE public.member_access
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'Anggota',
  ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'Umum',
  ADD COLUMN IF NOT EXISTS nim TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS major TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS faculty TEXT DEFAULT '-';

-- Protect `member_access.role` and `member_access.system_role` from non-super_admin changes
CREATE OR REPLACE FUNCTION public.enforce_member_access_role_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    IF NEW.system_role IS DISTINCT FROM OLD.system_role
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.member_id IS DISTINCT FROM OLD.member_id
       OR lower(COALESCE(NEW.email, '')) IS DISTINCT FROM lower(COALESCE(OLD.email, ''))
       OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Unauthorized: Only super_admin can modify system roles, user bindings, or access status.';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_member_access_role_protection ON public.member_access;
CREATE TRIGGER trg_enforce_member_access_role_protection
  BEFORE UPDATE ON public.member_access
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_access_role_protection();

-- Protect `registered_emails.system_role` from non-super_admin changes
CREATE OR REPLACE FUNCTION public.enforce_registered_emails_role_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    IF NEW.system_role IS DISTINCT FROM OLD.system_role
       OR lower(COALESCE(NEW.email, '')) IS DISTINCT FROM lower(COALESCE(OLD.email, ''))
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.used_by IS DISTINCT FROM OLD.used_by THEN
      RAISE EXCEPTION 'Unauthorized: Only super_admin can modify registered_emails.system_role or account status.';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_registered_emails_role_protection ON public.registered_emails;
CREATE TRIGGER trg_enforce_registered_emails_role_protection
  BEFORE UPDATE ON public.registered_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_registered_emails_role_protection();

-- 2. Ensure `public.members` has all required editable membership & profile columns
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'Anggota',
  ADD COLUMN IF NOT EXISTS nim TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS major TEXT DEFAULT 'Belum Diisi',
  ADD COLUMN IF NOT EXISTS faculty TEXT DEFAULT 'UIN Alauddin Makassar',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT DEFAULT '-',
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS responsibilities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Replace `enforce_member_self_edit_boundaries` trigger function on `public.members`
--    Allows authenticated members to update their OWN:
--      name, role, position, division, nim, major, faculty,
--      phone, emergency_contact, bio, avatar, avatar_url, avatar_storage_path, responsibilities
--    Blocks and rejects any attempt by a non-super_admin to modify:
--      id, system_role, auth_user_id, account_status, activated_at, disabled_at, email
CREATE OR REPLACE FUNCTION public.enforce_member_self_edit_boundaries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    -- Verify the caller actually owns this member record
    IF NOT (
      (OLD.auth_user_id IS NOT NULL AND OLD.auth_user_id = auth.uid())
      OR (
        OLD.email IS NOT NULL
        AND btrim(OLD.email) <> ''
        AND lower(btrim(OLD.email)) = public.current_jwt_email()
      )
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Members can only edit their own profile record.';
    END IF;

    -- Explicitly reject attempts to tamper with security/authorization columns
    IF NEW.system_role IS DISTINCT FROM OLD.system_role THEN
      RAISE EXCEPTION 'Unauthorized: Members cannot modify system_role or authorization privileges.';
    END IF;

    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id AND OLD.auth_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Unauthorized: Members cannot reassign auth_user_id.';
    END IF;

    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Unauthorized: Members cannot modify account_status.';
    END IF;

    -- Lock all protected columns to their existing authoritative values
    NEW.id := OLD.id;
    NEW.system_role := OLD.system_role;
    NEW.auth_user_id := COALESCE(OLD.auth_user_id, auth.uid());
    NEW.account_status := OLD.account_status;
    NEW.activated_at := OLD.activated_at;
    NEW.disabled_at := OLD.disabled_at;
    NEW.email := OLD.email;
  END IF;

  -- Keep `role` and `position` synchronized when either is updated
  IF NEW.role IS DISTINCT FROM OLD.role AND (NEW.position IS NULL OR NEW.position = OLD.position) THEN
    NEW.position := NEW.role;
  ELSIF NEW.position IS DISTINCT FROM OLD.position AND (NEW.role IS NULL OR NEW.role = OLD.role) THEN
    NEW.role := NEW.position;
  END IF;

  -- Keep `avatar` and `avatar_url` synchronized when either is updated
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url AND (NEW.avatar IS NULL OR NEW.avatar = OLD.avatar) THEN
    NEW.avatar := NEW.avatar_url;
  ELSIF NEW.avatar IS DISTINCT FROM OLD.avatar AND (NEW.avatar_url IS NULL OR NEW.avatar_url = OLD.avatar_url) THEN
    NEW.avatar_url := NEW.avatar;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_member_self_edit_boundaries ON public.members;
CREATE TRIGGER trg_enforce_member_self_edit_boundaries
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_self_edit_boundaries();

-- 4. Update RLS policies on `public.members` for self-service editing
DROP POLICY IF EXISTS "members_update_self_or_super_admin" ON public.members;
DROP POLICY IF EXISTS "members_update_self_contact_bio_photo" ON public.members;

CREATE POLICY "members_update_self_or_super_admin"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_active_member()
      AND (
        auth_user_id = auth.uid()
        OR (
          email IS NOT NULL
          AND btrim(email) <> ''
          AND lower(btrim(email)) = public.current_jwt_email()
        )
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_active_member()
      AND (
        auth_user_id = auth.uid()
        OR (
          email IS NOT NULL
          AND btrim(email) <> ''
          AND lower(btrim(email)) = public.current_jwt_email()
        )
      )
    )
  );

-- 5. Secure field-specific RPC function `public.update_own_member_profile`
--    Allows an authenticated member (or super_admin) to update permitted membership
--    and profile fields while preserving any field passed as NULL and logging the change.
CREATE OR REPLACE FUNCTION public.update_own_member_profile(
  p_member_id TEXT,
  p_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_division TEXT DEFAULT NULL,
  p_nim TEXT DEFAULT NULL,
  p_major TEXT DEFAULT NULL,
  p_faculty TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_emergency_contact TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_avatar_storage_path TEXT DEFAULT NULL,
  p_responsibilities JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := public.current_jwt_email();
  v_is_admin BOOLEAN := public.is_super_admin();
  v_target public.members%ROWTYPE;
  v_updated public.members%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Please sign in to update your profile.';
  END IF;

  SELECT *
  INTO v_target
  FROM public.members
  WHERE id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member record (%) not found.', p_member_id;
  END IF;

  -- Enforce strict ownership check unless caller is super_admin
  IF NOT v_is_admin THEN
    IF NOT public.is_active_member() THEN
      RAISE EXCEPTION 'Unauthorized: Your account is not active.';
    END IF;

    IF NOT (
      (v_target.auth_user_id IS NOT NULL AND v_target.auth_user_id = v_uid)
      OR (
        v_target.email IS NOT NULL
        AND btrim(v_target.email) <> ''
        AND lower(btrim(v_target.email)) = v_email
      )
    ) THEN
      RAISE EXCEPTION 'Unauthorized: You can only edit your own member profile.';
    END IF;
  END IF;

  UPDATE public.members
  SET
    name = COALESCE(NULLIF(btrim(p_name), ''), name),
    role = COALESCE(NULLIF(btrim(p_role), ''), role),
    position = COALESCE(NULLIF(btrim(p_role), ''), position, role),
    division = COALESCE(NULLIF(btrim(p_division), ''), division),
    nim = COALESCE(NULLIF(btrim(p_nim), ''), nim),
    major = COALESCE(NULLIF(btrim(p_major), ''), major),
    faculty = COALESCE(NULLIF(btrim(p_faculty), ''), faculty),
    phone = COALESCE(p_phone, phone),
    emergency_contact = COALESCE(p_emergency_contact, emergency_contact),
    bio = COALESCE(p_bio, bio),
    avatar = COALESCE(p_avatar_url, avatar),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    avatar_storage_path = COALESCE(p_avatar_storage_path, avatar_storage_path),
    responsibilities = COALESCE(p_responsibilities, responsibilities),
    auth_user_id = COALESCE(auth_user_id, CASE WHEN NOT v_is_admin THEN v_uid ELSE auth_user_id END),
    updated_at = now()
  WHERE id = p_member_id
  RETURNING * INTO v_updated;

  -- Synchronize non-privileged display metadata to `registered_emails` (never touching system_role/status)
  IF v_updated.email IS NOT NULL AND btrim(v_updated.email) <> '' THEN
    UPDATE public.registered_emails
    SET
      member_name = v_updated.name,
      name = v_updated.name,
      position = v_updated.role,
      division = v_updated.division,
      nim = v_updated.nim,
      major = v_updated.major,
      faculty = v_updated.faculty,
      phone = v_updated.phone,
      updated_at = now()
    WHERE lower(btrim(email)) = lower(btrim(v_updated.email));
  END IF;

  -- Synchronize non-privileged display metadata to `member_access` (never touching role/system_role)
  UPDATE public.member_access
  SET
    position = v_updated.role,
    division = v_updated.division,
    nim = v_updated.nim,
    major = v_updated.major,
    faculty = v_updated.faculty,
    updated_at = now()
  WHERE member_id = v_updated.id
     OR (v_updated.auth_user_id IS NOT NULL AND user_id = v_updated.auth_user_id);

  -- Record profile update in `admin_activity_logs`
  INSERT INTO public.admin_activity_logs (
    actor_user_id,
    actor_email,
    action,
    target_table,
    target_id,
    details
  ) VALUES (
    v_uid,
    v_email,
    CASE WHEN v_is_admin AND v_target.auth_user_id IS DISTINCT FROM v_uid THEN 'ADMIN_UPDATE_MEMBER_PROFILE' ELSE 'SELF_UPDATE_MEMBER_PROFILE' END,
    'members',
    v_updated.id,
    jsonb_build_object(
      'member_id', v_updated.id,
      'name', v_updated.name,
      'role', v_updated.role,
      'division', v_updated.division,
      'nim', v_updated.nim,
      'major', v_updated.major,
      'faculty', v_updated.faculty,
      'updated_at', v_updated.updated_at
    )
  );

  RETURN to_jsonb(v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_member_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_member_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
