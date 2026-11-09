-- Migration: 20261109000005_report_submissions_schema.sql
-- Dedicated report management, version control, and DPL review workflow schema

CREATE TABLE IF NOT EXISTS public.report_submissions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL DEFAULT 'pringgasela-selatan-2026',
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Laporan Mingguan',
    submitter_id TEXT,
    submitter_name TEXT NOT NULL,
    period TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    dpl_notes TEXT,
    file_name TEXT,
    file_url TEXT,
    file_size TEXT,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id TEXT NOT NULL REFERENCES public.report_submissions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size TEXT,
    storage_path TEXT,
    notes TEXT,
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id TEXT NOT NULL REFERENCES public.report_submissions(id) ON DELETE CASCADE,
    decision TEXT NOT NULL, -- 'approved', 'revision_requested', 'rejected'
    feedback TEXT NOT NULL,
    reviewed_by TEXT,
    reviewed_by_id TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for report_submissions
CREATE POLICY "Allow select for authenticated users on report_submissions"
    ON public.report_submissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow select for anon users on report_submissions"
    ON public.report_submissions FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow insert for authenticated users on report_submissions"
    ON public.report_submissions FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users on report_submissions"
    ON public.report_submissions FOR UPDATE
    TO authenticated
    USING (true);

-- Policies for report_versions
CREATE POLICY "Allow select for authenticated users on report_versions"
    ON public.report_versions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow select for anon users on report_versions"
    ON public.report_versions FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow insert for authenticated users on report_versions"
    ON public.report_versions FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policies for report_reviews
CREATE POLICY "Allow select for authenticated users on report_reviews"
    ON public.report_reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow select for anon users on report_reviews"
    ON public.report_reviews FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow insert for authenticated users on report_reviews"
    ON public.report_reviews FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_report_submissions_project ON public.report_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_report_submissions_status ON public.report_submissions(status);
CREATE INDEX IF NOT EXISTS idx_report_versions_report_id ON public.report_versions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_reviews_report_id ON public.report_reviews(report_id);
