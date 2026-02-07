-- =============================================================================
-- Yalla London — Security Audit Fix SQL
-- =============================================================================
-- Run this against your Supabase/PostgreSQL database.
--
-- Usage (psql):
--   psql "$DATABASE_URL" -f scripts/audit-fixes.sql
--
-- Usage (Supabase SQL Editor):
--   Copy-paste this entire file and run it.
-- =============================================================================

BEGIN;

-- ─── 1. Schema changes ─────────────────────────────────────────────────────

-- Add passwordHash for bcrypt-based authentication (replaces plaintext check)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- Add soft delete columns
ALTER TABLE "User"       ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "BlogPost"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add multi-tenant siteId to BlogPost
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- ─── 2. Performance indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "BlogPost_siteId_idx"      ON "BlogPost"("siteId");
CREATE INDEX IF NOT EXISTS "BlogPost_published_idx"    ON "BlogPost"("published");
CREATE INDEX IF NOT EXISTS "BlogPost_category_id_idx"  ON "BlogPost"("category_id");
CREATE INDEX IF NOT EXISTS "BlogPost_author_id_idx"    ON "BlogPost"("author_id");
CREATE INDEX IF NOT EXISTS "BlogPost_created_at_idx"   ON "BlogPost"("created_at");
CREATE INDEX IF NOT EXISTS "MediaAsset_file_type_idx"  ON "MediaAsset"("file_type");
CREATE INDEX IF NOT EXISTS "MediaAsset_created_at_idx" ON "MediaAsset"("created_at");

-- ─── 3. Seed initial admin user ────────────────────────────────────────────
-- IMPORTANT: Replace the values below before running!
--
-- Generate a bcrypt hash for your password:
--   node -e "require('bcryptjs').hash('YourPassword123!', 12).then(h => console.log(h))"
--
-- Then paste the hash below:

-- INSERT INTO "User" ("id", "email", "name", "role", "permissions", "isActive", "emailVerified", "passwordHash")
-- VALUES (
--   gen_random_uuid()::text,
--   'admin@yourdomain.com',                    -- ← YOUR EMAIL
--   'Admin',
--   'admin',
--   ARRAY['*'],
--   true,
--   NOW(),
--   '$2a$12$PASTE_YOUR_BCRYPT_HASH_HERE'       -- ← YOUR HASH
-- )
-- ON CONFLICT ("email") DO UPDATE SET
--   "role" = 'admin',
--   "permissions" = ARRAY['*'],
--   "isActive" = true,
--   "passwordHash" = EXCLUDED."passwordHash";

COMMIT;

-- ─── 4. Verify ─────────────────────────────────────────────────────────────

SELECT 'passwordHash' AS column_check,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'User' AND column_name = 'passwordHash'
       ) AS exists;

SELECT 'BlogPost_deletedAt' AS column_check,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'BlogPost' AND column_name = 'deletedAt'
       ) AS exists;

SELECT 'BlogPost_siteId_idx' AS index_check,
       EXISTS (
         SELECT 1 FROM pg_indexes
         WHERE indexname = 'BlogPost_siteId_idx'
       ) AS exists;

SELECT count(*) AS admin_users
FROM "User"
WHERE role = 'admin' AND "isActive" = true;
