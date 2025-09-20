#!/usr/bin/env tsx
/**
 * Phase 4 Supabase Migration Script
 * Creates and migrates schema to mirror/extend existing Prisma models
 * for the complete Phase-4 feature blueprint
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MigrationStep {
  name: string
  description: string
  sql: string
  rollbackSql?: string
}

const PHASE4_MIGRATION_STEPS: MigrationStep[] = [
  {
    name: 'create_topic_proposal_table',
    description: 'Create topic_proposal table for AI-powered topic research',
    sql: `
      CREATE TABLE IF NOT EXISTS topic_proposal (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        locale TEXT NOT NULL,
        primary_keyword TEXT NOT NULL,
        longtails TEXT[] NOT NULL DEFAULT '{}',
        featured_longtails TEXT[] NOT NULL DEFAULT '{}',
        questions TEXT[] NOT NULL DEFAULT '{}',
        authority_links_json JSONB NOT NULL DEFAULT '{}',
        intent TEXT NOT NULL,
        suggested_page_type TEXT NOT NULL,
        suggested_window_start TIMESTAMPTZ,
        suggested_window_end TIMESTAMPTZ,
        source_weights_json JSONB NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'proposed',
        confidence_score DECIMAL(3,2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT chk_featured_longtails_count CHECK (array_length(featured_longtails, 1) = 2),
        CONSTRAINT chk_authority_links_count CHECK (jsonb_array_length(authority_links_json) BETWEEN 3 AND 4),
        CONSTRAINT chk_status CHECK (status IN ('proposed', 'approved', 'snoozed', 'rejected')),
        CONSTRAINT chk_intent CHECK (intent IN ('info', 'transactional', 'event')),
        CONSTRAINT chk_page_type CHECK (suggested_page_type IN ('guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_topic_proposal_locale_status ON topic_proposal(locale, status);
      CREATE INDEX IF NOT EXISTS idx_topic_proposal_window ON topic_proposal(suggested_window_start, suggested_window_end);
      CREATE INDEX IF NOT EXISTS idx_topic_proposal_confidence ON topic_proposal(status, confidence_score);
    `,
    rollbackSql: 'DROP TABLE IF EXISTS topic_proposal CASCADE;'
  },
  
  {
    name: 'create_scheduled_content_table',
    description: 'Create scheduled_content table for content pipeline management',
    sql: `
      CREATE TABLE IF NOT EXISTS scheduled_content (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL,
        language TEXT NOT NULL,
        category TEXT,
        tags TEXT[] DEFAULT '{}',
        metadata JSONB,
        scheduled_time TIMESTAMPTZ NOT NULL,
        published_time TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending',
        platform TEXT,
        published BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        -- Phase 4 Extensions
        page_type TEXT,
        topic_proposal_id TEXT,
        seo_score INTEGER,
        generation_source TEXT,
        authority_links_used JSONB,
        longtails_used JSONB,
        
        CONSTRAINT chk_status CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
        CONSTRAINT chk_content_type CHECK (content_type IN ('blog_post', 'instagram_post', 'tiktok_video')),
        CONSTRAINT chk_language CHECK (language IN ('en', 'ar')),
        CONSTRAINT chk_page_type CHECK (page_type IS NULL OR page_type IN ('guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary')),
        CONSTRAINT chk_seo_score CHECK (seo_score IS NULL OR (seo_score >= 0 AND seo_score <= 100)),
        CONSTRAINT fk_topic_proposal FOREIGN KEY (topic_proposal_id) REFERENCES topic_proposal(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_scheduled_content_page_type ON scheduled_content(page_type);
      CREATE INDEX IF NOT EXISTS idx_scheduled_content_topic_proposal ON scheduled_content(topic_proposal_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_content_seo_score ON scheduled_content(seo_score);
      CREATE INDEX IF NOT EXISTS idx_scheduled_content_generation_source ON scheduled_content(generation_source);
    `,
    rollbackSql: 'DROP TABLE IF EXISTS scheduled_content CASCADE;'
  },
  
  {
    name: 'create_media_enrichment_table',
    description: 'Create media_enrichment table for AI-powered media enhancement',
    sql: `
      CREATE TABLE IF NOT EXISTS media_enrichment (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        media_id TEXT UNIQUE NOT NULL,
        alt_text_original TEXT,
        alt_text_enhanced TEXT,
        title_enhanced TEXT,
        description_enhanced TEXT,
        tags_ai TEXT[] DEFAULT '{}',
        color_palette JSONB,
        composition_data JSONB,
        accessibility_score INTEGER,
        seo_optimized BOOLEAN NOT NULL DEFAULT false,
        processing_status TEXT NOT NULL DEFAULT 'pending',
        ai_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT chk_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
        CONSTRAINT chk_accessibility_score CHECK (accessibility_score IS NULL OR (accessibility_score >= 0 AND accessibility_score <= 100))
      );
      
      CREATE INDEX IF NOT EXISTS idx_media_enrichment_processing_status ON media_enrichment(processing_status);
      CREATE INDEX IF NOT EXISTS idx_media_enrichment_seo_optimized ON media_enrichment(seo_optimized);
      CREATE INDEX IF NOT EXISTS idx_media_enrichment_created_at ON media_enrichment(created_at);
    `,
    rollbackSql: 'DROP TABLE IF EXISTS media_enrichment CASCADE;'
  },
  
  {
    name: 'create_prompt_template_table',
    description: 'Create prompt_template table for prompt management and versioning',
    sql: `
      CREATE TABLE IF NOT EXISTS prompt_template (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        template_en TEXT NOT NULL,
        template_ar TEXT,
        variables JSONB NOT NULL DEFAULT '{}',
        version TEXT NOT NULL DEFAULT '1.0',
        locale_overrides JSONB,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by TEXT,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT chk_category CHECK (category IN ('content_generation', 'seo_audit', 'topic_research', 'media_description')),
        CONSTRAINT chk_usage_count CHECK (usage_count >= 0),
        UNIQUE(name, version)
      );
      
      CREATE INDEX IF NOT EXISTS idx_prompt_template_category_active ON prompt_template(category, is_active);
      CREATE INDEX IF NOT EXISTS idx_prompt_template_version ON prompt_template(version);
      CREATE INDEX IF NOT EXISTS idx_prompt_template_usage_count ON prompt_template(usage_count);
    `,
    rollbackSql: 'DROP TABLE IF EXISTS prompt_template CASCADE;'
  },
  
  {
    name: 'create_seo_audit_result_table',
    description: 'Create seo_audit_result table for SEO audits and internal link offers',
    sql: `
      CREATE TABLE IF NOT EXISTS seo_audit_result (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        score INTEGER NOT NULL,
        breakdown_json JSONB NOT NULL DEFAULT '{}',
        suggestions JSONB NOT NULL DEFAULT '{}',
        quick_fixes JSONB NOT NULL DEFAULT '{}',
        internal_link_offers JSONB,
        authority_links_used JSONB,
        longtails_coverage JSONB,
        audit_version TEXT NOT NULL DEFAULT '1.0',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT chk_content_type CHECK (content_type IN ('blog_post', 'scheduled_content')),
        CONSTRAINT chk_score CHECK (score >= 0 AND score <= 100)
      );
      
      CREATE INDEX IF NOT EXISTS idx_seo_audit_result_content ON seo_audit_result(content_id, content_type);
      CREATE INDEX IF NOT EXISTS idx_seo_audit_result_score ON seo_audit_result(score);
      CREATE INDEX IF NOT EXISTS idx_seo_audit_result_created_at ON seo_audit_result(created_at);
    `,
    rollbackSql: 'DROP TABLE IF EXISTS seo_audit_result CASCADE;'
  },
  
  {
    name: 'create_analytics_snapshot_table',
    description: 'Create analytics_snapshot table for analytics caching and backlink triggers',
    sql: `
      CREATE TABLE IF NOT EXISTS analytics_snapshot (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        site_id TEXT,
        date_range TEXT NOT NULL,
        data_json JSONB NOT NULL DEFAULT '{}',
        indexed_pages INTEGER NOT NULL DEFAULT 0,
        top_queries JSONB NOT NULL DEFAULT '{}',
        performance_metrics JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT chk_date_range CHECK (date_range IN ('7d', '28d')),
        CONSTRAINT chk_indexed_pages CHECK (indexed_pages >= 0)
      );
      
      CREATE INDEX IF NOT EXISTS idx_analytics_snapshot_date_range ON analytics_snapshot(date_range);
      CREATE INDEX IF NOT EXISTS idx_analytics_snapshot_created_at ON analytics_snapshot(created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_snapshot_indexed_pages ON analytics_snapshot(indexed_pages);
    `,
    rollbackSql: 'DROP TABLE IF EXISTS analytics_snapshot CASCADE;'
  },
  
  {
    name: 'enable_rls_and_policies',
    description: 'Enable Row Level Security and create policies for RBAC',
    sql: `
      -- Enable RLS on all tables
      ALTER TABLE topic_proposal ENABLE ROW LEVEL SECURITY;
      ALTER TABLE scheduled_content ENABLE ROW LEVEL SECURITY;
      ALTER TABLE media_enrichment ENABLE ROW LEVEL SECURITY;
      ALTER TABLE prompt_template ENABLE ROW LEVEL SECURITY;
      ALTER TABLE seo_audit_result ENABLE ROW LEVEL SECURITY;
      ALTER TABLE analytics_snapshot ENABLE ROW LEVEL SECURITY;
      
      -- Create policies for authenticated users
      CREATE POLICY "Users can view topic proposals" ON topic_proposal FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Admins can manage topic proposals" ON topic_proposal FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));
      
      CREATE POLICY "Users can view scheduled content" ON scheduled_content FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Admins can manage scheduled content" ON scheduled_content FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));
      
      CREATE POLICY "Users can view media enrichment" ON media_enrichment FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Admins can manage media enrichment" ON media_enrichment FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));
      
      CREATE POLICY "Users can view prompt templates" ON prompt_template FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Admins can manage prompt templates" ON prompt_template FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
      
      CREATE POLICY "Users can view seo audit results" ON seo_audit_result FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Admins can manage seo audit results" ON seo_audit_result FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));
      
      CREATE POLICY "Users can view analytics snapshots" ON analytics_snapshot FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Admins can manage analytics snapshots" ON analytics_snapshot FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));
    `,
    rollbackSql: `
      -- Disable RLS
      ALTER TABLE topic_proposal DISABLE ROW LEVEL SECURITY;
      ALTER TABLE scheduled_content DISABLE ROW LEVEL SECURITY;
      ALTER TABLE media_enrichment DISABLE ROW LEVEL SECURITY;
      ALTER TABLE prompt_template DISABLE ROW LEVEL SECURITY;
      ALTER TABLE seo_audit_result DISABLE ROW LEVEL SECURITY;
      ALTER TABLE analytics_snapshot DISABLE ROW LEVEL SECURITY;
    `
  },
  
  {
    name: 'create_functions_and_triggers',
    description: 'Create database functions and triggers for business logic enforcement',
    sql: `
      -- Function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      -- Create triggers for updated_at
      CREATE TRIGGER update_topic_proposal_updated_at BEFORE UPDATE ON topic_proposal FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_scheduled_content_updated_at BEFORE UPDATE ON scheduled_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_media_enrichment_updated_at BEFORE UPDATE ON media_enrichment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_prompt_template_updated_at BEFORE UPDATE ON prompt_template FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      -- Function to check backlink offer trigger (indexed_pages >= 40)
      CREATE OR REPLACE FUNCTION check_backlink_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Log when indexed pages hits the threshold
        IF NEW.indexed_pages >= 40 AND (OLD.indexed_pages IS NULL OR OLD.indexed_pages < 40) THEN
          RAISE NOTICE 'Backlink offers threshold reached: % pages indexed', NEW.indexed_pages;
        END IF;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      CREATE TRIGGER check_backlink_trigger_on_analytics AFTER UPDATE ON analytics_snapshot FOR EACH ROW EXECUTE FUNCTION check_backlink_trigger();
    `,
    rollbackSql: `
      DROP TRIGGER IF EXISTS update_topic_proposal_updated_at ON topic_proposal;
      DROP TRIGGER IF EXISTS update_scheduled_content_updated_at ON scheduled_content;
      DROP TRIGGER IF EXISTS update_media_enrichment_updated_at ON media_enrichment;
      DROP TRIGGER IF EXISTS update_prompt_template_updated_at ON prompt_template;
      DROP TRIGGER IF EXISTS check_backlink_trigger_on_analytics ON analytics_snapshot;
      DROP FUNCTION IF EXISTS update_updated_at_column();
      DROP FUNCTION IF EXISTS check_backlink_trigger();
    `
  }
]

async function executeMigrationStep(step: MigrationStep): Promise<void> {
  console.log(`🔄 Executing: ${step.name}`)
  console.log(`   ${step.description}`)
  
  try {
    const { error } = await supabase.rpc('exec', { sql: step.sql })
    
    if (error) {
      console.error(`❌ Failed to execute ${step.name}:`, error)
      throw error
    }
    
    console.log(`✅ Completed: ${step.name}`)
  } catch (error) {
    console.error(`💥 Error in ${step.name}:`, error)
    throw error
  }
}

async function rollbackMigrationStep(step: MigrationStep): Promise<void> {
  if (!step.rollbackSql) {
    console.log(`⏭️  Skipping rollback for ${step.name} (no rollback SQL)`)
    return
  }
  
  console.log(`🔙 Rolling back: ${step.name}`)
  
  try {
    const { error } = await supabase.rpc('exec', { sql: step.rollbackSql })
    
    if (error) {
      console.error(`❌ Failed to rollback ${step.name}:`, error)
      throw error
    }
    
    console.log(`✅ Rolled back: ${step.name}`)
  } catch (error) {
    console.error(`💥 Error in rollback ${step.name}:`, error)
    throw error
  }
}

async function validateMigration(): Promise<void> {
  console.log('🔍 Validating migration...')
  
  const validations = [
    { table: 'topic_proposal', description: 'Topic proposal table exists' },
    { table: 'scheduled_content', description: 'Scheduled content table exists' },
    { table: 'media_enrichment', description: 'Media enrichment table exists' },
    { table: 'prompt_template', description: 'Prompt template table exists' },
    { table: 'seo_audit_result', description: 'SEO audit result table exists' },
    { table: 'analytics_snapshot', description: 'Analytics snapshot table exists' }
  ]
  
  for (const validation of validations) {
    try {
      const { error } = await supabase
        .from(validation.table)
        .select('count(*)', { count: 'exact', head: true })
      
      if (error) {
        console.error(`❌ Validation failed for ${validation.table}:`, error)
        throw error
      }
      
      console.log(`✅ ${validation.description}`)
    } catch (error) {
      console.error(`💥 Validation error for ${validation.table}:`, error)
      throw error
    }
  }
  
  console.log('🎉 Migration validation completed successfully!')
}

async function runMigration(): Promise<void> {
  console.log('🚀 Starting Phase 4 Supabase migration...')
  console.log(`📋 ${PHASE4_MIGRATION_STEPS.length} migration steps to execute`)
  
  try {
    // Execute all migration steps
    for (const step of PHASE4_MIGRATION_STEPS) {
      await executeMigrationStep(step)
    }
    
    // Validate migration
    await validateMigration()
    
    console.log('🎉 Phase 4 Supabase migration completed successfully!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    console.log('🔄 Consider running rollback if needed')
    throw error
  }
}

async function runRollback(): Promise<void> {
  console.log('🔄 Starting Phase 4 Supabase rollback...')
  
  try {
    // Execute rollback steps in reverse order
    const rollbackSteps = [...PHASE4_MIGRATION_STEPS].reverse()
    
    for (const step of rollbackSteps) {
      await rollbackMigrationStep(step)
    }
    
    console.log('✅ Phase 4 Supabase rollback completed successfully!')
    
  } catch (error) {
    console.error('💥 Rollback failed:', error)
    throw error
  }
}

// CLI interface
async function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'migrate':
      await runMigration()
      break
      
    case 'rollback':
      await runRollback()
      break
      
    case 'validate':
      await validateMigration()
      break
      
    default:
      console.log('Usage: tsx scripts/phase4-supabase-migration.ts [migrate|rollback|validate]')
      process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
}

export { runMigration, runRollback, validateMigration }