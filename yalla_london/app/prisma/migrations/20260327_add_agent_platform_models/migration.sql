-- CEO + CTO Agent Platform Models
-- Migration: 20260327_add_agent_platform_models
-- Creates: Conversation, Message, AgentTask, CrmOpportunity, InteractionLog,
--          RetentionSequence, RetentionProgress, FinanceEvent

-- ============================================================================
-- 1. Conversation — tracks multi-message threads across channels
-- ============================================================================
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId"          TEXT NOT NULL,
  "channel"         TEXT NOT NULL,
  "externalId"      TEXT,
  "contactName"     TEXT,
  "contactEmail"    TEXT,
  "contactPhone"    TEXT,
  "leadId"          TEXT,
  "subscriberId"    TEXT,
  "inquiryId"       TEXT,
  "opportunityId"   TEXT,
  "status"          TEXT NOT NULL DEFAULT 'open',
  "summary"         TEXT,
  "sentiment"       TEXT,
  "tags"            TEXT[] DEFAULT '{}',
  "metadata"        JSONB,
  "lastMessageAt"   TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "conversations_siteId_status_idx" ON "conversations"("siteId", "status");
CREATE INDEX IF NOT EXISTS "conversations_externalId_channel_idx" ON "conversations"("externalId", "channel");
CREATE INDEX IF NOT EXISTS "conversations_leadId_idx" ON "conversations"("leadId");
CREATE INDEX IF NOT EXISTS "conversations_opportunityId_idx" ON "conversations"("opportunityId");

-- ============================================================================
-- 2. Message — individual messages within a conversation
-- ============================================================================
CREATE TABLE IF NOT EXISTS "messages" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "conversationId"  TEXT NOT NULL,
  "direction"       TEXT NOT NULL,
  "channel"         TEXT NOT NULL,
  "content"         TEXT NOT NULL,
  "contentType"     TEXT NOT NULL DEFAULT 'text',
  "mediaUrls"       TEXT[] DEFAULT '{}',
  "senderName"      TEXT,
  "agentId"         TEXT,
  "toolsUsed"       TEXT[] DEFAULT '{}',
  "confidence"      DOUBLE PRECISION,
  "approved"        BOOLEAN NOT NULL DEFAULT true,
  "metadata"        JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_conversationId_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- 3. AgentTask — tasks for CEO or CTO agent
-- ============================================================================
CREATE TABLE IF NOT EXISTS "agent_tasks" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "agentType"       TEXT NOT NULL,
  "taskType"        TEXT NOT NULL,
  "priority"        TEXT NOT NULL DEFAULT 'medium',
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "description"     TEXT NOT NULL,
  "input"           JSONB,
  "output"          JSONB,
  "changes"         TEXT[] DEFAULT '{}',
  "testsRun"        TEXT[] DEFAULT '{}',
  "findings"        TEXT[] DEFAULT '{}',
  "followUps"       TEXT[] DEFAULT '{}',
  "errorMessage"    TEXT,
  "durationMs"      INTEGER,
  "siteId"          TEXT,
  "assignedTo"      TEXT,
  "dueAt"           TIMESTAMP(3),
  "conversationId"  TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"     TIMESTAMP(3),

  CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agent_tasks_agentType_status_idx" ON "agent_tasks"("agentType", "status");
CREATE INDEX IF NOT EXISTS "agent_tasks_siteId_idx" ON "agent_tasks"("siteId");
CREATE INDEX IF NOT EXISTS "agent_tasks_dueAt_status_idx" ON "agent_tasks"("dueAt", "status");

-- ============================================================================
-- 4. CrmOpportunity — sales pipeline stages
-- ============================================================================
CREATE TABLE IF NOT EXISTS "crm_opportunities" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId"          TEXT NOT NULL,
  "leadId"          TEXT,
  "inquiryId"       TEXT,
  "subscriberId"    TEXT,
  "contactName"     TEXT NOT NULL,
  "contactEmail"    TEXT,
  "contactPhone"    TEXT,
  "stage"           TEXT NOT NULL DEFAULT 'new',
  "value"           DOUBLE PRECISION,
  "currency"        TEXT NOT NULL DEFAULT 'USD',
  "source"          TEXT,
  "lostReason"      TEXT,
  "nextAction"      TEXT,
  "nextActionAt"    TIMESTAMP(3),
  "assignedTo"      TEXT,
  "tags"            TEXT[] DEFAULT '{}',
  "metadata"        JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"        TIMESTAMP(3),

  CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crm_opportunities_siteId_stage_idx" ON "crm_opportunities"("siteId", "stage");
CREATE INDEX IF NOT EXISTS "crm_opportunities_nextActionAt_idx" ON "crm_opportunities"("nextActionAt");
CREATE INDEX IF NOT EXISTS "crm_opportunities_leadId_idx" ON "crm_opportunities"("leadId");

-- ============================================================================
-- 5. InteractionLog — unified timeline of all touchpoints
-- ============================================================================
CREATE TABLE IF NOT EXISTS "interaction_logs" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId"          TEXT NOT NULL,
  "opportunityId"   TEXT,
  "conversationId"  TEXT,
  "leadId"          TEXT,
  "channel"         TEXT NOT NULL,
  "direction"       TEXT NOT NULL,
  "interactionType" TEXT NOT NULL,
  "summary"         TEXT NOT NULL,
  "sentiment"       TEXT,
  "agentId"         TEXT,
  "metadata"        JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interaction_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interaction_logs_siteId_createdAt_idx" ON "interaction_logs"("siteId", "createdAt");
CREATE INDEX IF NOT EXISTS "interaction_logs_opportunityId_idx" ON "interaction_logs"("opportunityId");
CREATE INDEX IF NOT EXISTS "interaction_logs_leadId_idx" ON "interaction_logs"("leadId");

ALTER TABLE "interaction_logs" DROP CONSTRAINT IF EXISTS "interaction_logs_opportunityId_fkey";
ALTER TABLE "interaction_logs" ADD CONSTRAINT "interaction_logs_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "interaction_logs" DROP CONSTRAINT IF EXISTS "interaction_logs_conversationId_fkey";
ALTER TABLE "interaction_logs" ADD CONSTRAINT "interaction_logs_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 6. RetentionSequence — automated email sequence definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS "retention_sequences" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId"          TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "triggerEvent"    TEXT NOT NULL,
  "steps"           JSONB NOT NULL,
  "active"          BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "retention_sequences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "retention_sequences_siteId_active_idx" ON "retention_sequences"("siteId", "active");
ALTER TABLE "retention_sequences" DROP CONSTRAINT IF EXISTS "retention_sequences_siteId_name_key";
ALTER TABLE "retention_sequences" ADD CONSTRAINT "retention_sequences_siteId_name_key" UNIQUE ("siteId", "name");

-- ============================================================================
-- 7. RetentionProgress — subscriber position in each sequence
-- ============================================================================
CREATE TABLE IF NOT EXISTS "retention_progress" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sequenceId"      TEXT NOT NULL,
  "subscriberId"    TEXT NOT NULL,
  "currentStep"     INTEGER NOT NULL DEFAULT 0,
  "status"          TEXT NOT NULL DEFAULT 'active',
  "lastSentAt"      TIMESTAMP(3),
  "nextSendAt"      TIMESTAMP(3),
  "metadata"        JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "retention_progress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "retention_progress_nextSendAt_status_idx" ON "retention_progress"("nextSendAt", "status");
ALTER TABLE "retention_progress" DROP CONSTRAINT IF EXISTS "retention_progress_sequenceId_subscriberId_key";
ALTER TABLE "retention_progress" ADD CONSTRAINT "retention_progress_sequenceId_subscriberId_key" UNIQUE ("sequenceId", "subscriberId");

-- ============================================================================
-- 8. FinanceEvent — Stripe/Mercury webhook event log
-- ============================================================================
CREATE TABLE IF NOT EXISTS "finance_events" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "siteId"          TEXT NOT NULL,
  "source"          TEXT NOT NULL,
  "eventType"       TEXT NOT NULL,
  "externalId"      TEXT,
  "amount"          DOUBLE PRECISION,
  "currency"        TEXT NOT NULL DEFAULT 'USD',
  "contactEmail"    TEXT,
  "opportunityId"   TEXT,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "agentAction"     TEXT,
  "metadata"        JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt"     TIMESTAMP(3),

  CONSTRAINT "finance_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "finance_events_siteId_eventType_idx" ON "finance_events"("siteId", "eventType");
CREATE INDEX IF NOT EXISTS "finance_events_externalId_idx" ON "finance_events"("externalId");
