# Supabase Database Migration Guide

## Quick Start

### Option 1: Supabase SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `nphnntnvqfpveyfktdct`
3. Navigate to **SQL Editor**
4. Run the migrations in order:

```sql
-- Step 1: Create Prisma migrations table (if not exists)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id                      VARCHAR(36) NOT NULL PRIMARY KEY,
    checksum                VARCHAR(64) NOT NULL,
    finished_at             TIMESTAMPTZ,
    migration_name          VARCHAR(255) NOT NULL,
    logs                    TEXT,
    rolled_back_at          TIMESTAMPTZ,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count     INTEGER NOT NULL DEFAULT 0
);

-- Step 2: Check existing migrations
SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at;
```

5. Then run each migration file from `prisma/migrations/*/migration.sql` in order

### Option 2: Prisma CLI (Local Machine)

```bash
# Set environment variables
export DATABASE_URL="postgresql://postgres.nphnntnvqfpveyfktdct:PASSWORD@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.nphnntnvqfpveyfktdct:PASSWORD@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"

# Run migrations
cd yalla_london/app
npx prisma migrate deploy
```

### Option 3: Vercel Build (Automatic)

Migrations run automatically during Vercel deployment if configured:

```json
// package.json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma migrate deploy && next build"
  }
}
```

## Migration Files

| Migration | Description | Status |
|-----------|-------------|--------|
| `20240101000000_baseline_main` | Core tables (users, posts, categories) | Required |
| `20250115000000_add_seo_tables` | SEO and analytics tables | Required |
| `20250908063738_phase4a_initial_models` | Command Center models | Required |

## Full Schema Tables

### Core Tables
- `users` - User accounts and authentication
- `accounts` - OAuth provider accounts
- `sessions` - User sessions
- `verificationtokens` - Email verification tokens

### Content Tables
- `Category` - Blog categories
- `BlogPost` - Blog posts (EN/AR)
- `Recommendation` - Location recommendations
- `ContentGeneration` - AI-generated content log

### Media Tables
- `MediaAsset` - Uploaded media files
- `SocialEmbed` - Social media embeds

### Homepage Builder
- `HomepageBlock` - Homepage sections
- `HomepageVersion` - Homepage version history

### Automation Tables
- `ScheduledContent` - Scheduled posts
- `ContentScheduleRule` - Automation rules
- `DatabaseBackup` - Backup history

### Command Center Tables (Phase 4)
- `Site` - Multi-site management
- `AutopilotTask` - Automation tasks
- `SocialAccount` - Social media accounts
- `SocialPost` - Social media posts
- `PdfGuide` - Generated PDF guides
- `AffiliatePartner` - Affiliate partners
- `EmailCampaign` - Email campaigns
- `Lead` - Lead management
- `AnalyticsSnapshot` - Analytics data

## Troubleshooting

### Error: relation already exists
```sql
-- Check if table exists before creating
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'users'
);
```

### Error: migration already applied
```sql
-- Check migration status
SELECT * FROM "_prisma_migrations";

-- If needed, mark migration as applied
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'manual', '20240101000000_baseline_main', now(), 1);
```

### Reset Database (DANGER - Development Only)
```sql
-- Drop all tables (USE WITH CAUTION)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

## Verification

After running migrations, verify with:

```sql
-- Count tables
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';

-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected: ~30+ tables

## Connection Strings

### Production (with PgBouncer)
```
postgresql://postgres.nphnntnvqfpveyfktdct:PASSWORD@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Direct Connection (for migrations)
```
postgresql://postgres.nphnntnvqfpveyfktdct:PASSWORD@aws-0-eu-west-2.pooler.supabase.com:5432/postgres
```

---

**Note:** Replace `PASSWORD` with your actual database password.
