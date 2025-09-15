#!/usr/bin/env tsx
/**
 * Phase 4C Database Migration Script
 * Creates the new models and updates for Phase 4C features
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

interface MigrationStep {
  name: string
  description: string
  sql: string
  rollback?: string
}

const PHASE4C_MIGRATION_STEPS: MigrationStep[] = [
  {
    name: 'create_topic_policy_table',
    description: 'Create TopicPolicy table for quota management',
    sql: `
      CREATE TABLE IF NOT EXISTS "TopicPolicy" (
        "id" TEXT NOT NULL,
        "site_id" TEXT,
        "name" TEXT NOT NULL,
        "policy_type" TEXT NOT NULL,
        "rules_json" JSONB NOT NULL,
        "quotas_json" JSONB,
        "priorities_json" JSONB,
        "auto_approval_rules" JSONB,
        "violation_actions" TEXT[],
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "effective_until" TIMESTAMP(3),
        "created_by" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "TopicPolicy_pkey" PRIMARY KEY ("id")
      );

      CREATE INDEX "TopicPolicy_site_id_idx" ON "TopicPolicy"("site_id");
      CREATE INDEX "TopicPolicy_policy_type_idx" ON "TopicPolicy"("policy_type");
      CREATE INDEX "TopicPolicy_is_active_idx" ON "TopicPolicy"("is_active");
      CREATE INDEX "TopicPolicy_effective_from_effective_until_idx" ON "TopicPolicy"("effective_from", "effective_until");

      ALTER TABLE "TopicPolicy" ADD CONSTRAINT "TopicPolicy_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `,
    rollback: 'DROP TABLE IF EXISTS "TopicPolicy";'
  },

  {
    name: 'create_subscriber_table',
    description: 'Create Subscriber table for CRM management',
    sql: `
      CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED');

      CREATE TABLE IF NOT EXISTS "Subscriber" (
        "id" TEXT NOT NULL,
        "site_id" TEXT,
        "email" TEXT NOT NULL,
        "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
        "source" TEXT,
        "preferences_json" JSONB,
        "metadata_json" JSONB,
        "double_optin_token" TEXT UNIQUE,
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

      CREATE UNIQUE INDEX "Subscriber_site_id_email_key" ON "Subscriber"("site_id", "email");
      CREATE INDEX "Subscriber_site_id_idx" ON "Subscriber"("site_id");
      CREATE INDEX "Subscriber_status_idx" ON "Subscriber"("status");
      CREATE INDEX "Subscriber_source_idx" ON "Subscriber"("source");
      CREATE INDEX "Subscriber_created_at_idx" ON "Subscriber"("created_at");
    `,
    rollback: 'DROP TABLE IF EXISTS "Subscriber"; DROP TYPE IF EXISTS "SubscriberStatus";'
  },

  {
    name: 'create_consent_log_table',
    description: 'Create ConsentLog table for GDPR compliance',
    sql: `
      CREATE TABLE IF NOT EXISTS "ConsentLog" (
        "id" TEXT NOT NULL,
        "site_id" TEXT,
        "subscriber_id" TEXT NOT NULL,
        "consent_type" TEXT NOT NULL,
        "consent_version" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "legal_basis" TEXT NOT NULL,
        "processing_purposes" TEXT[],
        "data_categories" TEXT[],
        "consent_text" TEXT,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
      );

      CREATE INDEX "ConsentLog_site_id_idx" ON "ConsentLog"("site_id");
      CREATE INDEX "ConsentLog_subscriber_id_idx" ON "ConsentLog"("subscriber_id");
      CREATE INDEX "ConsentLog_consent_type_idx" ON "ConsentLog"("consent_type");
      CREATE INDEX "ConsentLog_action_idx" ON "ConsentLog"("action");
      CREATE INDEX "ConsentLog_timestamp_idx" ON "ConsentLog"("timestamp");

      ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `,
    rollback: 'DROP TABLE IF EXISTS "ConsentLog";'
  },

  {
    name: 'create_model_provider_table',
    description: 'Create ModelProvider table for LLM management',
    sql: `
      CREATE TABLE IF NOT EXISTS "ModelProvider" (
        "id" TEXT NOT NULL,
        "site_id" TEXT,
        "name" TEXT NOT NULL,
        "display_name" TEXT NOT NULL,
        "provider_type" TEXT NOT NULL,
        "api_endpoint" TEXT,
        "api_key_encrypted" TEXT,
        "api_version" TEXT,
        "rate_limits_json" JSONB,
        "cost_per_token" DOUBLE PRECISION,
        "capabilities" TEXT[],
        "model_config_json" JSONB,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_tested_at" TIMESTAMP(3),
        "test_status" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "ModelProvider_pkey" PRIMARY KEY ("id")
      );

      CREATE INDEX "ModelProvider_site_id_idx" ON "ModelProvider"("site_id");
      CREATE INDEX "ModelProvider_provider_type_idx" ON "ModelProvider"("provider_type");
      CREATE INDEX "ModelProvider_is_active_idx" ON "ModelProvider"("is_active");
    `,
    rollback: 'DROP TABLE IF EXISTS "ModelProvider";'
  },

  {
    name: 'create_model_route_table',
    description: 'Create ModelRoute table for LLM routing',
    sql: `
      CREATE TABLE IF NOT EXISTS "ModelRoute" (
        "id" TEXT NOT NULL,
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

      CREATE INDEX "ModelRoute_site_id_idx" ON "ModelRoute"("site_id");
      CREATE INDEX "ModelRoute_route_name_idx" ON "ModelRoute"("route_name");
      CREATE INDEX "ModelRoute_is_active_idx" ON "ModelRoute"("is_active");

      ALTER TABLE "ModelRoute" ADD CONSTRAINT "ModelRoute_primary_provider_id_fkey" FOREIGN KEY ("primary_provider_id") REFERENCES "ModelProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `,
    rollback: 'DROP TABLE IF EXISTS "ModelRoute";'
  },

  {
    name: 'create_background_job_table',
    description: 'Create BackgroundJob table for job management',
    sql: `
      CREATE TABLE IF NOT EXISTS "BackgroundJob" (
        "id" TEXT NOT NULL,
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

      CREATE INDEX "BackgroundJob_site_id_idx" ON "BackgroundJob"("site_id");
      CREATE INDEX "BackgroundJob_job_name_idx" ON "BackgroundJob"("job_name");
      CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");
      CREATE INDEX "BackgroundJob_next_run_at_idx" ON "BackgroundJob"("next_run_at");
      CREATE INDEX "BackgroundJob_created_at_idx" ON "BackgroundJob"("created_at");
    `,
    rollback: 'DROP TABLE IF EXISTS "BackgroundJob";'
  },

  {
    name: 'create_exit_intent_impression_table',
    description: 'Create ExitIntentImpression table for engagement tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS "ExitIntentImpression" (
        "id" TEXT NOT NULL,
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

      CREATE INDEX "ExitIntentImpression_site_id_idx" ON "ExitIntentImpression"("site_id");
      CREATE INDEX "ExitIntentImpression_session_id_idx" ON "ExitIntentImpression"("session_id");
      CREATE INDEX "ExitIntentImpression_shown_at_idx" ON "ExitIntentImpression"("shown_at");
      CREATE INDEX "ExitIntentImpression_ttl_expires_at_idx" ON "ExitIntentImpression"("ttl_expires_at");
    `,
    rollback: 'DROP TABLE IF EXISTS "ExitIntentImpression";'
  },

  {
    name: 'create_user_extended_table',
    description: 'Create UserExtended table for enhanced user features',
    sql: `
      CREATE TABLE IF NOT EXISTS "UserExtended" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL UNIQUE,
        "site_memberships" JSONB,
        "feature_preferences" JSONB,
        "notification_settings" JSONB,
        "last_activity_at" TIMESTAMP(3),
        "activity_streak" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "UserExtended_pkey" PRIMARY KEY ("id")
      );

      CREATE INDEX "UserExtended_user_id_idx" ON "UserExtended"("user_id");
      CREATE INDEX "UserExtended_last_activity_at_idx" ON "UserExtended"("last_activity_at");
    `,
    rollback: 'DROP TABLE IF EXISTS "UserExtended";'
  },

  {
    name: 'add_user_topic_policies_relation',
    description: 'Add TopicPolicy relation to User table',
    sql: `
      -- The relation is already handled by the foreign key in TopicPolicy table
      -- This step is mainly for documentation and potential future use
    `,
    rollback: ''
  }
]

async function executeMigrationStep(step: MigrationStep): Promise<void> {
  console.log(`🔄 Executing: ${step.name} - ${step.description}`)
  
  try {
    if (step.sql.trim()) {
      // Split SQL into individual statements and execute them
      const statements = step.sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      
      for (const statement of statements) {
        await prisma.$executeRawUnsafe(statement + ';')
      }
    }
    
    console.log(`✅ Completed: ${step.name}`)
  } catch (error) {
    console.error(`❌ Failed: ${step.name}`)
    console.error(error)
    throw error
  }
}

async function rollbackMigrationStep(step: MigrationStep): Promise<void> {
  if (!step.rollback) {
    console.log(`⏭️  Skipping rollback for: ${step.name} (no rollback defined)`)
    return
  }
  
  console.log(`🔄 Rolling back: ${step.name}`)
  
  try {
    const statements = step.rollback
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement + ';')
    }
    
    console.log(`✅ Rolled back: ${step.name}`)
  } catch (error) {
    console.error(`❌ Rollback failed: ${step.name}`)
    console.error(error)
    throw error
  }
}

async function createMigrationRecord(): Promise<void> {
  const migrationName = `phase4c_unified_backend_${Date.now()}`
  const migrationHash = createHash('sha256')
    .update(PHASE4C_MIGRATION_STEPS.map(s => s.sql).join(''))
    .digest('hex')
  
  console.log(`📝 Creating migration record: ${migrationName}`)
  
  // Note: This would typically be in the _prisma_migrations table
  // For now, we'll just log it
  console.log(`Migration hash: ${migrationHash}`)
}

async function validateMigration(): Promise<void> {
  console.log('🔍 Validating migration...')
  
  try {
    // Check if all tables exist
    const tables = [
      'TopicPolicy',
      'Subscriber', 
      'ConsentLog',
      'ModelProvider',
      'ModelRoute',
      'BackgroundJob',
      'ExitIntentImpression',
      'UserExtended'
    ]
    
    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe(`
        SELECT to_regclass('public."${table}"') as exists;
      `)
      
      if (!(result as any)[0]?.exists) {
        throw new Error(`Table ${table} does not exist`)
      }
      
      console.log(`✅ Table ${table} exists`)
    }
    
    // Check if SubscriberStatus enum exists
    const enumResult = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM pg_type WHERE typname = 'SubscriberStatus';
    `)
    
    if (!(enumResult as any).length) {
      throw new Error('SubscriberStatus enum does not exist')
    }
    
    console.log('✅ SubscriberStatus enum exists')
    
    console.log('✅ Migration validation completed successfully')
  } catch (error) {
    console.error('❌ Migration validation failed')
    throw error
  }
}

async function runMigration(): Promise<void> {
  console.log('🚀 Starting Phase 4C migration...')
  console.log(`📋 ${PHASE4C_MIGRATION_STEPS.length} migration steps to execute`)
  
  try {
    // Execute all migration steps
    for (const step of PHASE4C_MIGRATION_STEPS) {
      await executeMigrationStep(step)
    }
    
    // Create migration record
    await createMigrationRecord()
    
    // Validate migration
    await validateMigration()
    
    console.log('🎉 Phase 4C migration completed successfully!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    console.log('🔄 Consider running rollback if needed')
    throw error
  }
}

async function runRollback(): Promise<void> {
  console.log('🔄 Starting Phase 4C rollback...')
  
  try {
    // Execute rollback steps in reverse order
    const rollbackSteps = [...PHASE4C_MIGRATION_STEPS].reverse()
    
    for (const step of rollbackSteps) {
      await rollbackMigrationStep(step)
    }
    
    console.log('✅ Phase 4C rollback completed successfully!')
    
  } catch (error) {
    console.error('💥 Rollback failed:', error)
    throw error
  }
}

async function main(): Promise<void> {
  const command = process.argv[2]
  
  switch (command) {
    case 'migrate':
    case 'up':
      await runMigration()
      break
      
    case 'rollback':
    case 'down':
      await runRollback()
      break
      
    case 'validate':
      await validateMigration()
      break
      
    default:
      console.log('Usage: tsx migrate-phase4c.ts [migrate|rollback|validate]')
      console.log('')
      console.log('Commands:')
      console.log('  migrate   - Run Phase 4C migration')
      console.log('  rollback  - Rollback Phase 4C migration')
      console.log('  validate  - Validate migration was successful')
      process.exit(1)
  }
}

// Run the script
main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })