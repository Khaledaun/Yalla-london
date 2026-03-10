-- =============================================================
-- CONSOLIDATED MIGRATION v2: 52 tables + 10 enums
-- Generated: 2026-03-10
-- BULLETPROOF: handles tables that partially exist
-- Strategy: CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN
-- Run in Supabase SQL Editor (paste entire script)
-- =============================================================

-- ─── STEP 1: Create Missing Enums ───────────────────────────

DO $$ BEGIN CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SkillCategory" AS ENUM ('ENGINEERING', 'AI_ML', 'DESIGN', 'DATA', 'CONTENT', 'MARKETING', 'PSYCHOLOGY', 'BUSINESS', 'TRAVEL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Proficiency" AS ENUM ('LEARNING', 'PROFICIENT', 'EXPERT', 'THOUGHT_LEADER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CreditRole" AS ENUM ('AUTHOR', 'CO_AUTHOR', 'EDITOR', 'CONTRIBUTOR', 'PHOTOGRAPHER', 'RESEARCHER', 'ADVISOR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PartnerType" AS ENUM ('HOTEL', 'EXPERIENCE', 'INSURANCE', 'FLIGHT', 'TRANSFER', 'EQUIPMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'BOOKED', 'COMPLETED', 'CANCELLED', 'PAID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeadType" AS ENUM ('NEWSLETTER', 'GUIDE_DOWNLOAD', 'TRIP_INQUIRY', 'QUOTE_REQUEST', 'CONSULTATION', 'CONTACT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUALIFIED', 'CONTACTED', 'ENGAGED', 'CONVERTED', 'SOLD', 'UNQUALIFIED', 'UNSUBSCRIBED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProductType" AS ENUM ('PDF_GUIDE', 'SPREADSHEET', 'TEMPLATE', 'BUNDLE', 'MEMBERSHIP', 'WALL_ART', 'PRESET', 'PLANNER', 'STICKER', 'WORKSHEET', 'EVENT_GUIDE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── STEP 2: Create Tables + Backfill Missing Columns ───────

-- AffiliateAssignment → "AffiliateAssignment"
CREATE TABLE IF NOT EXISTS "AffiliateAssignment" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "widget_id" TEXT,
    "content_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "placement_data" JSONB,
    "auto_assigned" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffiliateAssignment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "partner_id" TEXT;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "widget_id" TEXT;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "content_id" TEXT;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "content_type" TEXT;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "placement_data" JSONB;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "auto_assigned" BOOLEAN DEFAULT false;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 1;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "impressions" INTEGER DEFAULT 0;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "clicks" INTEGER DEFAULT 0;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "conversions" INTEGER DEFAULT 0;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "revenue" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AffiliateAssignment" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AffiliateAssignment_siteId_idx" ON "AffiliateAssignment"("siteId");
CREATE INDEX IF NOT EXISTS "AffiliateAssignment_partner_id_idx" ON "AffiliateAssignment"("partner_id");
CREATE INDEX IF NOT EXISTS "AffiliateAssignment_content_id_content_type_idx" ON "AffiliateAssignment"("content_id", "content_type");
CREATE INDEX IF NOT EXISTS "AffiliateAssignment_is_active_idx" ON "AffiliateAssignment"("is_active");

-- AffiliateClick → "affiliate_clicks"
CREATE TABLE IF NOT EXISTS "affiliate_clicks" (
    "id" TEXT,
    "site_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "resort_id" TEXT,
    "product_id" TEXT,
    "article_id" TEXT,
    "link_type" TEXT,
    "session_id" TEXT NOT NULL,
    "visitor_id" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "referrer" TEXT,
    "landing_page" TEXT,
    "user_agent" TEXT,
    "device_type" TEXT,
    "country_code" TEXT,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "partner_id" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "resort_id" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "product_id" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "article_id" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "link_type" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "session_id" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "visitor_id" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "utm_source" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "utm_medium" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "utm_campaign" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "utm_content" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "utm_term" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "referrer" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "landing_page" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "device_type" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "country_code" TEXT;
ALTER TABLE "affiliate_clicks" ADD COLUMN IF NOT EXISTS "clicked_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "affiliate_clicks_site_id_clicked_at_idx" ON "affiliate_clicks"("site_id", "clicked_at");
CREATE INDEX IF NOT EXISTS "affiliate_clicks_partner_id_idx" ON "affiliate_clicks"("partner_id");
CREATE INDEX IF NOT EXISTS "affiliate_clicks_resort_id_idx" ON "affiliate_clicks"("resort_id");
CREATE INDEX IF NOT EXISTS "affiliate_clicks_session_id_idx" ON "affiliate_clicks"("session_id");

-- AffiliatePartner → "AffiliatePartner"
CREATE TABLE IF NOT EXISTS "AffiliatePartner" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "partner_type" TEXT NOT NULL,
    "api_endpoint" TEXT,
    "api_key_encrypted" TEXT,
    "commission_rate" DOUBLE PRECISION,
    "contact_info" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "sync_status" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "AffiliatePartner_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "partner_type" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "api_endpoint" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "api_key_encrypted" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "commission_rate" DOUBLE PRECISION;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "contact_info" JSONB;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMP(3);
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "sync_status" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
ALTER TABLE "AffiliatePartner" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AffiliatePartner_siteId_idx" ON "AffiliatePartner"("siteId");
CREATE INDEX IF NOT EXISTS "AffiliatePartner_partner_type_idx" ON "AffiliatePartner"("partner_type");
CREATE INDEX IF NOT EXISTS "AffiliatePartner_is_active_idx" ON "AffiliatePartner"("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "AffiliatePartner_siteId_slug_key" ON "AffiliatePartner"("siteId", "slug");

-- AffiliateWidget → "AffiliateWidget"
CREATE TABLE IF NOT EXISTS "AffiliateWidget" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widget_type" TEXT NOT NULL,
    "config_json" JSONB NOT NULL,
    "preview_url" TEXT,
    "placement_rules" JSONB,
    "auto_placement" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "AffiliateWidget_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "partner_id" TEXT;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "widget_type" TEXT;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "config_json" JSONB;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "preview_url" TEXT;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "placement_rules" JSONB;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "auto_placement" BOOLEAN DEFAULT false;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
ALTER TABLE "AffiliateWidget" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AffiliateWidget_siteId_idx" ON "AffiliateWidget"("siteId");
CREATE INDEX IF NOT EXISTS "AffiliateWidget_partner_id_idx" ON "AffiliateWidget"("partner_id");
CREATE INDEX IF NOT EXISTS "AffiliateWidget_widget_type_idx" ON "AffiliateWidget"("widget_type");
CREATE INDEX IF NOT EXISTS "AffiliateWidget_is_active_idx" ON "AffiliateWidget"("is_active");

-- Agreement → "Agreement"
CREATE TABLE IF NOT EXISTS "Agreement" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agreement_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "effective_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "signatures" JSONB,
    "signed_at" TIMESTAMP(3),
    "signed_by" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "agreement_type" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "version" TEXT DEFAULT '1.0';
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "effective_date" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "expiry_date" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "signatures" JSONB;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "signed_at" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "signed_by" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Agreement_siteId_idx" ON "Agreement"("siteId");
CREATE INDEX IF NOT EXISTS "Agreement_agreement_type_idx" ON "Agreement"("agreement_type");
CREATE INDEX IF NOT EXISTS "Agreement_status_idx" ON "Agreement"("status");
CREATE INDEX IF NOT EXISTS "Agreement_effective_date_idx" ON "Agreement"("effective_date");

-- AnalyticsEvent → "AnalyticsEvent"
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id" TEXT,
    "eventName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'engagement',
    "label" TEXT,
    "value" DOUBLE PRECISION,
    "userId" TEXT,
    "sessionId" TEXT,
    "properties" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "eventName" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'engagement';
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "properties" JSONB;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "referer" TEXT;
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_eventName_idx" ON "AnalyticsEvent"("eventName");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_category_idx" ON "AnalyticsEvent"("category");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_timestamp_idx" ON "AnalyticsEvent"("timestamp");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- AuditLog → "AuditLog"
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "resource" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "resourceId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "details" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "success" BOOLEAN DEFAULT true;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_resource_idx" ON "AuditLog"("resource");

-- AuditLogPremium → "AuditLogPremium"
CREATE TABLE IF NOT EXISTS "AuditLogPremium" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "trace_id" TEXT,
    "reversible" BOOLEAN NOT NULL DEFAULT false,
    "reverse_operation" JSONB,
    "reversed_at" TIMESTAMP(3),
    "reversed_by" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLogPremium_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "resource" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "resourceId" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "details" JSONB;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "success" BOOLEAN DEFAULT true;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "trace_id" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "reversible" BOOLEAN DEFAULT false;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "reverse_operation" JSONB;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMP(3);
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "reversed_by" TEXT;
ALTER TABLE "AuditLogPremium" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "AuditLogPremium_siteId_idx" ON "AuditLogPremium"("siteId");
CREATE INDEX IF NOT EXISTS "AuditLogPremium_userId_idx" ON "AuditLogPremium"("userId");
CREATE INDEX IF NOT EXISTS "AuditLogPremium_action_idx" ON "AuditLogPremium"("action");
CREATE INDEX IF NOT EXISTS "AuditLogPremium_timestamp_idx" ON "AuditLogPremium"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLogPremium_resource_idx" ON "AuditLogPremium"("resource");
CREATE INDEX IF NOT EXISTS "AuditLogPremium_reversible_idx" ON "AuditLogPremium"("reversible");

-- BackgroundJob → "BackgroundJob"
CREATE TABLE IF NOT EXISTS "BackgroundJob" (
    "id" TEXT,
    "site_id" TEXT,
    "job_name" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "schedule_cron" TEXT,
    "parameters_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "result_json" JSONB,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "job_name" TEXT;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "job_type" TEXT;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "schedule_cron" TEXT;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "parameters_json" JSONB;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3);
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "duration_ms" INTEGER;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "result_json" JSONB;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "max_retries" INTEGER DEFAULT 3;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "next_run_at" TIMESTAMP(3);
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "BackgroundJob_site_id_idx" ON "BackgroundJob"("site_id");
CREATE INDEX IF NOT EXISTS "BackgroundJob_job_name_idx" ON "BackgroundJob"("job_name");
CREATE INDEX IF NOT EXISTS "BackgroundJob_status_idx" ON "BackgroundJob"("status");
CREATE INDEX IF NOT EXISTS "BackgroundJob_next_run_at_idx" ON "BackgroundJob"("next_run_at");
CREATE INDEX IF NOT EXISTS "BackgroundJob_created_at_idx" ON "BackgroundJob"("created_at");

-- BillingEntity → "billing_entities"
CREATE TABLE IF NOT EXISTS "billing_entities" (
    "id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_account_id" TEXT,
    "default_currency" TEXT NOT NULL DEFAULT 'GBP',
    "country" TEXT NOT NULL DEFAULT 'GB',
    "vat_number" TEXT,
    "address_json" JSONB,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_entities_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "stripe_account_id" TEXT;
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "default_currency" TEXT DEFAULT 'GBP';
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'GB';
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "vat_number" TEXT;
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "address_json" JSONB;
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "metadata_json" JSONB;
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "billing_entities" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "billing_entities_email_key" ON "billing_entities"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_entities_stripe_customer_id_key" ON "billing_entities"("stripe_customer_id");

-- ChangePremium → "ChangePremium"
CREATE TABLE IF NOT EXISTS "ChangePremium" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "operation_type" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT,
    "old_data" JSONB,
    "new_data" JSONB,
    "diff_data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "applied_at" TIMESTAMP(3),
    "reverted_at" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChangePremium_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "operation_id" TEXT;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "operation_type" TEXT;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "table_name" TEXT;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "record_id" TEXT;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "old_data" JSONB;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "new_data" JSONB;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "diff_data" JSONB;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "applied_at" TIMESTAMP(3);
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "reverted_at" TIMESTAMP(3);
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "ChangePremium" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "ChangePremium_operation_id_key" ON "ChangePremium"("operation_id");
CREATE INDEX IF NOT EXISTS "ChangePremium_siteId_idx" ON "ChangePremium"("siteId");
CREATE INDEX IF NOT EXISTS "ChangePremium_operation_id_idx" ON "ChangePremium"("operation_id");
CREATE INDEX IF NOT EXISTS "ChangePremium_status_idx" ON "ChangePremium"("status");
CREATE INDEX IF NOT EXISTS "ChangePremium_table_name_idx" ON "ChangePremium"("table_name");
CREATE INDEX IF NOT EXISTS "ChangePremium_created_at_idx" ON "ChangePremium"("created_at");

-- ConsentLog → "ConsentLog"
CREATE TABLE IF NOT EXISTS "ConsentLog" (
    "id" TEXT,
    "site_id" TEXT,
    "subscriber_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "consent_version" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "legal_basis" TEXT NOT NULL,
    "processing_purposes" TEXT[] NOT NULL,
    "data_categories" TEXT[] NOT NULL,
    "consent_text" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "subscriber_id" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "consent_type" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "consent_version" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "legal_basis" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "processing_purposes" TEXT[];
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "data_categories" TEXT[];
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "consent_text" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "ConsentLog_site_id_idx" ON "ConsentLog"("site_id");
CREATE INDEX IF NOT EXISTS "ConsentLog_subscriber_id_idx" ON "ConsentLog"("subscriber_id");
CREATE INDEX IF NOT EXISTS "ConsentLog_consent_type_idx" ON "ConsentLog"("consent_type");
CREATE INDEX IF NOT EXISTS "ConsentLog_action_idx" ON "ConsentLog"("action");
CREATE INDEX IF NOT EXISTS "ConsentLog_timestamp_idx" ON "ConsentLog"("timestamp");

-- ContentCredit → "content_credits"
CREATE TABLE IF NOT EXISTS "content_credits" (
    "id" TEXT,
    "team_member_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "role" "CreditRole" NOT NULL DEFAULT 'AUTHOR',
    "contribution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_credits_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "content_credits" ADD COLUMN IF NOT EXISTS "team_member_id" TEXT;
ALTER TABLE "content_credits" ADD COLUMN IF NOT EXISTS "content_type" TEXT;
ALTER TABLE "content_credits" ADD COLUMN IF NOT EXISTS "content_id" TEXT;
ALTER TABLE "content_credits" ADD COLUMN IF NOT EXISTS "role" "CreditRole" DEFAULT 'AUTHOR';
ALTER TABLE "content_credits" ADD COLUMN IF NOT EXISTS "contribution" TEXT;
ALTER TABLE "content_credits" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "content_credits_content_type_content_id_idx" ON "content_credits"("content_type", "content_id");
CREATE UNIQUE INDEX IF NOT EXISTS "content_credits_team_member_id_content_type_content_id_key" ON "content_credits"("team_member_id", "content_type", "content_id");

-- ContentImport → "content_imports"
CREATE TABLE IF NOT EXISTS "content_imports" (
    "id" TEXT,
    "site_id" TEXT,
    "import_type" TEXT NOT NULL,
    "source_file" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "content_imports_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "import_type" TEXT;
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "source_file" TEXT;
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "imported_count" INTEGER DEFAULT 0;
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "failed_count" INTEGER DEFAULT 0;
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "content_imports" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "content_imports_site_id_idx" ON "content_imports"("site_id");
CREATE INDEX IF NOT EXISTS "content_imports_status_idx" ON "content_imports"("status");

-- Conversion → "conversions"
CREATE TABLE IF NOT EXISTS "conversions" (
    "id" TEXT,
    "site_id" TEXT NOT NULL,
    "click_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "booking_ref" TEXT,
    "booking_value" INTEGER NOT NULL,
    "commission" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "ConversionStatus" NOT NULL DEFAULT 'PENDING',
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "click_id" TEXT;
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "partner_id" TEXT;
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "booking_ref" TEXT;
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "booking_value" INTEGER;
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "commission" INTEGER;
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "status" "ConversionStatus" DEFAULT 'PENDING';
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "check_in" TIMESTAMP(3);
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "check_out" TIMESTAMP(3);
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "converted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3);
ALTER TABLE "conversions" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "conversions_click_id_key" ON "conversions"("click_id");
CREATE INDEX IF NOT EXISTS "conversions_site_id_converted_at_idx" ON "conversions"("site_id", "converted_at");
CREATE INDEX IF NOT EXISTS "conversions_status_idx" ON "conversions"("status");

-- Credential → "credentials"
CREATE TABLE IF NOT EXISTS "credentials" (
    "id" TEXT,
    "site_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "encrypted_value" TEXT;
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3);
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "credentials_site_id_idx" ON "credentials"("site_id");
CREATE INDEX IF NOT EXISTS "credentials_type_idx" ON "credentials"("type");
CREATE INDEX IF NOT EXISTS "credentials_status_idx" ON "credentials"("status");

-- DigitalProduct → "digital_products"
CREATE TABLE IF NOT EXISTS "digital_products" (
    "id" TEXT,
    "site_id" TEXT,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT,
    "slug" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_ar" TEXT,
    "price" INTEGER NOT NULL,
    "compare_price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "product_type" "ProductType" NOT NULL DEFAULT 'PDF_GUIDE',
    "file_url" TEXT,
    "file_size" INTEGER,
    "cover_image" TEXT,
    "features_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sku" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tier" INTEGER,
    "ontologyCategory" TEXT,
    "etsyListingId" TEXT,
    "briefId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "digital_products_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "name_en" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "name_ar" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "description_en" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "description_ar" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "price" INTEGER;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "compare_price" INTEGER;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "product_type" "ProductType" DEFAULT 'PDF_GUIDE';
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "file_url" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "file_size" INTEGER;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "cover_image" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "features_json" JSONB;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN DEFAULT false;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "tier" INTEGER;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "ontologyCategory" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "etsyListingId" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "briefId" TEXT;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "digital_products" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "digital_products_slug_key" ON "digital_products"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "digital_products_sku_key" ON "digital_products"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "digital_products_etsyListingId_key" ON "digital_products"("etsyListingId");
CREATE INDEX IF NOT EXISTS "digital_products_site_id_idx" ON "digital_products"("site_id");
CREATE INDEX IF NOT EXISTS "digital_products_product_type_idx" ON "digital_products"("product_type");
CREATE INDEX IF NOT EXISTS "digital_products_tier_idx" ON "digital_products"("tier");

-- Domain → "domains"
CREATE TABLE IF NOT EXISTS "domains" (
    "id" TEXT,
    "site_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verification_token" TEXT,
    "verification_method" TEXT,
    "ssl_status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "hostname" TEXT;
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN DEFAULT false;
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN DEFAULT false;
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "verification_token" TEXT;
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "verification_method" TEXT;
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "ssl_status" TEXT DEFAULT 'pending';
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "domains_hostname_key" ON "domains"("hostname");
CREATE INDEX IF NOT EXISTS "domains_site_id_idx" ON "domains"("site_id");
CREATE INDEX IF NOT EXISTS "domains_verified_idx" ON "domains"("verified");

-- Event → "Event"
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT,
    "title_en" TEXT NOT NULL,
    "title_ar" TEXT,
    "description_en" TEXT NOT NULL,
    "description_ar" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "image" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bookingUrl" TEXT NOT NULL,
    "affiliateTag" TEXT,
    "ticketProvider" TEXT,
    "vipAvailable" BOOLEAN NOT NULL DEFAULT false,
    "soldOut" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "siteId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "title_en" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "title_ar" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "description_en" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "description_ar" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "time" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "venue" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "price" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "bookingUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "affiliateTag" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "ticketProvider" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "vipAvailable" BOOLEAN DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "soldOut" BOOLEAN DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "published" BOOLEAN DEFAULT true;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Event_siteId_idx" ON "Event"("siteId");
CREATE INDEX IF NOT EXISTS "Event_date_idx" ON "Event"("date");
CREATE INDEX IF NOT EXISTS "Event_category_idx" ON "Event"("category");
CREATE INDEX IF NOT EXISTS "Event_published_idx" ON "Event"("published");

-- ExitIntentImpression → "ExitIntentImpression"
CREATE TABLE IF NOT EXISTS "ExitIntentImpression" (
    "id" TEXT,
    "site_id" TEXT,
    "session_id" TEXT NOT NULL,
    "page_url" TEXT NOT NULL,
    "user_agent" TEXT,
    "impression_type" TEXT NOT NULL,
    "trigger_event" TEXT NOT NULL,
    "shown_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action_taken" TEXT,
    "action_taken_at" TIMESTAMP(3),
    "conversion_value" DOUBLE PRECISION,
    "ttl_expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExitIntentImpression_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "session_id" TEXT;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "page_url" TEXT;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "impression_type" TEXT;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "trigger_event" TEXT;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "shown_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "action_taken" TEXT;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "action_taken_at" TIMESTAMP(3);
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "conversion_value" DOUBLE PRECISION;
ALTER TABLE "ExitIntentImpression" ADD COLUMN IF NOT EXISTS "ttl_expires_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ExitIntentImpression_site_id_idx" ON "ExitIntentImpression"("site_id");
CREATE INDEX IF NOT EXISTS "ExitIntentImpression_session_id_idx" ON "ExitIntentImpression"("session_id");
CREATE INDEX IF NOT EXISTS "ExitIntentImpression_shown_at_idx" ON "ExitIntentImpression"("shown_at");
CREATE INDEX IF NOT EXISTS "ExitIntentImpression_ttl_expires_at_idx" ON "ExitIntentImpression"("ttl_expires_at");

-- FactEntry → "fact_entries"
CREATE TABLE IF NOT EXISTS "fact_entries" (
    "id" TEXT,
    "article_type" TEXT NOT NULL,
    "article_slug" TEXT NOT NULL,
    "fact_text_en" TEXT NOT NULL,
    "fact_text_ar" TEXT,
    "fact_location" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confidence_score" INTEGER DEFAULT 0,
    "last_verified_at" TIMESTAMP(3),
    "next_check_at" TIMESTAMP(3),
    "verification_count" INTEGER NOT NULL DEFAULT 0,
    "source_url" TEXT,
    "source_name" TEXT,
    "source_type" TEXT,
    "source_last_checked" TIMESTAMP(3),
    "original_value" TEXT,
    "current_value" TEXT,
    "updated_value" TEXT,
    "update_applied" BOOLEAN NOT NULL DEFAULT false,
    "update_applied_at" TIMESTAMP(3),
    "agent_notes" TEXT,
    "verification_log" JSONB,
    "siteId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fact_entries_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "article_type" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "article_slug" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "fact_text_en" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "fact_text_ar" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "fact_location" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "confidence_score" INTEGER DEFAULT 0;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "last_verified_at" TIMESTAMP(3);
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "next_check_at" TIMESTAMP(3);
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "verification_count" INTEGER DEFAULT 0;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "source_url" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "source_name" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "source_type" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "source_last_checked" TIMESTAMP(3);
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "original_value" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "current_value" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "updated_value" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "update_applied" BOOLEAN DEFAULT false;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "update_applied_at" TIMESTAMP(3);
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "agent_notes" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "verification_log" JSONB;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "fact_entries" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "fact_entries_article_type_article_slug_idx" ON "fact_entries"("article_type", "article_slug");
CREATE INDEX IF NOT EXISTS "fact_entries_status_idx" ON "fact_entries"("status");
CREATE INDEX IF NOT EXISTS "fact_entries_next_check_at_idx" ON "fact_entries"("next_check_at");
CREATE INDEX IF NOT EXISTS "fact_entries_category_idx" ON "fact_entries"("category");
CREATE INDEX IF NOT EXISTS "fact_entries_siteId_idx" ON "fact_entries"("siteId");

-- HomepageVersionPremium → "HomepageVersionPremium"
CREATE TABLE IF NOT EXISTS "HomepageVersionPremium" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blocks_data" JSONB NOT NULL,
    "diff_from_previous" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "HomepageVersionPremium_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "version_id" TEXT;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "blocks_data" JSONB;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "diff_from_previous" JSONB;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "published" BOOLEAN DEFAULT false;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "is_draft" BOOLEAN DEFAULT true;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
ALTER TABLE "HomepageVersionPremium" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "HomepageVersionPremium_version_id_key" ON "HomepageVersionPremium"("version_id");
CREATE INDEX IF NOT EXISTS "HomepageVersionPremium_siteId_idx" ON "HomepageVersionPremium"("siteId");
CREATE INDEX IF NOT EXISTS "HomepageVersionPremium_published_idx" ON "HomepageVersionPremium"("published");
CREATE INDEX IF NOT EXISTS "HomepageVersionPremium_is_draft_idx" ON "HomepageVersionPremium"("is_draft");
CREATE INDEX IF NOT EXISTS "HomepageVersionPremium_deleted_at_idx" ON "HomepageVersionPremium"("deleted_at");

-- InformationArticle → "information_articles"
CREATE TABLE IF NOT EXISTS "information_articles" (
    "id" TEXT,
    "slug" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "excerpt_en" TEXT,
    "excerpt_ar" TEXT,
    "content_en" TEXT NOT NULL,
    "content_ar" TEXT NOT NULL,
    "featured_image" TEXT,
    "reading_time" INTEGER NOT NULL DEFAULT 5,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "meta_title_en" TEXT,
    "meta_title_ar" TEXT,
    "meta_description_en" TEXT,
    "meta_description_ar" TEXT,
    "tags" TEXT[] NOT NULL,
    "keywords" TEXT[] NOT NULL,
    "page_type" TEXT DEFAULT 'article',
    "seo_score" INTEGER DEFAULT 0,
    "faq_questions" JSONB,
    "siteId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "information_articles_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "section_id" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "category_id" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "title_en" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "title_ar" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "excerpt_en" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "excerpt_ar" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "content_en" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "content_ar" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "featured_image" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "reading_time" INTEGER DEFAULT 5;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "published" BOOLEAN DEFAULT false;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "meta_title_en" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "meta_title_ar" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "meta_description_en" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "meta_description_ar" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "keywords" TEXT[];
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "page_type" TEXT DEFAULT 'article';
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "seo_score" INTEGER DEFAULT 0;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "faq_questions" JSONB;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "information_articles" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "information_articles_slug_key" ON "information_articles"("slug");
CREATE INDEX IF NOT EXISTS "information_articles_section_id_idx" ON "information_articles"("section_id");
CREATE INDEX IF NOT EXISTS "information_articles_category_id_idx" ON "information_articles"("category_id");
CREATE INDEX IF NOT EXISTS "information_articles_siteId_idx" ON "information_articles"("siteId");
CREATE INDEX IF NOT EXISTS "information_articles_siteId_published_idx" ON "information_articles"("siteId", "published");
CREATE INDEX IF NOT EXISTS "information_articles_published_idx" ON "information_articles"("published");
CREATE INDEX IF NOT EXISTS "information_articles_page_type_idx" ON "information_articles"("page_type");
CREATE INDEX IF NOT EXISTS "information_articles_seo_score_idx" ON "information_articles"("seo_score");
CREATE INDEX IF NOT EXISTS "information_articles_created_at_idx" ON "information_articles"("created_at");

-- InformationCategory → "information_categories"
CREATE TABLE IF NOT EXISTS "information_categories" (
    "id" TEXT,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description_en" TEXT,
    "description_ar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "information_categories_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "information_categories" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "information_categories" ADD COLUMN IF NOT EXISTS "name_en" TEXT;
ALTER TABLE "information_categories" ADD COLUMN IF NOT EXISTS "name_ar" TEXT;
ALTER TABLE "information_categories" ADD COLUMN IF NOT EXISTS "description_en" TEXT;
ALTER TABLE "information_categories" ADD COLUMN IF NOT EXISTS "description_ar" TEXT;
ALTER TABLE "information_categories" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "information_categories" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "information_categories_slug_key" ON "information_categories"("slug");

-- InformationSection → "information_sections"
CREATE TABLE IF NOT EXISTS "information_sections" (
    "id" TEXT,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description_en" TEXT,
    "description_ar" TEXT,
    "icon" TEXT,
    "featured_image" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "subsections" JSONB,
    "siteId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "information_sections_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "name_en" TEXT;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "name_ar" TEXT;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "description_en" TEXT;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "description_ar" TEXT;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "featured_image" TEXT;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER DEFAULT 1;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "published" BOOLEAN DEFAULT true;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "subsections" JSONB;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "information_sections" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "information_sections_slug_key" ON "information_sections"("slug");
CREATE INDEX IF NOT EXISTS "information_sections_siteId_idx" ON "information_sections"("siteId");
CREATE INDEX IF NOT EXISTS "information_sections_published_idx" ON "information_sections"("published");
CREATE INDEX IF NOT EXISTS "information_sections_sort_order_idx" ON "information_sections"("sort_order");

-- Invoice → "invoices"
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT,
    "billing_entity_id" TEXT NOT NULL,
    "stripe_invoice_id" TEXT,
    "number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "amount_due" INTEGER NOT NULL DEFAULT 0,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "hosted_invoice_url" TEXT,
    "pdf_url" TEXT,
    "site_ids" TEXT[] NOT NULL,
    "line_items_json" JSONB,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "billing_entity_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripe_invoice_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "number" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount_due" INTEGER DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount_paid" INTEGER DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'GBP';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "period_start" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "period_end" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "hosted_invoice_url" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "pdf_url" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "site_ids" TEXT[];
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "line_items_json" JSONB;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "metadata_json" JSONB;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_stripe_invoice_id_key" ON "invoices"("stripe_invoice_id");
CREATE INDEX IF NOT EXISTS "invoices_billing_entity_id_idx" ON "invoices"("billing_entity_id");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");

-- JobRun → "JobRun"
CREATE TABLE IF NOT EXISTS "JobRun" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "schedule_cron" TEXT,
    "parameters_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "result_json" JSONB,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "createdById" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "job_name" TEXT;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "job_type" TEXT;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "schedule_cron" TEXT;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "parameters_json" JSONB;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3);
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "duration_ms" INTEGER;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "result_json" JSONB;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "max_retries" INTEGER DEFAULT 3;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMP(3);
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "next_run_at" TIMESTAMP(3);
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "JobRun_siteId_idx" ON "JobRun"("siteId");
CREATE INDEX IF NOT EXISTS "JobRun_job_name_idx" ON "JobRun"("job_name");
CREATE INDEX IF NOT EXISTS "JobRun_status_idx" ON "JobRun"("status");
CREATE INDEX IF NOT EXISTS "JobRun_next_run_at_idx" ON "JobRun"("next_run_at");
CREATE INDEX IF NOT EXISTS "JobRun_next_retry_at_idx" ON "JobRun"("next_retry_at");
CREATE INDEX IF NOT EXISTS "JobRun_created_at_idx" ON "JobRun"("created_at");

-- Lead → "leads"
CREATE TABLE IF NOT EXISTS "leads" (
    "id" TEXT,
    "site_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "lead_type" "LeadType" NOT NULL DEFAULT 'NEWSLETTER',
    "lead_source" TEXT,
    "interests_json" JSONB,
    "budget_range" TEXT,
    "travel_dates" TEXT,
    "party_size" INTEGER,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "referrer" TEXT,
    "landing_page" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "score_factors" JSONB,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "assigned_to" TEXT,
    "value" INTEGER,
    "sold_to" TEXT,
    "sold_at" TIMESTAMP(3),
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "consent_ip" TEXT,
    "consent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lead_type" "LeadType" DEFAULT 'NEWSLETTER';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lead_source" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "interests_json" JSONB;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "budget_range" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "travel_dates" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "party_size" INTEGER;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "utm_source" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "utm_medium" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "utm_campaign" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "referrer" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "landing_page" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "score" INTEGER DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "score_factors" JSONB;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "status" "LeadStatus" DEFAULT 'NEW';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigned_to" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "value" INTEGER;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sold_to" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sold_at" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "marketing_consent" BOOLEAN DEFAULT false;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "consent_ip" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "consent_at" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads"("email");
CREATE INDEX IF NOT EXISTS "leads_site_id_created_at_idx" ON "leads"("site_id", "created_at");
CREATE INDEX IF NOT EXISTS "leads_lead_type_idx" ON "leads"("lead_type");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");
CREATE INDEX IF NOT EXISTS "leads_score_idx" ON "leads"("score");
CREATE UNIQUE INDEX IF NOT EXISTS "leads_site_id_email_key" ON "leads"("site_id", "email");

-- LeadActivity → "lead_activities"
CREATE TABLE IF NOT EXISTS "lead_activities" (
    "id" TEXT,
    "lead_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "activity_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "lead_activities" ADD COLUMN IF NOT EXISTS "lead_id" TEXT;
ALTER TABLE "lead_activities" ADD COLUMN IF NOT EXISTS "activity_type" TEXT;
ALTER TABLE "lead_activities" ADD COLUMN IF NOT EXISTS "activity_data" JSONB;
ALTER TABLE "lead_activities" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "lead_activities_lead_id_created_at_idx" ON "lead_activities"("lead_id", "created_at");

-- MediaEnrichment → "MediaEnrichment"
CREATE TABLE IF NOT EXISTS "MediaEnrichment" (
    "id" TEXT,
    "media_id" TEXT NOT NULL,
    "alt_text_original" TEXT,
    "alt_text_enhanced" TEXT,
    "title_enhanced" TEXT,
    "description_enhanced" TEXT,
    "tags_ai" TEXT[] NOT NULL,
    "color_palette" JSONB,
    "composition_data" JSONB,
    "accessibility_score" INTEGER,
    "seo_optimized" BOOLEAN NOT NULL DEFAULT false,
    "processing_status" TEXT NOT NULL DEFAULT 'pending',
    "ai_metadata" JSONB,
    "content_type" TEXT,
    "use_case" TEXT,
    "mood" TEXT,
    "destination_tags" TEXT[] NOT NULL,
    "objects_detected" TEXT[] NOT NULL,
    "text_detected" TEXT,
    "brand_compliance" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaEnrichment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "media_id" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "alt_text_original" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "alt_text_enhanced" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "title_enhanced" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "description_enhanced" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "tags_ai" TEXT[];
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "color_palette" JSONB;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "composition_data" JSONB;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "accessibility_score" INTEGER;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "seo_optimized" BOOLEAN DEFAULT false;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "processing_status" TEXT DEFAULT 'pending';
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "ai_metadata" JSONB;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "content_type" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "use_case" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "mood" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "destination_tags" TEXT[];
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "objects_detected" TEXT[];
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "text_detected" TEXT;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "brand_compliance" INTEGER;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "MediaEnrichment" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "MediaEnrichment_media_id_key" ON "MediaEnrichment"("media_id");
CREATE INDEX IF NOT EXISTS "MediaEnrichment_processing_status_idx" ON "MediaEnrichment"("processing_status");
CREATE INDEX IF NOT EXISTS "MediaEnrichment_seo_optimized_idx" ON "MediaEnrichment"("seo_optimized");
CREATE INDEX IF NOT EXISTS "MediaEnrichment_created_at_idx" ON "MediaEnrichment"("created_at");
CREATE INDEX IF NOT EXISTS "MediaEnrichment_content_type_idx" ON "MediaEnrichment"("content_type");
CREATE INDEX IF NOT EXISTS "MediaEnrichment_use_case_idx" ON "MediaEnrichment"("use_case");

-- ModelRoute → "ModelRoute"
CREATE TABLE IF NOT EXISTS "ModelRoute" (
    "id" TEXT,
    "site_id" TEXT,
    "route_name" TEXT NOT NULL,
    "primary_provider_id" TEXT NOT NULL,
    "fallback_provider_id" TEXT,
    "routing_rules_json" JSONB NOT NULL,
    "cost_optimization" BOOLEAN NOT NULL DEFAULT false,
    "quality_threshold" DOUBLE PRECISION,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "timeout_seconds" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModelRoute_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "route_name" TEXT;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "primary_provider_id" TEXT;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "fallback_provider_id" TEXT;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "routing_rules_json" JSONB;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "cost_optimization" BOOLEAN DEFAULT false;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "quality_threshold" DOUBLE PRECISION;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "max_retries" INTEGER DEFAULT 3;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "timeout_seconds" INTEGER DEFAULT 30;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ModelRoute" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ModelRoute_site_id_idx" ON "ModelRoute"("site_id");
CREATE INDEX IF NOT EXISTS "ModelRoute_route_name_idx" ON "ModelRoute"("route_name");
CREATE INDEX IF NOT EXISTS "ModelRoute_is_active_idx" ON "ModelRoute"("is_active");

-- NewsItem → "news_items"
CREATE TABLE IF NOT EXISTS "news_items" (
    "id" TEXT,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "headline_en" TEXT NOT NULL,
    "headline_ar" TEXT NOT NULL,
    "summary_en" TEXT NOT NULL,
    "summary_ar" TEXT NOT NULL,
    "announcement_en" TEXT NOT NULL,
    "announcement_ar" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_logo" TEXT,
    "featured_image" TEXT,
    "image_alt_en" TEXT,
    "image_alt_ar" TEXT,
    "image_credit" TEXT,
    "news_category" TEXT NOT NULL,
    "relevance_score" INTEGER NOT NULL DEFAULT 50,
    "is_major" BOOLEAN NOT NULL DEFAULT false,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "event_start_date" TIMESTAMP(3),
    "event_end_date" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "meta_title_en" TEXT,
    "meta_title_ar" TEXT,
    "meta_description_en" TEXT,
    "meta_description_ar" TEXT,
    "tags" TEXT[] NOT NULL,
    "keywords" TEXT[] NOT NULL,
    "related_article_slugs" TEXT[] NOT NULL,
    "related_shop_slugs" TEXT[] NOT NULL,
    "affiliate_link_ids" TEXT[] NOT NULL,
    "agent_source" TEXT,
    "agent_notes" TEXT,
    "research_log" JSONB,
    "updates_info_article" BOOLEAN NOT NULL DEFAULT false,
    "affected_info_slugs" TEXT[] NOT NULL,
    "siteId" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "headline_en" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "headline_ar" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "summary_en" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "summary_ar" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "announcement_en" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "announcement_ar" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "source_name" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "source_url" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "source_logo" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "featured_image" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "image_alt_en" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "image_alt_ar" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "image_credit" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "news_category" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "relevance_score" INTEGER DEFAULT 50;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "is_major" BOOLEAN DEFAULT false;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "urgency" TEXT DEFAULT 'normal';
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "event_start_date" TIMESTAMP(3);
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "event_end_date" TIMESTAMP(3);
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "meta_title_en" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "meta_title_ar" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "meta_description_en" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "meta_description_ar" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "keywords" TEXT[];
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "related_article_slugs" TEXT[];
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "related_shop_slugs" TEXT[];
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "affiliate_link_ids" TEXT[];
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "agent_source" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "agent_notes" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "research_log" JSONB;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "updates_info_article" BOOLEAN DEFAULT false;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "affected_info_slugs" TEXT[];
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "news_items_slug_key" ON "news_items"("slug");
CREATE INDEX IF NOT EXISTS "news_items_status_idx" ON "news_items"("status");
CREATE INDEX IF NOT EXISTS "news_items_news_category_idx" ON "news_items"("news_category");
CREATE INDEX IF NOT EXISTS "news_items_is_major_idx" ON "news_items"("is_major");
CREATE INDEX IF NOT EXISTS "news_items_published_at_idx" ON "news_items"("published_at");
CREATE INDEX IF NOT EXISTS "news_items_expires_at_idx" ON "news_items"("expires_at");
CREATE INDEX IF NOT EXISTS "news_items_siteId_idx" ON "news_items"("siteId");
CREATE INDEX IF NOT EXISTS "news_items_siteId_status_idx" ON "news_items"("siteId", "status");

-- NewsResearchLog → "news_research_logs"
CREATE TABLE IF NOT EXISTS "news_research_logs" (
    "id" TEXT,
    "run_type" TEXT NOT NULL DEFAULT 'daily',
    "status" TEXT NOT NULL DEFAULT 'running',
    "sources_checked" TEXT[] NOT NULL,
    "items_found" INTEGER NOT NULL DEFAULT 0,
    "items_published" INTEGER NOT NULL DEFAULT 0,
    "items_skipped" INTEGER NOT NULL DEFAULT 0,
    "facts_flagged" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "result_summary" JSONB,
    "siteId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "news_research_logs_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "run_type" TEXT DEFAULT 'daily';
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'running';
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "sources_checked" TEXT[];
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "items_found" INTEGER DEFAULT 0;
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "items_published" INTEGER DEFAULT 0;
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "items_skipped" INTEGER DEFAULT 0;
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "facts_flagged" INTEGER DEFAULT 0;
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "duration_ms" INTEGER;
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "result_summary" JSONB;
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "news_research_logs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "news_research_logs_run_type_idx" ON "news_research_logs"("run_type");
CREATE INDEX IF NOT EXISTS "news_research_logs_created_at_idx" ON "news_research_logs"("created_at");
CREATE INDEX IF NOT EXISTS "news_research_logs_siteId_idx" ON "news_research_logs"("siteId");

-- PageView → "page_views"
CREATE TABLE IF NOT EXISTS "page_views" (
    "id" TEXT,
    "site_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "page_type" TEXT,
    "content_id" TEXT,
    "session_id" TEXT NOT NULL,
    "visitor_id" TEXT,
    "duration" INTEGER,
    "scroll_depth" INTEGER,
    "referrer" TEXT,
    "utm_source" TEXT,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "path" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "page_type" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "content_id" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "session_id" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "visitor_id" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "scroll_depth" INTEGER;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "referrer" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "utm_source" TEXT;
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "viewed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "page_views_site_id_viewed_at_idx" ON "page_views"("site_id", "viewed_at");
CREATE INDEX IF NOT EXISTS "page_views_site_id_path_idx" ON "page_views"("site_id", "path");
CREATE INDEX IF NOT EXISTS "page_views_path_idx" ON "page_views"("path");
CREATE INDEX IF NOT EXISTS "page_views_content_id_idx" ON "page_views"("content_id");
CREATE INDEX IF NOT EXISTS "page_views_session_id_idx" ON "page_views"("session_id");

-- PaymentMethod → "payment_methods"
CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id" TEXT,
    "billing_entity_id" TEXT NOT NULL,
    "stripe_payment_method_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'card',
    "last4" TEXT,
    "brand" TEXT,
    "exp_month" INTEGER,
    "exp_year" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "billing_entity_id" TEXT;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "stripe_payment_method_id" TEXT;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'card';
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "last4" TEXT;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "exp_month" INTEGER;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "exp_year" INTEGER;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN DEFAULT false;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_stripe_payment_method_id_key" ON "payment_methods"("stripe_payment_method_id");
CREATE INDEX IF NOT EXISTS "payment_methods_billing_entity_id_idx" ON "payment_methods"("billing_entity_id");

-- PromptTemplate → "PromptTemplate"
CREATE TABLE IF NOT EXISTS "PromptTemplate" (
    "id" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "template_en" TEXT NOT NULL,
    "template_ar" TEXT,
    "variables" JSONB NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "locale_overrides" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "template_en" TEXT;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "template_ar" TEXT;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "variables" JSONB;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "version" TEXT DEFAULT '1.0';
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "locale_overrides" JSONB;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "usage_count" INTEGER DEFAULT 0;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3);
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "PromptTemplate_category_is_active_idx" ON "PromptTemplate"("category", "is_active");
CREATE INDEX IF NOT EXISTS "PromptTemplate_version_idx" ON "PromptTemplate"("version");
CREATE INDEX IF NOT EXISTS "PromptTemplate_usage_count_idx" ON "PromptTemplate"("usage_count");
CREATE UNIQUE INDEX IF NOT EXISTS "PromptTemplate_name_version_key" ON "PromptTemplate"("name", "version");

-- Purchase → "purchases"
CREATE TABLE IF NOT EXISTS "purchases" (
    "id" TEXT,
    "site_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payment_provider" TEXT,
    "payment_id" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "download_token" TEXT NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "download_limit" INTEGER NOT NULL DEFAULT 5,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "coupon_code" TEXT,
    "attribution_tags" JSONB,
    "channel" TEXT NOT NULL DEFAULT 'website',
    "gross_amount" INTEGER,
    "platform_fees" INTEGER,
    "processing_fees" INTEGER,
    "net_amount" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "product_id" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "customer_email" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "customer_name" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "amount" INTEGER;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "payment_provider" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "payment_id" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "status" "PurchaseStatus" DEFAULT 'PENDING';
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "download_token" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "download_count" INTEGER DEFAULT 0;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "download_limit" INTEGER DEFAULT 5;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "utm_source" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "utm_medium" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "utm_campaign" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "coupon_code" TEXT;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "attribution_tags" JSONB;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'website';
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "gross_amount" INTEGER;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "platform_fees" INTEGER;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "processing_fees" INTEGER;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "net_amount" INTEGER;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_download_token_key" ON "purchases"("download_token");
CREATE INDEX IF NOT EXISTS "purchases_site_id_created_at_idx" ON "purchases"("site_id", "created_at");
CREATE INDEX IF NOT EXISTS "purchases_customer_email_idx" ON "purchases"("customer_email");
CREATE INDEX IF NOT EXISTS "purchases_download_token_idx" ON "purchases"("download_token");
CREATE INDEX IF NOT EXISTS "purchases_channel_idx" ON "purchases"("channel");

-- SeoAuditAction → "seo_audit_actions"
CREATE TABLE IF NOT EXISTS "seo_audit_actions" (
    "id" TEXT,
    "auditId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "actionItemId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "autoFixable" BOOLEAN NOT NULL DEFAULT false,
    "fixType" TEXT NOT NULL,
    "affectedUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "executionLog" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seo_audit_actions_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "auditId" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "actionItemId" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "autoFixable" BOOLEAN DEFAULT false;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "fixType" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "affectedUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "executionLog" JSONB;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "seo_audit_actions" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "seo_audit_actions_siteId_status_idx" ON "seo_audit_actions"("siteId", "status");
CREATE INDEX IF NOT EXISTS "seo_audit_actions_auditId_idx" ON "seo_audit_actions"("auditId");

-- SiteConfig → "site_config"
CREATE TABLE IF NOT EXISTS "site_config" (
    "id" TEXT,
    "site_id" TEXT NOT NULL,
    "homepage_json" JSONB,
    "hero_video_url" TEXT,
    "hero_mobile_video_url" TEXT,
    "hero_poster_url" TEXT,
    "hero_autoplay" BOOLEAN NOT NULL DEFAULT true,
    "hero_muted" BOOLEAN NOT NULL DEFAULT true,
    "hero_loop" BOOLEAN NOT NULL DEFAULT true,
    "hero_cta_label" TEXT,
    "hero_cta_href" TEXT,
    "hero_headline" TEXT,
    "hero_subheadline" TEXT,
    "theme_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "homepage_json" JSONB;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_video_url" TEXT;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_mobile_video_url" TEXT;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_poster_url" TEXT;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_autoplay" BOOLEAN DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_muted" BOOLEAN DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_loop" BOOLEAN DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_cta_label" TEXT;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_cta_href" TEXT;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_headline" TEXT;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "hero_subheadline" TEXT;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "theme_config" JSONB;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "site_config_site_id_key" ON "site_config"("site_id");

-- SiteMemberPremium → "SiteMemberPremium"
CREATE TABLE IF NOT EXISTS "SiteMemberPremium" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" JSONB,
    "access_level" TEXT NOT NULL DEFAULT 'standard',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "last_access_at" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "SiteMemberPremium_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "permissions" JSONB;
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "access_level" TEXT DEFAULT 'standard';
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "invited_at" TIMESTAMP(3);
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "joined_at" TIMESTAMP(3);
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "last_access_at" TIMESTAMP(3);
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
ALTER TABLE "SiteMemberPremium" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "SiteMemberPremium_siteId_idx" ON "SiteMemberPremium"("siteId");
CREATE INDEX IF NOT EXISTS "SiteMemberPremium_userId_idx" ON "SiteMemberPremium"("userId");
CREATE INDEX IF NOT EXISTS "SiteMemberPremium_role_idx" ON "SiteMemberPremium"("role");
CREATE INDEX IF NOT EXISTS "SiteMemberPremium_is_active_idx" ON "SiteMemberPremium"("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteMemberPremium_siteId_userId_key" ON "SiteMemberPremium"("siteId", "userId");

-- SitePremium → "SitePremium"
CREATE TABLE IF NOT EXISTS "SitePremium" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "theme_id" TEXT,
    "settings_json" JSONB NOT NULL,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "locale_settings" JSONB,
    "brand_settings" JSONB,
    "seo_settings" JSONB,
    "analytics_settings" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "SitePremium_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "theme_id" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "settings_json" JSONB;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "favicon_url" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "locale_settings" JSONB;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "brand_settings" JSONB;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "seo_settings" JSONB;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "analytics_settings" JSONB;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
ALTER TABLE "SitePremium" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "SitePremium_siteId_key" ON "SitePremium"("siteId");
CREATE UNIQUE INDEX IF NOT EXISTS "SitePremium_slug_key" ON "SitePremium"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "SitePremium_domain_key" ON "SitePremium"("domain");
CREATE INDEX IF NOT EXISTS "SitePremium_is_active_idx" ON "SitePremium"("is_active");
CREATE INDEX IF NOT EXISTS "SitePremium_slug_idx" ON "SitePremium"("slug");
CREATE INDEX IF NOT EXISTS "SitePremium_deleted_at_idx" ON "SitePremium"("deleted_at");
CREATE INDEX IF NOT EXISTS "SitePremium_createdById_idx" ON "SitePremium"("createdById");

-- SiteThemePremium → "SiteThemePremium"
CREATE TABLE IF NOT EXISTS "SiteThemePremium" (
    "id" TEXT,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokens_json" JSONB NOT NULL,
    "preview_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "parent_theme_id" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "SiteThemePremium_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "tokens_json" JSONB;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "preview_url" TEXT;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT false;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "version" TEXT DEFAULT '1.0.0';
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "parent_theme_id" TEXT;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
ALTER TABLE "SiteThemePremium" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "SiteThemePremium_siteId_idx" ON "SiteThemePremium"("siteId");
CREATE INDEX IF NOT EXISTS "SiteThemePremium_is_active_idx" ON "SiteThemePremium"("is_active");
CREATE INDEX IF NOT EXISTS "SiteThemePremium_deleted_at_idx" ON "SiteThemePremium"("deleted_at");

-- Skill → "skills"
CREATE TABLE IF NOT EXISTS "skills" (
    "id" TEXT,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT,
    "category" "SkillCategory" NOT NULL,
    "description_en" TEXT,
    "description_ar" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "name_en" TEXT;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "name_ar" TEXT;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "category" "SkillCategory";
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "description_en" TEXT;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "description_ar" TEXT;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "display_order" INTEGER DEFAULT 0;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "skills_slug_key" ON "skills"("slug");
CREATE INDEX IF NOT EXISTS "skills_category_idx" ON "skills"("category");
CREATE INDEX IF NOT EXISTS "skills_is_active_idx" ON "skills"("is_active");

-- Subscriber → "Subscriber"
CREATE TABLE IF NOT EXISTS "Subscriber" (
    "id" TEXT,
    "site_id" TEXT,
    "email" TEXT NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "preferences_json" JSONB,
    "metadata_json" JSONB,
    "double_optin_token" TEXT,
    "double_optin_sent_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "unsubscribed_at" TIMESTAMP(3),
    "unsubscribe_reason" TEXT,
    "last_campaign_sent" TIMESTAMP(3),
    "engagement_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "status" "SubscriberStatus" DEFAULT 'PENDING';
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "preferences_json" JSONB;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "metadata_json" JSONB;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "double_optin_token" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "double_optin_sent_at" TIMESTAMP(3);
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3);
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "unsubscribed_at" TIMESTAMP(3);
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "unsubscribe_reason" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "last_campaign_sent" TIMESTAMP(3);
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "engagement_score" DOUBLE PRECISION;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_double_optin_token_key" ON "Subscriber"("double_optin_token");
CREATE INDEX IF NOT EXISTS "Subscriber_site_id_idx" ON "Subscriber"("site_id");
CREATE INDEX IF NOT EXISTS "Subscriber_status_idx" ON "Subscriber"("status");
CREATE INDEX IF NOT EXISTS "Subscriber_source_idx" ON "Subscriber"("source");
CREATE INDEX IF NOT EXISTS "Subscriber_created_at_idx" ON "Subscriber"("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_site_id_email_key" ON "Subscriber"("site_id", "email");

-- Subscription → "subscriptions"
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT,
    "billing_entity_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "plan_name" TEXT NOT NULL DEFAULT 'pro',
    "status" TEXT NOT NULL DEFAULT 'active',
    "site_ids" TEXT[] NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "trial_end" TIMESTAMP(3),
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "billing_entity_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_price_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_name" TEXT DEFAULT 'pro';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "site_ids" TEXT[];
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 1;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_start" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_end" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" BOOLEAN DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trial_end" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "metadata_json" JSONB;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_billing_entity_id_idx" ON "subscriptions"("billing_entity_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

-- SystemMetrics → "SystemMetrics"
CREATE TABLE IF NOT EXISTS "SystemMetrics" (
    "id" TEXT,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "metricUnit" TEXT,
    "tags" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemMetrics_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SystemMetrics" ADD COLUMN IF NOT EXISTS "metricName" TEXT;
ALTER TABLE "SystemMetrics" ADD COLUMN IF NOT EXISTS "metricValue" DOUBLE PRECISION;
ALTER TABLE "SystemMetrics" ADD COLUMN IF NOT EXISTS "metricUnit" TEXT;
ALTER TABLE "SystemMetrics" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "SystemMetrics" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "SystemMetrics_metricName_idx" ON "SystemMetrics"("metricName");
CREATE INDEX IF NOT EXISTS "SystemMetrics_timestamp_idx" ON "SystemMetrics"("timestamp");

-- TeamMember → "team_members"
CREATE TABLE IF NOT EXISTS "team_members" (
    "id" TEXT,
    "site_id" TEXT,
    "user_id" TEXT,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT,
    "slug" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_ar" TEXT,
    "bio_en" TEXT NOT NULL,
    "bio_ar" TEXT,
    "avatar_url" TEXT,
    "cover_image_url" TEXT,
    "email_public" TEXT,
    "linkedin_url" TEXT,
    "twitter_url" TEXT,
    "instagram_url" TEXT,
    "website_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "name_en" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "name_ar" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "title_en" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "title_ar" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "bio_en" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "bio_ar" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "email_public" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "twitter_url" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "instagram_url" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "website_url" TEXT;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN DEFAULT false;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "display_order" INTEGER DEFAULT 0;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_slug_key" ON "team_members"("slug");
CREATE INDEX IF NOT EXISTS "team_members_site_id_is_active_idx" ON "team_members"("site_id", "is_active");
CREATE INDEX IF NOT EXISTS "team_members_is_featured_idx" ON "team_members"("is_featured");

-- TeamMemberExpertise → "team_member_expertise"
CREATE TABLE IF NOT EXISTS "team_member_expertise" (
    "id" TEXT,
    "team_member_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "proficiency" "Proficiency" NOT NULL DEFAULT 'EXPERT',
    "years_experience" INTEGER,
    "description_en" TEXT,
    "description_ar" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "team_member_expertise_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "team_member_id" TEXT;
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "skill_id" TEXT;
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "proficiency" "Proficiency" DEFAULT 'EXPERT';
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "years_experience" INTEGER;
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "description_en" TEXT;
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "description_ar" TEXT;
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN DEFAULT false;
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "display_order" INTEGER DEFAULT 0;
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "team_member_expertise" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "team_member_expertise_team_member_id_idx" ON "team_member_expertise"("team_member_id");
CREATE INDEX IF NOT EXISTS "team_member_expertise_skill_id_idx" ON "team_member_expertise"("skill_id");
CREATE INDEX IF NOT EXISTS "team_member_expertise_is_primary_idx" ON "team_member_expertise"("is_primary");
CREATE UNIQUE INDEX IF NOT EXISTS "team_member_expertise_team_member_id_skill_id_key" ON "team_member_expertise"("team_member_id", "skill_id");

-- TopicPolicy → "TopicPolicy"
CREATE TABLE IF NOT EXISTS "TopicPolicy" (
    "id" TEXT,
    "site_id" TEXT,
    "name" TEXT NOT NULL,
    "policy_type" TEXT NOT NULL,
    "rules_json" JSONB NOT NULL,
    "quotas_json" JSONB,
    "priorities_json" JSONB,
    "auto_approval_rules" JSONB,
    "violation_actions" TEXT[] NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TopicPolicy_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "policy_type" TEXT;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "rules_json" JSONB;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "quotas_json" JSONB;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "priorities_json" JSONB;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "auto_approval_rules" JSONB;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "violation_actions" TEXT[];
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "effective_from" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "effective_until" TIMESTAMP(3);
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TopicPolicy" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "TopicPolicy_site_id_idx" ON "TopicPolicy"("site_id");
CREATE INDEX IF NOT EXISTS "TopicPolicy_policy_type_idx" ON "TopicPolicy"("policy_type");
CREATE INDEX IF NOT EXISTS "TopicPolicy_is_active_idx" ON "TopicPolicy"("is_active");
CREATE INDEX IF NOT EXISTS "TopicPolicy_effective_from_effective_until_idx" ON "TopicPolicy"("effective_from", "effective_until");

-- TrackingPartner → "tracking_partners"
CREATE TABLE IF NOT EXISTS "tracking_partners" (
    "id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "partner_type" "PartnerType" NOT NULL DEFAULT 'HOTEL',
    "commission_type" TEXT NOT NULL DEFAULT 'percentage',
    "commission_rate" DOUBLE PRECISION NOT NULL,
    "cookie_days" INTEGER NOT NULL DEFAULT 30,
    "api_url" TEXT,
    "tracking_domain" TEXT,
    "affiliate_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tracking_partners_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "partner_type" "PartnerType" DEFAULT 'HOTEL';
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "commission_type" TEXT DEFAULT 'percentage';
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "commission_rate" DOUBLE PRECISION;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "cookie_days" INTEGER DEFAULT 30;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "api_url" TEXT;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "tracking_domain" TEXT;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "affiliate_id" TEXT;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tracking_partners" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "tracking_partners_slug_key" ON "tracking_partners"("slug");

-- UserExtended → "UserExtended"
CREATE TABLE IF NOT EXISTS "UserExtended" (
    "id" TEXT,
    "user_id" TEXT NOT NULL,
    "site_memberships" JSONB,
    "feature_preferences" JSONB,
    "notification_settings" JSONB,
    "last_activity_at" TIMESTAMP(3),
    "activity_streak" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserExtended_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "UserExtended" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "UserExtended" ADD COLUMN IF NOT EXISTS "site_memberships" JSONB;
ALTER TABLE "UserExtended" ADD COLUMN IF NOT EXISTS "feature_preferences" JSONB;
ALTER TABLE "UserExtended" ADD COLUMN IF NOT EXISTS "notification_settings" JSONB;
ALTER TABLE "UserExtended" ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMP(3);
ALTER TABLE "UserExtended" ADD COLUMN IF NOT EXISTS "activity_streak" INTEGER DEFAULT 0;
ALTER TABLE "UserExtended" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "UserExtended" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "UserExtended_user_id_key" ON "UserExtended"("user_id");
CREATE INDEX IF NOT EXISTS "UserExtended_user_id_idx" ON "UserExtended"("user_id");
CREATE INDEX IF NOT EXISTS "UserExtended_last_activity_at_idx" ON "UserExtended"("last_activity_at");

-- UserSession → "UserSession"
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "sessionToken" TEXT;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "lastActivity" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_sessionToken_key" ON "UserSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX IF NOT EXISTS "UserSession_sessionToken_idx" ON "UserSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE INDEX IF NOT EXISTS "UserSession_lastActivity_idx" ON "UserSession"("lastActivity");

-- ─── STEP 3: Foreign Key Constraints ─────────────────────────

DO $$ BEGIN ALTER TABLE "AffiliateAssignment" ADD CONSTRAINT "AffiliateAssignment_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "AffiliatePartner"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AffiliateAssignment" ADD CONSTRAINT "AffiliateAssignment_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "AffiliateWidget"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "tracking_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AffiliatePartner" ADD CONSTRAINT "AffiliatePartner_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SitePremium"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AffiliateWidget" ADD CONSTRAINT "AffiliateWidget_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "AffiliatePartner"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SitePremium"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AuditLogPremium" ADD CONSTRAINT "AuditLogPremium_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SitePremium"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AuditLogPremium" ADD CONSTRAINT "AuditLogPremium_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ChangePremium" ADD CONSTRAINT "ChangePremium_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SitePremium"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "content_credits" ADD CONSTRAINT "content_credits_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "conversions" ADD CONSTRAINT "conversions_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "affiliate_clicks"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "conversions" ADD CONSTRAINT "conversions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "tracking_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "domains" ADD CONSTRAINT "domains_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Event" ADD CONSTRAINT "Event_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HomepageVersionPremium" ADD CONSTRAINT "HomepageVersionPremium_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SitePremium"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "information_articles" ADD CONSTRAINT "information_articles_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "information_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "information_articles" ADD CONSTRAINT "information_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "information_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_entity_id_fkey" FOREIGN KEY ("billing_entity_id") REFERENCES "billing_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SitePremium"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ModelRoute" ADD CONSTRAINT "ModelRoute_primary_provider_id_fkey" FOREIGN KEY ("primary_provider_id") REFERENCES "ModelProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_billing_entity_id_fkey" FOREIGN KEY ("billing_entity_id") REFERENCES "billing_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "digital_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SiteMemberPremium" ADD CONSTRAINT "SiteMemberPremium_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SitePremium"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SiteMemberPremium" ADD CONSTRAINT "SiteMemberPremium_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SitePremium" ADD CONSTRAINT "SitePremium_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "SiteThemePremium"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billing_entity_id_fkey" FOREIGN KEY ("billing_entity_id") REFERENCES "billing_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "team_members" ADD CONSTRAINT "team_members_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "team_member_expertise" ADD CONSTRAINT "team_member_expertise_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "team_member_expertise" ADD CONSTRAINT "team_member_expertise_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TopicPolicy" ADD CONSTRAINT "TopicPolicy_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── DONE ────────────────────────────────────────────────────