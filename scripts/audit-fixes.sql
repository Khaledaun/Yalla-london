-- =============================================================================
-- Yalla London — Security Audit Fix SQL
-- =============================================================================
-- Run this against your Supabase/PostgreSQL database.
--
-- Usage (Supabase SQL Editor):
--   Copy-paste this entire file and run it.
--
-- Usage (psql):
--   psql "$DATABASE_URL" -f scripts/audit-fixes.sql
-- =============================================================================

BEGIN;

-- ─── 1. Add missing columns to "users" table ────────────────────────────────
-- Note: Prisma maps User model to "users" table via @@map(name: "users")
-- Baseline migration only created: id, name, email, emailVerified, image

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'viewer';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT NOW();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT NOW();

-- ─── 2. Add soft delete + multi-tenant columns ──────────────────────────────

ALTER TABLE "BlogPost"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "BlogPost"   ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- ─── 3. Performance indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "BlogPost_siteId_idx"      ON "BlogPost"("siteId");
CREATE INDEX IF NOT EXISTS "BlogPost_published_idx"    ON "BlogPost"("published");
CREATE INDEX IF NOT EXISTS "BlogPost_category_id_idx"  ON "BlogPost"("category_id");
CREATE INDEX IF NOT EXISTS "BlogPost_author_id_idx"    ON "BlogPost"("author_id");
CREATE INDEX IF NOT EXISTS "BlogPost_created_at_idx"   ON "BlogPost"("created_at");
CREATE INDEX IF NOT EXISTS "MediaAsset_file_type_idx"  ON "MediaAsset"("file_type");
CREATE INDEX IF NOT EXISTS "MediaAsset_created_at_idx" ON "MediaAsset"("created_at");

-- ─── 4. Seed admin user ─────────────────────────────────────────────────────
-- Password: Yallalondon123!
-- bcrypt hash generated with cost factor 12

INSERT INTO "users" ("id", "email", "name", "role", "permissions", "isActive", "emailVerified", "passwordHash", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Aunk.adv@gmail.com',
  'Admin',
  'admin',
  ARRAY['*'],
  true,
  NOW(),
  '$2a$12$EqmhFjSL.E11T9FGWdnQyumZfZpyVTZzOk/otFkRXJcjjKVohpsRe',
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "role" = 'admin',
  "permissions" = ARRAY['*'],
  "isActive" = true,
  "passwordHash" = EXCLUDED."passwordHash",
  "updatedAt" = NOW();

COMMIT;

-- ─── 5. Verify ──────────────────────────────────────────────────────────────

SELECT 'role' AS column_check,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'role'
       ) AS exists;

SELECT 'passwordHash' AS column_check,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'passwordHash'
       ) AS exists;

SELECT 'BlogPost_siteId_idx' AS index_check,
       EXISTS (
         SELECT 1 FROM pg_indexes
         WHERE indexname = 'BlogPost_siteId_idx'
       ) AS exists;

SELECT "email", "role", "isActive", "passwordHash" IS NOT NULL AS has_password
FROM "users"
WHERE "email" = 'Aunk.adv@gmail.com';
