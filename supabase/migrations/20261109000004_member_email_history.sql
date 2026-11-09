-- ============================================================================
-- Migration: 20261109000004_member_email_history.sql
-- Description: Creates the authoritative member_email_history audit table for
--              tracking member email registrations, replacements, and removals.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.member_email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  previous_email TEXT,
  replacement_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('REGISTER', 'REPLACE', 'REMOVE')),
  performed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.member_email_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_email_history_select_authenticated" ON public.member_email_history;
CREATE POLICY "member_email_history_select_authenticated"
  ON public.member_email_history
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "member_email_history_super_admin_insert" ON public.member_email_history;
CREATE POLICY "member_email_history_super_admin_insert"
  ON public.member_email_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
