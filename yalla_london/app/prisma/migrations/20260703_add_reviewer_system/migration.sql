-- Reviewer System Migration
-- Human content reviewers for E-E-A-T compliance
-- July 3, 2026

-- ==============================================================================
-- CREATE TABLES
-- ==============================================================================

-- Reviewer — Human content reviewer profile with OTP-based auth
CREATE TABLE IF NOT EXISTS "reviewers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "location" TEXT,
    "years_in_location" INTEGER,
    "expertise_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "linkedin_url" TEXT,
    "instagram_url" TEXT,
    "twitter_url" TEXT,
    "website_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_onboard',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "site_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accepted_terms_at" TIMESTAMP(3),
    "photo_ownership_agreed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3),

    CONSTRAINT "reviewers_pkey" PRIMARY KEY ("id")
);

-- ReviewerSession — OTP-based authentication sessions
CREATE TABLE IF NOT EXISTS "reviewer_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "reviewer_id" TEXT,
    "email" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "otp_expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "session_token" TEXT,
    "session_expires" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviewer_sessions_pkey" PRIMARY KEY ("id")
);

-- ContentReview — Assignment of content to reviewer with hidden time tracking
CREATE TABLE IF NOT EXISTS "content_reviews" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "reviewer_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "article_draft_id" TEXT,
    "blog_post_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,
    "instructions" TEXT,
    "first_opened_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "total_active_seconds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "due_date" TIMESTAMP(3),
    "title_edit" TEXT,
    "content_edit" TEXT,
    "meta_title_edit" TEXT,
    "meta_description_edit" TEXT,
    "experience_notes" TEXT,
    "facts_verified" BOOLEAN NOT NULL DEFAULT false,
    "insider_tips_added" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "reviewer_notes" TEXT,
    "admin_reviewed_at" TIMESTAMP(3),
    "admin_reviewed_by" TEXT,
    "admin_feedback" TEXT,
    "approval_status" TEXT,
    "applied_to_content_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- ReviewerPhoto — Photos uploaded or linked by reviewers
CREATE TABLE IF NOT EXISTS "reviewer_photos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "reviewer_id" TEXT NOT NULL,
    "content_review_id" TEXT,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "filename" TEXT,
    "alt_text" TEXT,
    "caption" TEXT,
    "license_type" TEXT NOT NULL,
    "ownership_declared" BOOLEAN NOT NULL DEFAULT false,
    "declaration_text" TEXT,
    "source_url" TEXT,
    "license_details" TEXT,
    "photographer_credit" TEXT,
    "taken_at" TIMESTAMP(3),
    "location" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "used_in_article_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviewer_photos_pkey" PRIMARY KEY ("id")
);

-- ==============================================================================
-- UNIQUE CONSTRAINTS
-- ==============================================================================

ALTER TABLE "reviewers" ADD CONSTRAINT IF NOT EXISTS "reviewers_email_key" UNIQUE ("email");
ALTER TABLE "reviewers" ADD CONSTRAINT IF NOT EXISTS "reviewers_slug_key" UNIQUE ("slug");
ALTER TABLE "reviewer_sessions" ADD CONSTRAINT IF NOT EXISTS "reviewer_sessions_session_token_key" UNIQUE ("session_token");

-- ==============================================================================
-- FOREIGN KEYS
-- ==============================================================================

-- reviewer_sessions -> reviewers
DO $$ BEGIN
    ALTER TABLE "reviewer_sessions" ADD CONSTRAINT "reviewer_sessions_reviewer_id_fkey" 
        FOREIGN KEY ("reviewer_id") REFERENCES "reviewers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- content_reviews -> reviewers
DO $$ BEGIN
    ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_reviewer_id_fkey" 
        FOREIGN KEY ("reviewer_id") REFERENCES "reviewers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- content_reviews -> article_drafts
DO $$ BEGIN
    ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_article_draft_id_fkey" 
        FOREIGN KEY ("article_draft_id") REFERENCES "article_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- content_reviews -> BlogPost
DO $$ BEGIN
    ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_blog_post_id_fkey" 
        FOREIGN KEY ("blog_post_id") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- reviewer_photos -> reviewers
DO $$ BEGIN
    ALTER TABLE "reviewer_photos" ADD CONSTRAINT "reviewer_photos_reviewer_id_fkey" 
        FOREIGN KEY ("reviewer_id") REFERENCES "reviewers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- reviewer_photos -> content_reviews
DO $$ BEGIN
    ALTER TABLE "reviewer_photos" ADD CONSTRAINT "reviewer_photos_content_review_id_fkey" 
        FOREIGN KEY ("content_review_id") REFERENCES "content_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS "reviewers_status_idx" ON "reviewers"("status");
CREATE INDEX IF NOT EXISTS "reviewers_email_idx" ON "reviewers"("email");

CREATE INDEX IF NOT EXISTS "reviewer_sessions_email_otp_code_idx" ON "reviewer_sessions"("email", "otp_code");
CREATE INDEX IF NOT EXISTS "reviewer_sessions_session_token_idx" ON "reviewer_sessions"("session_token");
CREATE INDEX IF NOT EXISTS "reviewer_sessions_otp_expires_at_idx" ON "reviewer_sessions"("otp_expires_at");

CREATE INDEX IF NOT EXISTS "content_reviews_reviewer_id_status_idx" ON "content_reviews"("reviewer_id", "status");
CREATE INDEX IF NOT EXISTS "content_reviews_site_id_status_idx" ON "content_reviews"("site_id", "status");
CREATE INDEX IF NOT EXISTS "content_reviews_status_due_date_idx" ON "content_reviews"("status", "due_date");
CREATE INDEX IF NOT EXISTS "content_reviews_article_draft_id_idx" ON "content_reviews"("article_draft_id");
CREATE INDEX IF NOT EXISTS "content_reviews_blog_post_id_idx" ON "content_reviews"("blog_post_id");

CREATE INDEX IF NOT EXISTS "reviewer_photos_reviewer_id_idx" ON "reviewer_photos"("reviewer_id");
CREATE INDEX IF NOT EXISTS "reviewer_photos_content_review_id_idx" ON "reviewer_photos"("content_review_id");
CREATE INDEX IF NOT EXISTS "reviewer_photos_license_type_idx" ON "reviewer_photos"("license_type");

-- ==============================================================================
-- BLOGPOST REVIEWER COLUMNS
-- ==============================================================================

ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "reviewer_id" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "reviewer_byline" TEXT;
CREATE INDEX IF NOT EXISTS "BlogPost_reviewer_id_idx" ON "BlogPost"("reviewer_id");
