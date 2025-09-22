# 🚀 SEO System Activation Guide

This guide will help you activate and configure the SEO system for Yalla London.

## 📋 Quick Start Checklist

### ✅ Prerequisites
- [ ] Database is set up and accessible
- [ ] Environment variables are configured
- [ ] Node.js and npm/yarn are installed

### ✅ Activation Steps
1. [Enable feature flags](#1-enable-feature-flags)
2. [Run database migration](#2-run-database-migration)
3. [Configure API keys](#3-configure-api-keys)
4. [Setup Supabase RLS](#4-supabase-sql-editor-setup)
5. [Verify installation](#5-verify-installation)

---

## 1. Enable Feature Flags

### Local Development (.env.local)
```bash
# Core SEO features
FEATURE_SEO=1
NEXT_PUBLIC_FEATURE_SEO=1

# AI-powered SEO features (optional)
FEATURE_AI_SEO_AUDIT=1

# Analytics features (optional)
FEATURE_ANALYTICS_DASHBOARD=1

# Advanced SEO features (optional)
FEATURE_MULTILINGUAL_SEO=1
FEATURE_SCHEMA_GENERATION=1
FEATURE_SITEMAP_AUTO_UPDATE=1
```

### Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `FEATURE_SEO` | `1` | Production, Preview, Development |
| `NEXT_PUBLIC_FEATURE_SEO` | `1` | Production, Preview, Development |
| `FEATURE_AI_SEO_AUDIT` | `1` | Production, Preview, Development |
| `FEATURE_ANALYTICS_DASHBOARD` | `1` | Production, Preview, Development |

---

## 2. Run Database Migration

### Option A: Using Prisma CLI
```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Or run the specific migration
npx prisma migrate deploy
```

### Option B: Manual SQL Execution
```bash
# Connect to your database and run:
psql $DATABASE_URL -f prisma/migrations/20250115000000_add_seo_tables/migration.sql
```

### Option C: Using Database GUI
1. Open your database management tool (pgAdmin, DBeaver, etc.)
2. Execute the SQL from `prisma/migrations/20250115000000_add_seo_tables/migration.sql`

---

## 3. Configure API Keys

### Required for AI Features
```bash
# Abacus.ai API Key (for AI-powered SEO)
ABACUSAI_API_KEY=your-abacus-ai-key-here
```

### Required for Analytics
```bash
# Google Analytics 4
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Optional for Advanced Features
```bash
# Google Search Console
GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
GOOGLE_SEARCH_CONSOLE_KEY=your-gsc-api-key
GOOGLE_SEARCH_CONSOLE_CX=your-search-engine-id
```

---

## 4. Supabase SQL Editor Setup

> **Reference File**: The SQL policies are located in `docs/sql/seo-rls.sql` in the repository.

### Enable Row Level Security (RLS)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Create a new query

2. **Apply RLS Policies**
   - Copy the contents of `docs/sql/seo-rls.sql`
   - Paste into the SQL Editor
   - Execute the query

3. **Verify RLS is Enabled**
   ```sql
   -- Check if RLS is enabled on SEO tables
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename LIKE 'seo_%' 
   ORDER BY tablename;
   ```

4. **Test Policy Configuration**
   ```sql
   -- Check existing policies
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies 
   WHERE tablename LIKE 'seo_%' 
   ORDER BY tablename, policyname;
   ```

### Policy Profiles Available

**Profile A: LOCKED (Default - Recommended)**
- Only service role can read/write SEO data
- Maximum security for production environments
- Applied by default when running the SQL

**Profile B: PUBLIC-READ (Optional)**
- Allows anonymous users to read published SEO data
- Requires adding `is_published` column to `seo_meta` table
- Uncomment the PUBLIC-READ policies in the SQL file if needed

---

## 5. Verify Installation

### Run Health Check
```bash
# Test all SEO functionality
npm run health:seo

# Or using yarn
yarn health:seo
```

### Run Test Suite
```bash
# Run SEO tests
npm run test:seo

# Or using yarn
yarn test:seo
```

### Manual Verification
1. **Check Admin Dashboard**: Navigate to `/admin/seo` (if available)
2. **Test API Endpoints**: 
   - `GET /api/seo/save-meta?pageId=test` (should return 403 if disabled, 200 if enabled)
   - `POST /api/seo/generate-meta` (should return 403 if AI disabled, 200 if enabled)
3. **Check Database**: Verify SEO tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name LIKE 'seo_%';
   ```

---

## 🔧 Troubleshooting

### Common Issues

#### ❌ "SEO features are disabled" Error
**Solution**: Ensure both feature flags are set:
```bash
FEATURE_SEO=1
NEXT_PUBLIC_FEATURE_SEO=1
```

#### ❌ "Database table does not exist" Error
**Solution**: Run the database migration:
```bash
npx prisma db push
```

#### ❌ "AI SEO features are disabled" Error
**Solution**: Set the AI feature flag and API key:
```bash
FEATURE_AI_SEO_AUDIT=1
ABACUSAI_API_KEY=your-key-here
```

#### ❌ "Analytics features are disabled" Error
**Solution**: Set the analytics feature flag and GA ID:
```bash
FEATURE_ANALYTICS_DASHBOARD=1
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Health Check Failures

#### Database Connection Issues
```bash
# Test database connection
npx prisma db pull

# Check if tables exist
npx prisma studio
```

#### API Endpoint Issues
```bash
# Test local server
npm run dev

# Check if endpoints respond
curl http://localhost:3000/api/seo/save-meta
```

#### Environment Variable Issues
```bash
# Check if variables are loaded
node -e "console.log(process.env.FEATURE_SEO)"

# Verify .env.local exists
ls -la .env.local
```

---

## 📊 Feature Matrix

| Feature | Flag | Required Env | Status |
|---------|------|--------------|--------|
| **Core SEO** | `FEATURE_SEO` | None | ✅ Basic |
| **AI SEO** | `FEATURE_AI_SEO_AUDIT` | `ABACUSAI_API_KEY` | 🔑 API Key |
| **Analytics** | `FEATURE_ANALYTICS_DASHBOARD` | `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | 🔑 API Key |
| **Multilingual** | `FEATURE_MULTILINGUAL_SEO` | None | ✅ Basic |
| **Schema** | `FEATURE_SCHEMA_GENERATION` | None | ✅ Basic |
| **Sitemap** | `FEATURE_SITEMAP_AUTO_UPDATE` | None | ✅ Basic |

**Legend:**
- ✅ **Basic**: Works with just feature flag
- 🔑 **API Key**: Requires external service API key

---

## 🚀 Production Deployment

### Vercel Deployment Checklist

1. **Environment Variables**: Add all required variables in Vercel dashboard
2. **Database Migration**: Ensure production database has SEO tables
3. **Feature Flags**: Set all desired flags to `1`
4. **API Keys**: Configure production API keys
5. **Health Check**: Run health check after deployment

### Environment-Specific Configuration

#### Development
```bash
FEATURE_SEO=1
NEXT_PUBLIC_FEATURE_SEO=1
# Optional: Add API keys for testing
```

#### Preview/Staging
```bash
FEATURE_SEO=1
NEXT_PUBLIC_FEATURE_SEO=1
FEATURE_AI_SEO_AUDIT=1
ABACUSAI_API_KEY=staging-key
```

#### Production
```bash
FEATURE_SEO=1
NEXT_PUBLIC_FEATURE_SEO=1
FEATURE_AI_SEO_AUDIT=1
FEATURE_ANALYTICS_DASHBOARD=1
FEATURE_MULTILINGUAL_SEO=1
FEATURE_SCHEMA_GENERATION=1
FEATURE_SITEMAP_AUTO_UPDATE=1
ABACUSAI_API_KEY=production-key
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-PRODUCTION
```

---

## 📚 Additional Resources

- **Health Check Script**: `scripts/seo-health.ts`
- **Test Suite**: `tests/seo/`
- **Feature Flags**: `lib/flags.ts`
- **SEO Service**: `lib/seo/seo-meta-service.ts`
- **Schema Generator**: `lib/seo/schema-generator.ts`

---

## 🆘 Support

If you encounter issues:

1. **Check Health**: Run `npm run health:seo`
2. **Check Logs**: Look for error messages in console
3. **Verify Config**: Ensure all environment variables are set
4. **Test Database**: Verify SEO tables exist
5. **Check Network**: Ensure API endpoints are accessible

For additional help, check the main project documentation or create an issue in the repository.
