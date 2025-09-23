-- =============================================================================
-- YALLA LONDON - SEO TABLES ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
-- This file contains RLS policies for SEO-related tables in Supabase
-- Run this in the Supabase SQL Editor after creating the SEO tables

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all SEO tables
ALTER TABLE seo_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_page_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_internal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_sitemap_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_hreflang_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_structured_data ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLICY PROFILE A: LOCKED (Default - Service Role Only)
-- =============================================================================
-- This is the default secure configuration where only the service role
-- can read/write to SEO tables. Use this for production environments.

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "seo_meta_service_role_only" ON seo_meta;
DROP POLICY IF EXISTS "seo_audit_results_service_role_only" ON seo_audit_results;
DROP POLICY IF EXISTS "seo_page_metrics_service_role_only" ON seo_page_metrics;
DROP POLICY IF EXISTS "seo_redirects_service_role_only" ON seo_redirects;
DROP POLICY IF EXISTS "seo_internal_links_service_role_only" ON seo_internal_links;
DROP POLICY IF EXISTS "seo_keywords_service_role_only" ON seo_keywords;
DROP POLICY IF EXISTS "seo_content_analysis_service_role_only" ON seo_content_analysis;
DROP POLICY IF EXISTS "seo_reports_service_role_only" ON seo_reports;
DROP POLICY IF EXISTS "seo_health_metrics_service_role_only" ON seo_health_metrics;
DROP POLICY IF EXISTS "seo_sitemap_entries_service_role_only" ON seo_sitemap_entries;
DROP POLICY IF EXISTS "seo_hreflang_entries_service_role_only" ON seo_hreflang_entries;
DROP POLICY IF EXISTS "seo_structured_data_service_role_only" ON seo_structured_data;

-- Create service role only policies
CREATE POLICY "seo_meta_service_role_only" ON seo_meta
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_audit_results_service_role_only" ON seo_audit_results
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_page_metrics_service_role_only" ON seo_page_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_redirects_service_role_only" ON seo_redirects
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_internal_links_service_role_only" ON seo_internal_links
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_keywords_service_role_only" ON seo_keywords
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_content_analysis_service_role_only" ON seo_content_analysis
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_reports_service_role_only" ON seo_reports
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_health_metrics_service_role_only" ON seo_health_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_sitemap_entries_service_role_only" ON seo_sitemap_entries
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_hreflang_entries_service_role_only" ON seo_hreflang_entries
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_structured_data_service_role_only" ON seo_structured_data
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- POLICY PROFILE B: PUBLIC-READ (Optional - For Public SEO Data)
-- =============================================================================
-- This configuration allows anonymous users to read published SEO data
-- while maintaining write restrictions to service role only.
-- 
-- NOTE: This assumes you have an 'is_published' column in seo_meta.
-- If you don't have this column, add it first:
-- ALTER TABLE seo_meta ADD COLUMN is_published BOOLEAN DEFAULT false;

-- Uncomment the following policies if you want to allow public read access
-- to published SEO data:

/*
-- Drop service role only policies
DROP POLICY IF EXISTS "seo_meta_service_role_only" ON seo_meta;
DROP POLICY IF EXISTS "seo_audit_results_service_role_only" ON seo_audit_results;
DROP POLICY IF EXISTS "seo_page_metrics_service_role_only" ON seo_page_metrics;

-- Create public read policies for seo_meta
CREATE POLICY "seo_meta_public_read" ON seo_meta
    FOR SELECT USING (is_published = true);

CREATE POLICY "seo_meta_service_write" ON seo_meta
    FOR ALL USING (auth.role() = 'service_role');

-- Create public read policies for seo_audit_results (only for published pages)
CREATE POLICY "seo_audit_results_public_read" ON seo_audit_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM seo_meta 
            WHERE seo_meta.page_id = seo_audit_results.page_id 
            AND seo_meta.is_published = true
        )
    );

CREATE POLICY "seo_audit_results_service_write" ON seo_audit_results
    FOR ALL USING (auth.role() = 'service_role');

-- Create public read policies for seo_page_metrics (only for published pages)
CREATE POLICY "seo_page_metrics_public_read" ON seo_page_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM seo_meta 
            WHERE seo_meta.page_id = seo_page_metrics.page_id 
            AND seo_meta.is_published = true
        )
    );

CREATE POLICY "seo_page_metrics_service_write" ON seo_page_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- Keep other tables service role only
CREATE POLICY "seo_redirects_service_role_only" ON seo_redirects
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_internal_links_service_role_only" ON seo_internal_links
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_keywords_service_role_only" ON seo_keywords
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_content_analysis_service_role_only" ON seo_content_analysis
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_reports_service_role_only" ON seo_reports
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_health_metrics_service_role_only" ON seo_health_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_sitemap_entries_service_role_only" ON seo_sitemap_entries
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_hreflang_entries_service_role_only" ON seo_hreflang_entries
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "seo_structured_data_service_role_only" ON seo_structured_data
    FOR ALL USING (auth.role() = 'service_role');
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these queries to verify RLS is working correctly:

-- Check if RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'seo_%' 
ORDER BY tablename;

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE 'seo_%' 
ORDER BY tablename, policyname;

-- Test service role access (should work)
-- SET ROLE service_role;
-- SELECT COUNT(*) FROM seo_meta;

-- Test anonymous access (should fail with LOCKED policy, work with PUBLIC-READ)
-- SET ROLE anon;
-- SELECT COUNT(*) FROM seo_meta;




