export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-middleware";

/**
 * Database Migration Endpoint
 *
 * GET  → Scan for missing tables and columns (read-only)
 * POST → Create missing tables and add missing columns
 *
 * Auth: Admin session cookie OR CRON_SECRET bearer token
 */

// ─── Auth ──────────────────────────────────────────────────────────────────
async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  return requireAdminOrCron(request);
}

// ─── Schema Definition ─────────────────────────────────────────────────────
// Each entry maps a Prisma model to its Postgres table and expected columns.
// Only columns that are known to be missing in production are listed here;
// we also include full CREATE TABLE statements for entirely missing tables.

interface ColumnDef {
  name: string;
  type: string; // Postgres type
  nullable?: boolean;
  defaultValue?: string;
}

interface TableDef {
  table: string;
  model: string;
  columns: ColumnDef[];
  indexes?: string[]; // Raw CREATE INDEX IF NOT EXISTS statements
}

const EXPECTED_TABLES: TableDef[] = [
  // ── BlogPost ────────────────────────────────────
  {
    table: '"BlogPost"',
    model: "BlogPost",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
      { name: "deletedAt", type: "TIMESTAMPTZ", nullable: true },
      { name: "page_type", type: "TEXT", nullable: true },
      { name: "keywords_json", type: "JSONB", nullable: true },
      { name: "questions_json", type: "JSONB", nullable: true },
      { name: "authority_links_json", type: "JSONB", nullable: true },
      { name: "featured_longtails_json", type: "JSONB", nullable: true },
      { name: "seo_score", type: "INTEGER", nullable: true },
      { name: "og_image_id", type: "TEXT", nullable: true },
      { name: "place_id", type: "TEXT", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "BlogPost_siteId_idx" ON "BlogPost"("siteId")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_siteId_published_idx" ON "BlogPost"("siteId", "published")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_siteId_created_at_idx" ON "BlogPost"("siteId", "created_at")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_page_type_idx" ON "BlogPost"("page_type")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_seo_score_idx" ON "BlogPost"("seo_score")',
      'CREATE INDEX IF NOT EXISTS "BlogPost_place_id_idx" ON "BlogPost"("place_id")',
    ],
  },
  // ── ScheduledContent ────────────────────────────
  {
    table: '"ScheduledContent"',
    model: "ScheduledContent",
    columns: [
      { name: "content_id", type: "TEXT", nullable: true },
      { name: "site_id", type: "TEXT", nullable: true },
      { name: "page_type", type: "TEXT", nullable: true },
      { name: "topic_proposal_id", type: "TEXT", nullable: true },
      { name: "seo_score", type: "INTEGER", nullable: true },
      { name: "generation_source", type: "TEXT", nullable: true },
      { name: "authority_links_used", type: "JSONB", nullable: true },
      { name: "longtails_used", type: "JSONB", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "ScheduledContent_content_id_idx" ON "ScheduledContent"("content_id")',
      'CREATE INDEX IF NOT EXISTS "ScheduledContent_site_id_idx" ON "ScheduledContent"("site_id")',
      'CREATE INDEX IF NOT EXISTS "ScheduledContent_scheduled_time_idx" ON "ScheduledContent"("scheduled_time")',
      'CREATE INDEX IF NOT EXISTS "ScheduledContent_status_idx" ON "ScheduledContent"("status")',
    ],
  },
  // ── SeoReport ──────────────────────────────────
  {
    table: '"seo_reports"',
    model: "SeoReport",
    columns: [
      { name: "site_id", type: "TEXT", nullable: true },
      { name: "periodStart", type: "TIMESTAMPTZ", nullable: true },
      { name: "periodEnd", type: "TIMESTAMPTZ", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "seo_reports_site_id_idx" ON "seo_reports"("site_id")',
      'CREATE INDEX IF NOT EXISTS "seo_reports_site_id_reportType_idx" ON "seo_reports"("site_id", "reportType")',
      'CREATE INDEX IF NOT EXISTS "seo_reports_reportType_generatedAt_idx" ON "seo_reports"("reportType", "generatedAt")',
    ],
  },
  // ── InformationSection ──────────────────────────
  {
    table: '"information_sections"',
    model: "InformationSection",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
      { name: "deletedAt", type: "TIMESTAMPTZ", nullable: true },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "information_sections_siteId_idx" ON "information_sections"("siteId")',
    ],
  },
  // ── InformationArticle ──────────────────────────
  {
    table: '"information_articles"',
    model: "InformationArticle",
    columns: [
      { name: "siteId", type: "TEXT", nullable: true },
      { name: "deletedAt", type: "TIMESTAMPTZ", nullable: true },
      { name: "page_type", type: "TEXT", nullable: true, defaultValue: "'article'" },
      { name: "seo_score", type: "INTEGER", nullable: true, defaultValue: "0" },
      { name: "faq_questions", type: "JSONB", nullable: true },
      { name: "keywords", type: "TEXT[]", nullable: true, defaultValue: "'{}'" },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS "information_articles_siteId_idx" ON "information_articles"("siteId")',
      'CREATE INDEX IF NOT EXISTS "information_articles_siteId_published_idx" ON "information_articles"("siteId", "published")',
    ],
  },
];

// Full CREATE TABLE statements for tables that might be entirely missing
const CREATE_TABLE_STATEMENTS: { table: string; model: string; sql: string }[] = [
  {
    table: "news_items",
    model: "NewsItem",
    sql: `CREATE TABLE IF NOT EXISTS "news_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
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
  "event_start_date" TIMESTAMPTZ,
  "event_end_date" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "meta_title_en" TEXT,
  "meta_title_ar" TEXT,
  "meta_description_en" TEXT,
  "meta_description_ar" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "keywords" TEXT[] NOT NULL DEFAULT '{}',
  "related_article_slugs" TEXT[] NOT NULL DEFAULT '{}',
  "related_shop_slugs" TEXT[] NOT NULL DEFAULT '{}',
  "affiliate_link_ids" TEXT[] NOT NULL DEFAULT '{}',
  "agent_source" TEXT,
  "agent_notes" TEXT,
  "research_log" JSONB,
  "updates_info_article" BOOLEAN NOT NULL DEFAULT false,
  "affected_info_slugs" TEXT[] NOT NULL DEFAULT '{}',
  "siteId" TEXT,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "news_research_logs",
    model: "NewsResearchLog",
    sql: `CREATE TABLE IF NOT EXISTS "news_research_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "run_type" TEXT NOT NULL DEFAULT 'daily',
  "status" TEXT NOT NULL DEFAULT 'running',
  "sources_checked" TEXT[] NOT NULL DEFAULT '{}',
  "items_found" INTEGER NOT NULL DEFAULT 0,
  "items_published" INTEGER NOT NULL DEFAULT 0,
  "items_skipped" INTEGER NOT NULL DEFAULT 0,
  "facts_flagged" INTEGER NOT NULL DEFAULT 0,
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "result_summary" JSONB,
  "siteId" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "fact_entries",
    model: "FactEntry",
    sql: `CREATE TABLE IF NOT EXISTS "fact_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "article_type" TEXT NOT NULL,
  "article_slug" TEXT NOT NULL,
  "fact_text_en" TEXT NOT NULL,
  "fact_text_ar" TEXT,
  "fact_location" TEXT,
  "category" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "confidence_score" INTEGER DEFAULT 0,
  "last_verified_at" TIMESTAMPTZ,
  "next_check_at" TIMESTAMPTZ,
  "verification_count" INTEGER NOT NULL DEFAULT 0,
  "source_url" TEXT,
  "source_name" TEXT,
  "source_type" TEXT,
  "source_last_checked" TIMESTAMPTZ,
  "original_value" TEXT,
  "current_value" TEXT,
  "updated_value" TEXT,
  "update_applied" BOOLEAN NOT NULL DEFAULT false,
  "update_applied_at" TIMESTAMPTZ,
  "agent_notes" TEXT,
  "verification_log" JSONB,
  "siteId" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "information_sections",
    model: "InformationSection",
    sql: `CREATE TABLE IF NOT EXISTS "information_sections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
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
  "deletedAt" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "information_categories",
    model: "InformationCategory",
    sql: `CREATE TABLE IF NOT EXISTS "information_categories" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name_en" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "description_en" TEXT,
  "description_ar" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    table: "information_articles",
    model: "InformationArticle",
    sql: `CREATE TABLE IF NOT EXISTS "information_articles" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
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
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "keywords" TEXT[] NOT NULL DEFAULT '{}',
  "page_type" TEXT DEFAULT 'article',
  "seo_score" INTEGER DEFAULT 0,
  "faq_questions" JSONB,
  "siteId" TEXT,
  "deletedAt" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
];

// Indexes for newly created tables
const NEW_TABLE_INDEXES: Record<string, string[]> = {
  news_items: [
    'CREATE INDEX IF NOT EXISTS "news_items_status_idx" ON "news_items"("status")',
    'CREATE INDEX IF NOT EXISTS "news_items_news_category_idx" ON "news_items"("news_category")',
    'CREATE INDEX IF NOT EXISTS "news_items_is_major_idx" ON "news_items"("is_major")',
    'CREATE INDEX IF NOT EXISTS "news_items_published_at_idx" ON "news_items"("published_at")',
    'CREATE INDEX IF NOT EXISTS "news_items_expires_at_idx" ON "news_items"("expires_at")',
    'CREATE INDEX IF NOT EXISTS "news_items_siteId_idx" ON "news_items"("siteId")',
    'CREATE INDEX IF NOT EXISTS "news_items_siteId_status_idx" ON "news_items"("siteId", "status")',
  ],
  news_research_logs: [
    'CREATE INDEX IF NOT EXISTS "news_research_logs_run_type_idx" ON "news_research_logs"("run_type")',
    'CREATE INDEX IF NOT EXISTS "news_research_logs_created_at_idx" ON "news_research_logs"("created_at")',
    'CREATE INDEX IF NOT EXISTS "news_research_logs_siteId_idx" ON "news_research_logs"("siteId")',
  ],
  fact_entries: [
    'CREATE INDEX IF NOT EXISTS "fact_entries_article_type_slug_idx" ON "fact_entries"("article_type", "article_slug")',
    'CREATE INDEX IF NOT EXISTS "fact_entries_status_idx" ON "fact_entries"("status")',
    'CREATE INDEX IF NOT EXISTS "fact_entries_next_check_at_idx" ON "fact_entries"("next_check_at")',
    'CREATE INDEX IF NOT EXISTS "fact_entries_category_idx" ON "fact_entries"("category")',
    'CREATE INDEX IF NOT EXISTS "fact_entries_siteId_idx" ON "fact_entries"("siteId")',
  ],
  information_sections: [
    'CREATE INDEX IF NOT EXISTS "information_sections_siteId_idx" ON "information_sections"("siteId")',
    'CREATE INDEX IF NOT EXISTS "information_sections_published_idx" ON "information_sections"("published")',
    'CREATE INDEX IF NOT EXISTS "information_sections_sort_order_idx" ON "information_sections"("sort_order")',
  ],
  information_categories: [],
  information_articles: [
    'CREATE INDEX IF NOT EXISTS "information_articles_section_id_idx" ON "information_articles"("section_id")',
    'CREATE INDEX IF NOT EXISTS "information_articles_category_id_idx" ON "information_articles"("category_id")',
    'CREATE INDEX IF NOT EXISTS "information_articles_siteId_idx" ON "information_articles"("siteId")',
    'CREATE INDEX IF NOT EXISTS "information_articles_siteId_published_idx" ON "information_articles"("siteId", "published")',
    'CREATE INDEX IF NOT EXISTS "information_articles_published_idx" ON "information_articles"("published")',
    'CREATE INDEX IF NOT EXISTS "information_articles_page_type_idx" ON "information_articles"("page_type")',
    'CREATE INDEX IF NOT EXISTS "information_articles_seo_score_idx" ON "information_articles"("seo_score")',
    'CREATE INDEX IF NOT EXISTS "information_articles_created_at_idx" ON "information_articles"("created_at")',
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getExistingTables(prisma: any): Promise<Set<string>> {
  const rows: { table_name: string }[] = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  return new Set(rows.map((r) => r.table_name));
}

async function getExistingColumns(
  prisma: any,
  tableName: string,
): Promise<Set<string>> {
  const clean = tableName.replace(/"/g, "");
  const rows: { column_name: string }[] = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${clean}
  `;
  return new Set(rows.map((r) => r.column_name));
}

// ─── Scan (GET) ─────────────────────────────────────────────────────────────

interface ScanResult {
  missingTables: { table: string; model: string }[];
  missingColumns: { table: string; model: string; column: string; type: string }[];
  missingIndexes: number;
  existingTables: string[];
  totalChecked: number;
}

async function scanDatabase(prisma: any): Promise<ScanResult> {
  const existingTables = await getExistingTables(prisma);

  const missingTables: ScanResult["missingTables"] = [];
  const missingTableNames = new Set<string>();
  const missingColumns: ScanResult["missingColumns"] = [];
  let missingIndexCount = 0;

  // Check for entirely missing tables (from CREATE_TABLE_STATEMENTS)
  for (const def of CREATE_TABLE_STATEMENTS) {
    if (!existingTables.has(def.table)) {
      missingTables.push({ table: def.table, model: def.model });
      missingTableNames.add(def.table);
    }
  }

  // Check for missing columns on existing tables (from EXPECTED_TABLES)
  for (const def of EXPECTED_TABLES) {
    const tableName = def.table.replace(/"/g, "");
    if (!existingTables.has(tableName)) {
      // Entire table is missing — skip column checks, add if not already tracked
      if (!missingTableNames.has(tableName)) {
        missingTables.push({ table: tableName, model: def.model });
        missingTableNames.add(tableName);
      }
      continue;
    }

    const existingCols = await getExistingColumns(prisma, def.table);
    for (const col of def.columns) {
      if (!existingCols.has(col.name)) {
        missingColumns.push({
          table: tableName,
          model: def.model,
          column: col.name,
          type: col.type,
        });
      }
    }
  }

  // Estimate missing indexes (we can't easily check index existence via information_schema alone)
  for (const def of EXPECTED_TABLES) {
    if (def.indexes) missingIndexCount += def.indexes.length;
  }
  for (const table in NEW_TABLE_INDEXES) {
    missingIndexCount += NEW_TABLE_INDEXES[table].length;
  }

  return {
    missingTables,
    missingColumns,
    missingIndexes: missingIndexCount,
    existingTables: Array.from(existingTables).sort(),
    totalChecked:
      CREATE_TABLE_STATEMENTS.length +
      EXPECTED_TABLES.reduce((n, t) => n + t.columns.length, 0),
  };
}

// ─── Migrate (POST) ────────────────────────────────────────────────────────

interface MigrateResult {
  tablesCreated: string[];
  columnsAdded: string[];
  indexesCreated: string[];
  errors: string[];
}

async function migrateDatabase(prisma: any): Promise<MigrateResult> {
  const result: MigrateResult = {
    tablesCreated: [],
    columnsAdded: [],
    indexesCreated: [],
    errors: [],
  };

  const existingTables = await getExistingTables(prisma);

  // 1. Create missing tables
  for (const def of CREATE_TABLE_STATEMENTS) {
    if (!existingTables.has(def.table)) {
      try {
        await prisma.$executeRawUnsafe(def.sql);
        result.tablesCreated.push(`${def.table} (${def.model})`);

        // Create indexes for new table
        const tableIndexes = NEW_TABLE_INDEXES[def.table] || [];
        for (const idx of tableIndexes) {
          try {
            await prisma.$executeRawUnsafe(idx);
            result.indexesCreated.push(idx.match(/\"([^"]+_idx)\"/)?.[1] || idx);
          } catch (e: any) {
            result.errors.push(`Index error: ${e.message?.substring(0, 100)}`);
          }
        }
      } catch (e: any) {
        result.errors.push(
          `Failed to create ${def.table}: ${e.message?.substring(0, 150)}`,
        );
      }
    }
  }

  // 2. Add missing columns to existing tables
  for (const def of EXPECTED_TABLES) {
    const tableName = def.table.replace(/"/g, "");
    if (!existingTables.has(tableName)) {
      // Table doesn't exist and isn't in CREATE_TABLE_STATEMENTS — skip
      continue;
    }

    const existingCols = await getExistingColumns(prisma, def.table);

    for (const col of def.columns) {
      if (existingCols.has(col.name)) continue;

      const nullable = col.nullable !== false ? "" : " NOT NULL";
      const dflt = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : "";
      const sql = `ALTER TABLE ${def.table} ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}${nullable}${dflt}`;

      try {
        await prisma.$executeRawUnsafe(sql);
        result.columnsAdded.push(`${tableName}.${col.name} (${col.type})`);
      } catch (e: any) {
        result.errors.push(
          `Failed to add ${tableName}.${col.name}: ${e.message?.substring(0, 150)}`,
        );
      }
    }

    // Create indexes for existing tables
    if (def.indexes) {
      for (const idx of def.indexes) {
        try {
          await prisma.$executeRawUnsafe(idx);
          result.indexesCreated.push(
            idx.match(/\"([^"]+_idx)\"/)?.[1] || "index",
          );
        } catch (e: any) {
          // Most index errors are "already exists" — not critical
          if (!e.message?.includes("already exists")) {
            result.errors.push(`Index error: ${e.message?.substring(0, 100)}`);
          }
        }
      }
    }
  }

  return result;
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const scan = await scanDatabase(prisma);

    return NextResponse.json({
      success: true,
      action: "scan",
      ...scan,
      summary: {
        missingTables: scan.missingTables.length,
        missingColumns: scan.missingColumns.length,
        needsMigration:
          scan.missingTables.length > 0 || scan.missingColumns.length > 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error: e.message || "Scan failed",
        hint: "Check DATABASE_URL and that the database is reachable",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    // Scan first
    const before = await scanDatabase(prisma);

    // Migrate
    const result = await migrateDatabase(prisma);

    // Scan after to verify
    const after = await scanDatabase(prisma);

    return NextResponse.json({
      success: true,
      action: "migrate",
      before: {
        missingTables: before.missingTables.length,
        missingColumns: before.missingColumns.length,
      },
      after: {
        missingTables: after.missingTables.length,
        missingColumns: after.missingColumns.length,
      },
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error: e.message || "Migration failed",
        hint: "Check DATABASE_URL and ensure the database user has CREATE/ALTER permissions",
      },
      { status: 500 },
    );
  }
}
