-- =============================================================================
-- KKN SPACE — SUPABASE ADMIN CONSOLE, AUTHORITATIVE ROSTER, & RLS MIGRATION
-- Project ID: scslevzuxxkfcuvwbtty
-- Purpose:
--   1. Ensure schema support for full Admin Console CRUD across all modules
--   2. Preserve existing valid Supabase records while guaranteeing the 10-member
--      authoritative KKN roster & separate DPL supervisor record
--   3. Configure strict Row Level Security (RLS) policies for super_admin,
--      active KKN members, DPL supervisors, and public read access
--   4. Enforce append-only system activity logs (admin_activity_logs)
--   5. Protect the last remaining super_admin (abhyy333@gmail.com) from deletion
--      or suspension at the database level
-- =============================================================================

-- 1. Helper Functions for Role & Status Verification
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND (
        lower(u.email) = 'abhyy333@gmail.com'
        OR EXISTS (
          SELECT 1 FROM public.registered_emails re
          WHERE lower(re.email) = lower(u.email)
            AND re.system_role = 'super_admin'
            AND COALESCE(re.status, 'activated') <> 'disabled'
            AND COALESCE(re.is_active, true) = true
        )
        OR EXISTS (
          SELECT 1 FROM public.member_access ma
          WHERE (ma.auth_user_id = u.id OR lower(ma.email) = lower(u.email))
            AND ma.system_role = 'super_admin'
            AND COALESCE(ma.status, 'active') <> 'disabled'
            AND COALESCE(ma.is_active, true) = true
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.registered_emails re ON lower(re.email) = lower(u.email)
    WHERE u.id = auth.uid()
      AND COALESCE(re.status, 'activated') <> 'disabled'
      AND COALESCE(re.is_active, true) = true
      AND re.system_role IN ('member', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dpl()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.registered_emails re ON lower(re.email) = lower(u.email)
    WHERE u.id = auth.uid()
      AND COALESCE(re.status, 'activated') <> 'disabled'
      AND COALESCE(re.is_active, true) = true
      AND re.system_role = 'dpl'
  );
$$;

-- 2. Core Identity & Account Tables (Idempotent Enhancements)
CREATE TABLE IF NOT EXISTS public.registered_emails (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  member_id text NOT NULL,
  member_name text NOT NULL,
  position text NOT NULL,
  division text NOT NULL,
  system_role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending_activation',
  is_active boolean NOT NULL DEFAULT true,
  auth_user_id uuid,
  registered_by text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  disabled_at timestamptz,
  disabled_reason text
);

ALTER TABLE public.registered_emails ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.registered_emails ADD COLUMN IF NOT EXISTS disabled_at timestamptz;
ALTER TABLE public.registered_emails ADD COLUMN IF NOT EXISTS disabled_reason text;

CREATE TABLE IF NOT EXISTS public.member_access (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  member_id text NOT NULL,
  member_name text NOT NULL,
  position text NOT NULL,
  division text NOT NULL,
  system_role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending_activation',
  is_active boolean NOT NULL DEFAULT true,
  auth_user_id uuid,
  activated_at timestamptz,
  disabled_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.member_access ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.member_access ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

CREATE TABLE IF NOT EXISTS public.members (
  id text PRIMARY KEY,
  name text NOT NULL,
  nim text DEFAULT '-',
  major text DEFAULT 'Universitas Mataram',
  faculty text DEFAULT 'Universitas Mataram',
  role text NOT NULL,
  division text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '-',
  avatar text DEFAULT '',
  status text DEFAULT 'Offline',
  tasks_completed integer DEFAULT 0,
  total_tasks integer DEFAULT 0,
  contribution_score integer DEFAULT 100,
  auth_user_id uuid,
  account_status text DEFAULT 'unregistered',
  system_role text DEFAULT 'member',
  activated_at timestamptz,
  disabled_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

-- Separate Supervisor (DPL) Table so DPL is never mixed as an 11th student member
CREATE TABLE IF NOT EXISTS public.dpl_supervisors (
  id text PRIMARY KEY,
  name text NOT NULL,
  nip text NOT NULL,
  title text NOT NULL DEFAULT 'Dosen Pembimbing Lapangan',
  faculty text NOT NULL DEFAULT 'Universitas Mataram',
  email text DEFAULT '',
  phone text DEFAULT '',
  avatar text DEFAULT '',
  auth_user_id uuid,
  account_status text DEFAULT 'unregistered',
  updated_at timestamptz DEFAULT now()
);

-- Seed DPL record if not exists
INSERT INTO public.dpl_supervisors (id, name, nip, title, faculty)
VALUES ('dpl-1', 'Dr. Lalu Syamsuddin, M.Si.', '19780412 200501 1 002', 'Dosen Pembimbing Lapangan', 'Universitas Mataram')
ON CONFLICT (id) DO NOTHING;

-- Authoritative Super Admin seed (Abdul Habir Al Majdi — Divisi Acara 1)
INSERT INTO public.registered_emails (
  id, email, member_id, member_name, position, division, system_role, status, is_active, registered_by
)
VALUES (
  're-admin-1',
  'abhyy333@gmail.com',
  'm-4',
  'Abdul Habir Al Majdi',
  'Divisi Acara 1',
  'Divisi Acara',
  'super_admin',
  'activated',
  true,
  'System Initialization'
)
ON CONFLICT (email) DO UPDATE SET
  member_id = 'm-4',
  member_name = 'Abdul Habir Al Majdi',
  position = 'Divisi Acara 1',
  division = 'Divisi Acara',
  system_role = 'super_admin',
  is_active = true;

-- 3. Prevent Disabling or Deleting the Last Remaining Super Admin
CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_loss()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_admins integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.system_role = 'super_admin' OR lower(OLD.email) = 'abhyy333@gmail.com' THEN
      SELECT count(*) INTO remaining_admins
      FROM public.registered_emails
      WHERE system_role = 'super_admin'
        AND COALESCE(status, 'activated') <> 'disabled'
        AND COALESCE(is_active, true) = true
        AND id <> OLD.id;
      IF remaining_admins < 1 OR lower(OLD.email) = 'abhyy333@gmail.com' THEN
        RAISE EXCEPTION 'Operasi ditolak: Tidak dapat menghapus akun Super Admin utama atau Super Admin terakhir.';
      END IF;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.system_role = 'super_admin' OR lower(OLD.email) = 'abhyy333@gmail.com')
       AND (NEW.system_role <> 'super_admin' OR NEW.status = 'disabled' OR NEW.is_active = false) THEN
      SELECT count(*) INTO remaining_admins
      FROM public.registered_emails
      WHERE system_role = 'super_admin'
        AND COALESCE(status, 'activated') <> 'disabled'
        AND COALESCE(is_active, true) = true
        AND id <> OLD.id;
      IF remaining_admins < 1 OR lower(OLD.email) = 'abhyy333@gmail.com' THEN
        RAISE EXCEPTION 'Operasi ditolak: Tidak dapat menonaktifkan atau menurunkan hak akses Super Admin utama/terakhir.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_super_admin ON public.registered_emails;
CREATE TRIGGER trg_protect_super_admin
BEFORE UPDATE OR DELETE ON public.registered_emails
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_super_admin_loss();

-- 4. Application Module Tables (Idempotent Creation)
CREATE TABLE IF NOT EXISTS public.meetings (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_private boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.decisions (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_private boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.village_research (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stakeholders (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  dusun text NOT NULL,
  category text NOT NULL,
  phone text DEFAULT '',
  influence text DEFAULT 'Tinggi',
  notes text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.surveys (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.programs (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentation (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.archive (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Pengumuman Internal',
  content text NOT NULL,
  author_name text NOT NULL,
  date text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_published boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_articles (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_feedback (
  id text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id text PRIMARY KEY,
  actor_email text NOT NULL,
  actor_name text NOT NULL,
  action text NOT NULL,
  target text NOT NULL,
  details text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- 5. Enforce Append-Only Integrity on admin_activity_logs
CREATE OR REPLACE FUNCTION public.enforce_append_only_activity_logs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Operasi ditolak: Tabel admin_activity_logs bersifat append-only dan tidak dapat diubah atau dihapus.';
END;
$$;

DROP TRIGGER IF EXISTS trg_append_only_activity_logs ON public.admin_activity_logs;
CREATE TRIGGER trg_append_only_activity_logs
BEFORE UPDATE OR DELETE ON public.admin_activity_logs
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only_activity_logs();

-- 6. Enable Row Level Security (RLS) on All Tables
ALTER TABLE public.registered_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpl_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. Row Level Security Policies
-- 7A. Super Admin Full Access Across All Operational Tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'registered_emails', 'member_access', 'members', 'dpl_supervisors',
    'meetings', 'decisions', 'tasks', 'village_research', 'stakeholders',
    'surveys', 'programs', 'documentation', 'reports', 'archive',
    'transactions', 'inventory', 'announcements', 'public_articles', 'public_feedback'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS super_admin_full_access ON public.%I;', tbl);
    EXECUTE format(
      'CREATE POLICY super_admin_full_access ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
      tbl
    );
  END LOOP;
END $$;

-- 7B. Active KKN Member & DPL Access Policies
DROP POLICY IF EXISTS authenticated_read_registered_emails ON public.registered_emails;
CREATE POLICY authenticated_read_registered_emails ON public.registered_emails
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS member_read_members ON public.members;
CREATE POLICY member_read_members ON public.members
  FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.is_dpl());

DROP POLICY IF EXISTS member_update_own_profile ON public.members;
CREATE POLICY member_update_own_profile ON public.members
  FOR UPDATE TO authenticated
  USING (public.is_active_member() AND (auth_user_id = auth.uid() OR lower(email) = lower(auth.jwt()->>'email')))
  WITH CHECK (public.is_active_member());

-- Workspace collaborative tables for active KKN members
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'meetings', 'decisions', 'tasks', 'village_research', 'stakeholders',
    'surveys', 'programs', 'documentation', 'reports', 'archive',
    'transactions', 'inventory', 'announcements', 'public_articles'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS active_member_collab_access ON public.%I;', tbl);
    EXECUTE format(
      'CREATE POLICY active_member_collab_access ON public.%I FOR ALL TO authenticated USING (public.is_active_member()) WITH CHECK (public.is_active_member());',
      tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS dpl_read_access ON public.%I;', tbl);
    EXECUTE format(
      'CREATE POLICY dpl_read_access ON public.%I FOR SELECT TO authenticated USING (public.is_dpl());',
      tbl
    );
  END LOOP;
END $$;

-- DPL can update reports (for evaluation notes and verification status)
DROP POLICY IF EXISTS dpl_evaluate_reports ON public.reports;
CREATE POLICY dpl_evaluate_reports ON public.reports
  FOR UPDATE TO authenticated
  USING (public.is_dpl())
  WITH CHECK (public.is_dpl());

-- Public Website Read Policies (Only published content; private contacts hidden)
DROP POLICY IF EXISTS public_read_published_programs ON public.programs;
CREATE POLICY public_read_published_programs ON public.programs
  FOR SELECT TO anon
  USING (COALESCE(is_published, true) = true);

DROP POLICY IF EXISTS public_read_published_documentation ON public.documentation;
CREATE POLICY public_read_published_documentation ON public.documentation
  FOR SELECT TO anon
  USING (COALESCE(is_published, true) = true);

DROP POLICY IF EXISTS public_read_published_articles ON public.public_articles;
CREATE POLICY public_read_published_articles ON public.public_articles
  FOR SELECT TO anon
  USING (COALESCE(is_published, true) = true);

DROP POLICY IF EXISTS public_insert_feedback ON public.public_feedback;
CREATE POLICY public_insert_feedback ON public.public_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Append-Only Admin Activity Logs Policies
DROP POLICY IF EXISTS super_admin_read_logs ON public.admin_activity_logs;
CREATE POLICY super_admin_read_logs ON public.admin_activity_logs
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS super_admin_insert_logs ON public.admin_activity_logs;
CREATE POLICY super_admin_insert_logs ON public.admin_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.is_active_member());
