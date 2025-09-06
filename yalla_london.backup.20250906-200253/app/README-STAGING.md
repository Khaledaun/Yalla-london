
# Staging Deployment Guide - Yalla London CMS

Complete guide for deploying and validating Phases 3.2-3.5 on staging environment.

## 📋 Quick Overview

This staging deployment validates:
- **Phase 3.2:** Social Media Embeds (IG, TikTok, YouTube, Facebook)
- **Phase 3.3:** Media Library (S3 upload, responsive variants, usage tracking)
- **Phase 3.4:** Homepage Builder (drag-drop, version control, live preview)  
- **Phase 3.5:** Database & Backups (PostgreSQL backups to S3, restore)

## 🚀 Step 1: Create Staging Infrastructure

### 1.1 Vercel Staging Project
```bash
# Install Vercel CLI
npm install -g vercel@latest

# Create new project (not --prod)
vercel login
vercel init yalla-london-staging
cd yalla-london-staging

# Link to existing code
vercel link

# Deploy to preview (not production)
vercel --env .env.staging
```

### 1.2 Neon Database (Staging)
```bash
# Create staging database
# 1. Go to console.neon.tech
# 2. Create new project: "yalla-london-staging"  
# 3. Copy connection string -> DATABASE_URL

# Test connection
psql "postgresql://username:password@staging-db.neon.tech/yalla_london_staging"
```

Alternative: **Supabase Staging**
```bash
# 1. Go to supabase.com/dashboard
# 2. New project: "yalla-london-staging"
# 3. Settings -> Database -> Connection string
```

### 1.3 S3 Staging Bucket
```bash
# Create bucket
aws s3 mb s3://yalla-london-staging --region us-east-1

# Create IAM user with least privilege
aws iam create-user --user-name yalla-staging-s3-user

# Attach policy (see staging-iam-policy.json)
aws iam attach-user-policy \
  --user-name yalla-staging-s3-user \
  --policy-arn arn:aws:iam::ACCOUNT:policy/YallaLondonStagingS3Policy
```

Alternative: **Cloudflare R2**
```bash
# 1. Go to Cloudflare Dashboard -> R2
# 2. Create bucket: "yalla-london-staging"
# 3. API Tokens -> Create R2 Token
# 4. Use R2 S3-compatible endpoint
```

## ⚙️ Step 2: Environment Configuration

### 2.1 Copy Environment Template
```bash
cp .env.staging.example .env.local
# Edit with your staging values
```

### 2.2 Set Vercel Environment Variables
```bash
# Database
vercel env add DATABASE_URL
# Paste: postgresql://username:password@staging-db.neon.tech/yalla_london_staging

# Authentication  
vercel env add NEXTAUTH_SECRET
# Generate: openssl rand -base64 32

vercel env add NEXTAUTH_URL
# Your staging URL: https://yalla-london-staging.vercel.app

# AWS S3
vercel env add AWS_BUCKET_NAME
vercel env add AWS_ACCESS_KEY_ID  
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add AWS_REGION

# Feature Flags
vercel env add FEATURE_SEO 1
vercel env add FEATURE_EMBEDS 1
vercel env add FEATURE_MEDIA 1
vercel env add FEATURE_HOMEPAGE_BUILDER 1

# AI Content
vercel env add ABACUSAI_API_KEY
```

## 🗄️ Step 3: Database Setup

### 3.1 Run Migrations
```bash
# Generate Prisma client
yarn prisma generate

# Deploy schema to staging
yarn prisma migrate deploy --schema=./prisma/schema.prisma

# Verify schema
yarn prisma db pull
```

### 3.2 Seed Staging Data
```bash
# Run staging seed
yarn tsx scripts/seed-staging.ts

# Expected output:
# ✅ Created 4 social embeds (IG, TikTok, YouTube, Facebook)
# ✅ Created 2 homepage blocks (Hero, Featured Experiences)  
# ✅ Created 2 blog posts (EN/AR)
# ✅ Created 2 events
# ✅ Created 3 media assets
```

## 🚀 Step 4: Deploy to Staging

### 4.1 Deploy Application
```bash
# Deploy to staging (not --prod)
vercel

# Get staging URL
vercel domains ls
# Example: https://yalla-london-staging-abc123.vercel.app
```

### 4.2 Health Check
```bash
# Test all endpoints
curl https://your-staging-url.vercel.app/api/health

# Expected: {"status":"ok","timestamp":"2024-..."}
```

## ✅ Step 5: Automated Testing

### 5.1 Run API Tests
```bash
# Install testing dependencies
yarn add -D @playwright/test

# Run API test suite
yarn playwright test tests/api-staging.spec.ts

# Expected: 14/14 endpoints passing
```

### 5.2 Run E2E Tests  
```bash
# Run browser automation tests
yarn playwright test tests/e2e-staging.spec.ts

# Tests:
# ✅ Social embed insertion + CLS-safe rendering
# ✅ Media upload + metadata + hero assignment  
# ✅ Homepage builder drag-drop + publish
# ✅ Database backup + restore
```

### 5.3 Lighthouse CI
```bash
# Run performance audit
yarn lhci autorun --config=lighthouserc-staging.js

# Expected scores ≥ 0.90:
# - Performance
# - Accessibility  
# - SEO
# - Best Practices
```

## 🔍 Step 6: Manual Validation

### 6.1 Admin Interface Test
```bash
# 1. Visit: https://your-staging-url.vercel.app/admin
# 2. Test each section:
#    - Social Embeds Manager
#    - Media Library  
#    - Homepage Builder
#    - Database Backups
```

### 6.2 Frontend Validation
```bash
# 1. Visit: https://your-staging-url.vercel.app
# 2. Verify:
#    - Hero image loads (no CLS)
#    - Social embeds render safely
#    - EN/AR language switching
#    - Mobile responsive design
```

## 🔧 Step 7: Backup & Restore Test

### 7.1 Create Test Backup
```bash
# Via API
curl -X POST https://your-staging-url.vercel.app/api/database/backups \
  -H "Content-Type: application/json" \
  -d '{"backupName":"staging-test","backupType":"manual"}'

# Expected: Backup created and uploaded to S3
```

### 7.2 Test Restore (SAFE)
```bash
# Create temporary staging DB for restore test
# 1. Create new Neon project: "yalla-london-restore-test"
# 2. Update DATABASE_URL temporarily
# 3. Run restore via admin UI
# 4. Verify data integrity
# 5. Switch back to original DB
```

## 📊 Expected Results

### API Endpoints (14 total)
- **Social Embeds:** 3 endpoints ✅  
- **Media Library:** 4 endpoints ✅
- **Homepage Builder:** 4 endpoints ✅
- **Database Backups:** 3 endpoints ✅

### Frontend Features
- **CLS-Safe Embeds:** Instagram, TikTok, YouTube, Facebook ✅
- **Responsive Media:** WebP/AVIF variants, srcset/sizes ✅  
- **Drag-Drop Builder:** Live preview, version control ✅
- **i18n Support:** EN/AR switching intact ✅

### Performance Metrics
- **Lighthouse Performance:** ≥ 0.90 ✅
- **Accessibility Score:** ≥ 0.90 ✅  
- **SEO Score:** ≥ 0.90 ✅
- **CLS:** < 0.1 ✅

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Verify connection string format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/db?sslmode=require

# Test direct connection
psql "$DATABASE_URL" -c "SELECT version();"
```

**S3 Upload Failed:**
```bash
# Verify AWS credentials
aws s3 ls s3://yalla-london-staging/

# Check IAM permissions
aws iam get-user-policy --user-name yalla-staging-s3-user --policy-name S3Access
```

**Build Failed:**
```bash
# Check TypeScript errors
yarn tsc --noEmit

# Verify environment variables
vercel env ls
```

### Recovery Procedures

**Restore from Backup:**
1. Go to `/admin` -> Database Backups
2. Select backup from S3 list
3. Click "Restore" -> Confirm
4. Monitor restore progress
5. Verify data integrity

**Reset Staging Environment:**
```bash
# 1. Delete staging database
# 2. Run fresh migration
yarn prisma migrate reset --skip-seed
yarn prisma migrate deploy

# 3. Re-seed with fresh data  
yarn tsx scripts/seed-staging.ts
```

## ✅ Success Criteria

Staging is ready for production when:

- [ ] All 14 API endpoints return 200 status
- [ ] E2E tests pass (social embeds, media library, homepage builder)
- [ ] Lighthouse CI scores ≥ 0.90 across all metrics
- [ ] Backup/restore cycle completes successfully
- [ ] No console errors in browser dev tools
- [ ] EN/AR language switching works correctly
- [ ] Mobile responsive design verified

## 🚀 Next Steps

After staging validation passes:
1. **Production Deployment** with real domain
2. **Phase 4 Automation** implementation
3. **Content generation** workflow setup
4. **Monitoring** and analytics integration

---

**Questions?** Check the troubleshooting section or create an issue in the repository.
